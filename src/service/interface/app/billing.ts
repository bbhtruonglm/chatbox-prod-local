import type { IPage, PageInfo } from './page'

import type { ChatbotUserInfo } from './chatbot_user'
import type { IBankAccount } from '@/utils/api/N4Service/Partner'

/**tổ chức */
export interface OrgInfo {
  /**gắn thêm cờ chọn tổ chức */
  is_selected?: boolean
  /**inject thêm dữ liệu nhân viên nếu cần */
  current_ms?: MemberShipInfo
  /**id của tổ chức */
  org_id?: string
  /**thông tin của tổ chức */
  org_info?: {
    /**tên tổ chức */
    org_name?: string
    /**avatar của tổ chức */
    org_avatar?: string
    /**mã tổ chức */
    org_customer_code?: string
    /**tên doanh nghiệp */
    org_company_name?: string
    /**sdt tổ chức */
    org_phone?: string
    /**mã hợp đồng */
    org_contract_code?: string
    /**mã số thuế */
    org_tax_code?: string
    /**địa chỉ tổ chức */
    org_address?: string
    /**email tổ chức */
    org_email?: string
    /**đại diện tổ chức */
    org_representative?: string
  }
  /**thông tin riêng tư của tổ chức */
  org_private?: {
    /**mã bí mật của tổ chức */
    org_secret_key?: string
  }
  /**các thiết lập của tổ chức */
  org_config?: {
    /**
     * chế độ hiển thị gắn nhãn
     * - ICON_TOOLTIP: Hiện chấm màu có chú giải
     * - ICON: Chỉ hiện chấm màu
     * - FULL: Hiện văn bản
     */
    org_display_label_type?: 'ICON_TOOLTIP' | 'ICON' | 'FULL'
    /**cài đặt ẩn ảnh của trang trong danh sách conversation, hover vào mới hiện */
    org_is_hide_page_avatar?: boolean
    /**chế độ hiển thị (sắp xếp) hội thoại */
    org_sort_conversation?: 'NEWEST' | 'UNREAD'
    /**yêu cầu bảo mật nâng cao 2FA */
    org_is_active_2fa?: boolean
    /**kích hoạt AI tự động dịch en -> vn */
    org_is_ai_auto_translate?: boolean
    /**kích hoạt AI tự động đề xuất câu trả lời */
    org_is_ai_auto_suggest_response?: boolean
    /**kích hoạt AI tự động đánh dấu các tin nhắn phàn nàn của khách hàng */
    org_is_ai_auto_alert_complain?: boolean
    /**kích hoạt AI tự động gắn nhãn cho khách hàng */
    org_is_ai_auto_auto_tag?: boolean
    /**cho phép tự động thanh toán khi đến hạn */
    org_is_auto_charge?: boolean
    /**id của người kích hoạt chế độ tự động thanh toán */
    org_auto_charge_actor?: string
    /**hiện hội thoại theo nhân viên chỉ định */
    org_is_only_visible_client_of_staff?: boolean
  }
  /**thông số về gói hiện tại của tổ chức */
  org_package?: {
    /**có cho phép chạy tính năng action tin nhắn call center và zalo không */
    org_allow_message_action?: boolean
    /**số tháng của gói hiện tại */
    org_months?: number
    /**đã giảm giá 1 lần rồi */
    org_has_discounted?: boolean
    /**loại gói của tổ chức */
    org_package_type?: OrgPackage
    /**phần trăm giảm giá khi tổ chức mua gói */
    org_discount?: number
    /**mốc thời gian mà sau đó thì discount hết hiệu lực */
    org_discount_end_date?: number
    /**đánh dấu tổ chức đã dùng thử rồi, không cho dùng thứ quá 1 lần */
    org_has_trial?: boolean
    /**có chặn luồng fau không */
    org_is_lock_fau?: boolean
    /**có chặn luồng khách hàng không */
    org_is_lock_client?: boolean
    /**có chặn luồng AI ký tự không */
    org_is_lock_ai_text?: boolean
    /**có chặn luồng AI hình ảnh không */
    org_is_lock_ai_image?: boolean
    /**có chặn luồng AI âm thanh không */
    org_is_lock_ai_sound?: boolean
    /**có chặn luồng AI video không */
    org_is_lock_ai_video?: boolean
    /**ngày bắt đầu sử dụng gói */
    org_start_date?: number
    /**ngày kết thúc sử dụng gói */
    org_end_date?: number
    /**giới hạn số lượng page tối đa của tổ chức */
    org_quota_page?: number
    /**giới hạn số lượng user tối đa của tổ chức */
    org_quota_staff?: number
    /**giới hạn số lượng fau tối đa của tổ chức */
    org_quota_fau?: number
    /**số khách hàng tối đa */
    org_quota_client?: number
    /**giới hạn số lượng AI xử lý ký tự của tổ chức */
    org_quota_ai_text?: number
    /**giới hạn số lượng AI xử lý hình ảnh của tổ chức */
    org_quota_ai_image?: number
    /**giới hạn số lượng AI xử lý âm thanh của tổ chức */
    org_quota_ai_sound?: number
    /**giới hạn số lượng AI xử lý video của tổ chức */
    org_quota_ai_video?: number
    /**số lượng trang hiện tại của tổ chức */
    org_current_page?: number
    /**số lượng user hiện tại của tổ chức */
    org_current_staff?: number
    /**số lượng fau hiện tại của tổ chức */
    org_current_fau?: number
    /**số khách hàng hiện tại */
    org_current_client?: number
    /**số lượng AI xử lý ký tự hiện tại của tổ chức */
    org_current_ai_text?: number
    /**số lượng AI xử lý hình ảnh hiện tại của tổ chức */
    org_current_ai_image?: number
    /**số lượng AI xử lý âm thanh hiện tại của tổ chức */
    org_current_ai_sound?: number
    /**số lượng AI xử lý video hiện tại của tổ chức */
    org_current_ai_video?: number
    /**cho phép tổ chức dùng tính năng zl cá nhân dù gói không cho phép */
    org_allow_zlp?: boolean
  }
}

/**bảng tạm liên kết giữa tổ chức và người dùng */
export interface MemberShipInfo {
  /**inject thêm thông tin cá nhân */
  user_info?: ChatbotUserInfo
  /**id của tổ chức */
  org_id?: string
  /**id của nhân viên của tổ chức */
  staff_id?: string
  /**vai trò của nhân viên trong tổ chức */
  ms_role?: 'ADMIN' | 'STAFF'
  /**nhân viên đã được kích hoạt chưa */
  ms_is_active?: boolean
  /** thời gian tạo */
  createdAt?: string
}

/**gói của tổ chức */
export type OrgPackage = 'FREE' | 'TRIAL' | 'LITE' | 'PRO' | 'BUSINESS'

/**bảng tạm liên kết giữa tổ chức và trang */
export interface OwnerShipInfo {
  /**inject thêm thông tin của trang */
  page_info?: IPage
  /**id của tổ chức */
  org_id?: string
  /**id của trang của tổ chức */
  page_id?: string
}

/**kết quả của API lấy dữ liệu tổ chức của trang */
export interface PageOrgInfoMap {
  /**map id trang - id tổ chức */
  map_page_org: Record<string, string>
  /**map id tổ chức - id trang */
  map_org_page: Record<string, Record<string, 1>>
  /**map id tổ chức - thông tin tổ chức */
  map_org_info: Record<string, OrgInfo>
}

/**thông tin của ví */
export interface WalletInfo {
  /**id của ví */
  wallet_id?: string
  /**tổ chức sở hữu ví này: 1-1 */
  org_id?: string
  /**số dư hiện tại của ví */
  wallet_balance?: number
}

/**dữ liệu ví, tiêm thêm một số dữ liệu */
export interface ICustomWallet extends WalletInfo {
  /**số dư credit */
  credit_balance?: number
  /**tổng số dư */
  estimate_balance?: number
  /**tổng chi phí */
  extra_cost?: number
}

/**Thông tin chuyển khoản */
export interface PaymentInfo {
  /**Mã ngân hàng */
  bank_bin: number
  /**Số tài khoản */
  account: number
  /**Tên chủ tài khoản */
  name: string
  /**Tên ngân hàng */
  bank: string
  /**định danh ngân hàng từ BE */
  code: string
}
/**thông tin giao dịch */
export interface TransactionInfo {
  /**tiền khuyến mại được tặng thêm */
  txn_credit_amount?: number
  /**loại tiền */
  txn_currency?: string
  /**id của giao dịch */
  txn_id?: string
  /**tổ chức thực hiện giao dịch này */
  org_id?: string
  /**id hoá đơn của giao dịch này */
  invoice_id?: string
  /**dánh dấu có xuất hoá đơn hay không */
  txn_is_issue_invoice?: boolean
  /**id của người đại diện tổ chức, người thực tế thực hiện giao dịch này */
  user_id?: string
  /**id của ví chủ của giao dịch */
  wallet_id?: string
  /**số tiền của giao dịch này */
  txn_amount?: number
  /**số tiền gốc của giao dịch này */
  txn_origin_amount?: number
  /**trạng thái của giao dịch */
  txn_status?: TransactionStatus
  /**phương thức thanh toán */
  txn_payment_method?: PaymentMethod
  /**các dữ liệu cần lưu thêm của giao dịch */
  txn_data?: {
    user_info?: ChatbotUserInfo
  }
  /**loại giao dịch */
  txn_type?: BillingType
  /**mô tả giao dịch */
  txn_description?: string
  /**ngày tạo */
  createdAt?: string
  /**id của mã khuyển mại được kích hoạt cho giao dịch nạp tiền này */
  txn_voucher_id?: string
  /**snap lại dữ liệu của mã khuyến mại tại thời điểm tạo */
  txn_voucher_info?: IVoucher
  /** phiên bản sử dụng */
  version?: string
}
/**dữ liệu đính kèm nếu mã theo phạm vi nhân viên */
export interface IStaffInfo {
  /**id doanh nghiệp */
  bm_id?: string
  /**id chi nhánh */
  bu_id?: string
}
/**giao diện dữ liệu mã giảm giá */
export interface IVoucher {
  /**tiền khi nạp mà có voucher này sẽ về stk của đổi tác */
  voucher_is_pay_partner?: boolean
  /**thông tin tài khoản của đối tác này */
  voucher_partner_info?: IBankAccount
  /**id của voucher này */
  voucher_id?: string
  /**phạm vi của mã này với khách hàng */
  client_id?: string
  /**phạm vi của mã này với nhân viên, đối tác */
  staff_id?: string
  /**id của đối tác mà id nhân viên đại diện */
  affiliate_id?: string
  /**dữ liệu đính kèm nếu mã theo phạm vi nhân viên */
  voucher_staff_info?: IStaffInfo
  /**phạm vi của mã này với quốc gia */
  voucher_country?: string
  /**phạm vi của mã này với domain */
  voucher_domain?: string
  /**ngày bắt đầu áp dụng mã */
  voucher_start_date?: Date
  /**ngày kết thúc áp dụng mã */
  voucher_end_date?: Date
  /**số tiền thấp nhất để có thể áp dung mã này */
  voucher_min_amount?: number
  /**số tiền cao nhất để có thể áp dung mã này */
  voucher_max_amount?: number
  /**tên mã giảm giá */
  voucher_code?: string
  /**mô tả về mã giảm giá */
  voucher_description?: string
  /**đơn vị tiền tệ */
  voucher_currency?: string
  /**mã có kích hoạt không */
  voucher_is_active?: boolean
  /**số lần áp dụng mã trên 1 khách hàng */
  voucher_max_use_per_client?: number
  /**giá trị của mã này */
  voucher_value?: number
  /**loại mã khuyến mại */
  voucher_type?: 'PERCENT' | 'AMOUNT'
  /**tác dụng của mã này là tăng hay giảm */
  voucher_effect?: 'INCREASE' | 'DECREASE'
  /**
   * số thời gian mã có hiệu lực tính từ lúc người dùng tạo tài khoản mới
   * tính theo milisecond
   * @example 1000 * 60 * 60 * 24 * 3 = 3 ngày
   */
  voucher_max_time?: number
  /**thời gian tối đa mà credit được tạo từ voucher này có thể sử dụng */
  voucher_credit_max_time?: number
  /**tổng số mã tối đa có thể sử dụng */
  voucher_max_use?: number
  /**số lần mã này đã được dùng */
  voucher_current_use?: number
}

/**
 * trạng thái của giao dịch
 * - chờ thanh toán
 * - thành công
 * - thất bại
 */
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

/**
 * phương thức thanh toán
 * - tiền mặt
 * - chuyển khoản
 * - VNPAY
 * - ZALO PAY
 * - MOMO
 * - thẻ tín dụng hoặc thẻ ATM
 */
export type PaymentMethod =
  | 'CASH'
  | 'TRANSFER'
  | 'VNPAY'
  | 'ZALO_PAY'
  | 'MOMO'
  | 'CARD'
  | 'INTERNAL'

/**
 * loại giao dịch
 * - nạp tiền vào ví
 * - rút tiền ra khỏi ví
 * - thanh toán cho hóa đơn
 */
export type BillingType = 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT'

/** --------------------- NOTI --------------------- */
/**thông tin của 1 thông báo */
export interface NotiInfo {
  /**dữ liệu đính kèm tuy theo từng type */
  noti_data?: {
    /**id của giao dịch */
    txn_id?: string
  }
  /**định danh của thông báo này */
  noti_code?: string
  /**id của thông báo này */
  noti_id?: string
  /**id của tổ chức thực hiện đặt hàng */
  org_id?: string
  /**tiêu đề của thông báo */
  noti_title?: string
  /**nội dung của thông báo */
  noti_content?: string
  /**thông báo này đã được đọc chưa */
  is_read?: boolean
  /**thời gian record này được xoá */
  auto_remove_at?: string
  /**thời gian thông báo được tạo */
  createdAt?: string
}

/**đầu vào API tạo mã qr */
export interface QrCodeInput {
  /**id của tổ chức */
  org_id: string
  /**mã BIN của ngân hàng */
  bank_bin: number
  /**số tài khoản người nhận */
  consumer_id: string
  /**số tiền chuyển khoản */
  amount: number
  /**nội dung chuyển khoản */
  message: string
  /** phiên bản   */
  version?: string
  /** mã giao dịch txn_id */
  txn_id?: string
}

/**loại quota của AI cơ bản */
export type QuotaAiBaseType = 'AI_TEXT'

/**loại quota của AI media */
export type QuotaAIMediaType = 'AI_IMAGE' | 'AI_SOUND' | 'AI_VIDEO'

/**loại quota của AI */
export type QuotaAiType = QuotaAiBaseType | QuotaAIMediaType

/**loại quota của chatbot */
export type QuotaChatbotType = 'FAU'

/**loại quota hệ thống */
export type QuotaSystemType = 'PAGE' | 'STAFF' | 'CLIENT'

/**loại quota */
export type QuotaType =
  | QuotaSystemType
  | QuotaChatbotType
  | QuotaAiBaseType
  | QuotaAIMediaType

/**các thông tin bổ sung của giao dịch */
export interface ITxnMeta {
  /**loại giao dịch */
  type?:
    | 'PURCHASE' // mua gói
    | 'INCREASE' // mua thêm
    | 'TOP_UP_WALLET' // chỉ nạp tiền vào ví
  /**loại sản phẩm */
  product?: OrgPackage | QuotaType
  /**số lượng */
  quantity?: number
}
