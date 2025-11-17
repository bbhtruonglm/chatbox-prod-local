import type { FacebookCommentPost } from '@/service/interface/app/post'

/**dữ liệu phân tích của bài viết */
export interface IPostAnalyticData {
  // dữ liệu có sẵn quét từ FB
  /**tổng số lượt reaction */
  // total_reactions?: number
  /**tổng số lượt bình luận */
  total_comment?: number
  /**tổng số lượt chia sẻ */
  total_share?: number
  /**tổng số lượt reaction like */
  total_reaction_like?: number
  /**tổng số lượt reaction love */
  total_reaction_love?: number
  /**tổng số lượt reaction wow */
  total_reaction_wow?: number
  /**tổng số lượt reaction haha */
  total_reaction_haha?: number
  /**tổng số lượt reaction sorry */
  total_reaction_sorry?: number
  /**tổng số lượt reaction anger */
  total_reaction_anger?: number

  // phân loại cảm xúc
  /**tổng số lượt cảm xúc tích cực */
  total_emotion_positive?: number
  /**tổng số lượt cảm xúc tiêu cực */
  total_emotion_negative?: number
  /**tổng số lượt cảm xúc trung lập */
  total_emotion_neutral?: number

  // dữ liệu phân tích cảm xúc
  /**tổng số lượt thích */
  total_emotion_like?: number
  /**tổng số lượt cảm thấy vui */
  total_emotion_happy?: number
  /**tổng số lượt cảm thấy buồn */
  total_emotion_sad?: number
  /**tổng số lượt cảm thấy tức giận */
  total_emotion_angry?: number

  // dữ liệu phân tích CTA
  /**tổng số lượt cta địa chỉ */
  total_cta_address?: number
  /**tổng số lượt cta tài liệu */
  total_cta_document?: number
  /**tổng số lượt cta email */
  total_cta_email?: number
  /**tổng số lượt cta link */
  total_cta_link?: number
  /**tổng số lượt cta số điện thoại */
  total_cta_phone?: number
  /**tổng số lượt cta đặt hàng */
  total_cta_place_order?: number
  /**tổng số lượt cta sale */
  total_cta_sale?: number
  /**tổng số lượt cta giao hàng */
  total_cta_shipping?: number
  /**tổng số lượt cta thời gian */
  total_cta_time?: number
  /**tổng số lượt cta giao dịch */
  total_cta_transaction?: number
}
/**bài viết */
export interface IPostAnalytic {
  /**id trang */
  page_id?: string
  /**id bài viết */
  post_id?: string
  /**dữ liệu phân tích của bài viết */
  post_analytic_data?: IPostAnalyticData
}
/**kích thước của file */
export interface AttachmentSize {
  /**độ rộng */
  width?: number
  /**độ cao */
  height?: number
}
export interface IPortContent {
  /**thời gian tạo */
  created_time?: string
  /**id bài viết */
  id?: string
  /**tên người tạo */
  creator_name?: string
  /**dữ liệu của admin */
  admin_creator?: {
    /**tên */
    name: string
  }
  /**dữ liệu người tạo */
  from?: {
    /**tên */
    name: string
  }
  /**file đính kèm */
  attachments?: {
    /**dữ liệu */
    data?: [
      {
        /**đa phương tiện */
        media?: {
          /**hình ảnh chính */
          image?: {
            /**đường dẫn */
            src?: string
          }
        }
        /**tiêu đề bài viết */
        title?: string
      }
    ]
  }
  /**nội dung thông điệp */
  message?: string
  /**đường dẫn của bài viết */
  permalink_url?: string
  /**thời gian cập nhật bài vieets */
  updated_time?: string
}
/**dữ liệu của 1 bài post */
export interface IPost extends IPortContent {
  /**thời gian tạo bài viết */
  createdAt?: string
  /**nội dung bài viết */
  content?: IPortContent
  /**loại nền tảng */
  post_platform?: 'FB'
  /**id trang */
  page_id?: string
  /**id bài viết */
  post_id?: string
}
/**dữ liệu của một tin nhắn */
export interface MessageInfo {
  /**só diện thoại phát hiện được từ tin nhắn */
  client_phone?: string
  /**tên khách hàng nhắn vào nhóm */
  group_client_name?: string
  /**id khách hàng nhắn vào nhóm */
  group_client_id?: string
  /**avt của khách nhắn vào nhóm */
  group_client_avatar?: string
  /**comment của tin nhắn này có bị ẩn không */
  is_hidden_comment?: boolean
  /**đã trả lời bí mật chưa */
  is_private_reply?: boolean
  /** Dữ liệu bình luận trả lời được tiêm thêm vào */
  reply_comments: FacebookCommentPost[]
  /**dữ liệu của 1 bài post, tin nhắn dạng post */
  post?: IPost
  /**id của bình luận này */
  comment_id?: string
  /**cảm xúc thả tim của tin nhắn */
  reaction?: {
    /**loại reaction */
    reaction?: string
    /**icon đại diện */
    emoji?: string
    /**thời gian cập nhật */
    updatedAt?: string
  }
  /**tin nhắn này có phải bị sửa không */
  is_edit?: boolean
  /**danh sách các kích thước của file */
  attachment_size?: AttachmentSize[]
  /**AI đánh dấu là tin bị rep chậm */
  is_ai_slow_reply?: boolean
  /**hệ thống đánh dấu tin bị rep chậm */
  is_system_slow_reply?: boolean
  /**id bản ghi mongo */
  _id: string
  /**tin nhắn này thuộc loại gì */
  platform_type?: 'FB_MESS' | 'FB_POST' | 'WEBSITE'
  /**id trang */
  fb_page_id: string
  /**id khách hàng */
  fb_client_id: string
  /**tin nhắn được gửi từ đâu */
  message_type: 'page' | 'client' | 'system' | 'note' | 'activity' | 'group'
  /**thời gian tin được gửi */
  time: string
  /**nội dung tin nhắn văn bản */
  message_text?: string
  /**nội dung tin nhắn dạng postback - người dùng click vào button */
  postback_title?: string
  /**nội dung tệp đính kèm */
  message_attachments?: AttachmentInfo[]
  /**id của tin nhắn ở hệ thống chính */
  message_mid?: string
  /**thông tin thêm của tin nhắn này */
  message_metadata?: string
  /** id quảng cáo */
  ad_id?: string
  /** id bài post fb */
  fb_post_id?: string
  /**dữ liệu khi comment */
  comment?: FacebookCommentPost
  /**thời gian tạo bản ghi của server */
  createdAt: string
  /**mid của tin được reply nếu có */
  replay_mid?: string
  /**nội dung tin nhắn trước đó được reply nếu có */
  snap_replay_message?: MessageInfo
  /**dữ liệu của AI */
  ai?: MessageAiData[]
  /** sender id id người gửi*/
  sender_id?: string
}

/**
 * loại trả lời
 * - REPLY: trả lời bình luận bình thường
 * - PRIVATE_REPLY: trả lời tin nhắn riêng
 */
export type IReplyCommentType = 'REPLY' | 'PRIVATE_REPLY'

/**dữ liệu cần thiết để trả lời bình luận */
export interface IReplyComment {
  /**loại trả lời */
  type?: IReplyCommentType
  /**id của bình luận gốc */
  root_comment_id?: string
  /**nội dung bình luận gốc */
  root_comment_message?: string
  /**vị trí của tin nhắn chứa bình luận */
  message_index?: number
  /**có đang loading không */
  is_loading?: boolean
  /**id bài viết */
  post_id?: string
}

/**dữ liệu AI của một phần tử */
export interface MessageAiData {
  /**thành phố */
  city?: string
  /**sdt */
  phone?: string
  /**email */
  email?: string
  /**địa chỉ */
  address?: string
  /**cảm xúc */
  emotion?: string
  /**dữ liệu được orc từ media -> text */
  ocr?: IMediaOcrResult
  /**dữ liệu được chuyển từ text -> CTA */
  cta?: string
  /**id mongo tự tạo */
  _id?: string
  /**tóm tắt orc */
  summary?: string
}

/**kết quả khi chuyển media thành văn bản */
export interface IMediaOcrResult {
  /**văn bản gốc */
  original_text?: string
  /**ngôn ngữ gốc */
  original_language?: string
  /**văn bản dịch */
  translated_text?: string
  /**độ chính xác của OCR */
  ocr_confidence?: number
  /**mô tả */
  description?: string
  /**loại tài liệu */
  document_type?: string
  /**
   * dữ liệu ocr này bắt nguồn từ tin nhắn dạng nào
   * - IMAGE: hình ảnh
   * - SOUND: âm thanh
   * - TEXT: văn bản
   * - các dạng khác chưa xử lý
   */
  origin_message_type?: 'IMAGE' | 'SOUND' | 'TEXT'
}

/**dữ liệu của một mẫu tin nhắn */
export interface MessageTemplateInput {
  /**hình ảnh */
  image?: {
    /**đường dẫn hình ảnh */
    url?: string
  }
  /**video */
  video?: {
    /**đường dẫn video */
    url?: string
  }
  /**audio */
  audio?: {
    /**đường dẫn audio */
    url?: string
  }
  /**tập tin khác */
  file?: {
    /**đường dẫn tập tin */
    url?: string
  }
  /**tiêu đề */
  title?: string
  /**nội dung */
  content?: string
  /**dữ liệu ai detect ra văn bản từ media */
  ocr?: IMediaOcrResult
  /**danh sáchnút */
  list_button?: MessageTemplateButton[]
  /**có xử lý AI thành công */
  is_ai?: boolean
  /**dữ liệu AI nếu có */
  ai?: MessageAiData
}
/**dữ liệu của một nút bấm của mẫu tin nhắn */
export interface MessageTemplateButton {
  /**kiểu của nút này */
  type?: ButtonType
  /**tiêu đề nút */
  title?: string
  /**đường dẫn của nút */
  url?: string
}

/**đầu vào của api */
export interface QueryMessage {
  /**id trang */
  page_id?: string
  /**id khách hàng */
  client_id?: string
  /**phân trang */
  skip?: number
  /**phân trang */
  limit?: number
}

/**các loại tệp fb cho phép gửi */
export type FileTypeInfo = 'audio' | 'file' | 'image' | 'template' | 'video'

/**body khi gửi tin nhắn */
export interface SendMesageInput {
  /**id trang */
  page_id: string
  /**id khách hàng */
  client_id: string
  /**nội dung tin nhắn dạng văn bản */
  text?: string
  attachment?: {
    /**link của file muốn gửi */
    url: string
    /**file muốn gửi là loại gì */
    type: FileTypeInfo
  }
  /**gửi tin nhắn vào nhóm */
  is_group?: boolean
  /** tin nhắn dạng ghi chú */
  is_note?: boolean
}
/**body khi gửi tin nhắn */
export interface SendMesageInputHorizontal {
  /**id trang */
  page_id: string
  /**id khách hàng */
  client_id: string
  /**nội dung tin nhắn dạng văn bản */
  text?: string
  attachments?: {
    /**link của file muốn gửi */
    url: string
    /**file muốn gửi là loại gì */
    type: FileTypeInfo
  }[]
  attachment?: {
    /**link của file muốn gửi */
    url: string
    /**file muốn gửi là loại gì */
    type: FileTypeInfo
  }
  /**gửi tin nhắn vào nhóm */
  is_group?: boolean
  /** tin nhắn dạng ghi chú */
  is_note?: boolean
}

/**nội dung của tin nhắn tạm vừa được gửi */
export interface TempSendMessage {
  /**id của tin nhắn */
  message_id?: string
  /**nội dung tin nhắn đã gửi */
  text: string
  /**thời gian gửi tin nhắn */
  time: string
  /**lỗi khi gửi tin nhắn */
  error?: boolean
  /**id tạm dưới client */
  temp_id: string
}

/**dữ liệu 1 file */
export interface AttachmentInfo {
  /**thêm index để mapping */
  index?: number
  /**file là dạng gì */
  type?: 'image' | 'video' | 'audio' | 'file' | 'template' | 'fallback'
  /**tiêu đề */
  title?: string
  /**đường link */
  url?: string
  /**nội dung dữ liệu */
  payload?: {
    /**đường dẫn của file */
    url?: string
    /**kiểu của tin nhắn này */
    template_type?: 'button' | 'generic' | 'media'
    /**dữ liệu tin nhắn dạng carousel */
    elements?: AttachmentPayload[]
    /**dữ liệu của nút bấm */
    buttons?: ChatbotButton[]
    /**tiêu đề trang */
    title?: string
  }
}
/**dữ liệu kiểu slider */
export interface AttachmentPayload {
  /**tiêu đề */
  title?: string
  /**chú thích */
  subtitle?: string
  /**link ảnh hiển thị */
  image_url?: string
  /**link của video - tạo thêm */
  video_url?: string
  /**link của audio - tạo thêm */
  audio_url?: string
  /**link của file - tạo thêm */
  file_url?: string
  /**link của cả khối */
  item_url?: string
  /**dữ liệu của nút bấm */
  buttons?: ChatbotButton[]

  /**kiểu của file */
  media_type?: 'image' | 'video'
  /**đường link của file */
  url?: string
}
/**dữ liệu file được cache */
export interface AttachmentCacheList {
  [index: string]: AttachmentInfo[]
}

/**đầu vào api đọc nội dung file */
export interface InputGetUrlAttachment {
  /**id của đối tượng mục tiêu */
  target_id: string
  /**kiểu của đối tượng */
  type: 'MESSAGE' | 'POST' | 'COMMENT'
  /**id trang */
  page_id: string
}

/**kiểu của nút */
export type ButtonType =
  | 'postback'
  | 'web_url'
  | 'phone_number'
  | 'bbh_place_order'
  | 'bbh_create_transaction'
  | 'bbh_schedule_appointment'
  | 'bbh_address'
  | 'bbh_document'
  | 'bbh_email'
  | 'bbh_link'
  | 'bbh_phone'
  | 'bbh_sale'
  | 'bbh_shipping'

/**dữ liệu dạng nút bấm */
export interface ChatbotButton {
  /**dạng của nút này */
  type?: ButtonType
  /**tiêu đề của nút */
  title?: string
  /**hành động của nút này */
  payload?: string
  /**link của nút */
  url?: string
}

/**dữ liệu của trả lời nhanh */
export interface QuickAnswerInfo {
  /** ID bản ghi */
  id?: string
  /** Tiêu đề */
  title?: string
  /** Nội dung */
  content?: string
  /** ID page fb */
  fb_page_id?: string
  /** Danh sách ảnh đính kèm */
  list_images?: string[]
  /**dánh dấu là tính năng của AI đính kèm */
  is_ai?: boolean
}
