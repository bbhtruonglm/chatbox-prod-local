import type { PageType } from './page'

export interface FilterConversation {
  /**loại hội thoại */
  conversation_type?: 'CHAT' | 'POST'
  /**lọc hội thoại chưa đọc */
  unread_message?: 'true' | 'false'
  /**tìm kiếm hội thoại theo tên | sdt | email */
  search?: string
  /**lọc hội thoại có tên */
  have_client_name?: boolean
  /**hiển thị tất cả hội thoại | chỉ hiển thị tin nhắn | chỉ hiển thị bình luận */
  display_style?: 'ALL' | 'INBOX' | 'COMMENT' | 'FRIEND' | 'GROUP'
  /**lọc hội thoại có | không có số điện thoại */
  have_phone?: 'YES' | 'NO'
  /**lọc hội thoại không có uid */
  not_have_fb_uid?: boolean
  /**lọc theo thời gian */
  time_range?: {
    /**thời gian bắt đầu */
    gte?: number
    /**thời gian kết thúc */
    lte?: number
  }
  /**lọc các hội thoại của 1 nhân viên */
  staff_id?: string[]
  /**lọc hội thoại bị gắn cờ spam */
  is_spam_fb?: 'YES' | 'NO'
  /**lọc hội thoại theo nhãn or */
  label_id?: string[]
  /**lọc hội thoại theo nhãn and */
  label_and?: boolean
  /**lọc hội thoại không có nhãn x */
  not_label_id?: string[]
  /**lọc hội thoại chưa trả lời */
  not_response_client?: 'true' | 'false'
  /**lọc hội thoại chưa gắn nhãn */
  not_exist_label?: 'true' | 'false'
  /**lọc hội thoại có email */
  have_email?: 'YES' | 'NO'
  /**lọc theo nền tảng */
  platform_type?: string
  /**lọc theo bài viết */
  post_id?: string
  /** Lọc theo bài viết đã nhắn tin private */
  is_private_reply?: string
  /** Lọc theo bài viết đã phản hồi */
  is_reply?: string
}

export interface QueryConversationInput extends FilterConversation {
  /**lọc theo danh sách page: "ID_1 ID_2 ID_3 ID_4" */
  page_id: string[]
  /**tìm 1 khách hàng */
  client_id?: string
  /**phân trang */
  skip?: number
  /**phân trang */
  limit?: number
  /**sắp xếp */
  sort?: string
  /**phân trang kiểu con trỏ */
  after?: number[]
}

/**dữ liệu của một khách hàng */
export interface ConversationInfo {
  /**thời gian chatbot được chạy tiếp */
  bot_resume_at?: number
  /**có phải là nhóm chat không */
  is_group?: boolean
  /**loại của hội thoại */
  conversation_type?: 'CHAT' | 'POST'
  /**id của nhân viên chăm sóc bản mới */
  user_id?: string
  /**cảm xúc cuối cùng */
  emotion?: string
  /**key cho vitual scroll */
  data_key?: string
  /**gắn cờ đặc biệt để có thể ẩn hội thoại đi */
  is_hidden?: boolean
  /**id của trang */
  fb_page_id: string
  /**id của khách hàng */
  fb_client_id: string
  /**kiểu của hội thoại này */
  platform_type?: PageType
  /**id của nhân viên được assign cho khách này */
  fb_staff_id?: string
  /** tên gốc của khách hàng */
  client_origin_name?: string
  /**tên khách hàng */
  client_name?: string
  /**ảnh đại diện của khách hàng nếu có */
  client_avatar?: string
  /**tin nhắn cuối cùng */
  last_message?: string
  /**tin nhắn cuối cùng của ai */
  last_message_type: 'client' | 'page'
  /**danh sách id các nhãn được gắn */
  label_id?: string[]
  /**đếm tổng sổ các tin nhắn chưa đọc */
  unread_message_amount?: number
  /**thời gian tin nhắn cuối cùng được gửi */
  last_message_time?: number
  /**sdt của khách hàng */
  client_phone?: string
  /**email của khách hàng */
  client_email?: string
  /**thông tin thêm của khách hàng */
  client_bio?: {
    /**uid fb quét được */
    fb_uid?: string
    /**thông tin khách hàng */
    fb_info?: Record<string, any>
  }
  /**snap dữ liệu của nhân viên được chỉ định nếu có */
  snap_staff?: {
    /**tên nhân viên */
    name?: string
  }
  /**thời gian cuối cùng mà user đọc tin nhắn */
  last_read_message?: string
  /**id và thời gian cuối cùng nhân viên đã đọc hội thoại này */
  staff_read?: {
    [index: string]: number
  }
  /**đánh dấu khách hàng này là spam */
  is_spam_fb?: boolean
  /**gắn thêm cờ, đánh dấu hội thoại này là chưa đọc */
  is_force_unread?: boolean
  /**thời gian tạo */
  createdAt?: string
  /**thời gian cập nhật */
  updatedAt?: string
  /**nội dung câu trả lời */
  ai_answer?: string
  /** giới tính */
  client_gender?: 'male' | 'female'

  // * Các field custome thêm
  /** có thông tin khách mới từ extension gửi về */
  has_new_info_from_ext?: boolean
  /** Mô tả huấn luyện AI */
  ai_description?: string
  /** id conversation */
  id?: string
  /** Tên gợi nhớ */
  client_alias_name?: string
  /** id của tin nhắn cuối cùng */
  last_message_id?: string
  /** field thời gian cập nhật cuối cùng  */
  last_update?: number
  /** danh sách id bài viết fb */
  list_fb_post_id?: string[]
  /** id org */
  org_id?: string
}

/**dữ liệu khách hàng dạng obj để dễ update */
export interface ConversationList {
  [index: string]: ConversationInfo
}

/**kết quả trả về khi đọc danh sách hội thoại */
export interface QueryConversationResponse {
  conversation?: ConversationList
  count?: number
  after?: number[]
  result?: ConversationInfo[]
}

/**đầu vào cần thiết để gọi api đến 1 khách hàng */
export interface QueryOneConversation {
  /**id trang */
  page_id: string
  /**id khách hàng */
  client_id: string
}

/**đầu vào api đánh dấu là đã đọc */
export interface QueryResetReadConversation extends QueryOneConversation {
  /**reset về mấy, mặc định là 0 */
  unread_message_amount?: number
}

/**đầu vào của api đói assign nhân viên */
export interface QuerySetAssignStaffConversation extends QueryOneConversation {
  /**id của nhân viên mới được assign */
  new_staff_id: string
  /**id của nhân viên cũ */
  old_staff_id?: string
}

/**đầu vào api toggle spam coversation */
export interface QueryToggleSpamConversation extends QueryOneConversation {
  /**giá trị của cờ */
  is_spam: boolean
}

/**đầu vào api toggle nhãn */
export interface QueryToggleLabelConversation extends QueryOneConversation {
  /**id của nhãn */
  label_id: string
}

/**đầu vào api cập nhật thông tin khách hàng */
export interface QueryUpdateÌnoConversation extends QueryOneConversation {
  /**sdt */
  client_phone?: string
  /**email */
  client_email?: string
  /**id của user fb */
  fb_uid?: string
  /**thông tin khách hàng */
  fb_info?: Record<string, any>
  /** giới tính */
  client_gender?: 'male' | 'female'
  /** Mô tả cho AI */
  ai_description?: string
}

export interface QueryPostMessage {
  /** ad_id */
  ad_id?: string
  /** post_id */
  post_id?: string
  /** page_id */
  page_id?: string
  /** client_id */
  client_id?: string
  /** target_id */
  target_id?: string
  /** Nội dung bình luận */
  text?: string
  sort?: string
  skip?: number
  limit?: number
}
