import { useChatbotUserStore, useMessageStore, useOrgStore } from '@/stores'

import { BillingAppOrganization } from '@/utils/api/Billing'
import type { CbError } from '@/service/interface/function'
import { flow } from '@/service/helper/async'
import { getCurrentOrgInfo } from '@/service/function'
import { getItem } from '@/service/helper/localStorage'
import { handleFileLocal } from '@/service/helper/file'
import { map } from 'lodash'
import { onMounted } from 'vue'
import { read_me_chatbot_user } from '@/service/api/chatbox/n4-service'
import { toastError } from '@/service/helper/alert'

/** load các dữ liệu cần thiết của giao diện */
export function initRequireData() {
  const chatbotUserStore = useChatbotUserStore()
  const orgStore = useOrgStore()

  // init các dữ liệu cần thiết
  onMounted(() => {
    getMeChatbotUser()
    getAllOrg()
  })

  /**đọc các thông tin của user hiện tại đang đăng nhập */
  function getMeChatbotUser() {
    // nếu chưa đăng nhập thì thôi
    if (!getItem('access_token')) return

    flow(
      [
        // * call api
        (cb: CbError) =>
          read_me_chatbot_user((e, r) => {
            // * call api
            if (e) {
              console.log(e)
              // nếu call api thất bại thì redirect qua login
              // signout()

              return cb(e)
            }

            // lưu vào store
            chatbotUserStore.chatbot_user = r
            cb()
          }),
      ],
      undefined
    )
  }
  /**lấy danh sách các tổ chức của người dùng này */
  async function getAllOrg() {
    try {
      // nếu chưa đăng nhập thì thôi
      if (!getItem('access_token')) return

      // lấy danh sách các tổ chức
      orgStore.list_org = await new BillingAppOrganization().readOrg()

      // tự động lấy thông tin tổ chức hiện tại
      getCurrentOrgInfo()
    } catch (e) {
      // hiển thị thông báo lỗi
      toastError(e)
    }
  }

  return { getMeChatbotUser }
}

/** xử lý kéo thả file */
export function useDropFile() {
  const messageStore = useMessageStore()

  /**xử lý sự kiện vứt file vào để gửi */
  function onDropFile($event: DragEvent) {
    // chặn các hành động mặc định, vd như mở file ở tab mới
    $event.stopPropagation()
    $event.preventDefault()

    // đang gửi thì không cho chọn lại file để bị lỗi
    if (messageStore.is_send_file) return

    map($event.dataTransfer?.files, file => handleFileLocal(file))
  }
  return {
    onDropFile,
  }
}
