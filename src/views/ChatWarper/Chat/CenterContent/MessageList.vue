<template>
  <div
    v-if="!select_conversation"
    class="w-full h-full flex justify-center items-center text-slate-500 gap-1"
  >
    <ChatIcon class="w-5" />
    <div>
      {{ $t('v1.view.main.dashboard.chat.empty_message') }}
    </div>
  </div>
  <div
    v-else
    id="chat__message-list"
    class="h-full overflow-hidden rounded-b-xl relative"
  >
    <div
      v-if="isLockPage()"
      class="text-sm text-red-600 text-center"
    >
      {{ $t('v1.view.main.dashboard.org.lock_free_page_over_quota') }}
    </div>
    <FullPost v-else-if="select_conversation.conversation_type === 'POST'" />
    <div
      v-else
      @scroll="onScrollMessage"
      :id="messageStore.list_message_id"
      class="pt-14 pb-5 pl-2 pr-5 gap-1 flex flex-col h-full overflow-hidden overflow-y-auto bg-[#0015810f] rounded-b-xl"
    >
      <div
        v-if="is_loading"
        class="relative z-10"
      >
        <div class="fixed left-1/2 -translate-x-1/2">
          <Loading class="mx-auto" />
        </div>
      </div>
      <!-- <HeaderChat /> -->
      <div
        v-for="(message, index) of show_list_message"
        :key="message._id"
        class="relative"
      >
        <div class="flex flex-col gap-2">
          <UnReadAlert :index />
          <TimeSplit
            :before_message="show_list_message?.[index - 1]"
            :now_message="message"
          />
        </div>
        <div
          :class="{
            'py-2': ['client', 'page', 'note', 'group'].includes(
              message.message_type
            ),
          }"
          class="flex gap-1 relative"
        >
          <div
            v-if="
              (message.message_type === 'client' && !message.ad_id) ||
              message.message_type === 'group' ||
              message.fb_post_id
            "
            class="flex-shrink-0"
          >
            <ClientAvatar
              :conversation="select_conversation"
              :avatar="message?.group_client_avatar"
              class="w-8 h-8"
            />
          </div>
          <div
            :class="{
              'items-end':
                ['page', 'note'].includes(message.message_type) ||
                message.ad_id,
            }"
            class="relative flex flex-col flex-grow min-w-0"
          >
            <MessageItem
              v-if="
                ['client', 'activity', 'page', 'note', 'group'].includes(
                  message.message_type
                ) && !message.ad_id
              "
              :message="message"
              :message_index="index"
            />
            <div
              v-else-if="message.message_type === 'system'"
              class="text-center px-20"
            >
              <SystemMessage
                v-if="message.message_text"
                :text="message.message_text"
              />
              <UnsupportMessage v-else />
            </div>
            <template
              v-else-if="message.message_type === 'client' && message.ad_id"
            >
              <PostTemplate
                :message
                :message_index="index"
              />
            </template>

            <PostTemplate
              v-else-if="
                message.platform_type === 'FB_POST' && message.fb_post_id
              "
              :message
              :message_index="index"
            />
            <UnsupportMessage
              v-else-if="
                message.message_mid && message.message_mid !== 'undefined'
              "
            />
            <DoubleCheckIcon
              v-if="isLastPageMessage(message, index)"
              class="w-3 h-3 text-green-500 absolute -bottom-1.5 -right-11"
            />
          </div>
          <PageStaffAvatar
            :message
            v-if="
              ['page', 'note'].includes(message.message_type) || message.ad_id
            "
          />
          <ClientRead
            @change_last_read_message="visibleFirstClientReadAvatar"
            :time="message.time"
          />
        </div>
        <StaffRead
          @change_last_read_message="visibleLastStaffReadAvatar"
          :time="message.time"
        />
      </div>
      <div
        v-for="message of messageStore.send_message_list"
        :key="message.temp_id"
        class="relative group flex flex-col gap-1 items-end py-2"
      >
        <div class="message-size group relative flex gap-1 items-end">
          <PageTempTextMessage
            :text="message.text"
            :mentions="message.mentions"
            :snap_replay_message="message.snap_replay_message"
            :is_error="message.error"
          />
          <!-- :class="{
            'border border-red-500 rounded-lg': message.error,
          }" -->
          <StaffAvatar
            :id="chatbotUserStore.chatbot_user?.user_id"
            class="w-6 h-6 rounded-oval flex-shrink-0"
          />
        </div>
        <SendStatus :is_error="message.error" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  useConversationStore,
  useMessageStore,
  useCommonStore,
  useChatbotUserStore,
  useOrgStore,
} from '@/stores'
import { flow } from '@/service/helper/async'
import { read_message } from '@/service/api/chatbox/n4-service'
import { toastError } from '@/service/helper/alert'
import { getPageInfo, scrollToBottomMessage } from '@/service/function'
import { debounce, findLastIndex, remove, size } from 'lodash'

import FullPost from '@/views/ChatWarper/Chat/CenterContent/MessageList/FullPost.vue'
import Loading from '@/components/Loading.vue'
import TimeSplit from '@/views/ChatWarper/Chat/CenterContent/MessageList/TimeSplit.vue'
import UnsupportMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/UnsupportMessage.vue'
import PageTempTextMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/PageTempTextMessage.vue'
import SendStatus from '@/views/ChatWarper/Chat/CenterContent/MessageList/SendStatus.vue'
import SystemMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/SystemMessage.vue'
import ClientRead from '@/views/ChatWarper/Chat/CenterContent/MessageList/ClientRead.vue'
import StaffRead from '@/views/ChatWarper/Chat/CenterContent/MessageList/StaffRead.vue'
import AdMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/AdMessage.vue'
import PostTemplate from '@/views/ChatWarper/Chat/CenterContent/MessageList/PostTemplate.vue'
import FacebookPost from '@/views/ChatWarper/Chat/CenterContent/MessageList/FacebookPost.vue'
import PageStaffAvatar from '@/views/ChatWarper/Chat/CenterContent/MessageList/PageStaffAvatar.vue'
import ClientAvatar from '@/components/Avatar/ClientAvatar.vue'
import StaffAvatar from '@/components/Avatar/StaffAvatar.vue'
// import HeaderChat from '@/views/ChatWarper/Chat/CenterContent/MessageList/HeaderChat.vue'
import MessageItem from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem.vue'
import UnReadAlert from '@/views/ChatWarper/Chat/CenterContent/MessageList/UnReadAlert.vue'

import DoubleCheckIcon from '@/components/Icons/DoubleCheck.vue'
import ChatIcon from '@/components/Icons/Chat.vue'

import type {
  MessageInfo,
  TempSendMessage,
} from '@/service/interface/app/message'
import type { CbError } from '@/service/interface/function'
import type { DebouncedFunc } from 'lodash'
import type { ConversationInfo } from '@/service/interface/app/conversation'
import { db } from '@/db/ChatDB'

/**dữ liệu từ socket */
interface CustomEvent extends Event {
  detail?: MessageInfo
}

const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const commonStore = useCommonStore()
const chatbotUserStore = useChatbotUserStore()
const orgStore = useOrgStore()

/**danh sách tin nhắn hiện tại */
// const list_message = ref<MessageInfo[]>([])
/**có đang load tin nhắn hay không */
const is_loading = ref(false)
/**gắn cờ đã load hết dữ liệu */
const is_done = ref(false)
/**phân trang */
const skip = ref(0)
/**phân trang */
const LIMIT = 20
/**giá trị scroll_height trước đó của danh sách tin nhắn */
let old_scroll_height = ref(0)
/** giá trị từ vị trí scroll tới cuối danh sách tin nhắn trước đó */
const old_position_to_bottom = ref(0)
/**danh sách các hàm debounce cho từng staff */
const list_debounce_staff = ref<{
  [index: string]: DebouncedFunc<any>
}>({})

/** hội thoại đang chọn */
const select_conversation = computed(() => {
  return conversationStore.select_conversation
})

/** danh sách tin nhắn */
const show_list_message = computed(() => messageStore.list_message)

/**vị trí của tin nhắn cuối cùng nhân viên gửi */
const last_client_message_index = computed(() =>
  findLastIndex(
    show_list_message.value,
    m => m.message_type === 'page' && !!m.message_metadata
  )
)

// lắng nghe sự kiện từ socket khi component được tạo ra
onMounted(() => {
  // * reset danh sách tin nhắn lúc mới vào nếu không mở bằng modal
  messageStore.list_message = []

  if (true) {
    // * reset danh sách tin nhắn khi đổi khách hàng
    messageStore.list_message = []

    // * reset danh sách tin nhắn chờ
    messageStore.send_message_list = []

    // reset cờ đã load hết dữ liệu
    is_done.value = false

    // reset phân trang
    skip.value = 0

    getListMessage(true)
  }

  // tin nhắn mới
  window.addEventListener('chatbox_socket_message', socketNewMessage)

  // cập nhật tin nhắn
  window.addEventListener('chatbox_socket_update_message', socketUpdateMessage)
})

// hủy lắng nghe sự kiện từ socket khi component bị hủy
onUnmounted(() => {
  // tin nhắn mới
  window.removeEventListener('chatbox_socket_message', socketNewMessage)

  // cập nhật tin nhắn
  window.removeEventListener(
    'chatbox_socket_update_message',
    socketUpdateMessage
  )
})

watch(
  () => select_conversation.value,
  (new_val, old_val) => {
    // * reset danh sách tin nhắn khi đổi khách hàng
    messageStore.list_message = []

    // * reset danh sách tin nhắn chờ
    messageStore.send_message_list = []

    // reset cờ đã load hết dữ liệu
    is_done.value = false

    // reset phân trang
    skip.value = 0

    getListMessage(true)
  }
)

/**có khoá truy cập của trang này không */
function isLockPage(): boolean {
  // chỉ lock với gói free
  if (!orgStore.isFreePack()) return false

  // nếu tổ chức bị lock thì lock toàn bộ trang
  if (orgStore.selected_org_info?.org_package?.org_is_lock_client) return true

  // nếu page bị lock từ trước, thì cũng lock
  if (getPageInfo(select_conversation.value?.fb_page_id)?.is_lock_client)
    return true

  // tổ chức free + page chưa bị lock -> ok
  return false
}
/**kiểm tra xem tin nhắn này có phải là tin nhắn cuối cùng của nhân viên gửi không */
function isLastPageMessage(message: MessageInfo, index: number) {
  // chỉ tính tin nhắn của trang
  if (message.message_type !== 'page') return false
  // phải là tin do nhân viên gửi
  if (!message.message_metadata) return false

  // nếu là tin nhắn cuối cùng của nhân viên gửi
  return index === last_client_message_index.value
}
// /**xử lý socket tin nhắn mới */
// function socketNewMessage({ detail }: CustomEvent) {
//   // nếu không có dữ liệu thì thôi
//   if (!detail) return

//   // nếu không phải của khách hàng đang chọn thì chặn
//   if (
//     detail.fb_page_id !== select_conversation.value?.fb_page_id ||
//     detail.fb_client_id !== select_conversation.value.fb_client_id
//   )
//     return

//   // nếu là tin nhắn của khách thì gửi cho toàn bộ các widget
//   if (detail?.message_type === 'client' && detail?.message_text) {
//     document.querySelectorAll('iframe')?.forEach(iframe => {
//       iframe?.contentWindow?.postMessage(
//         {
//           from: 'CHATBOX',
//           type: 'CLIENT_MESSAGE',
//           payload: { message: detail?.message_text },
//         },
//         '*'
//       )
//     })
//   }

//   // nếu là dạng comment bài post thì loại bỏ các post cũ, để post mới sẽ lên đầu
//   if (size(detail.comment))
//     remove(messageStore.list_message, message => message._id === detail._id)

//   // lấy div chứa danh sách tin nhắn
//   const LIST_MESSAGE = document.getElementById(messageStore.list_message_id)

//   /** vị trí scroll */
//   const SCROLL_POSITION =
//     (LIST_MESSAGE?.scrollTop || 0) + (LIST_MESSAGE?.clientHeight || 0)

//   /** có đang scroll xuống dưới cùng không? */
//   const IS_BOTTOM = SCROLL_POSITION === LIST_MESSAGE?.scrollHeight

//   // thêm tin nhắn vào danh sách
//   messageStore.list_message.push(detail)

//   // xử lý khi gặp trường hợp phát hiện tin nhắn chờ
//   if (detail?.message_mid)
//     remove(
//       messageStore.send_message_list,
//       message => message.message_id === detail?.message_mid
//     )

//   // nếu đang ở vị trí bottom thì dùng scrollToBottomMessage
//   if (IS_BOTTOM) scrollToBottomMessage(messageStore.list_message_id)
// }
// /**xử lý socket cập nhật tin nhắn hiện tại */
// function socketUpdateMssage({ detail }: CustomEvent) {
//   // nếu không có dữ liệu thì thôi
//   if (!detail) return

//   // nếu không phải của khách hàng đang chọn thì chặn
//   if (
//     detail.fb_page_id !== select_conversation.value?.fb_page_id ||
//     detail.fb_client_id !== select_conversation.value.fb_client_id
//   )
//     return

//   // cập nhật dữ liệu của tin nhắn
//   messageStore.list_message?.forEach(message => {
//     // tìm đến tin nhắn bằng id, sau đó sao chép dữ liệu mới vào object cũ
//     if (message._id === detail._id) Object.assign(message, detail)
//   })
// }

/** Cập nhật conversation trong IndexedDB theo fb_page_id + fb_client_id */
// async function updateConversationInDB(detail: any) {
//   try {
//     if (!detail.fb_page_id || !detail.fb_client_id) return

//     const convKey = `${detail.fb_page_id}_${detail.fb_client_id}`
//     console.log(convKey, 'key')
//     const conv = await db.conversations.get(convKey)
//     console.log(conv, 'conversation')
//     const lastMessageTime = detail.last_message_time || Date.now()
//     console.log(lastMessageTime)
//     if (!conv) {
//       // nếu chưa có conversation thì tạo mới
//       await db.conversations.put({
//         id: convKey,
//         fb_page_id: detail.fb_page_id,
//         fb_client_id: detail.fb_client_id,
//         last_message: detail.message_text,
//         last_message_id: detail._id,
//         last_message_type: detail.message_type,
//         last_message_time: lastMessageTime,
//         unread_message_amount: detail.message_type === 'client' ? 1 : 0,
//       })
//     } else if (lastMessageTime > (conv.last_message_time || 0)) {
//       // nếu đã có, update nếu tin nhắn mới hơn
//       const unread = conv.unread_message_amount || 0
//       await db.conversations.update(convKey, {
//         last_message: detail.message_text || conv.last_message,
//         last_message_id: detail._id,
//         last_message_type: detail.message_type,
//         last_message_time: lastMessageTime,
//         unread_message_amount:
//           detail.message_type === 'client' ? unread + 1 : unread,
//       })
//     }
//   } catch (e) {
//     console.error('Failed to update conversation in IndexedDB', e)
//   }
// }
/** Cập nhật conversation trong IndexedDB theo fb_page_id + fb_client_id */
async function updateConversationInDB(detail: any) {
  try {
    if (!detail.fb_page_id || !detail.fb_client_id) return

    const convKey = `${detail.fb_page_id}_${detail.fb_client_id}`
    const conv = await db.conversations.get(convKey)
    const lastMessageTime = detail.last_message_time || Date.now()

    if (!conv) {
      // nếu chưa có conversation thì tạo mới
      await db.conversations.put({
        id: convKey,
        fb_page_id: detail.fb_page_id,
        fb_client_id: detail.fb_client_id,
        last_message: detail.message_text,
        last_message_id: detail._id,
        last_message_type: detail.message_type,
        last_message_time: lastMessageTime,
        unread_message_amount: detail.message_type === 'client' ? 1 : 0,
      })
    } else {
      const updateData: Partial<typeof conv> = {}

      // 🔹 Cập nhật các trường tin nhắn nếu có tin nhắn mới
      if (lastMessageTime > (conv.last_message_time || 0)) {
        updateData.last_message = detail.message_text || conv.last_message
        updateData.last_message_id = detail._id
        updateData.last_message_type = detail.message_type
        updateData.last_message_time = lastMessageTime
      }

      // 🔹 Luôn cập nhật unread_message_amount nếu là tin nhắn client
      if (detail.message_type === 'client') {
        const unread = conv.unread_message_amount || 0
        updateData.unread_message_amount = unread + 1
      } else {
        updateData.unread_message_amount = 0
      }

      // 🔹 Nếu cần, có thể reset unread_message_amount từ socket khác hoặc hành động user
      // updateData.unread_message_amount = detail.unread_message_amount_override ?? updateData.unread_message_amount

      await db.conversations.update(convKey, updateData)
    }
  } catch (e) {
    console.error('Failed to update conversation in IndexedDB', e)
  }
}

/** Xử lý tin nhắn mới từ socket */
function socketNewMessage({ detail }: CustomEvent) {
  if (!detail) return

  /** 1. Update DB cho tất cả conversation */
  updateConversationInDB(detail)

  /** 2. Chỉ update UI nếu là conversation đang chọn */
  if (
    detail.fb_page_id !== select_conversation.value?.fb_page_id ||
    detail.fb_client_id !== select_conversation.value.fb_client_id
  )
    return

  /** Nếu là tin nhắn client, gửi cho iframe */
  if (detail?.message_type === 'client' && detail?.message_text) {
    document.querySelectorAll('iframe')?.forEach(iframe => {
      iframe?.contentWindow?.postMessage(
        {
          from: 'CHATBOX',
          type: 'CLIENT_MESSAGE',
          payload: { message: detail?.message_text },
        },
        '*'
      )
    })
  }

  /** Nếu là comment, loại bỏ comment cũ trùng id */
  if (size(detail.comment))
    remove(messageStore.list_message, m => m._id === detail._id)

  const LIST_MESSAGE = document.getElementById(messageStore.list_message_id)
  const SCROLL_POSITION =
    (LIST_MESSAGE?.scrollTop || 0) + (LIST_MESSAGE?.clientHeight || 0)
  const IS_BOTTOM = SCROLL_POSITION === LIST_MESSAGE?.scrollHeight

  messageStore.list_message.push(detail)

  if (detail?.message_mid)
    remove(
      messageStore.send_message_list,
      message =>
        message.message_id === detail?.message_mid ||
        (message.replay_mid && message.replay_mid === detail?.replay_mid)
    )

  if (IS_BOTTOM) scrollToBottomMessage(messageStore.list_message_id)
}

/** Xử lý cập nhật tin nhắn từ socket */
function socketUpdateMessage({ detail }: CustomEvent) {
  if (!detail) return

  /** 1. Update DB */
  updateConversationInDB(detail)

  /** 2. Update UI nếu conversation đang chọn */
  if (
    detail.fb_page_id !== select_conversation.value?.fb_page_id ||
    detail.fb_client_id !== select_conversation.value.fb_client_id
  )
    return

  /** Update nội dung tin nhắn trên list_message */
  messageStore.list_message?.forEach(message => {
    if (message._id === detail._id) Object.assign(message, detail)
  })
}

/**lắng nghe sự kiện khi scroll danh sách tin nhắn */
function onScrollMessage($event: Event) {
  /** xử lý ẩn hiện nút về bottom */
  handleButtonToBottom($event as UIEvent)

  /** xử lý load dữ liệu tin nhắn */
  debounceLoadMoreMessage($event as UIEvent)
}

/** hàm debounce load dữ liệu tin nhắn */
const debounceLoadMoreMessage = debounce(
  $event => loadMoreMessage($event as UIEvent),
  300
)

/**ẩn hiện nút về bottom */
function handleButtonToBottom($event: UIEvent) {
  /**div chưa danh sách tin nhắn */
  const LIST_MESSAGE = $event?.target as HTMLElement

  let { scrollHeight, scrollTop, clientHeight } = LIST_MESSAGE

  /**giá trị khoảng cách scroll với bottom */
  const SCROLL_BOTTOM = scrollHeight - scrollTop - clientHeight

  /**
   * xử lý như thế này để giảm tải việc thay đổi store liên tục, nếu không
   * có khả năng bị lag, treo, khi có nhiều nơi watch store, send event mà
   * mình không phát hiện ra
   */
  if (SCROLL_BOTTOM > 400 && !messageStore.is_show_to_bottom) {
    messageStore.is_show_to_bottom = true
  }
  if (SCROLL_BOTTOM <= 400 && messageStore.is_show_to_bottom) {
    messageStore.is_show_to_bottom = false
  }
}
/**load thêm dữ liệu khi lăn chuột lên trên */
function loadMoreMessage($event: UIEvent) {
  /**div chưa danh sách tin nhắn */
  const LIST_MESSAGE = $event?.target as HTMLElement

  if (!LIST_MESSAGE) return

  /**giá trị scroll top hiện tại */
  const SCROLL_TOP = LIST_MESSAGE?.scrollTop

  /** nếu đang chạy hoặc đã hết dữ liệu thì thôi */
  if (is_loading.value || is_done.value) return

  /** infinitve loading scroll */
  if (SCROLL_TOP < 500) getListMessage()
}
/**đọc danh sách tin nhắn */
function getListMessage(is_scroll?: boolean) {
  /** nếu đang mất mạng thì không cho gọi api */
  if (!commonStore.is_connected_internet) return

  /** nếu chưa chọn khách hàng thì thôi */
  if (!select_conversation.value?.fb_page_id) return
  if (!select_conversation.value?.fb_client_id) return

  /**id tin nhắn trên đầu của lần loading trước */
  let old_first_message_id = messageStore.list_message?.[0]?._id

  flow(
    [
      /** * bật loading */
      (cb: CbError) => {
        is_loading.value = true

        /** thẻ div chứa danh sách tin nhắn */
        const LIST_MESSAGE = document.getElementById(
          messageStore.list_message_id
        )

        /** nếu có thì thôi */
        if (!LIST_MESSAGE) return cb()

        /** lưu lại bị vị trí scroll hiện tại */
        old_position_to_bottom.value =
          LIST_MESSAGE?.scrollHeight - LIST_MESSAGE?.scrollTop

        cb()
      },
      /** * đọc dữ liệu từ api */
      (cb: CbError) => tryLoadUntilScrollable(cb),
      /** * làm cho scroll to top mượt hơn */
      (cb: CbError) => {
        /** chạy infinitve loading scroll */
        nextTick(() => {
          /** lấy div chưa danh sách tin nhắn */
          const LIST_MESSAGE = document.getElementById(
            messageStore.list_message_id
          )

          /** nếu không có thì thôi */
          if (!LIST_MESSAGE) return cb()

          /** Scroll lại div cho về đúng giá trị trước -> gần như mượt */
          LIST_MESSAGE.scrollTop =
            LIST_MESSAGE.scrollHeight - old_position_to_bottom.value
        })

        cb()
      },
    ],
    e => {
      /** tắt loading */
      is_loading.value = false

      /** load lần đầu thì tự động cuộn xuống */
      if (is_scroll) {
        scrollToBottomMessage(messageStore.list_message_id)

        setTimeout(
          () => scrollToBottomMessage(messageStore.list_message_id),
          500
        )
      }

      if (e) {
        /** gắn cờ đã load hết dữ liệu */
        is_done.value = true

        return toastError(e)
      }
    }
  )
}
/**
 * chỉ hiển thị avatar khách hàng đã đọc đến tin nhắn đầu tiên
 * vì cùng mội thời điểm sẽ có nhiều div thoả mãn điều kiện gửi event
 * nên sử dụng debounce để chỉ chạy event cuối cùng, tránh bị lặp code
 */
const visibleFirstClientReadAvatar = debounce(() => {
  /** danh sách các phần tử avatar đánh dấu khách đọc */
  const ELEMENTS = document.querySelectorAll('.mesage-client-read')
  /** nếu không có thì thôi */
  if (!ELEMENTS?.length) return
  /** nếu có thì ẩn tất cả chỉ hiện phần tử cuối cùng */
  ELEMENTS.forEach((el, index) => {
    /** phần tử avatar đánh dấu khách đọc */
    const ELEMENT = el as HTMLElement
    /** nếu không có thì thôi */
    if (!ELEMENT) return
    /** nếu là phần tử cuối cùng thì hiện */
    if (index === ELEMENTS.length - 1) {
      ELEMENT.style.display = 'block'
    } else {
      /** nếu khác phần tử cuối cùng thì ẩn */
      ELEMENT.style.display = 'none'
    }
  })
}, 50)
/**
 * chỉ hiển thị avatar nhân viên đã đọc tin nhắn cuối cùng
 * vì cùng mội thời điểm sẽ có nhiều div thoả mãn điều kiện gửi event
 * nên sử dụng debounce để chỉ chạy event cuối cùng, tránh bị lặp code
 */
function visibleLastStaffReadAvatar(staff_id: string) {
  /** init hàm debounce cho từng staff nếu không tồn tại */
  if (!list_debounce_staff.value[staff_id])
    list_debounce_staff.value[staff_id] = debounce(doVisibleAvatar, 50)

  /** chạy hàm debounce */
  list_debounce_staff.value[staff_id](staff_id)

  /**hiển thị avatar staff cuối cùng */
  function doVisibleAvatar(staff_id: string) {
    /**toàn bộ các div avatar */
    const LIST_AVATAR: HTMLElement[] = Array.from(
      document.querySelectorAll(`.message-staff-read-${staff_id}`)
    )

    /** lặp qua toàn bộ các div */
    LIST_AVATAR.forEach((element: any, i: number) => {
      /** reset ẩn toàn bộ các avatar hiện tại */
      if (i < LIST_AVATAR.length - 1) element.style.display = 'none'
      /** chỉ hiển thị avatar cuối cùng */ else element.style.display = 'block'
    })
  }
}

/** hàm load dữ liệu cho đến khi danh sách có thể scroll */
const tryLoadUntilScrollable = (cb: CbError) => {
  read_message(
    {
      page_id: conversationStore.select_conversation?.fb_page_id,
      client_id: conversationStore.select_conversation?.fb_client_id,
      skip: skip.value,
      limit: LIMIT,
    },
    (e, r) => {
      /** nếu lỗi thì thôi */
      if (e) return cb(e)

      /** không có kết quả thì thôi hoặc đã lấy hết dữ liệu thì thôi */
      if (!r || !r.length) {
        is_done.value = true
        return cb()
      }

      /** đảo ngược mảng */
      r.reverse()

      /** thêm vào danh sách lên đầu */
      messageStore.list_message.unshift(...r)

      /** trang tiếp theo */
      skip.value += LIMIT

      /** ⚠️ Gọi lại nếu chưa scroll được */
      /** Dùng nextTick nếu Vue chưa render kịp */
      nextTick(() => {
        /** lấy div chưa danh sách tin nhắn */
        const LIST_MESSAGE = document.getElementById(
          messageStore.list_message_id
        )

        /** nếu không có thì thôi */
        if (!LIST_MESSAGE) return cb()

        /** nếu chưa thể scroll thì load tiếp */
        if (
          LIST_MESSAGE.scrollHeight <= LIST_MESSAGE.clientHeight &&
          !is_done.value
        ) {
          /** chưa scroll được, tiếp tục load thêm */
          tryLoadUntilScrollable(cb)
        } else {
          /** đã scroll được, hoặc đã hết dữ liệu */
          cb()
        }
      })
    }
  )
}
</script>
<style scoped lang="scss">
.message-size {
  @apply max-w-96;
  width: fit-content;
}
</style>
