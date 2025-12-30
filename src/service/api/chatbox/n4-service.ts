import type {
  CreatePricing,
  PricingInfo,
  UpgradePricing,
} from '@/service/interface/app/pricing'
import type {
  GetFbPostInfo,
  GetPageGroupStaff,
  GroupStaffInfo,
  PageList,
  PageWebsiteCreate,
} from '@/service/interface/app/page'
import type {
  MessageInfo,
  QueryMessage,
  SendMesageInput,
  SendMesageInputHorizontal,
  IContextUndoMessage,
} from '@/service/interface/app/message'
import type {
  QueryConversationInput,
  QueryConversationResponse,
  QueryPostMessage,
  QueryResetReadConversation,
  QuerySetAssignStaffConversation,
  QueryToggleLabelConversation,
  QueryToggleSpamConversation,
  QueryUpdateÌnoConversation,
} from '@/service/interface/app/conversation'
import { chatbox, chatboxSync } from '@/service/api/chatbox/common'

import type { AllStaffList } from '@/service/interface/app/staff'
import type { Cb } from '@/service/interface/function'
import type { ChatbotUserInfo } from '@/service/interface/app/chatbot_user'
import type { FacebookCommentPost } from '@/service/interface/app/post'
import type { FacebookPost } from '@/service/interface/app/post'

/**đăng nhập bằng token của fb */
export const login_facebook = (
  access_token: string,
  proceed: (
    e: any,
    r: {
      access_token: string
      fb_staff_id: string
    }
  ) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/public/oauth/facebook/login`,
      body: { access_token },
    },
    proceed
  )

/** đọc thông tin của user hiện tại đang đăng nhập */
export const read_me_chatbot_user = (
  proceed: (e: any, r: ChatbotUserInfo) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/chatbot_user/read_me_chatbot_user`,
    },
    proceed
  )

/**dữ liệu của trang hiện tại kích hoạt */
export interface CurrentPageData {
  /**danh sách page đang kích hoạt */
  page_list: PageList
  /**danh sách nhân viên của các page trên */
  all_staff_list: AllStaffList
}
/**đọc thông tin của toàn bộ các page đang được kích hoạt của user hiện tại */
export const get_current_active_page = (
  body: {
    /**chỉ tìm các trang đã kích hoạt */
    is_active?: boolean
    /**chỉ tìm các trang thuộc 1 tổ chức */
    org_id?: string
  },
  proceed: (e: any, r: CurrentPageData) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/get_current_page`,
      body,
    },
    proceed
  )
/**đọc thông tin của toàn bộ các page đang được kích hoạt của user hiện tại */
export const get_current_active_page_sync = async (body: {
  is_active?: boolean
}): Promise<CurrentPageData> =>
  chatboxSync({
    uri: `${$env.host.n4_service_v2}/app/page/get_current_page`,
    body,
  })

/**cập nhật một số dữ liệu của page */
export const update_page = (
  body: {
    page_id?: string
    is_priority?: boolean
    is_active?: boolean
  },
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/update_page`,
      body,
    },
    proceed
  )
/**cập nhật một số dữ liệu của page - bất đồng bộ */
export const update_page_sync = async (body: {
  page_id?: string
  is_priority?: boolean
  is_active?: boolean
}) =>
  chatboxSync({
    uri: `${$env.host.n4_service_v2}/app/page/update_page`,
    body,
  })

/**đồng bộ dữ liệu page mới nhất từ facebook */
export const sync_facebook_page = (
  access_token: string,
  from: string | undefined,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/sync_facebook_page`,
      body: { access_token, from },
    },
    proceed
  )

/**tạo ra link oauth của zalo oa */
export const zalo_oa_get_url_oauth = (proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/zalo_oa_get_url_oauth`,
      // body: { redirect_uri: $env.zalo_oa.redirect_uri },
    },
    proceed
  )
/**đầu vào api đồng bộ page zalo */
interface SyncZaloOAPageInput {
  /**id page của OA */
  oa_id: string
  /**mã đổi lấy token */
  code: string
  /**mã xác minh ban đầu */
  code_verifier: string
  /**tên nhân viên hiện tại */
  staff_name: string
}
/**đồng bộ dữ liệu page zalo oa về chatbox */
export const sync_zalo_oa_page = (input: SyncZaloOAPageInput, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/sync_zalo_oa_page`,
      body: { is_debug: true, ...input },
    },
    proceed
  )

/**tạo mới page dạng website */
export const create_website_page = (body: PageWebsiteCreate, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/create_website_page`,
      body,
    },
    proceed
  )

/**đọc toàn bộ các gói của user */
export const read_me_pricing = (body: { pricing_id?: string }, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/read_me_pricing`,
      body,
    },
    proceed
  )

/**tính toán số tiền của một gói */
export const calc_price_of_pricing = (body: CreatePricing, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/calc_price_of_pricing`,
      body,
    },
    proceed
  )

/**tạo mới một gói */
export const create_pricing = (
  body: CreatePricing,
  proceed: (e?: any, r?: PricingInfo) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/create_pricing`,
      body,
    },
    proceed
  )

/**tính toán số tiền khi nâng cấp gói */
export const calc_price_of_upgrade_pricing = (
  body: UpgradePricing | {},
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/calc_price_of_upgrade_pricing`,
      body,
    },
    proceed
  )

/**tạo mới một gói */
export const upgrade_this_pricing = (
  body: UpgradePricing | {},
  proceed: (e?: any, r?: PricingInfo) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/upgrade_this_pricing`,
      body,
    },
    proceed
  )

/**huỷ một gói chưa thanh toán */
export const cancel_this_pricing = (
  pricing_id: string,
  proceed: (e?: any, r?: PricingInfo) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/cancel_this_pricing`,
      body: { pricing_id },
    },
    proceed
  )

/**đọc info của danh sách user */
export const read_pricing_info_of_list_chatbot_user = (
  list_staff: string[],
  proceed: (
    e?: any,
    r?: {
      [index: string]: ChatbotUserInfo
    }
  ) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/read_pricing_info_of_list_chatbot_user`,
      body: { list_staff },
    },
    proceed
  )

/**kích hoạt | huỷ kích hoạt page và staff */
export const control_active_pricing = (
  body: {
    pricing_id?: string
    active_page_id_list?: string[]
    inactive_page_id_list?: string[]
    active_staff_id_list?: string[]
    inactive_staff_id_list?: string[]
  },
  proceed: (e?: any, r?: PricingInfo) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/pricing/control_active_pricing`,
      body,
    },
    proceed
  )

/**đọc dữ liệu trực tuyến của các user */
export const online_staff = (
  list_page_id: string[],
  proceed: (
    e?: any,
    r?: {
      [index: string]: string
    }
  ) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/staff/online_staff`,
      body: { list_page_id },
    },
    proceed
  )

/**@deprecated đọc dữ liệu của page để chat */
export const get_page_info_to_chat = (
  list_page_id: string[],
  proceed: (e?: any, r?: PageList) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/page/get_page_info_to_chat`,
      body: { list_page_id },
    },
    proceed
  )

/**đọc dữ liệu của conversation */
export const read_conversation = (
  body: QueryConversationInput,
  proceed: (e?: any, r?: QueryConversationResponse) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/read_conversation`,
      body,
    },
    proceed
  )

/**đếm số conversation thoả mãn */
export const count_conversation = (
  body: QueryConversationInput,
  proceed: (e?: any, r?: number) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/count_conversation`,
      body,
    },
    proceed
  )

/**đọc dữ liệu của message */
export const read_message = (
  body: QueryMessage,
  proceed: (e?: any, r?: MessageInfo[]) => void
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/message/read_message`,
      body,
    },
    proceed
  )

/**
 * đánh dấu hội thoại là đã đọc
 * @deprecated dùng new N4SerivceAppOneConversation().resetRead thay thế
 */
export const reset_read_conversation = (
  body: QueryResetReadConversation,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/reset_read_conversation`,
      body,
    },
    proceed
  )

/**thay đổi assign nhân viên */
export const set_assign_staff_conversation = (
  body: QuerySetAssignStaffConversation,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/set_assign_staff_conversation`,
      body,
    },
    proceed
  )

/**thay đổi gắn cờ spam cho khách hàng */
export const toggle_spam_conversation = (
  body: QueryToggleSpamConversation,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/toggle_spam_conversation`,
      body,
    },
    proceed
  )

/**gửi tin nhắn đến khách hàng */
export const send_message = (body: SendMesageInputHorizontal, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/message/send_message`,
      body,
    },
    proceed
  )

/**hoàn tác tin nhắn */
export const undo_message = (body: IContextUndoMessage, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/message/undo_message`,
      body,
    },
    proceed
  )

/**toggle nhãn với hội thoại */
export const toggle_label_conversation = (
  body: QueryToggleLabelConversation,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/toggle_label_conversation`,
      body,
    },
    proceed
  )

/**cập nhật thông tin khách hàng */
export const update_info_conversation = (
  body: QueryUpdateÌnoConversation,
  proceed: Cb
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/conversation/update_info_conversation`,
      body,
    },
    proceed
  )

/** Lấy thông tin bài post từ ad_id */
export const get_post_from_ad_id = (body: QueryPostMessage, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/post/get_post_from_ad`,
      body,
    },
    proceed
  )

/** Lấy thông tin bài post từ post_id */
export const get_post_from_post_id = (body: QueryPostMessage, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/post/get_post_from_id`,
      body,
    },
    proceed
  )

/** Lấy bình luận từ bài post */
export const get_fb_post_comments = (
  body: QueryPostMessage,
  proceed: Cb<FacebookCommentPost[]>
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/post/get_comment`,
      body,
    },
    proceed
  )

/** Tạo bình luận phụ vào 1 bình luận trong bài post */
export const send_post_comment = (body: QueryPostMessage, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/post/send_comment`,
      body,
    },
    proceed
  )

export const private_inbox = (body: QueryPostMessage, proceed: Cb) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v2}/app/post/private_reply`,
      body,
    },
    proceed
  )

/**lấy danh sách nhóm nhân viên của một trang */
export const get_page_group_staff = (
  body: GetPageGroupStaff,
  proceed: Cb<GroupStaffInfo[]>
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v1}/v1/app/group-staff/read`,
      body,
      is_disable_org: true,
    },
    (e, r) => proceed(e, r?.group_staff)
  )

/** Lấy danh sách bài post theo các pages đang chọn */

export const get_post_list = (
  body: GetFbPostInfo,
  proceed: Cb<{ count: number; fb_post: FacebookPost[] }>
) =>
  chatbox(
    {
      uri: `${$env.host.n4_service_v1}/v1/app/fb-post/read`,
      body,
    },
    (e, r) => proceed(e, r)
  )
