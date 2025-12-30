import type { Cb } from '@/service/interface/function'
import { getItem } from '@/service/helper/localStorage'
import { request } from '@/service/helper/request'
import { useOrgStore } from '@/stores'

/**đầu vào api */
interface Input {
  /**đường dẫn api */
  uri: string
  /**dữ liệu gửi lên dạng json */
  body?: any
  /**dữ liệu dạng upload file */
  form?: boolean
  /**dữ liệu gửi lên dạng query string */
  qs?: any
  /**không thêm org_id vào api */
  is_disable_org?: boolean
}

/**
 * - fix token cho toàn bộ api gọi lên server chatbox
 * - format lại response trước khi return
 */
export const chatbox = (
  { uri, body, form, qs, is_disable_org }: Input,
  proceed: Cb
) => {
  const orgStore = useOrgStore()

  // thêm org_id vào body nếu có thể
  if (!form && !is_disable_org)
    body = { ...body, org_id: orgStore.selected_org_id }

  request(
    {
      uri,
      method: 'POST',
      // fix token cho toàn bộ api gọi lên server chatbox
      headers: { Authorization: getItem('access_token') },
      json: true,
      qs,
      form,
      body,
    },
    (e, r) => {
      // format lại response trước khi return
      if (e) return proceed(e)
      if (r?.mean) return proceed(r.mean)
      if (r?.message) return proceed(r.message)
      if (r?.data || r?.data === 0) return proceed(null, r.data)

      proceed(e, r)
    }
  )
}

/**gọi api dưới dạng async */
export const chatboxSync = async (input: Input): Promise<any> =>
  new Promise((resolve, reject) =>
    chatbox(input, (e, r) => (e ? reject(e) : resolve(r)))
  )
