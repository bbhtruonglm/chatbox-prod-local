import { useCommonStore } from '@/stores'
import { singleton } from 'tsyringe'

export function composableService() {
  @singleton()
  class InputService {
    /**đặt nội dung vào input chat + giữ con trỏ ở cuối */
    setInputText(text: string) {
      const commonStore = useCommonStore()

      /**input chat */
      const INPUT_CHAT = document.getElementById('chat-text-input-message')

      // nếu không có input chat thì thôi
      if (!INPUT_CHAT) return

      // đánh dấu đang gõ
      commonStore.is_typing = !!text

      // thay đổi nội dung chat
      INPUT_CHAT.innerText = text

      /**đối tượng Range */
      const RANGE = document.createRange()

      /**đối tượng Selection */
      const SELECTION = window.getSelection()

      // Đặt điểm bắt đầu của RANGE ở cuối phần tử
      RANGE.selectNodeContents(INPUT_CHAT)

      // Đặt điểm kết thúc của RANGE ở cuối phần tử
      RANGE.collapse(false)

      // Xóa mọi lựa chọn hiện tại
      SELECTION?.removeAllRanges()

      // Thêm RANGE mới vào SELECTION
      SELECTION?.addRange(RANGE)
    }

    /** lấy nội dung của input chat */
    getInputText() {
      /**input chat */
      const INPUT_CHAT = document.getElementById('chat-text-input-message')
      return INPUT_CHAT?.innerText?.trim() || ''
    }
  }

  return { InputService }
}
