<template>
  <Modal
    ref="modal_widget__group_share_ref"
    class_modal="w-[80dvw]"
    :class_body="`flex flex-col gap-2 ${
      view === 'SEARCH' || !view ? 'h-[90dvh]' : 'h-[80dvh]'
    }`"
  >
    <template #header>
      {{ $t('v1.common.share_message') }}
    </template>

    <template #body>
      <div class="flex gap-2 overflow-hidden h-full">
        <div class="bg-white h-full w-1/2 rounded-md p-2 flex flex-col gap-2">
          <!-- Search member -->
          <div class="relative">
            <MagnifyingGlassIcon
              class="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-slate-500"
            />
            <input
              v-model="search_conversation"
              class="w-full bg-slate-100 placeholder-slate-500 py-1.5 pl-9 pr-8 text-sm rounded-md"
              type="text"
              :placeholder="$t('v1.common.search_member')"
            />
            <XMarkIcon
              @click="search_conversation = undefined"
              v-if="search_conversation"
              class="absolute top-1/2 right-2 -translate-y-1/2 size-5 text-red-500 cursor-pointer"
            />
          </div>

          <!-- Selected info -->
          <!-- <div class="flex w-full gap-2 items-center justify-between text-xs">
            <span
              class="p-0.5 px-2 bg-blue-50 text-blue-700 font-semibold rounded-md"
            >
              {{ $t('v1.common.member_selected') }}
              {{ selected_members.length }}
            </span>
          </div> -->
          <div
            class="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer"
            @click="select_all()"
          >
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                :checked="
                  selected_members.length === FILTERED_CONVERSATION.length
                "
                class="h-4 w-4 text-blue-600 flex-shrink-0"
              />

              <div>
                <p class="text-sm font-medium flex items-center gap-1">
                  <span
                    class="flex text-xs justify-center items-center flex-shrink-0 h-5 rounded-full p-1 bg-blue-50 text-blue-700"
                  >
                    {{ $t('v1.common.select_all') }}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <!-- List conversation -->
          <div
            class="flex flex-col overflow-y-auto border-t border-slate-200 pt-2 h-full"
          >
            <div
              v-for="(conv, index) in FILTERED_CONVERSATION"
              :key="conv.fb_client_id + '_' + conv.fb_page_id"
              class="flex items-center justify-between p-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              @click="toggleMember(conv)"
            >
              <div class="flex items-center gap-4 flex-1 min-w-0">
                <input
                  type="checkbox"
                  :checked="selected_members.includes(conv)"
                  class="h-4 w-4 text-blue-600 flex-shrink-0"
                />
                <!-- <img
                  :src="conv.client_avatar"
                  alt=""
                  class="size-10 rounded-full"
                /> -->
                <ClientAvatar :source="conv" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1">
                    <span
                      class="flex text-xs justify-center items-center flex-shrink-0 h-5 rounded-full p-1 bg-blue-50 text-blue-700"
                    >
                      {{ index + 1 }}
                    </span>
                    <p class="text-sm font-medium truncate">
                      {{ conv.client_name }}
                    </p>
                  </div>
                  <p class="text-xs text-slate-500 line-clamp-1">
                    {{ conv.last_message || '-' }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-if="FILTERED_CONVERSATION.length === 0"
              class="p-2 text-slate-400 text-sm"
            >
              {{ $t('v1.common.no_data') }}
            </div>
          </div>

          <div class="flex flex-col gap-2 text-sm">
            <div>
              {{ $t('v1.common.sharing_content') }}:
              <span
                v-if="sending_media.length > 0 && sending_media?.[0].type"
                >{{ $t('v1.common.attachments') }}</span
              >
            </div>
            <div>
              <div>
                <textarea
                  v-model="sending_message"
                  class="w-full border border-slate-200 h-20 rounded-md p-2 placeholder-slate-500"
                  :placeholder="$t('v1.common.enter_sharing_content')"
                />
              </div>
            </div>
            <!-- Thông báo cảnh báo khi có attachment không phải image -->
            <div
              v-if="
                sending_media.length > 0 &&
                sending_media.some(m => m.type && m.type !== 'image')
              "
              class="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-md p-2"
            >
              ⚠️ Chỉ hỗ trợ chia sẻ tin nhắn text và hình ảnh. Các file video,
              audio, document sẽ không được gửi.
            </div>
          </div>
        </div>
        <div
          class="bg-white h-full w-1/2 rounded-md p-2 flex flex-col justify-between"
        >
          <!-- Selected info -->
          <div
            class="flex w-full gap-2 items-center justify-between text-xs pb-2 border-b border-slate-100"
          >
            <span
              class="flex items-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 text-sm font-semibold rounded-md w-full justify-between"
            >
              <span>
                {{ $t('v1.common.selected') }}
                ({{ displayed_members.length }})
              </span>
              <span>
                <XMarkIcon
                  @click="selected_members = []"
                  v-if="selected_members.length > 0"
                  class="size-5 text-red-500 cursor-pointer hover:bg-red-100 rounded-full"
                />
              </span>
            </span>
          </div>

          <!-- List conversation -->
          <div class="flex flex-col overflow-y-auto py-2 h-full">
            <div
              v-for="conv in displayed_members"
              :key="conv.fb_client_id + '_' + conv.fb_page_id"
              class="flex flex-col p-2 border-b border-slate-100"
              :class="{
                'hover:bg-slate-50': !is_sharing,
                'bg-slate-50': is_sharing,
              }"
            >
              <!-- Thông tin member -->
              <div
                class="flex items-center gap-4"
                :class="{ 'cursor-pointer': !is_sharing }"
                @click="!is_sharing && toggleMember(conv)"
              >
                <!-- Checkbox cho Selection Mode -->
                <input
                  v-if="
                    selected_members.length > 0 || sent_members.length === 0
                  "
                  type="checkbox"
                  :checked="selected_members.includes(conv)"
                  :disabled="is_sharing"
                  class="h-4 w-4 text-blue-600 flex-shrink-0"
                  :class="{ 'opacity-50 cursor-not-allowed': is_sharing }"
                />

                <!-- Icon Check xanh cho Sent Mode -->
                <CheckCircleIcon
                  v-else
                  class="h-5 w-5 text-green-500 flex-shrink-0"
                />

                <ClientAvatar :source="conv" />
                <div class="flex-1">
                  <p class="text-sm font-medium line-clamp-1">
                    {{ conv.client_name }}
                  </p>
                  <p class="text-xs text-slate-500 line-clamp-1">
                    {{ conv.last_message || '-' }}
                  </p>
                </div>
              </div>

              <!-- Trạng thái chia sẻ (hiển thị ở dưới) -->
              <div
                v-if="
                  display_status_map.has(
                    `${conv.fb_client_id}_${conv.fb_page_id}`
                  )
                "
                class="ml-14 mt-2"
              >
                <!-- Not Sent -->
                <div
                  v-if="
                    display_status_map.get(
                      `${conv.fb_client_id}_${conv.fb_page_id}`
                    ) === 'not_sent'
                  "
                  class="text-xs text-slate-500 flex items-center gap-1 py-1 px-2 bg-slate-50 rounded-md w-fit"
                >
                  <svg
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke-width="2"
                      stroke-dasharray="2 2"
                    ></circle>
                  </svg>
                  Chưa gửi
                </div>

                <!-- Pending -->
                <div
                  v-else-if="
                    display_status_map.get(
                      `${conv.fb_client_id}_${conv.fb_page_id}`
                    ) === 'pending'
                  "
                  class="text-xs text-slate-400 flex items-center gap-1 py-1 px-2 bg-slate-100 rounded-md w-fit"
                >
                  <svg
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke-width="2"
                    ></circle>
                  </svg>
                  Đang chờ...
                </div>

                <!-- Sending -->
                <div
                  v-else-if="
                    display_status_map.get(
                      `${conv.fb_client_id}_${conv.fb_page_id}`
                    ) === 'sending'
                  "
                  class="text-xs text-blue-600 flex items-center gap-1 py-1 px-2 bg-blue-50 rounded-md w-fit"
                >
                  <svg
                    class="animate-spin size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {{ $t('v1.common.sending_message') }}
                </div>

                <!-- Success -->
                <div
                  v-else-if="
                    display_status_map.get(
                      `${conv.fb_client_id}_${conv.fb_page_id}`
                    ) === 'success'
                  "
                  class="text-xs text-green-600 flex items-center gap-1 py-1 px-2 bg-green-50 rounded-md w-fit"
                >
                  <svg
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  {{ $t('v1.common.sent_success') }}
                </div>

                <!-- Error -->
                <div
                  v-else-if="
                    display_status_map.get(
                      `${conv.fb_client_id}_${conv.fb_page_id}`
                    ) === 'error'
                  "
                  class="text-xs text-red-600 flex items-center gap-1 py-1 px-2 bg-red-50 rounded-md w-fit"
                >
                  <svg
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                  {{ $t('v1.common.sent_failed') }}
                </div>
              </div>
            </div>

            <div
              v-if="FILTERED_CONVERSATION.length === 0"
              class="p-2 text-slate-400 text-sm"
            >
              {{ $t('v1.common.no_data') }}
            </div>
          </div>

          <!-- Selected info -->
          <div
            class="flex flex-col w-full gap-2 items-center justify-center text-xs w-full pt-2"
          >
            <!-- Progress bar khi đang gửi (ẩn đi) -->
            <div
              v-if="false"
              class="w-full"
            >
              <div class="flex justify-between text-xs text-slate-600 mb-1">
                <span>{{ $t('v1.common.sending_message') }}</span>
                <span>{{ shared_count }}/{{ total_share }}</span>
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2">
                <div
                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  :style="{
                    width: `${(shared_count / total_share) * 100}%`,
                  }"
                ></div>
              </div>
            </div>

            <!-- Nút Share -->
            <button
              @click="shareMessage()"
              class="py-2 px-4 font-medium text-base rounded-md transition-all"
              :class="[
                selected_members.length === 0 || is_sharing || has_sent_messages
                  ? 'cursor-not-allowed opacity-50 bg-slate-200 text-slate-500 border border-slate-200'
                  : 'cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-100 hover:border-blue-200',
              ]"
              :disabled="
                selected_members.length === 0 || is_sharing || has_sent_messages
              "
            >
              <span
                v-if="is_sharing"
                class="flex items-center gap-2"
              >
                <svg
                  class="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ $t('v1.common.sending_message') }}
              </span>
              <span v-else-if="has_sent_messages">{{
                $t('v1.common.sent_success')
              }}</span>
              <span v-else>{{ $t('v1.common.share_to') }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { container } from 'tsyringe'
import { computed, ref, watch } from 'vue'

import Modal from '@/components/Modal.vue'
import type {
  FilterConversation,
  QueryConversationResponse,
} from '@/service/interface/app/conversation'
import {
  useConversationStore,
  useMessageStore,
  useOrgStore,
  usePageStore,
} from '@/stores'
import { N13ZaloPersonal } from '@/utils/api/N13ZaloPersonal'
import {
  N4SerivceAppConversation,
  N4SerivceAppMessage,
} from '@/utils/api/N4Service/Conversation'
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { keys } from 'lodash'

import ClientAvatar from '@/views/ChatWarper/Chat/LeftBar/Conversation/ClientAvatar.vue'
import { storeToRefs } from 'pinia'
import type {
  AttachmentInfo,
  MessageInfo,
} from '@/service/interface/app/message'
import { send_message } from '@/service/api/chatbox/n4-service'

/** Stores quản lý org và page */
const orgStore = useOrgStore()
const pageStore = usePageStore()
const conversationStore = useConversationStore()
const { message_data } = storeToRefs(useMessageStore())
const API_MESSAGE = container.resolve(N4SerivceAppMessage)

const sending_media = ref<AttachmentInfo[]>([])

const sending_message = ref<string>('')

watch(
  () => message_data.value,
  newVal => {
    console.log('newVal', newVal)
    sending_message.value = newVal?.message_text || ''
    sending_media.value = newVal?.message_attachments || []
  }
)

/** UI state */
/** Tên group Zalo muốn tạo */
const group_name = ref('')
/** Từ khóa tìm kiếm conversation */
const search_conversation = ref<string>()
/** Ref tới component modal */
const modal_widget__group_share_ref = ref<InstanceType<typeof Modal>>()
/** View hiện tại: SEARCH, CHAT, FRIEND_REQUEST hoặc trống */
const view = ref<'SEARCH' | 'CHAT' | 'FRIEND_REQUEST' | ''>('')
/** Cờ kiểm tra modal đang mở */
const is_modal_open = ref(false)

/** Conversation data */
/** Danh sách conversation đang hiển thị */
const conversations = ref<any[]>([])
/** Danh sách thành viên được chọn để tạo group */
const selected_members = ref<any[]>([])
/** Tổng số conversation */
const count_conversation = ref<number>(0)
/** Cursor cho paging conversation */
const after_cursor = ref<number[] | undefined>(undefined)
/** Cờ kiểm tra đang fetch conversation */
const is_fetching = ref(false)

/** Loading state */
/** Cờ kiểm tra đang gửi tin nhắn */
const is_sharing = ref(false)
/** Số lượng tin nhắn đã gửi */
const shared_count = ref(0)
/** Tổng số tin nhắn cần gửi */
const total_share = ref(0)
/** Map trạng thái chia sẻ cho từng member */
const member_share_status = ref<
  Map<string, 'not_sent' | 'pending' | 'sending' | 'success' | 'error'>
>(new Map())

/**
 * Kiểm tra đã gửi xong chưa (có ít nhất 1 member success hoặc error)
 */
const has_sent_messages = computed(() => {
  const STATUSES = Array.from(member_share_status.value.values())
  return STATUSES.some(status => status === 'success' || status === 'error')
})

/** Danh sách members đã gửi thành công (lưu riêng) */
const sent_members = ref<any[]>([])
/** Map trạng thái cho lịch sử gửi */
const history_share_status = ref<
  Map<string, 'not_sent' | 'pending' | 'sending' | 'success' | 'error'>
>(new Map())

/**
 * Danh sách members hiển thị
 * - Nếu có selected_members mới → hiển thị selected_members
 * - Nếu không → hiển thị sent_members
 */
const displayed_members = computed(() => {
  if (selected_members.value.length > 0) {
    return selected_members.value
  }
  return sent_members.value
})

/** Map trạng thái hiển thị (tùy theo mode) */
const display_status_map = computed(() => {
  if (selected_members.value.length > 0) {
    return member_share_status.value
  }
  return history_share_status.value
})

/** Validation */
/** Kiểm tra lỗi tên group */
const error_group_name = ref(false)
/** Kiểm tra lỗi chọn thành viên */
const error_select_members = ref('')

/** Khởi tạo trực tiếp instance API Zalo */
const API_ZALO = new N13ZaloPersonal('app/page/group')

/**
 * @class Main
 * @description Chứa logic gọi API conversation, KHÔNG chứa store
 */
class Main {
  /**
   * @param API instance N4ServiceAppConversation
   */
  constructor(
    private readonly API = container.resolve(N4SerivceAppConversation)
  ) {}

  /**
   * Bật/tắt modal, nếu mở modal sẽ fetch toàn bộ conversation
   */
  /**
   * Bật/tắt modal, nếu mở modal sẽ fetch toàn bộ conversation
   */
  toggleModal() {
    modal_widget__group_share_ref.value?.toggleModal()
    is_modal_open.value = !is_modal_open.value
    if (is_modal_open.value) {
      /**
       * Reset data gửi tin nhắn từ message_data
       * Cần thiết khi chia sẻ lại cùng 1 tin nhắn (watch không chạy)
       * hoặc khi tin nhắn trước đó đã bị edit nội dung trong modal
       */
      sending_message.value = message_data.value?.message_text || ''
      sending_media.value = message_data.value?.message_attachments || []

      /** Reset lại trạng thái để đảm bảo sạch sẽ khi mở lại */
      selected_members.value = []
      sent_members.value = []
      member_share_status.value.clear()
      history_share_status.value.clear()
      shared_count.value = 0
      total_share.value = 0
      search_conversation.value = ''
      group_name.value = ''

      fetchAllConversations()
    } else {
      selected_members.value = []
      sent_members.value = []
      member_share_status.value.clear()
      history_share_status.value.clear()
      shared_count.value = 0
      total_share.value = 0
      search_conversation.value = ''
      group_name.value = ''
    }
  }

  /**
   * Lấy conversation từ server
   * @param params - object chứa pageIds, orgId, filter, limit, sort, after
   * @returns kết quả bao gồm result[], after cursor, count
   */
  async getConversation(params: {
    page_ids: string[]
    org_id: string
    filter: FilterConversation
    limit: number
    sort: string
    after?: number[] | undefined
  }) {
    try {
      return await this.API.readConversations(
        params.page_ids,
        params.org_id,
        params.filter,
        params.limit,
        params.sort,
        params.after
      )
    } catch (err) {
      console.error('Lỗi getConversation:', err)
      return { result: [], after: null, count: 0 }
    }
  }

  /**
   * Lấy tổng số conversation theo filter
   * @param params object chứa pageIds và filter
   * @returns object { count }
   */
  async countConversation(params: {
    pageIds: string[]
    filter: FilterConversation
  }) {
    try {
      return await this.API.countConversation(params.pageIds, params.filter)
    } catch (err) {
      console.error('Lỗi countConversation:', err)
      return { count: 0 }
    }
  }
}

const $main = new Main()

/**
 * Fetch toàn bộ conversation theo cursor (paging)
 * Sử dụng while loop để fetch tới khi hết dữ liệu
 */
async function fetchAllConversations() {
  /** Nếu đang fetch thì return */
  if (is_fetching.value) return
  is_fetching.value = true
  /** Lấy page id theo conversation đang được chọn */
  const CURRENT_PAGE_ID = conversationStore?.select_conversation?.fb_page_id
  /** Lấy tất cả page_id đang chọn */
  const PAGE_IDS = keys(pageStore.selected_page_id_list)
  /** Filter mặc định */
  const FILTER: FilterConversation = {
    conversation_type: 'CHAT',
    is_spam_fb: 'NO',
  }
  /** Sắp xếp theo số lượng unread, sau đó thời gian tin nhắn cuối */
  const SORT = 'unread_message_amount:desc,last_message_time:desc'

  /** Reset dữ liệu trước khi fetch */
  conversations.value = []
  selected_members.value = []
  after_cursor.value = undefined
  /** Tạo trạng thái fetching = true */
  let keep_fetching = true
  while (keep_fetching) {
    /** Gọi API để fetch conversation */
    const RES: QueryConversationResponse | any = await $main.getConversation({
      page_ids: [CURRENT_PAGE_ID || ''],
      org_id: orgStore.selected_org_id || '',
      filter: FILTER,
      limit: 50,
      sort: SORT,
      after: after_cursor.value || undefined,
    })

    /** Nếu có dữ liệu, push vào list và update cursor */
    if (RES?.result?.length) {
      conversations.value.push(...RES.result)
      after_cursor.value = RES.after || undefined
      // keep_fetching = !!after_cursor.value
      keep_fetching = false
    } else {
      /** Nếu không có dữ liệu nữa thì dừng loop */
      keep_fetching = false
    }

    count_conversation.value = RES?.count || conversations.value.length
  }

  /** Reset cờ fetch */
  is_fetching.value = false
}

/**
 * Computed filter conversation theo từ khóa name hoặc phone
 */
const FILTERED_CONVERSATION = computed(() => {
  /** Nếu không có key word thì trả về cả list */
  if (!search_conversation.value) return conversations.value
  /** Xử lý to lowercase */
  const KEYWORD = search_conversation.value.toLowerCase()
  /** Xử lý filter conversation phone và name */
  return conversations.value.filter(
    conv =>
      (conv.client_name || '').toLowerCase().includes(KEYWORD) ||
      (conv.client_phone || '').includes(KEYWORD)
  )
})

/**
 * Xử lý chia sẻ tin nhắn (text và/hoặc attachment)
 */
async function shareMessage() {
  /** Bật loading state */
  is_sharing.value = true
  shared_count.value = 0
  total_share.value = selected_members.value.length

  /** Lấy page_id mặc định (page đầu tiên) */
  const PAGE_IDS = keys(pageStore.selected_page_id_list)
  const page_id = PAGE_IDS[0] || ''
  /** Lấy list page */
  const LIST = orgStore.list_os || []

  /** Lặp qua danh sách thành viên đã chọn */
  for (const member of selected_members.value) {
    const MEMBER_KEY = `${member.fb_client_id}_${member.fb_page_id}`
    console.log('MEMBER_KEY', MEMBER_KEY)
    /** Set trạng thái đang gửi */
    member_share_status.value.set(MEMBER_KEY, 'sending')
    console.log('member_share_status.value', member_share_status.value)
    try {
      /** Kiểm tra và xử lý attachment */
      let ATTACHMENTS: { url: string; type: 'image' }[] = []
      if (sending_media.value && sending_media.value.length > 0) {
        /** Chuyển đổi attachment sang định dạng API yêu cầu */
        ATTACHMENTS = sending_media.value
          .filter(media => media.type === 'image')
          .map(media => {
            /** Lấy URL từ nhiều nguồn khác nhau */
            let url = media.url || media.payload?.url

            /** Nếu chưa có URL, thử lấy từ elements */
            if (!url && media.payload?.elements?.[0]) {
              const ELEMENT = media.payload.elements[0]
              url = ELEMENT.image_url || ELEMENT.url
            }

            /** Type luôn là image */
            const type = 'image' as 'image'

            return { url, type }
          })
          .filter(item => item.url) as { url: string; type: 'image' }[]
      }

      console.log(ATTACHMENTS, 'ATTACHMENTS')

      /** Nếu có attachment hợp lệ thì gửi */
      if (ATTACHMENTS.length > 0) {
        /** Gọi API gửi tin nhắn với attachment */
        await new Promise((resolve, reject) =>
          send_message(
            {
              page_id: member.fb_page_id,
              client_id: member.fb_client_id,
              text: sending_message.value || undefined,
              attachments: ATTACHMENTS,
            },
            (e: any, r: any) => {
              /** Nếu có lỗi thì reject */
              if (e) return reject(e)
              /** Nếu thành công thì resolve */
              resolve(r)
            }
          )
        )
      } else if (sending_message.value) {
        /** Tìm page tương ứng với member để lấy org_id */
        const MEMBER_PAGE = LIST.find(p => p.page_id === member.fb_page_id)
        console.log(MEMBER_PAGE, 'MEMBER_PAGE')
        console.log(member.fb_page_id, 'member.fb_page_id')
        console.log(member.fb_client_id, 'member.fb_client_id')
        console.log(sending_message.value, 'sending_message.value')
        console.log(MEMBER_PAGE?.org_id, 'MEMBER_PAGE?.org_id')
        /** Chỉ gửi text nếu không có attachment */
        await API_MESSAGE.sendMessage(
          member.fb_page_id,
          member.fb_client_id,
          sending_message.value,
          MEMBER_PAGE?.org_id || ''
        )
      }
      console.log(sending_message.value, 'sending_message.value')
      /** Set trạng thái thành công */
      member_share_status.value.set(MEMBER_KEY, 'success')
      /** Tăng số lượng đã gửi */
      shared_count.value++
    } catch (err) {
      console.error('Lỗi khi chia sẻ tin nhắn:', err)
      /** Set trạng thái lỗi */
      member_share_status.value.set(MEMBER_KEY, 'error')
      /** Vẫn tăng count để tiếp tục */
      shared_count.value++
    }
  }

  /** Tắt loading state */
  is_sharing.value = false

  /** Lưu danh sách đã gửi */
  sent_members.value = [...selected_members.value]

  /** Copy trạng thái sang history */
  selected_members.value.forEach(member => {
    const KEY = `${member.fb_client_id}_${member.fb_page_id}`
    const STATUS = member_share_status.value.get(KEY)
    if (STATUS) {
      history_share_status.value.set(KEY, STATUS)
    }
  })

  /** Reset selection để hiển thị danh sách đã gửi (hoặc sẵn sàng cho selection mới) */
  selected_members.value = []
  /** Clear trạng thái hiện tại để không ảnh hưởng lần chọn sau */
  member_share_status.value.clear()

  /** Reset counters */
  shared_count.value = 0
  total_share.value = 0
}

/**
 * Thêm/xóa thành viên trong danh sách selected_members
 * @param conv conversation object
 */
function toggleMember(conv: any) {
  /** Reset lỗi */
  error_select_members.value = ''

  /** Tìm index thành viên đã chọn */
  const INDEX = selected_members.value.findIndex(
    m =>
      m.fb_client_id === conv.fb_client_id && m.fb_page_id === conv.fb_page_id
  )

  const MEMBER_KEY = `${conv.fb_client_id}_${conv.fb_page_id}`

  /** Nếu đã chọn, xóa; nếu chưa chọn, push vào mảng */
  if (INDEX >= 0) {
    selected_members.value.splice(INDEX, 1)
    /** Xóa trạng thái của member này */
    member_share_status.value.delete(MEMBER_KEY)
  } else {
    selected_members.value.push(conv)
    /** Khởi tạo trạng thái "Đang chờ gửi tin" cho member mới */
    member_share_status.value.set(MEMBER_KEY, 'not_sent')
  }
}

/**
 * Chọn tất cả thành viên
 */
function select_all() {
  /** Nếu đang chọn tất cả thì reset */
  if (selected_members.value?.length === FILTERED_CONVERSATION.value.length) {
    selected_members.value = []
    /** Xóa tất cả trạng thái */
    member_share_status.value.clear()
    return
  }
  /** Nếu chưa chọn tất cả thì chọn tất cả */
  selected_members.value = [...FILTERED_CONVERSATION.value]

  /** Khởi tạo trạng thái "Đang chờ gửi tin" cho tất cả members */
  selected_members.value.forEach(member => {
    const MEMBER_KEY = `${member.fb_client_id}_${member.fb_page_id}`
    member_share_status.value.set(MEMBER_KEY, 'not_sent')
  })
}

/** Expose toggleModal ra component cha để gọi trực tiếp */
defineExpose({ toggleModal: $main.toggleModal.bind($main) })
</script>
