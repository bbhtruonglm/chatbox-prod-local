import type {
  IPage,
  PageList,
  PageWebsiteCreate,
} from '@/service/interface/app/page'

import type { AllStaffList } from '@/service/interface/app/staff'
import type { LocationQueryValue } from 'vue-router'
import { N4Serivce } from '@/utils/api/N4Serivce'
import { singleton } from 'tsyringe'

/**dữ liệu của trang hiện tại kích hoạt */
export interface CurrentPageData {
  /**danh sách page đang kích hoạt */
  page_list?: PageList
  /**danh sách nhân viên của các page trên */
  all_staff_list?: AllStaffList
}

/**gọi API module page của chatbox */
@singleton()
export class N4SerivceAppPage extends N4Serivce {
  constructor() {
    /** gọi API module page của chatbot */
    super('app/page')
  }

  /**đọc danh sách trang mà người dùng có khả năng tiếp cận */
  public async getListPage(
    body?: Record<string, any>
  ): Promise<CurrentPageData> {
    /** gọi api */
    return this.post('get_current_page', body)
  }
  public async getListActivePage(
    body?: Record<string, any>
  ): Promise<CurrentPageData> {
    // gọi api
    return this.post('get_available_pages', body)
  }
  /**
   * đọc danh sách trang đang kích hoạt của tổ chức
   * @param org_id id tổ chức
   * @param group_id lọc theo id nhóm
   */
  public async getOrgActiveListPage(
    org_id: string,
    group_id?: string
  ): Promise<CurrentPageData> {
    /** gọi api */
    return this.getListPage({ org_id, is_active: true, group_id })
  }
  /**đồng bộ lại danh sách trang mới nhất của Facebook với hệ thống */
  public async syncFacebookPage(access_token: string): Promise<void> {
    /** gọi api */
    return this.post('sync_facebook_page', { access_token })
  }
  /**tạo ra url cấp quyền của zalo oa */
  public async zaloOaGetUrlOauth(): Promise<string> {
    try {
      /**cổng callback url trung gian */
      const PORTAL = $env.zalo_oa.portal
      /**domain hiện tại */
      const CURRENT_HOST = origin

      /**path đến ui xử lý */
      let query_path =
        '/dashboard/select-page?connect_page=ZALO&zalo_type=ZALO_OA'

      /** nếu là deploy ở /chat/xxx thì cần thêm */
      if (location?.pathname?.indexOf('/chat/') === 0)
        query_path = '/chat' + query_path

      /**callback uri mục tiêu */
      const FORWOARD = encodeURIComponent(`${CURRENT_HOST}${query_path}`)

      /**đường dẫn callback url */
      const CALLBACK_URL = `${PORTAL}?forward=${FORWOARD}`

      /**đường dẫn cấp quyền của zalo */
      const RESULT = await this.post('zalo_oa_get_url_oauth', {
        redirect_uri: CALLBACK_URL,
      })

      /** trả về kết quả */
      return RESULT
    } catch (e) {
      /** nếu có lỗi thì bắn ra */
      throw e
    }
  }
  /**đồng bộ lại danh sách trang mới nhất của Zalo OA với hệ thống */
  public async syncZaloOaPage(
    payload: Record<string, string | LocationQueryValue[] | undefined>
  ): Promise<void> {
    /** gọi api */
    return this.post('sync_zalo_oa_page', payload)
  }
  /**
   * lấy dữ liệu page, widget, staff, user, ... của các page liên quan cần chat
   * @param org_id id tổ chức
   * @param page_ids danh sách id trang
   * @param is_raw_error trả về dữ liệu lỗi nguyên bản
   */
  public async getPageInfoToChat(
    org_id: string,
    page_ids: string[],
    is_raw_error?: boolean
  ): Promise<PageList> {
    /** gọi api */
    return this.post(
      'get_page_info_to_chat',
      {
        org_id,
        list_page_id: page_ids,
      },
      is_raw_error
    )
  }
  /**
   * tạo trang website
   * @param body thông tin trang
   */
  public async createWebsite(body: PageWebsiteCreate): Promise<IPage> {
    /** gọi api */
    return this.post('create_website_page', body, true)
  }
  /**kết nối, tái đồng bộ tài khoản IG */
  public async syncInstagramPage(
    code: string,
    redirect_uri: string,
    org_id?: string
  ): Promise<void> {
    /** gọi api */
    return this.post('sync_instagram_page', { code, redirect_uri, org_id })
  }
  /**kết nối, tái đồng bộ tài khoản IG */
  public async syncTiktokPage(
    code: string,
    redirect_uri: string,
    org_id?: string,
    state?: string
  ): Promise<void> {
    /** gọi api */
    return this.post('tiktok/sync_tiktok_page', {
      code,
      redirect_uri,
      org_id,
      state,
    })
  }
  /**k Lấy link kết nối với tiktok */
  public async getTiktokUri(redirect_uri: string): Promise<void> {
    /** gọi api */
    return this.post('tiktok/get_tiktok_auth_url', {
      redirect_uri,
    })
  }
  /**kết nối tài khoản zalo cá nhân */
  public async syncZaloPersonalPage(org_id?: string): Promise<string> {
    /** gọi api */
    return this.post('sync_zalo_personal_page', { org_id })
  }
}
