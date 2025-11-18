<template>
  <div
    v-if="is_loading && !is_loading_first"
    class="relative"
  >
    <div class="absolute left-1/2 -translate-x-1/2">
      <Loading class="mx-auto" />
    </div>
  </div>
  <SkeletonLoading v-if="is_loading_first" />
  <template v-if="!is_loading_first">
    <RecycleScroller
      @scroll="($event: UIEvent) => $main.loadMoreConversation($event)"
      v-if="size(conversationStore.conversation_list)"
      class="overflow-y-auto"
      :items="map(conversationStore.conversation_list)"
      :item-size="86"
      key-field="data_key"
      v-slot="{ item }"
    >
      <ConversationItem :source="item" />
    </RecycleScroller>
    <div v-else>
      <img
        src="@/assets/icons/empty-page.svg"
        width="250"
        class="mx-auto mt-5"
      />
      <div class="text-center text-slate-400">
        {{ $t('v1.view.main.dashboard.chat.empty_conversation') }}
      </div>
    </div>
  </template>
</template>
<script setup lang="ts">
import {
  read_conversation,
  reset_read_conversation,
} from '@/service/api/chatbox/n4-service'
import { selectConversation, setParamChat } from '@/service/function'
import { toastError } from '@/service/helper/alert'
import {
  useChatbotUserStore,
  useCommonStore,
  useConversationStore,
  useMessageStore,
  useOrgStore,
  usePageStore,
} from '@/stores'
import { N4SerivceAppConversation } from '@/utils/api/N4Service/Conversation'
import { error } from '@/utils/decorator/Error'
import { loadingV2 } from '@/utils/decorator/Loading'
import { waterfall } from 'async'
import { differenceInHours } from 'date-fns'
import { find, keys, map, mapValues, pick, set, size, throttle } from 'lodash'
import { container } from 'tsyringe'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import Loading from '@/components/Loading.vue'
import ConversationItem from '@/views/ChatWarper/Chat/LeftBar/Conversation/ConversationItem.vue'
import SkeletonLoading from '@/views/ChatWarper/Chat/LeftBar/Conversation/SkeletonLoading.vue'

import { ChatAdapter } from '@/db/ChatAdapter'
import { db } from '@/db/ChatDB'
import type { SocketEvent } from '@/service/interface/app/common'
import type {
  ConversationInfo,
  ConversationList,
  FilterConversation,
} from '@/service/interface/app/conversation'
import type { CbError } from '@/service/interface/function'
import {
  CalcSpecialPageConfigs,
  type ICalcSpecialPageConfigs,
} from '@/utils/helper/Conversation/CalcSpecialPageConfigs'

/**dữ liệu từ socket */
interface CustomEvent extends Event {
  detail?: {
    /**dữ liệu của 1 hội thoại */
    conversation?: ConversationInfo
    /**tên sự kiện socket */
    event?: SocketEvent
  }
}
/** Khai báo các thông tin từ store */
const $route = useRoute()
const $router = useRouter()
const pageStore = usePageStore()
const conversationStore = useConversationStore()
const commonStore = useCommonStore()
const chatbotUserStore = useChatbotUserStore()
const messageStore = useMessageStore()
const orgStore = useOrgStore()

/**có đang load hội thoại hay không */
const is_loading = ref(false)
/** load danh sách hội thoại mới */
const is_loading_first = ref(true)
/**toàn bộ hội thoại đã được load hết chưa */
const is_done = ref(false)
/**phân trang kiểu after */
const after = ref<number[]>()
/**thời gian component được render */
const mounted_time = ref<Date>(new Date())

const need_fetch_from_api = ref(true)
onMounted(() => {
  // Khi vào màn, luôn bật flag cần fetch API
  need_fetch_from_api.value = true
  console.log('Mounted → need_fetch_from_api set to true')
})

/** dữ liệu lọc trừ conversation_type */
const option_filter_page_data = computed(() => {
  const { conversation_type, ...rest } =
    conversationStore.option_filter_page_data
  return JSON.stringify(rest)
})

class Main {
  /**
   * @param API_CONVERSATION API của hội thoại
   * @param SERVICE_CALC_SPECIAL_PAGE_CONFIGS tính toán cấu hình trang đặc biệt
   */
  constructor(
    private readonly API_CONVERSATION = container.resolve(
      N4SerivceAppConversation
    ),
    private readonly SERVICE_CALC_SPECIAL_PAGE_CONFIGS: ICalcSpecialPageConfigs = container.resolve(
      CalcSpecialPageConfigs
    )
  ) {
    this.loadMoreConversation = throttle(
      this.loadMoreConversation.bind(this),
      300
    )
  }

  /**
   * làm mới dữ liệu được chọn
   * - map từng field để hàm watch store ở những chỗ khác không nhận
   */
  private refreshConversation(conversation: ConversationInfo) {
    /** nếu không có hội thoại nào được chọn thì thôi */
    if (!conversationStore.select_conversation) return

    /*các giá trị cần update */
    const UPDATED_VALUE = pick(conversation, [
      'client_name',
      'client_bio',
      'client_phone',
      'user_id',
      'fb_staff_id',
      'label_id',
      'last_read_message',
      'staff_read',
    ])

    /** thay đổi obj nhưng không cho trigger watch */
    Object.assign(conversationStore.select_conversation, UPDATED_VALUE)
  }

  /**
   * đọc danh sách hội thoại
   * @param is_first_time có phải lần đầu tiên không
   * @param is_pick_first có chọn hội thoại đầu tiên không
   */
  @loadingV2(is_loading, 'value')
  @error()

  /**
   *  getConversation()
   *
   * Hàm load conversation, hỗ trợ:
   * - Lần đầu load → bật loading
   * - Load từ Local IndexedDB (nếu USE_LOCAL = true)
   * - Incremental Sync: chỉ fetch những conversation mới hơn lastSyncedAt
   * - Kết hợp filter đặc biệt cho từng page
   * - Phân trang bằng AFTER (array timestamp)
   * - Merge vào conversationStore
   *
   * @param is_first_time   Có phải lần đầu load không → bật loading + auto select
   * @param is_pick_first   Khi lần đầu load thì tự chọn cuộc hội thoại đầu tiên
   */
  async getConversation(is_first_time?: boolean, is_pick_first?: boolean) {
    /** Nếu lần đầu gọi → bật loading UI */
    is_loading_first.value = !!is_first_time
    console.log('nnnnnn')
    const USE_LOCAL = ChatAdapter.use_local

    /** Không có internet thì dừng luôn */
    if (!commonStore.is_connected_internet) return

    /** Không có org → không thể load */
    if (!orgStore.selected_org_id) return

    /** Danh sách pageId đang chọn */
    const PAGE_IDS = keys(pageStore.selected_page_id_list)

    /** Cấu hình đặc biệt theo từng page (chỉ định sort, lọc staff…) */
    const SPECIAL_PAGE_CONFIG = this.SERVICE_CALC_SPECIAL_PAGE_CONFIGS.exec()

    /** Sort ưu tiên unread nếu cấu hình yêu cầu */
    const SORT =
      SPECIAL_PAGE_CONFIG?.sort_conversation === 'UNREAD'
        ? 'unread_message_amount:desc,last_message_time:desc'
        : undefined

    /**
     * Tạo filter bổ sung (OVERWRITE_FILTER)
     * → Các page đặc biệt chỉ được thấy hội thoại của chính họ
     */
    const OVERWRITE_FILTER: FilterConversation = {}

    if (
      SPECIAL_PAGE_CONFIG.is_only_visible_client_of_staff &&
      conversationStore.option_filter_page_data.conversation_type !== 'POST'
    ) {
      OVERWRITE_FILTER.staff_id = []

      /** Gộp nhiều staff_id vào filter */
      if (chatbotUserStore.chatbot_user?.user_id)
        OVERWRITE_FILTER.staff_id.push(chatbotUserStore.chatbot_user.user_id)

      if (chatbotUserStore.chatbot_user?.fb_staff_id)
        OVERWRITE_FILTER.staff_id.push(
          chatbotUserStore.chatbot_user.fb_staff_id
        )
    }

    try {
      /**
       * res = {
       *    conversation: Record<string, ConversationInfo>
       *    after?: number[]
       * }
       */
      let res: {
        conversation: Record<string, ConversationInfo>
        after?: number[]
      }

      /** AFTER_FOR_FETCH: lấy phần tử đầu tiên của after[] để phân trang */
      const AFTER_FOR_FETCH: number[] | undefined = after.value?.length
        ? [after.value[0]]
        : undefined

      /**
       * ----------------------------------------------------------------------------------
       *  MODE LOCAL (IndexedDB)
       * ----------------------------------------------------------------------------------
       */
      if (USE_LOCAL) {
        if (need_fetch_from_api.value) {
          const now = Date.now()

          /**
           * 1️ Lấy last_synced_at từ bảng meta để biết lần sync API gần nhất
           */
          const LAST_SYNC_META = await db.meta.get(
            `last_update_${PAGE_IDS?.[0]}`
          )
          const LAST_SYNCED_AT = LAST_SYNC_META?.value || 0

          /**
           * 2️ Lấy last_message_time mới nhất hiện đang có trong IndexedDB
           */

          /** Lấy conversation mới nhất theo page */
          const LAST_CONV = await db.conversations
            .where('fb_page_id')
            .equals(PAGE_IDS[0]) // hoặc lặp qua từng PAGE_IDS nếu muốn fetch incremental từng page
            .and(c => (c.last_message_time ?? 0) > 0)

            .reverse()
            .first()

          /** Lấy tạm data từ last message time */
          const LAST_MESSAGE_TIME = LAST_CONV?.last_message_time || 0

          /**
           * 3️⃣ Lấy mốc thời gian lớn nhất → là điểm bắt đầu incremental sync
           */
          const LAST_TIME = Math.max(LAST_SYNCED_AT, LAST_MESSAGE_TIME)

          /**
           * 4️⃣ Gọi API incremental:
           * Chỉ lấy các hội thoại mới/updated từ lastTime → now
           */
          try {
            // console.log('ádjflkajsdlfajsdlkfajdklfajdlfka')
            const INCREAMENTAL_RES =
              await this.API_CONVERSATION.readConversations(
                PAGE_IDS,
                orgStore.selected_org_id,
                {
                  ...conversationStore.option_filter_page_data,
                  ...OVERWRITE_FILTER,
                  time_range: { gte: LAST_TIME, lte: now },
                },
                100,
                SORT
              )
            // console.log('ládfjkladsflasdjfla')
            /** Nếu API trả về conversation mới → lưu vào IndexedDB ngay */
            if (
              INCREAMENTAL_RES?.conversation &&
              keys(INCREAMENTAL_RES.conversation).length
            ) {
              await db.saveManyFetch(INCREAMENTAL_RES.conversation)

              console.log(
                `🔥 Synced ${
                  keys(INCREAMENTAL_RES.conversation).length
                } new conversations BEFORE rendering`
              )
            }
          } catch (e) {
            console.error(
              'Failed to fetch incremental conversations from API:',
              e
            )
          } finally {
            /** Lưu lại thời gian sync để lần sau incremental nhanh hơn */
            // await db.meta.put({ key: 'last_synced_at', value: now })
            need_fetch_from_api.value = false
          }
        }
        /**
         * 5️⃣ Sau khi sync xong → đọc dữ liệu từ IndexedDB theo filter
         */
        res = await ChatAdapter.fetchConversations(
          PAGE_IDS,
          orgStore.selected_org_id,
          {
            ...conversationStore.option_filter_page_data,
            ...OVERWRITE_FILTER,
          },
          40,
          SORT,
          AFTER_FOR_FETCH
        )
      } else {
        /**
         * ----------------------------------------------------------------------------------
         *  🌐 MODE API DIRECT
         * ----------------------------------------------------------------------------------
         * Gọi API trực tiếp, không dùng IndexedDB
         */
        let apiRes = await this.API_CONVERSATION.readConversations(
          PAGE_IDS,
          orgStore.selected_org_id,
          { ...conversationStore.option_filter_page_data, ...OVERWRITE_FILTER },
          40,
          SORT,
          AFTER_FOR_FETCH
        )

        res = {
          conversation: apiRes.conversation || {},
          after: apiRes.after || [],
        }
      }

      /**
       * conversationStore trả về dạng object map → cần map thêm data_key
       */
      const CONVERSATIONS = res.conversation

      /** Nếu không còn conversation mới → báo hết phân trang */
      if (!size(CONVERSATIONS) || !res.after) is_done.value = true

      /** Sau mỗi lần fetch → cập nhật after[] để phân trang tiếp */
      after.value = res.after || []

      /**
       * Gán data_key → dùng để identify item khi merge vào store
       * Nếu page_id trùng client_id → loại bỏ (conversation rác)
       */
      mapValues(CONVERSATIONS, (conversation, key) => {
        conversation.data_key = key
        if (conversation.fb_page_id === conversation.fb_client_id)
          delete CONVERSATIONS[key]
      })

      /** Merge kết quả vào conversationStore */
      conversationStore.conversation_list = {
        ...conversationStore.conversation_list,
        ...CONVERSATIONS,
      }

      /** Lần đầu load → tự chọn conversation đầu tiên */
      if (is_first_time) $main.selectDefaultConversation(is_pick_first)
    } catch (e) {
      console.error('Error loading conversations:', e)
    } finally {
      /** Tắt loading dù thành công hay lỗi */
      is_loading_first.value = false
    }
  }

  /**
   * đếm số lượng hội thoại
   */
  @error()
  async countConversation(conversation_type: 'CHAT' | 'POST') {
    /** nếu đang mất mạng thì không cho gọi api */
    if (!commonStore.is_connected_internet) return

    /**danh sách id page */
    const PAGE_IDS = keys(pageStore.selected_page_id_list)
    /**cấu hình trang đặc biệt */
    const SPECIAL_PAGE_CONFIG = this.SERVICE_CALC_SPECIAL_PAGE_CONFIGS.exec()

    /**ghi đè 1 số lọc tin nhắn */
    const OVERWRITE_FILTER: FilterConversation = {}

    /** chỉ cho hiện hội thoại của nhân viên */
    if (SPECIAL_PAGE_CONFIG.is_only_visible_client_of_staff) {
      /** tạo ra filter nhân viên */
      OVERWRITE_FILTER.staff_id = []

      /** thêm id mới */
      if (chatbotUserStore.chatbot_user?.user_id)
        OVERWRITE_FILTER.staff_id?.push(chatbotUserStore.chatbot_user?.user_id)

      /** thêm id cũ, tránh lỗi */
      if (chatbotUserStore.chatbot_user?.fb_staff_id)
        OVERWRITE_FILTER.staff_id?.push(
          chatbotUserStore.chatbot_user?.fb_staff_id
        )
    }

    /**lấy dữ liệu hội thoại */
    const RES = await this.API_CONVERSATION.countConversation(PAGE_IDS, {
      ...conversationStore.option_filter_page_data,
      ...OVERWRITE_FILTER,
      conversation_type,
    })

    /** nếu là đếm số bài viết */
    if (conversation_type === 'POST') {
      conversationStore.count_conversation.post = RES || 0
    }

    /** nếu là đếm số hội thoại chat */
    if (conversation_type === 'CHAT') {
      conversationStore.count_conversation.chat = RES || 0
    }
  }

  /**xử lý socket conversation */
  onRealtimeUpdateConversation({ detail }: CustomEvent) {
    /** Nếu đang clear hoặc đang chuyển hội thoại thì bỏ qua socket update */
    if (
      conversationStore.is_clearing_conversation ||
      conversationStore.is_switching_conversation
    ) {
      return
    }
    console.log('on Realtime Update hahahahahahah')
    /** nếu không có dữ liệu thì thôi */
    if (!detail) return

    /** nạp dữ liệu */
    let { conversation, event } = detail
    /**danh sách hội thoại */
    let conversation_list = conversationStore.conversation_list

    /** nếu không có dữ liệu hội thoại thì thôi */
    if (!conversation) return

    /** nếu không đúng tab thì bỏ qua */
    if (
      (conversation?.conversation_type || 'CHAT') !==
      (conversationStore.option_filter_page_data?.conversation_type || 'CHAT')
    )
      return

    /**cấu hình trang đặc biệt */
    const SPECIAL_PAGE_CONFIG = this.SERVICE_CALC_SPECIAL_PAGE_CONFIGS.exec()

    /** lọc các hội thoại không phải của nv này nếu cần */
    if (
      /** chỉ chạy với dạng chat */
      conversationStore.option_filter_page_data?.conversation_type !== 'POST' &&
      /** phải bật thiết lập */
      SPECIAL_PAGE_CONFIG?.is_only_visible_client_of_staff &&
      /** dùng cả id cũ và mới */
      !(
        conversation?.user_id === chatbotUserStore.chatbot_user?.user_id ||
        conversation?.fb_staff_id === chatbotUserStore.chatbot_user?.fb_staff_id
      )
    )
      return

    /** bỏ qua record của page chat cho page */
    if (conversation.fb_page_id === conversation.fb_client_id) return

    /** tạo ra key cho vitual scroll */
    conversation.data_key = `${conversation?.fb_page_id}_${conversation?.fb_client_id}`

    /**
     * nếu dữ liệu được socket chính là hội thoại đang chọn, thì làm mới dữ liệu
     * được chọn
     * map từng field để hàm watch store ở những chỗ khác không nhận
     */
    if (
      conversationStore.select_conversation?.data_key === conversation.data_key
    ) {
      /** làm mới dữ liệu được chọn */
      this.refreshConversation(conversation)

      /** làm mới thời gian nhân viên hiện tại đọc tin nhắn */
      this.hardRenewCurrentStaffRead()
    }
    console.log('111111')
    /** không đẩy hội thoại lên đầu nếu */
    if (
      /** nếu thời gian giống nhau, thì cũng không thay đổi vị trí */
      conversation?.last_message_time ===
        conversation_list[conversation.data_key]?.last_message_time ||
      /** nếu chỉ đồng bộ dữ liệu thì không đẩy hội thoại lên đầu */
      event === 'SYNC_DATA' ||
      /** nếu sort chưa đọc lên đầu và là tin của page */
      (SPECIAL_PAGE_CONFIG?.sort_conversation === 'UNREAD' &&
        conversation?.last_message_type === 'page')
    ) {
      console.log('22222222')
      /**
       * 1. Có socket
       * 2. Lọc không phản hồi + client hoặc Các trạng thái khác
       */
      if (
        !conversationStore.option_filter_page_data.not_response_client ||
        (conversationStore.option_filter_page_data.not_response_client &&
          conversation?.last_message_type === 'client')
      ) {
        /** Cập nhật tin nhắn bình thường */
        conversation_list[conversation.data_key] = conversation
      } else {
        /**
         * Nếu hội thoại đang chọn khác tin nhắn socket
         * KHÁC CONVERSATION
         * */
        if (
          conversationStore.select_conversation?.fb_client_id !==
          conversation.fb_client_id
        ) {
          /** Xoá dữ liệu cũ khỏi conversation_list */
          delete conversation_list[conversation.data_key]

          /** Nạp lại store (với dữ liệu đã xoá) */
          conversationStore.conversation_list = { ...conversation_list }
        } else {
          /** GIỐNG CONVERSATION */

          /** Nếu giống thì gán dữ liệu  */
          conversationStore.selected_client_id = conversation.fb_client_id

          /** xoá dữ liệu cũ */
          delete conversation_list[conversation.data_key]

          /** thêm dữ liệu mới lên đầu của obj */
          conversation_list = {
            [conversation.data_key]: conversation,
            ...conversation_list,
          }

          /** nạp lại store */
          conversationStore.conversation_list = conversation_list
        }
      }
    } else {
      console.log('33333')
      /** nạp dữ liệu vào danh sách hội thoại lên đầu */
      /**
       * Check xem có đang filter không, có phải từ cient không
       */
      if (
        !conversationStore.option_filter_page_data.not_response_client ||
        (conversationStore.option_filter_page_data.not_response_client &&
          conversation?.last_message_type === 'client')
      ) {
        console.log('444444444')
        /** xoá dữ liệu cũ */
        delete conversation_list[conversation.data_key]

        console.log(conversation_list, 'length')

        /** thêm dữ liệu mới lên đầu của obj */
        conversation_list = {
          [conversation.data_key]: conversation,
          ...conversation_list,
        }
        console.log('5555555555')
        /** nạp lại store */
        conversationStore.conversation_list = conversation_list

        /** Nếu giống thì gán dữ liệu  */
        conversationStore.selected_client_id = undefined
      } else {
        console.log('......')
      }
    }
  }
  /**
   * - hàm này dùng để ghi đè thời gian nhân viên hiện tại đọc tin nhắn mới này
   * thành hiện tại
   * - để tránh lỗi user hiện tại nhắn thêm tin, nhưng avatar user đọc tin nhắn
   * vẫn ở các tin trước đó (do giá trị read chỉ được update khi click vào hội
   * thoại, nó chưa được làm mới, socket vẫn trả về giá trị cũ) -> cần set lại
   * thủ công
   * => muốn chuẩn hơn, cần fix ở backend, khi user gửi tin nhắn thành công, thì
   * update staff_read của user đó, trước khi socket
   */
  hardRenewCurrentStaffRead() {
    // nếu chưa chọn hội thoại nào thì thôi
    if (!conversationStore.select_conversation) return

    // nếu không có id nhân viên hiện tại thì thôi
    if (!chatbotUserStore.chatbot_user?.user_id) return

    // nạp thời gian đọc tin nhắn mới
    set(
      conversationStore.select_conversation,
      ['staff_read', chatbotUserStore.chatbot_user?.user_id],
      new Date().getTime()
    )
  }
  /**đọc danh sách hội thoại lần đầu tiên */
  async loadConversationFirstTime(
    is_first_time?: boolean,
    is_count_conversation?: boolean,
    is_pick_first?: boolean
  ) {
    // nếu có đếm hội thoại thì reset các giá trị
    if (is_count_conversation) {
      conversationStore.count_conversation = {
        chat: 0,
        post: 0,
      }
    }

    /** reset data */
    conversationStore.conversation_list = {}

    /** reset phân trang */
    after.value = undefined

    /** reset trạng thái load */
    is_done.value = false

    await this.getConversation(is_first_time, is_pick_first)

    /** nếu không cần đếm hội thoại thì thôi */
    if (!is_count_conversation) return

    /** lấy số lượng các hội thoại chat */
    await this.countConversation('CHAT')

    /** lấy số lượng các hội thoại zalo */
    await this.countConversation('POST')
  }
  /**tự động chọn một khách hàng để hiển thị danh sách tin nhắn */
  selectDefaultConversation(is_pick_first?: boolean) {
    /** nếu ở chế độ lọc chưa đọc thì thôi */
    if (conversationStore.option_filter_page_data?.unread_message) return

    // tự động focus vào input chat
    // đơi nửa giây cho div được render
    // setTimeout(() => {
    //   document.getElementById('chat-text-input-message')?.focus()
    // }, 500)

    /** lấy id hội thoại trên param */
    let page_id: string
    let user_id: string

    /** chọn hội thoại đầu tiên */
    if (is_pick_first) {
      /** reset lại hội thoại đang chọn */
      conversationStore.select_conversation = undefined

      /** reset lại widget */
      pageStore.widget_list = []

      /** lấy phần tử đầu tiên của hội thoại từ store */
      const FIRST_CONVERSATION = map(conversationStore.conversation_list)?.[0]

      /** nạp id */
      page_id = FIRST_CONVERSATION?.fb_page_id
      user_id = FIRST_CONVERSATION?.fb_client_id

      /** đặt lại param */
      setParamChat($router, page_id, user_id)
    } else {
      /** chọn hội thoại theo param */
      page_id = ($route.query?.p || $route.query?.page_id) as string
      user_id = ($route.query?.u || $route.query?.user_id) as string
    }

    /** nếu id page của hội thoại không được chọn thì thôi */
    if (page_id && !pageStore.selected_page_id_list?.[page_id]) return

    /** key của hội thoại */
    let data_key = `${page_id}_${user_id}`

    /** tìm kiếm hội thoại thoả mãn param */
    let target_conversation = find(
      conversationStore.conversation_list,
      (conversation, key) => {
        return data_key === key
      }
    )

    /**dữ liệu hội thoại tìm được */
    let conversation: ConversationInfo | undefined
    waterfall(
      [
        /** * verify input */
        (cb: CbError) => {
          /** nếu không có id khách hàng thì thôi */
          if (!page_id || !user_id) return cb(true)

          /** nếu đã tìm thấy khách hàng rồi thì thôi */
          if (target_conversation) return cb(true)

          cb()
        },
        /** * tìm đến hội thoại */
        (cb: CbError) =>
          read_conversation(
            {
              page_id: [page_id as string],
              client_id: user_id as string,
              limit: 1,
            },
            (e, r) => {
              if (e) return cb(e)

              /** dữ liệu của hội thoại tìm được */
              const CONVERSATION = r?.conversation?.[data_key]

              /** id của nhân sự hiện tại */
              const CURRENT_STAFF_ID =
                chatbotUserStore.chatbot_user?.user_id ||
                conversationStore.select_conversation?.fb_staff_id

              /** trạng thái của tài khoản hiện tại có phải là admin hay ko? */
              const IS_ADMIN = conversationStore.isCurrentStaffAdmin()

              // nếu bật chỉ hiện hội thoại với nhân viên được assign và
              // id hiện tại không phải của nhân sự đó và
              // không phải admin thì dừng lại
              if (
                orgStore.selected_org_info?.org_config
                  ?.org_is_only_visible_client_of_staff &&
                CONVERSATION?.fb_staff_id !== CURRENT_STAFF_ID &&
                !IS_ADMIN
              ) {
                cb()
              }

              conversation = r?.conversation?.[data_key]
              cb()
            }
          ),
        /** * thêm hội thoại vào danh sách và pick chọn */
        (cb: CbError) => {
          if (!conversation) return cb(true)

          /** chọn khách hàng đã tìm được */
          target_conversation = {
            ...conversation,
            data_key,
          }

          /** thêm khách hàng vào list khách hàng */
          let temp: ConversationList = {}
          temp[data_key] = target_conversation

          conversationStore.conversation_list = {
            ...conversationStore.conversation_list,
            ...temp,
          }

          cb()
        },
      ],
      e => {
        /** nếu không tìm thấy thì lấy hội thoại đầu tiên */
        if (!target_conversation) {
          target_conversation = map(conversationStore.conversation_list)?.[0]

          /** đẩy id lên param */
          setParamChat(
            $router,
            target_conversation?.fb_page_id,
            target_conversation?.fb_client_id
          )
        }

        selectConversation(
          target_conversation,
          /** nếu đang tìm kiếm thì không tự động select input chat nữa */
          !!conversationStore.option_filter_page_data?.search
        )
      }
    )
  }
  /**load thêm hội thoại khi lăn chuột xuống cuối */
  // loadMoreConversation($event: UIEvent) {
  //   /**sẽ scroll khi đã đi được số phần trăm trên độ dài  */
  //   const PERCENT_SCROLL = 90

  //   /**div đang scroll */
  //   const TARGET: HTMLDivElement = $event.target as HTMLDivElement

  //   /**khoảng cách scroll với bottom */
  //   let padBehind =
  //     TARGET?.scrollHeight - TARGET?.scrollTop - TARGET?.clientHeight

  //   if (
  //     !padBehind ||
  //     padBehind > TARGET?.scrollHeight * (1 - PERCENT_SCROLL / 100) || // khi đạt mốc 70% scroll thì load thêm dữ liệu
  //     is_loading.value || // chỉ load thêm khi không có tiến trình khác đang load
  //     is_done.value // nếu đã hết dữ liệu thì không load nữa
  //   )
  //     console.log('load more')

  //   return this.getConversation()
  // }

  loadMoreConversation($event: UIEvent) {
    const target = $event.target as HTMLDivElement
    const PERCENT_SCROLL = 70
    const padBehind =
      target.scrollHeight - target.scrollTop - target.clientHeight
    console.log(padBehind, is_loading.value, is_done.value)
    if (
      !padBehind ||
      padBehind > target.scrollHeight * (1 - PERCENT_SCROLL / 100) ||
      is_loading.value ||
      is_done.value
    )
      return

    console.log('load more triggered')
    this.getConversation()
  }

  /**
   * tự động reload lại trang nếu người dùng focus lại tab sau một khoảng thời
   * gian lớn (VD: 3 tiếng)
   */
  autoRefreshPage() {
    /** nếu thời gian focus vào tab dưới 3 tiếng thì thôi */
    if (differenceInHours(new Date(), mounted_time.value) < 3) return

    /** reload lại trang */
    location.reload()
  }
}
const $main = new Main()

/** khi component được render */
onMounted(() => {
  /** lắng nghe sự kiện socket */
  window.addEventListener(
    'chatbox_socket_conversation',
    $main.onRealtimeUpdateConversation.bind($main)
  )

  /** lưu thời gian render hiện tại */
  mounted_time.value = new Date()

  /** lắng nghe sự kiện focus vào tab */
  window.addEventListener('focus', $main.autoRefreshPage.bind($main))
})
/** khi component bị xoá */
onUnmounted(() => {
  /** khi thoát khỏi component này thì xoá dữ liệu hội thoại hiện tại */
  conversationStore.conversation_list = {}

  /** xoá sự kiện socket */
  window.removeEventListener(
    'chatbox_socket_conversation',
    $main.onRealtimeUpdateConversation.bind($main)
  )

  /** xoá sự kiện focus vào tab */
  window.removeEventListener('focus', $main.autoRefreshPage.bind($main))
})

/** khi thay đổi giá trị lọc tin nhắn(trừ field conversation_type) thì load lại dữ liệu */
watch(
  () => option_filter_page_data.value,
  (new_val, old_val) => {
    $main.loadConversationFirstTime(true, true, true)
  },
  { deep: true }
)

/** lắng nghe thay đổi loại hội thoại */
watch(
  () => conversationStore.option_filter_page_data?.conversation_type,
  () => $main.loadConversationFirstTime(true, false, true)
)

/** khi có data page được chọn thì tính toán danh sách conversation */
watch(
  () => pageStore.selected_page_list_info,
  () => $main.loadConversationFirstTime(true, true)
)
/** khi thay đổi hội thoại, nếu hội thoại trước đó còn tin nhắn chưa đọc thì reset */
watch(
  () => conversationStore.select_conversation,
  (new_val, old_val) => {
    /** nếu cùng một hội thoại thì thôi */
    if (new_val?.data_key === old_val?.data_key) return

    /** nếu không có hội thoại trước đó thì thôi */
    if (!old_val?.data_key) return

    /** nếu người dùng cố tình đánh dấu tin nhắn chưa đọc thì thôi */
    if (old_val?.is_force_unread) return

    /** nếu tin nhắn của hội thoại trước đó đã đọc thì thôi */
    if (
      !conversationStore.conversation_list[old_val.data_key]
        ?.unread_message_amount
    )
      return

    /** reset tin nhắn chưa đọc trên biến */
    if (conversationStore.conversation_list[old_val.data_key])
      conversationStore.conversation_list[
        old_val.data_key
      ].unread_message_amount = 0

    /** gọi api xoá trên backend */
    reset_read_conversation(
      {
        page_id: old_val?.fb_page_id,
        client_id: old_val?.fb_client_id,
      },
      (e, r) => {
        if (e) return toastError(e)
      }
    )
  }
)

defineExpose({
  loadConversationFirstTime: $main.loadConversationFirstTime.bind($main),
})
</script>
