import {
  useConversationStore,
  usePageStore,
  useMessageStore,
  useOrgStore,
  useCommonStore,
} from '@/stores'
import { identity, isEqual, keys, omit, pickBy, size, sortBy } from 'lodash'
import { flow, toggle_loading } from '@/service/helper/async'
import { checkPricingValid } from '@/service/helper/pricing'
import { differenceInMinutes } from 'date-fns'
import {
  get_page_info_to_chat,
  reset_read_conversation,
} from '../api/chatbox/n4-service'
import { toastError } from '../helper/alert'
import { format as format_date } from 'date-fns'
import { useRoute } from 'vue-router'
import { nextTick } from 'vue'
import { getItem } from '../helper/localStorage'
import { useI18n, type ComposerTranslation } from 'vue-i18n'

import type { Cb, CbError } from '@/service/interface/function'
import type { ConversationInfo } from '../interface/app/conversation'
import type { AppInstalledInfo } from '../interface/app/widget'
import type { Router } from 'vue-router'
import type { MessageInfo } from '../interface/app/message'
import { copyToClipboard } from '../helper/copyWithAlert'
import { User } from '@/utils/helper/User'
import { LocaleSingleton } from '@/utils/helper/Locale'
import { Parser } from '@/utils/helper/Parser'
import { N4SerivceAppPage } from '@/utils/api/N4Service/Page'
import type { IPage } from '@/service/interface/app/page'

/**kiểm tra, xử lý một số logic trước khi đi đến trang chat */
export const preGoToChat = (proceed: Cb) => {
  const pageStore = usePageStore()
  const conversationStore = useConversationStore()
  const orgStore = useOrgStore()
  const commonStore = useCommonStore()

  // nếu vượt quá giới hạn gói hiện tại thì hiện modal cảnh báo
  if (orgStore.isOverLimit()) {
    commonStore.ref_alert_reach_limit?.toggleModal()
    return
  }

  flow(
    [
      // * kiểm tra xem page đã được chọn hay chưa
      (cb: CbError) => {
        if (!size(pageStore.selected_page_id_list))
          return cb('v1.view.main.dashboard.select_page.empty_page.title')

        cb()
      },
      // * nếu danh sách page chọn thay đổi, thì xoá filter conversation
      (cb: CbError) => {
        // nếu vẫn là các page cũ đã chọn thì bỏ qua
        if (
          isEqual(
            sortBy(keys(pageStore.selected_page_id_list)),
            sortBy(keys(pageStore.selected_page_list_info))
          )
        )
          return cb()

        // nếu chọn khác page thì

        //  xoá lọc
        resetConversationFilter()

        // xoá conversation đang chọn
        conversationStore.select_conversation = undefined

        // xóa widget
        pageStore.widget_list = []

        cb()
      },
    ],
    proceed,
    true
  )
}

/**xoá lọc hội thoại */
export const resetConversationFilter = () => {
  const conversationStore = useConversationStore()

  // reset bộ lọc
  conversationStore.option_filter_page_data.is_spam_fb = 'NO'

  // reset lọc nhanh
  conversationStore.selected_quick_filter = 'ALL'
  // conversationStore.option_filter_page_data = { is_spam_fb: 'NO' }
}

/**chọn một hội thoại */
export const selectConversation = (
  conversation: ConversationInfo,
  is_disable_focus?: boolean
) => {
  if (!conversation) return

  const conversationStore = useConversationStore()

  // chọn khách hàng này, lưu dữ liệu vào store
  conversationStore.select_conversation = conversation

  // đánh dấu tin nhắn là đã đọc
  reset_read_conversation(
    {
      page_id: conversation?.fb_page_id,
      client_id: conversation?.fb_client_id,
    },
    (e, r) => {
      if (e) return toastError(e)
    }
  )

  // tự động focus vào input chat
  if (!is_disable_focus)
    document.getElementById('chat-text-input-message')?.focus()
}

/**cuộn xuống cuối trang */
export const scrollToBottomMessage = (id?: string) => {
  /** id của danh sách tin nhắn */
  const ID = id || 'list-message'

  const LIST_MESSAGE = document.getElementById(ID)

  if (!LIST_MESSAGE) return

  // html được render thì mới cuộn
  nextTick(() => {
    setTimeout(() => {
      LIST_MESSAGE.scrollTop = LIST_MESSAGE.scrollHeight
    }, 200)
  })
}

/**
 * lấy danh sách nhãn của trang
 * @deprecated dùng hàm của store thay thế
 */
export const getPageLabel = (page_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id as string]?.label_list
}

/**lấy danh sách nhân viên của trang */
export const getPageStaff = (page_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id as string]?.staff_list
}

/**đọc tên của nhân viên */
export function getStaffName(page_id?: string, staff_id?: string) {
  const $t = useI18n().t

  return (
    getPageStaff(page_id)?.[staff_id as string]?.name ||
    `[${$t('v1.view.main.dashboard.chat.center_content.del_staff')}]`
  )
}

/**format thời gian đọc tin nhắn */
export function getStaffReadDate(staff_id: string) {
  const conversationStore = useConversationStore()

  const TIME =
    conversationStore.select_conversation?.staff_read?.[staff_id] || 0

  return format_date(new Date(TIME), 'HH:mm dd/MM/yyyy')
}

/**lấy danh sách widget của trang */
export const getPageWidget = (page_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id as string]?.widget_list
}
/**lấy dữ liệu nhân viên hiện tại có liên quan đến trang này */
export const getPageCurrentStaff = (page_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id as string]?.current_staff
}
/**
 * lấy dữ liệu của nhân viên của trang
 * @deprecated dùng hàm của store thay thế
 */
export const getStaffInfo = (page_id?: string, staff_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id!]?.staff_list?.[staff_id!]
}
/**lấy thông tin của trang */
export const getPageInfo = (page_id?: string) => {
  const pageStore = usePageStore()

  return pageStore.selected_page_list_info?.[page_id as string]?.page
}

/** lấy tên hiển thị của trang */
export const getPageName = (page_info?: IPage) => {
  // ưu tiên tên gợi sau đó mới đến tên của page
  return page_info?.alias || page_info?.name || 'N/A'
}

/**đọc dữ liệu của nhãn */
export const getILabel = (page_id?: string, label_id?: string) => {
  return getPageLabel(page_id)?.[label_id as string]
}

/**
 * lọc các nhãn chưa bị xoá
 * @deprecated dùng hàm của store thay thế
 */
export const getLabelValid = (page_id?: string, label_list?: string[]) => {
  return label_list?.filter(label_id => getILabel(page_id, label_id))
}

/**
 * kiểm tra staff hiện tại có phải là admin của page không
 * @deprecated dùng hàm của store thay thế
 */
export const isCurrentStaffIsPageAdmin = (page_id: string) => {
  const pageStore = usePageStore()

  /**dữ liệu của trang */
  const PAGE_INFO = pageStore.selected_page_list_info?.[page_id]

  // kiểm tra staff có nằm trong nhóm admin không
  if (
    !PAGE_INFO?.group_admin_id ||
    !PAGE_INFO?.current_staff?.group_staff ||
    !PAGE_INFO?.current_staff?.group_staff?.includes(PAGE_INFO?.group_admin_id)
  )
    return false

  return true
}

/**khởi tạo url và token cho iframe */
export const getIframeUrl = (widget: AppInstalledInfo) => {
  const conversationStore = useConversationStore()
  const pageStore = usePageStore()

  const URL_APP = widget.snap_app?.url_app
  const ACCESS_TOKEN =
    conversationStore.list_widget_token?.data?.[widget._id || '']

  const CHATBOX_TOKEN = getItem('access_token')
  const LOCALE = LocaleSingleton.getInst().get()
  const IS_PAGE_ADMIN = isCurrentStaffIsPageAdmin(widget.fb_page_id || '')

  /**token của đối tác */
  const PARTNER_TOKEN =
    pageStore.selected_page_list_info?.[
      conversationStore.select_conversation?.fb_page_id!
    ]?.partner_token

  /**id khách hàng */
  const CLIENT_ID = conversationStore.select_conversation?.fb_client_id

  /**tạo ra chuỗi query */
  const PARAMS = Parser.toQueryString({
    //v1
    access_token: ACCESS_TOKEN,
    // chatbox_token: CHATBOX_TOKEN,
    is_page_admin: IS_PAGE_ADMIN,

    //v2
    partner_token: PARTNER_TOKEN,
    client_id: CLIENT_ID,

    // both
    locale: LOCALE,
  })

  // trả về url đã tạo
  return `${URL_APP}?${PARAMS}`
}

/**mở link tab mới */
export const openNewTab = (url: string) => {
  window.open(url, '_blank')
}

/**mở link tab mới */
export const openPopup = (url: string, width = 800, height = 600) => {
  // Tính vị trí bên trái sao cho cửa sổ nằm giữa màn hình
  var left = (screen.width - width) / 2
  // Tính vị trí trên cùng sao cho cửa sổ nằm giữa màn hình
  var top = (screen.height - height) / 2

  var params = `width=${width}, height=${height}, top=${top}, left=${left}, resizable=yes, scrollbars=yes`

  // Mở cửa sổ popup
  window.open(url, 'PopupWindow', params)
}

/**kiểm tra xem có đang kích hoạt filter tin nhắn hay không */
export function isActiveMessageFilter() {
  const conversationStore = useConversationStore()

  if (
    conversationStore.option_filter_page_data.unread_message ||
    conversationStore.option_filter_page_data.not_response_client ||
    conversationStore.option_filter_page_data.not_exist_label ||
    conversationStore.option_filter_page_data.is_spam_fb === 'YES'
  )
    return true

  return false
}
/**check xem có đang kích hoạt lọc hội thoại hay không */
export function isFilterActive() {
  const conversationStore = useConversationStore()

  // đọc lấy dữ liệu lọc sẽ bỏ qua
  let filter = omit(conversationStore.option_filter_page_data, [
    'search', // tìm kiếm
    'conversation_type', // loại hội thoại
  ])

  // loại bỏ các giá trị bị undefied trong object
  filter = pickBy(filter, identity)

  // kiểm tra lọc
  // if (isEqual(filter, { is_spam_fb: 'NO' })) return false

  /** các key sẽ kiểm tra để biết có filter nào đang sử dụng không */
  const KEYS_CHECK_ACTIVE: (keyof typeof filter)[] = [
    'display_style',
    'unread_message',
    'not_response_client',
    'not_exist_label',
    'have_phone',
    'time_range',
    'label_id',
    'not_label_id',
    'staff_id',
    'is_reply',
    'have_email',
    'is_private_reply',
    'post_id',
  ]

  /** có đang không lọc hay không */
  const IS_NOT_FILTER =
    KEYS_CHECK_ACTIVE.every(key => !filter[key]) && filter.is_spam_fb === 'NO'

  return !IS_NOT_FILTER
}

/**lấy dữ liệu ngôn ngữ hiện tại */
export function getLocale() {
  // đọc ngôn ngữ hiện tại được lưu từ local storage
  return LocaleSingleton.getInst().get()
}

/**cài đặt id trang và user cho chat */
export function setParamChat(
  $router: Router,
  page_id: string,
  client_id: string
) {
  // $router.replace({ query: { p: page_id, u: client_id } })

  /** tab hội thoại được lưu trong store */
  const TAB = useConversationStore().option_filter_page_data.conversation_type

  $router.replace({
    query: {
      page_id: page_id,
      user_id: client_id,
      tab: TAB === 'POST' ? 'POST' : undefined,
    },
  })
}

/** Check trạng thái kích hoạt bộ lọc */
export function isActiveFilter(type: string): boolean {
  const conversationStore = useConversationStore()

  let status = false
  switch (type) {
    case 'date':
      if (
        conversationStore.option_filter_page_data.time_range &&
        !conversationStore.option_filter_page_data.post_id
      )
        status = true
      break
    case 'phone':
      if (
        conversationStore.option_filter_page_data.have_phone &&
        !conversationStore.option_filter_page_data.post_id
      )
        status = true
      break
    default:
      break
  }
  return status
}

/**
 * - đọc dữ liệu của các trang được chọn để chat
 * - đọc dữ liệu tổ chức
 * - i18n phải được truyền vào để đọc ngôn ngữ
 * @deprecated không dùng nữa
 */
export async function getSelectedPageInfo(
  $t: ComposerTranslation,
  proceed: Cb
) {
  const pageStore = usePageStore()

  /** nạp dữ liệu của tổ chức hiện tại */
  getCurrentOrgInfo()

  /** lấy dữ liệu trang muốn chat */
  get_page_info_to_chat(keys(pageStore.selected_page_id_list), (e, r) => {
    if (e) return proceed(e)
    if (!r)
      return proceed($t('v1.view.main.dashboard.chat.error.get_page_info'))

    /** lưu dữ liệu trang đã chọn */
    pageStore.selected_page_list_info = r

    /** lưu dữ liệu nhân viên của các trang đã chọn */
    pageStore.selected_pages_staffs = User.getUsersInfo(r)

    proceed()
  })
}

/**nạp dữ liệu của tổ chức hiện tại được chọn */
export function getCurrentOrgInfo() {
  const orgStore = useOrgStore()

  // nếu chưa có danh sách tổ chức thì không làm gì cả
  if (!size(orgStore.list_org)) return

  // tự động chọn tổ chức đầu tiên nếu
  if (
    // chưa có tổ chức nào được chọn
    !orgStore.selected_org_id ||
    // bị kick ra khỏi tổ chức hiện tại đang chọn
    !orgStore.list_org?.find(org => org.org_id === orgStore.selected_org_id)
  )
    orgStore.selected_org_id = orgStore.list_org?.[0]?.org_id

  // nạp dữ liệu của tổ chức hiện tại được chọn từ danh sách tổ chức
  orgStore.selected_org_info = orgStore.list_org?.find(
    org => org.org_id === orgStore.selected_org_id
  )
}

/**kiểm tra xem tin nhắn có quá thời gian không */
export function calcIsClientRepSlow(
  page_id?: string,
  time?: string,
  current_index?: number
) {
  // nếu không có page_id thì thôi
  if (!page_id || !current_index) return false

  // nếu không có thời gian thì thôi
  if (!time) return false

  /**thời gian rep chậm bị cảnh báo */
  let ALERT_TIME = getPageInfo(page_id)?.alert_slow_rep_time

  // nếu không bật cảnh báo thì thôi
  if (!ALERT_TIME || ALERT_TIME <= 0) return false

  const messageStore = useMessageStore()

  /**tin nhắn tiếp theo */
  let next_message = messageStore.list_message?.[current_index + 1]

  // nếu tin tiếp theo không phải là của page thì thôi
  if (!next_message || next_message?.message_type !== 'page') return false

  /**thời gian tin tiếp theo được nhắn */
  let next_date = next_message?.time || next_message?.createdAt

  if (!next_date) return false

  /**khoảng thời gian tính bằng phút giữa 2 tin */
  let duration_minute = differenceInMinutes(new Date(next_date), new Date(time))

  // nếu trong khoảng cho phép thì thôi
  if (duration_minute < ALERT_TIME) return false

  return true
}
/**kiểm tra xem trang có quá trễ không */
export function calcIsPageRepSlow(
  page_id?: string,
  current_index?: number,
  list_message?: MessageInfo[]
) {
  // nếu không có page_id thì thôi
  if (!page_id || !current_index) return false

  /**vị trí của tin nhắn trước đó */
  const BEFORE_INDEX = current_index - 1

  // nếu không có tin trước đó thì thôi
  if (BEFORE_INDEX < 0) return false

  /**tin nhắn trước đó */
  let before_message = list_message?.[BEFORE_INDEX]

  // nếu tin trước đó không phải là của client thì thôi
  if (!before_message || before_message?.message_type !== 'client') return false

  /**thời gian tin trước đó được nhắn */
  let before_date = before_message?.time || before_message?.createdAt

  // nếu không có thời gian thì thôi
  if (!before_date) return false

  // tính dựa vào hàm trước
  return calcIsClientRepSlow(page_id, before_date, BEFORE_INDEX)
}

/**
 * xử lý chuỗi tin nhắn trước khi hiển thị
 * @deprecated dùng renderTextV2() thay thế
 */
export function renderText(text: string) {
  /** regex kiểm tra số điện thoại */
  const REGEX_PHONE =
    /[\/]?(?:[+]84|0)(?:[\-\.\s])?[35789]+[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}/

  /** regex kiểm tra email */
  const REGEX_EMAIL =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$|([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi

  /** regex kiểm tra url */
  const REGEX_URL = /((http|https)?:\/\/[^\s]+)/g

  /**số điện thoại */
  let phone = REGEX_PHONE.exec(text)?.[0]?.trim()
  /**email */
  let email = REGEX_EMAIL.exec(text)?.[0]?.trim()
  /**đường dẫn url */
  let url = REGEX_URL.exec(text)?.[0]?.trim()

  // nếu sdt nằm trong link, thì loại bỏ sdt tìm được
  if (phone && url && url.includes(phone)) phone = undefined

  // nếu trong sdt có dấu '/' thì bỏ sdt tìm được
  if (phone?.includes('/')) phone = undefined

  // thay đổi hiển thị của sdt
  if (phone)
    text = text.replace(phone, ` <span class="phone-detect">${phone}</span>`)

  // thay đổi hiển thị của email
  if (email)
    text = text.replace(email, ` <span class="email-detect">${email}</span>`)

  // thay đổi hiển thị của url
  // if (url)
  //   text = text.replace(
  //     url,
  //     `<a class="link-detect" href="${url}" target="_blank">${url}</a>`
  //   )

  // trả về chuỗi đã xử lý
  return text
}

/** xử lý chuỗi tin nhắn trước khi hiển thị  */
export function renderTextV2(input: string): string {
  /** regex kiểm tra url */
  const URL_REGEX = /((http|https)?:\/\/[^\s]+)/g

  /** regex kiểm tra email */
  const EMAIL_REGEX =
    /^(([^<spanspan>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$|([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi

  /**regex kiểm tra số điện thoại */
  const PHONE_REGEX =
    /[\/]?(?:[+]84|0)(?:[\-\.\s])?[35789]+[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}?[\-\.\s]?\d{1}/g

  // Bước 1: bảo vệ link trước, thay tạm bằng placeholder
  const URL_PLACEHOLDERS: string[] = []

  /** nội dung tin nhắn sau khi đã thay tạm các url bằng placeholder */
  let protected_text = input.replace(URL_REGEX, match => {
    URL_PLACEHOLDERS.push(match)
    return `__URL_PLACEHOLDER_${URL_PLACEHOLDERS.length - 1}__`
  })

  // thay hiển thị các số điện thoại
  protected_text = protected_text.replace(PHONE_REGEX, match => {
    return `<span class="phone-detect" style="cursor: copy;">${match}</span>`
  })

  // thay hiện thị các email
  protected_text = protected_text.replace(EMAIL_REGEX, match => {
    return `<span class="email-detect" style="cursor: copy;">${match}</span>`
  })

  // trả các link về chỗ cũ
  protected_text = protected_text.replace(
    /__URL_PLACEHOLDER_(\d+)__/g,
    (_, index) => URL_PLACEHOLDERS[Number(index)]
  )

  return protected_text
}

/**xử lý sự kiện click vào tin nhắn để sao chép sdt, email */
export function clickCopyPhoneEmail($event: MouseEvent) {
  /**mục tiêu thực tế được click */
  const TARGET = $event.target as HTMLElement

  // nếu không phải là sdt, email thì thôi
  if (!['phone-detect', 'email-detect'].includes(TARGET.className)) return

  /**giá trị cấn copy */
  const VALUE = TARGET.innerText

  copyToClipboard(VALUE)
}
