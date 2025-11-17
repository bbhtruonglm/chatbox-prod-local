import { ErrorHandler } from '@/utils/helper/Conversation/ErrorHandler'
import { getItem } from '@/service/helper/localStorage'

/**quản lý API của ứng dụng */
export class ApiManager {
  /**đường dẫn cần gọi */
  readonly #URI: string
  /**header cần gửi */
  readonly #HEADERS?: HeadersInit

  constructor(uri: string, headers?: HeadersInit) {
    // lưu lại đường dẫn
    this.#URI = uri

    // lưu lại header
    this.#HEADERS = headers || {}
  }

  /**thực hiện gọi API */
  async #request(
    is_json: boolean,
    is_form: boolean,
    path: string,
    method: string,
    qs?: any,
    body?: any,
    is_raw_error?: boolean
  ): Promise<any> {
    try {
      /**đường dẫn cần gọi */
      let uri = `${this.#URI}/${path}`

      /**dữ liệu khởi tạo API */
      const OPTIONS: RequestInit = { method }

      // nếu có query string thì thêm vào
      if (qs) uri += `?${new URLSearchParams(qs).toString()}`

      // xử lý dữ liệu json nếu
      if (
        // thiết lập parser json
        is_json &&
        // không phải form upload
        !is_form
      ) {
        // chuyển body json thành chuỗi
        body = JSON.stringify(body)

        // thiết lập header kiểu json
        OPTIONS.headers = { 'Content-Type': 'application/json' }
      }

      // mặc định dùng token của chatbox, để fix lỗi contructor không tự new zzz
      // vì đang sử dụng container nên bị bug
      // @ts-ignore
      if (!this.#HEADERS?.Authorization)
        // @ts-ignore
        this.#HEADERS.Authorization = getItem('access_token')

      // thêm header custom nếu có
      if (this.#HEADERS)
        OPTIONS.headers = { ...OPTIONS.headers, ...this.#HEADERS }

      // nếu có body thì thêm vào
      if (body) OPTIONS.body = body

      /**gọi api */
      const RES = await fetch(uri, OPTIONS)

      // nếu không phải json thì trả về dữ liệu gốc
      if (!is_json) return RES

      /**chuyển dữ liệu về json */
      const RESULT = await RES.json()

      // có message thì là bị lỗi
      if (RESULT?.message || RESULT?.code !== 200) throw RESULT

      // nếu là raw thì trả về nguyên bản
      // if (is_raw) return RESULT

      // fix falsy value
      if (RESULT?.data === false || RESULT?.data === 0 || RESULT?.data === '')
        return RESULT?.data

      // trả về dữ liệu
      return RESULT?.data || RESULT
    } catch (e: any) {
      throw ErrorHandler.parse(e, is_raw_error)
    }
  }

  /**gọi API dạng get */
  protected get(
    path: string,
    qs?: Record<string, any>,
    is_raw_error?: boolean
  ): Promise<any> {
    return this.#request(true, false, path, 'GET', qs, undefined, is_raw_error)
  }
  /**gọi API dạng post */
  protected post(
    path: string,
    body?: Record<string, any>,
    is_raw_error?: boolean
  ): Promise<any> {
    return this.#request(
      true,
      false,
      path,
      'POST',
      undefined,
      body,
      is_raw_error
    )
  }
  /**gọi API dạng form upload */
  protected upload(
    path: string,
    qs?: Record<string, any>,
    body?: FormData,
    is_raw_error?: boolean
  ): Promise<any> {
    return this.#request(true, true, path, 'POST', qs, body, is_raw_error)
  }
}
