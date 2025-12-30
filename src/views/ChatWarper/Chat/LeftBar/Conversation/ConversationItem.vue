<template>
  <button
    @click="$main.clickConversation()"
    :class="{
      'bg-slate-200': $main.isSelectThisClient(),
    }"
    class="flex items-center hover:bg-slate-200 w-full group rounded-xl px-2 py-3 gap-3"
  >
    <ClientAvatar :source="source" />
    <span>{{ index }}</span>
    <div class="flex flex-col gap-0.5 flex-grow min-w-0 relative">
      <ClientName :source="source" />
      <LastMessage :source="source" />
      <ClientSupport :source="source" />
      <hr
        v-if="!$main.isSelectThisClient()"
        class="absolute w-full -bottom-3.5 group-hover:hidden"
      />
    </div>
  </button>
</template>
<script setup lang="ts">
import {
  usePageStore,
  useCommonStore,
  useConversationStore,
  useMessageStore,
  useExtensionStore,
} from '@/stores'
import { useRouter } from 'vue-router'
import { selectConversation, setParamChat } from '@/service/function'
import { getFbUserInfo } from '@/service/helper/ext'

import ClientAvatar from '@/views/ChatWarper/Chat/LeftBar/Conversation/ClientAvatar.vue'
import ClientName from '@/views/ChatWarper/Chat/LeftBar/Conversation/ClientName.vue'
import LastMessage from '@/views/ChatWarper/Chat/LeftBar/Conversation/LastMessage.vue'
import ClientSupport from '@/views/ChatWarper/Chat/LeftBar/Conversation/ClientSupport.vue'

import type { ConversationInfo } from '@/service/interface/app/conversation'
import { findIndex, forEach, keys, pickBy, values, zipObject } from 'lodash'
import {
  CalcSpecialPageConfigs,
  type ICalcSpecialPageConfigs,
} from '@/utils/helper/Conversation/CalcSpecialPageConfigs'
import { container } from 'tsyringe'
import { db } from '@/db/ChatDB'

/**dữ liệu của item */
interface IConversationItem extends ConversationInfo {
  /**đánh dấu hội thoại này sẽ bị đẩy xuống ở lần tới */
  is_go_down?: boolean
}

const $props = withDefaults(
  defineProps<{
    source?: ConversationInfo
    index?: number
  }>(),
  {}
)
/** Khai báo các store */
const $router = useRouter()
const pageStore = usePageStore()
const commonStore = useCommonStore()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const extensionStore = useExtensionStore()

class Main {
  /**
   * @param SERVICE_CALC_SPECIAL_PAGE_CONFIGS tính toán cấu hình trang đặc biệt
   */
  constructor(
    private readonly SERVICE_CALC_SPECIAL_PAGE_CONFIGS: ICalcSpecialPageConfigs = container.resolve(
      CalcSpecialPageConfigs
    )
  ) {}

  /**tìm index của hội thoại đầu tiên đã đọc */
  private findFirstReadMessageIndex() {
    /**danh sách hội thoại */
    const CONVERSATIONS = conversationStore.conversation_list
    /**lấy key của danh sách hội thoại */
    const CONVERSATION_KEYS = keys(CONVERSATIONS)

    /**tìm index của hội thoại đầu tiên đã đọc */
    let index = findIndex(CONVERSATION_KEYS, key => {
      /**số lượng tin chưa đọc */
      const COUNT_UNREAD = CONVERSATIONS?.[key]?.unread_message_amount

      /** lấy hội thoại đã đọc */
      return !COUNT_UNREAD
    })

    /** nếu không tìm được thì cho xuống cùng */
    if (index < 0) index = CONVERSATION_KEYS?.length

    /** trả về vị trí */
    return index
  }
  /**thêm item vào danh sách hội thoại theo vị trí */
  private addItemToConversationsByIndex(
    data_key: string,
    conversation: ConversationInfo,
    index: number
  ) {
    /**danh sách hội thoại */
    const CONVERSATIONS = conversationStore.conversation_list
    /**lấy key của danh sách hội thoại */
    const CONVERSATION_KEYS = keys(CONVERSATIONS)
    /**lấy value của danh sách hội thoại */
    const CONVERSATION_VALUES = values(CONVERSATIONS)

    /** thêm key vào vị trí index */
    CONVERSATION_KEYS.splice(index, 0, data_key)
    /** thêm value vào vị trí index */
    CONVERSATION_VALUES.splice(index, 0, conversation)

    /** ghi đè danh sách hội thoại mới */
    conversationStore.conversation_list = zipObject(
      CONVERSATION_KEYS,
      CONVERSATION_VALUES
    )
  }

  /**click chuột vào 1 khách hàng */
  async clickConversation() {
    /** nếu không có key thì không cho click */
    if (
      !$props.source?.fb_page_id ||
      !$props.source?.fb_client_id ||
      !$props.source?.data_key
    )
      return
    /** Đánh dấu đang chuyển hội thoại */
    conversationStore.is_switching_conversation = true
    /**dữ liệu hội thoại */
    const CONVERSATION: IConversationItem = $props.source
    /**hội thoại cũ */
    const OLD_CONVERSATION: IConversationItem | undefined =
      conversationStore.select_conversation

    /** ẩn mũi tên scroll bottom */
    messageStore.is_show_to_bottom = false

    /**cấu hình trang đặc biệt */
    const SPECIAL_PAGE_CONFIG = this.SERVICE_CALC_SPECIAL_PAGE_CONFIGS.exec()

    /**xóa các conversation có client_id trùng với client_id vừa phản hồi nếu có phải là case chưa phản hồi */
    if (
      conversationStore.option_filter_page_data.not_response_client &&
      conversationStore.selected_client_id &&
      conversationStore.selected_client_id !== CONVERSATION.fb_client_id
    ) {
      /** Bắt đầu clear hội thoại */
      conversationStore.is_clearing_conversation = true

      /** Tìm client trong danh sách hội thoại */
      const SELECTED_CLIENT_ID = conversationStore.selected_client_id

      /** Tìm tất cả key cần xóa*/
      const KEYS_REMOVE = keys(conversationStore.conversation_list).filter(
        key => key.split('_')[1] === SELECTED_CLIENT_ID
      )

      /** Xóa từng key */
      // forEach(KEYS_REMOVE, key => {
      //   /** Xóa khỏi danh sách hội thoại */
      //   delete conversationStore.conversation_list[key]
      // })

      /** Xóa từng key (theo cách reactive đúng của Vue 3) */
      const OLD_LIST = { ...conversationStore.conversation_list }
      forEach(KEYS_REMOVE, key => {
        delete OLD_LIST[key]
      })

      /** đổi reference để Vue nhận thay đổi */
      conversationStore.conversation_list = { ...OLD_LIST }
      /** Reset selected_client_id  */
      conversationStore.selected_client_id = undefined

      /** Sau khi xóa xong, reset cờ sau 200ms (đủ thời gian chặn socket) */
      setTimeout(() => {
        conversationStore.is_clearing_conversation = false
      }, 200)
    }

    /** đánh dấu hội thoại này sẽ bị đẩy xuống vào lần tới nếu */
    if (
      /** đang bật chế độ sắp xếp hội thoại chưa đọc lên đầu */
      SPECIAL_PAGE_CONFIG?.sort_conversation === 'UNREAD' &&
      /** hội thoại này có tin nhắn chưa đọc (đang ở trên đầu) */
      CONVERSATION?.unread_message_amount &&
      /** không phải chế độ lọc chưa đọc (vì sẽ xóa luôn) */
      !conversationStore.option_filter_page_data?.unread_message
    ) {
      /** gắn cờ */
      CONVERSATION.is_go_down = true
    }
    /**
     * 1. Check nếu không lọc chưa phản hồi
     * 2. Nếu lọc phản hồi, phải là page phản hồi
     */
    if (
      conversationStore.option_filter_page_data.not_response_client &&
      conversationStore.selected_client_id &&
      conversationStore.selected_client_id !== CONVERSATION.fb_client_id
    ) {
      /** nếu hội thoại trước đó được gắn cờ đi xuống */
      if (OLD_CONVERSATION?.is_go_down && OLD_CONVERSATION?.data_key) {
        /** xóa cờ */
        delete OLD_CONVERSATION.is_go_down

        /** xóa hội thoại khỏi vị trí cũ (trên đầu) */
        delete conversationStore.conversation_list?.[OLD_CONVERSATION?.data_key]

        /**index của hội thoại đầu tiên đã đọc */
        const NEW_INDEX = this.findFirstReadMessageIndex()

        /** đẩy hội thoại xuống vị trí mới (dưới các hội thoại chưa đọc) */
        this.addItemToConversationsByIndex(
          OLD_CONVERSATION?.data_key,
          OLD_CONVERSATION,
          NEW_INDEX
        )
      }
    }

    /** logic chọn hội thoại mới */
    selectConversation(CONVERSATION)
    /** Nếu có conversation id */
    if (CONVERSATION.id) {
      await db.conversations.update(CONVERSATION.id, {
        unread_message_amount: 0,
      })
    }
    /** xóa hội thoại trước đó khỏi danh sách nếu */
    if (
      /** đang ở chế độ lọc chưa đọc */
      conversationStore.option_filter_page_data?.unread_message &&
      /** có hội thoại trước đó */
      OLD_CONVERSATION?.data_key &&
      /** không tự click vào chính mình */
      OLD_CONVERSATION?.data_key !== CONVERSATION?.data_key
    ) {
      /** xóa hội thoại khỏi vị trí */
      delete conversationStore.conversation_list?.[OLD_CONVERSATION?.data_key]
    }

    /** đẩy id lên param */
    setParamChat($router, CONVERSATION?.fb_page_id, CONVERSATION?.fb_client_id)
    /** Trạng thái đổi conversation */
    setTimeout(() => {
      conversationStore.is_switching_conversation = false
      /** 300ms đủ để socket đẩy xong event cũ */
    }, 300)

    /** lấy uid và thông tin khách hàng */
    this.triggerExtension()
  }
  /**gọi ext để lấy uid và thông tin khách hàng */
  triggerExtension() {
    /** không chạy với dạng hội thoại post */
    if ($props.source?.conversation_type === 'POST') return

    /** chỉ chạy với trang FB */
    if (conversationStore.getPage()?.type !== 'FB_MESS') return

    /** nếu không có key thì không cho click */
    if (
      !$props.source?.fb_page_id ||
      !$props.source?.fb_client_id ||
      !$props.source?.data_key
    )
      return

    /** tìm uid fb nếu chưa có và đang bật ext */
    if (
      commonStore.extension_status === 'FOUND' &&
      (!$props.source?.client_bio?.fb_uid ||
        !$props.source?.client_bio?.fb_info)
    ) {
      /** nếu chưa có uid thì gắn cờ đang quét uid */
      if (!$props.source?.client_bio?.fb_uid)
        extensionStore.is_find_uid[$props.source?.data_key] = true
      /** nếu chưa có thông tin khách hàng thì gắn cờ đang quét thông tin khách hàng */
      if (!$props.source?.client_bio?.fb_info)
        extensionStore.is_find_client_info[$props.source?.data_key] = true

      /** quá 10s thì thôi không loading nữa */
      setTimeout(() => {
        /** tắt cờ đang quét uid */
        extensionStore.is_find_uid[$props.source?.data_key!] = false
        /** tắt cờ đang quét thông tin khách hàng */
        extensionStore.is_find_client_info[$props.source?.data_key!] = false
      }, 10000)

      /** gọi ext để lấy uid và thông tin khách hàng */
      getFbUserInfo(
        $props.source?.platform_type,
        $props.source?.fb_page_id,
        $props.source?.fb_client_id,
        pageStore?.selected_page_list_info?.[$props.source?.fb_page_id]?.page
          ?.fb_page_token
      )
    }
  }
  /**kiểm tra xem có đang chọn khách này không */
  isSelectThisClient() {
    return (
      $props.source?.data_key ===
      conversationStore.select_conversation?.data_key
    )
  }
}
const $main = new Main()
</script>
