import type { FacebookCommentPost } from '@/service/interface/app/post'
import { N4Serivce } from '@/utils/api/N4Serivce'
import { singleton } from 'tsyringe'

/**Thông tin của một thành viên trong nhóm*/
export interface IGroupMember {
  /**Tên của thành viên*/
  client_name?: string
  /**avatar của thành viên*/
  client_avatar?: string
}

/**gọi API module page của chatbox */
@singleton()
export class N4SerivceAppZaloPersonal extends N4Serivce {
  constructor() {
    // gọi API module page của chatbot
    super('app/zalo_personal')
  }

  /**gửi lời mời kết bạn bằng id tin nhắn */
  public async sendFriendRequestByMessage(data: {
    page_id: string
    actual_page_id: string
    actual_client_id: string
    message_id?: string
    message?: string
  }): Promise<{
    /**đã kết bạn chưa */
    is_accept_friend_request?: boolean
  }> {
    return this.post('send_friend_request_by_message', data)
  }

  /** gửi lời mời kết bạn bằng sdt */
  public async sendFriendRequest(data: {
    page_id: string
    phone: string
    message?: string
  }) {
    return this.post('send_friend_request', data)
  }

  /** Lấy thông tin khách hàng zalo cá nhân */
  public async getInfoZaloPersonal(data: {
    page_id: string
    message_id?: string
    client_id?: string
    client_phone?: string
  }): Promise<{
    client_id?: string
    client_name?: string
    client_avatar?: string
    client_gender?: string
    client_birthday?: string
    client_phone?: string
    is_accept_friend_request?: boolean
  }> {
    return this.post('search_client', data)
  }

  /**
   * Lấy danh sách thành viên trong nhóm
   * @param page_id id của trang
   * @param groud_id trong nhóm thì id khách hàng là id nhóm
   */
  public async getGroupMenbers(
    page_id: string,
    group_id: string
  ): Promise<IGroupMember[]> {
    return this.post('get_group_member', {
      page_id,
      group_id,
    })
  }

  /**
   * Lấy id của khách đã nhắn với nhóm zalo đã chọn
   * @param page_id id của trang
   * @param message_id id của tin nhắn
   */
  public async getClientId(
    page_id: string,
    message_id: string
  ): Promise<string> {
    return this.post('get_client_id_by_message', {
      page_id,
      message_id,
    })
  }
}
