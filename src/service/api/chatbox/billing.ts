import type {
  ITxnMeta,
  MemberShipInfo,
  NotiInfo,
  OrgInfo,
  OrgPackage,
  OwnerShipInfo,
  PageOrgInfoMap,
  QrCodeInput,
  TransactionInfo,
  WalletInfo,
} from '@/service/interface/app/billing'

import type { QuotaType } from '@/service/interface/app/ai'
import { chatboxSync } from '@/service/api/chatbox/common'

/**đọc tổ chức */
export const read_org = async (org_id?: string): Promise<OrgInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/organization/read_org`,
    body: { org_id },
  })

/**cập nhật thiết lập, thông tin một tổ chức */
export const update_org = async (org_id: string, body: {}): Promise<OrgInfo> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/organization/update_org`,
    body: {
      org_id,
      ...body,
    },
  })

/**đọc danh sách các trang trong tổ chức */
export const read_os = async (org_id: string): Promise<OwnerShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/owner_ship/read_page`,
    body: { org_id },
  })

/**thêm trang vào tổ chức */
export const add_os = async (
  org_id: string,
  page_id: string
): Promise<OwnerShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/owner_ship/add_page`,
    body: { org_id, page_id },
  })

/**xoá trang khỏi tổ chức */
export const kick_os = async (
  org_id: string,
  page_id: string
): Promise<OwnerShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/owner_ship/kick_page`,
    body: { org_id, page_id },
  })

/**đọc dữ liệu tổ chức của trang liên quan */
export const read_link_org = async (
  page_ids: string[]
): Promise<PageOrgInfoMap> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/organization/read_link_org`,
    body: { page_ids },
  })

/**đọc danh sách các thành viên trong tổ chức */
export const read_ms = async (org_id: string): Promise<MemberShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/member_ship/read_member`,
    body: { org_id },
  })

/**thêm nhân viên vào tổ chức */
export const add_ms = async (
  org_id: string,
  member_id: string,
  ms_role?: string
): Promise<OwnerShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/member_ship/add_member`,
    body: { org_id, member_id, ms_role },
  })

/**xoá nhân viên khỏi tổ chức */
export const kick_ms = async (
  org_id: string,
  member_id: string
): Promise<OwnerShipInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/member_ship/kick_member`,
    body: { org_id, member_id },
  })

/**đọc thông tin của ví */
export const read_wallet = async (org_id: string): Promise<WalletInfo> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/wallet/read_wallet`,
    body: { org_id },
  })

/**đọc thông giao dịch */
export const read_txn = async (
  org_id: string,
  txn_id?: string
): Promise<TransactionInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/transaction/read_txn`,
    body: { org_id, txn_id },
  })

/**đọc thông giao dịch */
export const create_txn = async (
  org_id: string,
  wallet_id: string,
  txn_amount: number,
  txn_payment_method: TransactionInfo['txn_payment_method'],
  txn_is_issue_invoice: boolean,
  voucher_code?: string,
  meta?: ITxnMeta
): Promise<TransactionInfo> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/transaction/create_txn`,
    body: {
      org_id,
      wallet_id,
      txn_amount,
      txn_payment_method,
      txn_is_issue_invoice,
      voucher_code,
      meta,
    },
  })

/**mua gói */
export const purchase_package = async (
  org_id: string,
  wallet_id: string,
  package_type: OrgPackage,
  months: number
): Promise<TransactionInfo> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/wallet/purchase_package`,
    body: {
      org_id,
      wallet_id,
      package_type,
      months,
    },
  })

/**kích hoạt giảm giá 1 năm */
export const active_discount = async (
  org_id: string,
  wallet_id: string,
  package_type: OrgPackage
): Promise<TransactionInfo> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/wallet/active_discount`,
    body: {
      org_id,
      wallet_id,
      package_type,
    },
  })

/**mua thêm quota */
export const inc_quota = async (
  org_id: string,
  wallet_id: string,
  quota_type: QuotaType,
  amount: number
): Promise<void> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/wallet/inc_quota`,
    body: {
      org_id,
      wallet_id,
      quota_type,
      amount,
    },
  })

/**đếm thông báo */
export const read_noti = async (
  org_id?: string,
  noti_id?: string
): Promise<void> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/noti/read_noti`,
    body: { org_id, noti_id },
  })

/**đọc thông báo */
export const get_noti = async (
  org_id?: string,
  limit?: number,
  is_read?: {},
  noti_code?: string[]
): Promise<NotiInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/noti/get_noti`,
    body: { org_id, limit, is_read, noti_code },
    is_disable_org: true,
  })
/**đọc thông báo */
export const get_all_noti = async ({
  org_id,
  limit,
  is_read,
  noti_code,
  sort,
}: {
  org_id?: string[]
  limit?: number
  is_read?: {}
  noti_code?: string[]
  sort?: string
}): Promise<NotiInfo[]> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/noti/get_noti`,
    body: { org_id, limit, is_read, noti_code, sort },
    is_disable_org: true,
  })

/**xem thông báo */
export const count_noti = async (org_id: string): Promise<number> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/noti/count_noti`,
    body: { org_id },
    is_disable_org: true,
  })
/**xem thông báo */
export const count_all_noti = async (org_id: string[]): Promise<number> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/noti/count_noti`,
    body: { org_id },
    is_disable_org: true,
  })

/**tạo nội dung cho mã qr */
export const qr_code = async (body?: QrCodeInput): Promise<string> =>
  chatboxSync({
    uri: `${$env.host.billing}/app/wallet/qr_code`,
    body,
  })
