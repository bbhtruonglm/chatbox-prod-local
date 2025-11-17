/**
 * @file N13ZaloPersonal API class
 * @description Lớp kế thừa từ Botx, dùng để gọi các API liên quan đến Zalo cá nhân (N13).
 */

import { Botx } from '@/utils/api/Botx'
import { injectable } from 'tsyringe'

/** Khai báo group kiểu dữ liệu payload */
interface ICreateGroupZalo {
  /** Page id */
  page_id: string
  /** Tên group */
  group_name: string
  /** Id của nhân viên */
  member_ids: string[]
}
/** Khai báo group kiểu dữ liệu payload */
interface IUpdateGroupZalo {
  /** Page id */
  page_id: string
  /** Tên group */
  group_id: string
  /** Id của nhân viên */
  member_id: string[]
}
/** Khai báo group kiểu dữ liệu payload */
interface IRemoveMemberZalo {
  /** Page id */
  page_id: string
  /** Tên group */
  group_id: string
  /** Id của nhân viên */
  member_id: string
}

/**
 * @class N13ZaloPersonal
 * @extends Botx
 * @description API wrapper cho Zalo cá nhân N13. Cho phép gọi các endpoint liên quan đến group, tin nhắn, v.v.
 */
@injectable()
export class N13ZaloPersonal extends Botx {
  /**
   * @constructor
   * @param {string} path - Path bổ sung vào host N13 để tạo URL đầy đủ cho API
   */
  constructor(path: string) {
    /** Gọi constructor cha với URL đầy đủ */
    super(`${$env.host.n13_zalo_personal}/${path}`)
  }

  /**
   * Tạo nhóm Zalo mới
   * @param {Object} payload - Dữ liệu gửi lên API
   * @param {string} payload.page_id - ID của page Zalo thực hiện tạo nhóm
   * @param {string} payload.group_name - Tên nhóm Zalo muốn tạo
   * @param {string[]} payload.member_ids - Danh sách ID thành viên cần thêm vào nhóm
   * @returns {Promise<string>} Trả về message hoặc group ID từ server
   */
  public async createGroupZalo(payload: ICreateGroupZalo): Promise<string> {
    /** Gọi phương thức POST của Botx với endpoint 'create_group' và payload */
    return this.post('create_group', payload)
  }
  /**
   * Tạo nhóm Zalo mới
   * @param {Object} payload - Dữ liệu gửi lên API
   * @param {string} payload.page_id - ID của page Zalo thực hiện tạo nhóm
   * @param {string} payload.group_name - Tên nhóm Zalo muốn tạo
   * @param {string[]} payload.member_ids - Danh sách ID thành viên cần thêm vào nhóm
   * @returns {Promise<string>} Trả về message hoặc group ID từ server
   */
  public async addMemberZalo(payload: IUpdateGroupZalo): Promise<string> {
    /** Gọi phương thức POST của Botx với endpoint 'create_group' và payload */
    return this.post('add_member_group', payload)
  }
  /**
   * Tạo nhóm Zalo mới
   * @param {Object} payload - Dữ liệu gửi lên API
   * @param {string} payload.page_id - ID của page Zalo thực hiện tạo nhóm
   * @param {string} payload.group_name - Tên nhóm Zalo muốn tạo
   * @param {string[]} payload.member_ids - Danh sách ID thành viên cần thêm vào nhóm
   * @returns {Promise<string>} Trả về message hoặc group ID từ server
   */
  public async removeMemberZalo(payload: IRemoveMemberZalo): Promise<string> {
    /** Gọi phương thức POST của Botx với endpoint 'create_group' và payload */
    return this.post('remove_member_group', payload)
  }
}
