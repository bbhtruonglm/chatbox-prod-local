import { Botx } from '@/utils/api/Botx'

/**gọi API lên server widget của chatbox */
class Widget extends Botx {
  constructor(path: string) {
    /** gọi API lên server của chatbox */
    super(`${$env.host.widget}/${path}`)
  }
}

/**gọi API lên module trả lời nhanh */
export class QuickAnswer extends Widget {
  /**id trang */
  readonly #PAGE_ID: string

  constructor(page_id: string) {
    /** thiết lập module path */
    super('v1/quick-answer/quickanswer')

    /** lưu lại id trang */
    this.#PAGE_ID = page_id
  }

  /**đọc dữ liệu trả lời nhanh
   * @param skip số bản ghi bỏ qua
   * @param limit số bản ghi lấy về
   * @param search từ khóa tìm kiếm
   */
  async readAnswer(
    skip: number,
    limit: number,
    search?: string
  ): Promise<any[]> {
    /**dữ liệu gốc */
    return await this.post('read_answer', {
      skip,
      limit,
      fb_page_id: this.#PAGE_ID,
      // sort: 'index ASC'
      search,
    })
  }
}
