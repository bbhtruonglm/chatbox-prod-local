<template>
  <div
    @dragover.prevent
    @drop="onDropFile"
    id="router__chat"
    class="h-full w-full flex relative p-2 gap-2"
  >
    <HotAlert
      :codes="['ALMOST_REACH_QUOTA_AI', 'LOCK_FEATURE', 'PAGE_EXPIRED_SESSION']"
      is_chat
      class="absolute top-3 left-1/2 -translate-x-1/2 w-2/3 z-10"
    />

    <Menu />
    <Layout>
      <template #left>
        <LeftBar />
      </template>
      <template #right>
        <div class="flex gap-2 h-full">
          <CenterContent />
          <RightBar />
        </div>
      </template>
    </Layout>

    <AlertRechQuota
      @close_modal="goDashboard"
      @confirm="goDashboard()"
      ref="ref_alert_reach_quota"
    />
    <AlertAccountLimitReached ref="ref_alert_reach_limit" />
  </div>
</template>
<script setup lang="ts">
import { read_os } from '@/service/api/chatbox/billing'
import { update_info_conversation } from '@/service/api/chatbox/n4-service'
import { create_token_app_installed } from '@/service/api/chatbox/n5-app'
import {
  getCurrentOrgInfo,
  getPageInfo,
  getPageWidget,
} from '@/service/function'
import {
  listen as ext_listen,
  ping as ext_ping,
  getFbUserInfo,
} from '@/service/helper/ext'
import {
  useChatbotUserStore,
  useCommonStore,
  useConversationStore,
  useExtensionStore,
  useOrgStore,
  usePageStore,
} from '@/stores'
import { N4SerivceAppPage } from '@/utils/api/N4Service/Page'
import { N5AppV1AppApp } from '@/utils/api/N5App'
import { error } from '@/utils/decorator/Error'
import { loading } from '@/utils/decorator/Loading'
import { Toast } from '@/utils/helper/Alert/Toast'
import { Delay } from '@/utils/helper/Delay'
import { Socket } from '@/utils/helper/Socket'
import { User } from '@/utils/helper/User'
import { initRequireData, useDropFile } from '@/views/composable'
import { debounce, difference, intersection, keys, map, size } from 'lodash'
import { storeToRefs } from 'pinia'
import { container } from 'tsyringe'
import { onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import AlertAccountLimitReached from '@/components/AlertModal/AlertAccountLimitReached.vue'
import AlertRechQuota from '@/components/AlertModal/AlertRechQuota.vue'
import HotAlert from '@/components/HotAlert.vue'
import CenterContent from '@/views/ChatWarper/Chat/CenterContent.vue'
import LeftBar from '@/views/ChatWarper/Chat/LeftBar.vue'
import RightBar from '@/views/ChatWarper/Chat/RightBar.vue'
import Layout from '@/views/ChatWarper/Layout.vue'
import Menu from '@/views/ChatWarper/Menu.vue'

import BellSound from '@/assets/sound/notification-sound.mp3'

import type { SocketEvent } from '@/service/interface/app/common'
import type { ConversationInfo } from '@/service/interface/app/conversation'
import type { MessageInfo } from '@/service/interface/app/message'
import type { FacebookCommentPost } from '@/service/interface/app/post'
import type { StaffSocket } from '@/service/interface/app/staff'
import type { IAlert } from '@/utils/helper/Alert/type'
import type { OwnerShipInfo } from '@/service/interface/app/billing'
import { BackupApp } from '@/utils/api/Backup'
import { loadZip } from '@/db/ChatZipLoader'

// store
const pageStore = usePageStore()
const chatbotUserStore = useChatbotUserStore()
const conversationStore = useConversationStore()
const commonStore = useCommonStore()
const extensionStore = useExtensionStore()
const orgStore = useOrgStore()

const { ref_alert_reach_limit } = storeToRefs(commonStore)

// watch(
//   () => orgStore.selected_org_id,
//   async (newOrgId, oldOrgId) => {
//     if (newOrgId && newOrgId !== oldOrgId) {
//       await preloadBackup(newOrgId)
//     }
//   },
//   { immediate: true }
// )

// async function preloadBackup(orgId: string) {
//   if (!orgId) return
//   try {
//     const backupApi = new BackupApp('app') // gọi tới module backup
//     // Lấy thông tin backup cho orgId
//     const res = await backupApi.post(`backup/get_backup_info?org_id=${orgId}`)
//     console.log(res, 'ressss')

//     const zipUrl = res?.path_conversation
//     if (zipUrl) {
//       await loadZip(zipUrl) // load zip vào IndexedDB
//       console.log('✅ Backup loaded for org:', orgId)
//     } else {
//       console.log('⚠️ No backup available for org:', orgId)
//     }
//   } catch (error) {
//     console.error('Failed to preload backup for org', orgId, error)
//   }
// }

// utils
const { t: $t } = useI18n()
const $router = useRouter()
const $delay = container.resolve(Delay)
const $socket = container.resolve(Socket)

// composable
initRequireData()
const { onDropFile } = useDropFile()

/**cờ xác định người dùng có đang focus vào tab chat không */
const is_focus_chat_tab = ref(true)
/**ref modal cảnh báo hết gói */
const ref_alert_reach_quota = ref<InstanceType<typeof AlertRechQuota>>()

watch(
  () => conversationStore.select_conversation,
  (new_val, old_val) => getTokenOfWidget(new_val, old_val),
)

onMounted(() => {
  checkOverLimit()

  $main.getPageInfoToChat()

  $main.getPageOfCurrentOrg()

  initExtensionLogic()

  checkAllowNoti()

  // lắng nghe người dùng focus chat
  window.addEventListener('focus', checkFocusChatTab)
  window.addEventListener('blur', checkFocusChatTab)
})
// tiêu huỷ kết nối socket khi thoát khỏi component này
onUnmounted(() => {
  // đóng socket
  $socket.close()

  // huỷ lắng nghe focus chat
  window.removeEventListener('focus', checkFocusChatTab)
  window.removeEventListener('blur', checkFocusChatTab)
})

/** hàm kiểm tra xem đã vượt giới hạn gói chưa */
function checkOverLimit() {
  if (orgStore.isOverLimit()) {
    ref_alert_reach_limit.value?.toggleModal()
  }
}

/**chuyển đến trang dashboard */
function goDashboard() {
  $router.push('/dashboard')
}
/**kiểm tra xem người dùng có đang ở trong tab chatbox không */
function checkFocusChatTab($event: FocusEvent) {
  // nếu type của sự kiện là focus thì đánh dấu đang focus, ngược lại thì không
  is_focus_chat_tab.value = $event.type === 'focus'
}
/**gắn cờ nếu ext được kích hoạt + xử lý các logic */
function initExtensionLogic() {
  // đánh dấu đang tìm ext
  commonStore.extension_status = 'FINDING'

  /**ping qua ext để check tồn tại */
  // chờ 500ms để chắc chắn content script đã load
  setTimeout(() => ext_ping(), 500)

  // sau 3s mà không tìm thấy ext thì đánh dấu không tìm thấy
  setTimeout(() => {
    // nếu ext đã được tìm thấy rồi thì không cần check nữa
    if (commonStore.extension_status !== 'FINDING') return

    // đánh dấu không tìm thấy ext
    commonStore.extension_status = 'NOT_FOUND'
  }, 10000)

  // lắng nghe ext gửi thông điệp
  ext_listen((event, e, r) => {
    // đánh dấu đã phát hiện ext
    if (event === 'EXTENSION_INSTALLED') {
      // gắn cờ phát hiện ext
      commonStore.extension_status = 'FOUND'

      // gắn cờ force all tin nhắn qua ext
      if (r?.force_send_message_over_inbox)
        commonStore.force_send_message_over_inbox = true

      // nếu hội thoại đang được chọn chưa có uid thì check
      if (
        conversationStore.select_conversation?.fb_page_id &&
        (!conversationStore.select_conversation?.client_bio?.fb_uid ||
          !conversationStore.select_conversation?.client_bio?.fb_info)
      )
        getFbUserInfo(
          conversationStore.select_conversation?.platform_type,
          conversationStore.select_conversation?.fb_page_id,
          conversationStore.select_conversation?.fb_client_id,
          pageStore?.selected_page_list_info?.[
            conversationStore.select_conversation?.fb_page_id
          ]?.page?.fb_page_token,
        )
    }

    // nếu nhận được thông tin cá nhân của hội thoại thì update
    if (event === 'GET_FB_USER_INFO' && r?.page_id && r?.client_id) {
      /**key để update hội thoại */
      const DATA_KEY = `${r?.page_id}_${r?.client_id}`

      // nếu tìm thấy uid thì tắt cờ đang quét uid
      if (r?.id) extensionStore.is_find_uid[DATA_KEY] = false
      // nếu tìm thấy thông tin thì tắt cờ đang quét thông tin khách hàng
      if (r?.info) extensionStore.is_find_client_info[DATA_KEY] = false

      // nếu không tìm thấy cả 2 dữ liệu thì tắt cờ và dừng
      if (!r?.id && !r?.info) {
        // tắt cờ đang quét uid
        extensionStore.is_find_uid[DATA_KEY] = false
        // tắt cờ đang quét thông tin khách hàng
        extensionStore.is_find_client_info[DATA_KEY] = false

        return
      }

      /**dữ liệu khách hàng hiện tại */
      const CLIENT_BIO: ConversationInfo['client_bio'] =
        conversationStore.conversation_list?.[DATA_KEY]?.client_bio || {}

      // nạp UID
      if (r?.id) CLIENT_BIO.fb_uid = r?.id

      // nạp thông tin khách hàng
      if (r?.info) {
        // nếu có thông tin khách hàng thì bật cờ có thông tin mới lên
        if (conversationStore.select_conversation) {
          conversationStore.select_conversation.has_new_info_from_ext = true
        }

        CLIENT_BIO.fb_info = r?.info
      }

      // ghi dữ liệu vào mảng
      if (conversationStore.conversation_list?.[DATA_KEY])
        conversationStore.conversation_list[DATA_KEY].client_bio = CLIENT_BIO

      // ghi dữ liệu vào user hiện tại đang chọn
      if (
        conversationStore.select_conversation &&
        conversationStore.select_conversation?.fb_client_id === r?.client_id
      )
        conversationStore.select_conversation.client_bio = CLIENT_BIO

      // cập nhật data lên server
      update_info_conversation(
        {
          page_id: r?.page_id,
          client_id: r?.client_id,
          fb_uid: r?.id,
          fb_info: r?.info,
        },
        (e, r) => {},
      )
    }
  })
}
/**khởi tạo token cho widget */
function getTokenOfWidget(
  new_val?: ConversationInfo,
  old_val?: ConversationInfo,
) {
  /**id trang hiện tại được chọn */
  const PAGE_ID = new_val?.fb_page_id
  /**id trang trước đó được chọn */
  const OLD_PAGE_ID = old_val?.fb_page_id

  if (!PAGE_ID) return

  /**danh sách id widget */
  let list_app_installed_id: {
    // app_installed_id: app_id
    [index: string]: string
  } = {}

  // khởi tạo dữ liệu
  getPageWidget(PAGE_ID)
    // ?.filter(widget => widget.active_widget)
    ?.map(widget => {
      list_app_installed_id[widget._id || ''] = widget.app_id || ''
    })

  create_token_app_installed(
    {
      page_id: PAGE_ID,
      list_app_installed_id,
      payload: {
        fb_client_id: conversationStore.select_conversation?.fb_client_id,
        page_name: getPageInfo(
          conversationStore.select_conversation?.fb_page_id,
        )?.name,
        label_data: map(
          pageStore.selected_page_list_info?.[PAGE_ID]?.label_list,
        )?.filter(label =>
          conversationStore.select_conversation?.label_id?.includes(label?._id),
        ),
        current_staff_id: chatbotUserStore.chatbot_user?.fb_staff_id,
        current_staff_name: chatbotUserStore.chatbot_user?.full_name,
        org_id: orgStore.selected_org_id,
      },
    },
    (e, r: any) => {
      if (e) return

      // nhập dữ liệu token mới
      conversationStore.list_widget_token = {
        new_page_id: PAGE_ID,
        old_page_id: OLD_PAGE_ID,
        data: r,
      }
    },
  )
}
/**giảm tải việc làm mới thời gian liên tục */
const debounceRefreshConversationTime = debounce(() => {
  // thông báo cho component cập nhật lại thời gian
  window.dispatchEvent(new CustomEvent('chatbox_conversation_refresh_time'))
}, 1000 * 5)

/** hàm xử lý sự kiện nhận được từ socket */
function handleSocketEvent(socket_data: {
  /**dữ liệu của khách hàng */
  conversation?: ConversationInfo
  /**dữ liệu tin nhắn mới */
  message?: MessageInfo
  /**dữ liệu nhân viên */
  staff?: StaffSocket
  /**tên sự kiện */
  event?: SocketEvent
  /**dữ liệu tin nhắn cần cập nhật */
  update_message?: MessageInfo
  /**dữ liệu comment cập nhật */
  update_comment?: FacebookCommentPost
}) {
  let { conversation, message, update_message, update_comment, event } =
    socket_data

  // gửi thông điệp đến component xử lý danh sách hội thoại
  if (validateConversation(conversation, message))
    window.dispatchEvent(
      new CustomEvent('chatbox_socket_conversation', {
        detail: {
          conversation,
          event,
        },
      }),
    )

  // gửi thông điệp đến component xử lý hiển thị danh sách tin nhắn
  if (size(message)) {
    // socket tin nhắn mới cho các component
    window.dispatchEvent(
      new CustomEvent('chatbox_socket_message', { detail: message }),
    )

    // render lại thời gian của hội thoại
    debounceRefreshConversationTime()
  }

  // gửi thông điệp cập nhật tin nhắn đã có
  if (size(update_message))
    window.dispatchEvent(
      new CustomEvent('chatbox_socket_update_message', {
        detail: update_message,
      }),
    )

  // gửi thông điệp cập nhật comment
  if (size(update_comment))
    window.dispatchEvent(
      new CustomEvent('chatbox_socket_update_comment', {
        detail: update_comment,
      }),
    )

  // thông báo cho người dùng nếu là tin nhắn của khách hàng gửi cho page
  if (message?.message_type === 'client') triggerAlert(conversation)
}

/**gửi thông báo cho nhân viên hiện tại */
function triggerAlert(conversation?: ConversationInfo) {
  // nếu người dùng đang focus vào tab chat thì không cần thông báo
  if (is_focus_chat_tab.value) return

  // phát nhạc thông báo
  ringBell()

  // bắn web noti
  pushWebNoti(conversation)
}
/**gửi thông báo bằng web noti - không chạy trên mac */
async function pushWebNoti(conversation?: ConversationInfo) {
  // dừng nếu không đủ điều kiện thực thi
  if (
    // nếu trình duyệt không hỗ trợ
    !('Notification' in window) ||
    // nếu người dùng không cấp quyền
    Notification.permission !== 'granted'
  )
    return

  /**tiêu đề */
  const TITLE = conversation?.client_name || commonStore.partner?.name || ''

  /**link avatar của khách hàng */
  const AVATAR = `https://chatbox-static-v3.botbanhang.vn/app/facebook/avatar/${conversation?.fb_client_id}?page_id=${conversation?.fb_page_id}&staff_id=${chatbotUserStore.chatbot_user?.fb_staff_id}&width=64&height=64&type=${conversation?.platform_type}`

  /**nội dung muốn thông báo */
  const MESSAGE_ALERT =
    conversation?.last_message ||
    $t('v1.view.main.dashboard.chat.new_message_alert')

  /**tạo đối tượng thông báo noti + thực hiện noti */
  const NOTI = new Notification(TITLE, { body: MESSAGE_ALERT, icon: AVATAR })

  // chờ 5 giây
  await new Promise(resolve => setTimeout(resolve, 5000))

  // tắt noti
  NOTI.close()
}
/**phát nhạc thông báo */
function ringBell() {
  const BELL = new Audio(BellSound)
  BELL.volume = 0.3
  BELL.play()
}
/**kiểm tra xem người dùng có cấp quyền cho phép thông báo không */
function checkAllowNoti() {
  // * lưu ý web noti chỉ chạy trên window, mac không chạy

  // nếu trình duyệt không hỗ trợ thì thôi
  if (!('Notification' in window)) return

  // nếu người dùng từ chối cấp quyền rồi thì thôi
  if (Notification.permission === 'denied') return

  // hỏi xin quyền từ người dùng
  Notification.requestPermission(permission => {
    // nếu trình duyệt đã hỗ trợ quyền này thì dừng
    if ('permission' in Notification) return

    // nếu trình duyệt không hỗ trợ thì dùng thủ thuật để lưu lại quyền
    // @ts-ignore
    Notification.permission = permission
  })
}
/**kiểm tra hội thoại có thoả mãn diều kiện lọc để được xuất hiện không */
function validateConversation(
  conversation?: ConversationInfo,
  message?: MessageInfo,
) {
  // nêu không có dữ liệu hội thoại thì chặn
  if (!conversation || !size(conversation)) return

  // đang lọc inbox thì không cho post qua
  if (
    conversationStore.option_filter_page_data.display_style === 'INBOX' &&
    message?.platform_type === 'FB_POST'
  )
    return

  // đang lọc post thì không cho inbox qua
  if (
    conversationStore.option_filter_page_data.display_style === 'COMMENT' &&
    message?.platform_type === 'FB_MESS'
  )
    return

  // đang lọc bạn bè
  if (
    conversationStore.option_filter_page_data.display_style === 'FRIEND' &&
    conversation?.is_group
  )
    return

  // đang lọc nhóm
  if (
    conversationStore.option_filter_page_data.display_style === 'GROUP' &&
    !conversation?.is_group
  )
    return

  // lọc theo search: tên, sdt, email
  if (
    conversationStore.option_filter_page_data.search &&
    (!conversation.client_name ||
      !new RegExp(conversationStore.option_filter_page_data.search, 'i').test(
        conversation.client_name,
      )) &&
    (!conversation.client_phone ||
      !new RegExp(conversationStore.option_filter_page_data.search, 'i').test(
        conversation.client_phone,
      )) &&
    (!conversation.client_email ||
      !new RegExp(conversationStore.option_filter_page_data.search, 'i').test(
        conversation.client_email,
      ))
  )
    return

  // lọc có sdt
  if (
    conversationStore.option_filter_page_data.have_phone === 'YES' &&
    !conversation.client_phone
  )
    return

  // lọc không có sdt
  if (
    conversationStore.option_filter_page_data.have_phone === 'NO' &&
    conversation.client_phone
  )
    return

  // lọc theo thời gian
  if (
    !conversation.last_message_time ||
    (conversationStore.option_filter_page_data.time_range?.lte &&
      conversationStore.option_filter_page_data.time_range?.lte <
        new Date(conversation.last_message_time).getTime()) ||
    (conversationStore.option_filter_page_data.time_range?.gte &&
      conversationStore.option_filter_page_data.time_range?.gte >
        new Date(conversation.last_message_time).getTime())
  )
    return

  // lọc theo nhân viên
  if (
    conversationStore.option_filter_page_data.staff_id &&
    (!conversation.fb_staff_id ||
      !conversationStore.option_filter_page_data.staff_id.includes(
        conversation.fb_staff_id,
      ))
  )
    return

  // lọc nhãn hoặc
  if (
    conversationStore.option_filter_page_data.label_id &&
    !conversationStore.option_filter_page_data.label_and &&
    !intersection(
      conversationStore.option_filter_page_data.label_id,
      conversation.label_id,
    ).length
  )
    return

  // lọc nhãn và
  if (
    conversationStore.option_filter_page_data.label_id &&
    conversationStore.option_filter_page_data.label_and &&
    (!conversation.label_id ||
      !conversation.label_id.length ||
      difference(
        conversationStore.option_filter_page_data.label_id,
        conversation.label_id,
      ).length)
  )
    return

  // lọc loại trừ nhãn
  if (
    conversationStore.option_filter_page_data.not_label_id &&
    intersection(
      conversationStore.option_filter_page_data.not_label_id,
      conversation.label_id,
    ).length
  )
    return

  // lọc khách spam
  if (
    conversationStore.option_filter_page_data.is_spam_fb === 'YES' &&
    !conversation.is_spam_fb
  )
    return

  // lọc hội thoại chưa gắn nhãn
  if (
    conversationStore.option_filter_page_data.not_exist_label &&
    size(conversation.label_id)
  )
    return

  return true
}

class CustomToast extends Toast implements IAlert {
  public error(message: any): void {
    // nếu lỗi là không có quyền truy cập thì thông báo khác
    if (message?.message === 'COMMON.ACCESS_DENIED')
      return ref_alert_reach_quota.value?.toggleModal()

    // thông báo lỗi
    super.error(message)
  }
}

class Main {
  /**đọc dữ liệu của các page được chọn lưu lại */
  @loading(toRef(commonStore, 'is_loading_full_screen'))
  // nếu lỗi thì chuyển về trang chọn page
  @error(new CustomToast())
  async getPageInfoToChat() {
    // delay một chút để load dữ liệu từ local vào store kịp
    await $delay.exec(200)

    /**danh sách id các page được chọn */
    const SELECTED_PAGE_IDS = keys(pageStore.selected_page_id_list)

    // nếu không có page nào được chọn thì thôi
    if (!SELECTED_PAGE_IDS?.length) return goDashboard()

    // nạp lại dữ liệu của tổ chức hiện tại đang chọn cho chắc
    getCurrentOrgInfo()

    /** nếu vẫn không có tổ chức thì thôi */
    if (!orgStore.selected_org_id)
      throw $t('v1.view.main.dashboard.chat.error.get_org_info')

    /**dữ liệu các trang đang chọn */
    const PAGES = await new N4SerivceAppPage().getPageInfoToChat(
      orgStore.selected_org_id,
      SELECTED_PAGE_IDS,
      true,
    )

    // nếu không có dữ liệu trang nào thì thôi
    if (!PAGES) throw $t('v1.view.main.dashboard.chat.error.get_page_info')

    // lưu dữ liệu trang đã chọn
    pageStore.selected_page_list_info = PAGES

    // lưu dữ liệu nhân viên của các trang đã chọn
    pageStore.selected_pages_staffs = User.getUsersInfo(PAGES)

    // lưu lại các widget trên chợ, để map cta
    pageStore.market_widgets = await new N5AppV1AppApp()
      .readMarket()
      .catch(() => undefined)

    // khởi tạo kết nối socket lên server
    $socket.connect(
      $env.host.n3_socket,
      keys(pageStore.selected_page_id_list),
      chatbotUserStore.chatbot_user?.fb_staff_id || '',
      handleSocketEvent,
    )
  }

  /** lấy danh sách trang của tổ chức hiện tại */
  async getPageOfCurrentOrg() {
    // nếu không có id tổ chức thì thôi
    if (!orgStore.selected_org_id) return

    /**lấy danh sách trang của tổ chức hiện tại */
    const OSS = await read_os(orgStore.selected_org_id)

    // lưu danh sách các trang của tổ chức hiện tại vào store
    orgStore.list_os = OSS

    // lọc ra các trang zalo cá nhân
    this.markOrgHaveZalo(OSS)
  }

  /**đánh dấu xem tổ chức này có page zalo không */
  markOrgHaveZalo(oss: OwnerShipInfo[]) {
    /**lọc ra các trang zalo cá nhân */
    pageStore.zlp_oss = oss.filter(
      os => os?.page_info?.type === 'ZALO_PERSONAL',
    )
  }
}
const $main = new Main()
</script>
