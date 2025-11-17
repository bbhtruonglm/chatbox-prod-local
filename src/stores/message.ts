import type {
  AttachmentCacheList,
  AttachmentInfo,
  IReplyComment,
  MessageInfo,
  TempSendMessage,
} from '@/service/interface/app/message'

import type { UploadFile } from '@/service/interface/app/album'
import type ZaloAddMember from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/PhoneAction/ZaloAddMember.vue'
import type ZaloCreateGroup from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/PhoneAction/ZaloCreateGroup.vue'
import type ZaloPersonalModal from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/PhoneAction/ZaloPersonalModal.vue'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { remove } from 'lodash'

export const useMessageStore = defineStore('message_store', () => {
  /** id của danh sách tin nhắn */
  const list_message_id = ref('list-message')
  /**danh sách tin nhắn hiện tại */
  const list_message = ref<MessageInfo[]>([])

  /**danh sách tin nhắn tạm vừa được gửi */
  const send_message_list = ref<TempSendMessage[]>([])

  /**danh sách dữ liệu file được cache để không phải gọi lại nhiều lần */
  const attachment_list = ref<AttachmentCacheList>({})

  /**dữ liệu 1 file được chọn xem chi tiết */
  const select_attachment = ref<AttachmentInfo>()

  /** danh sách id đã chọn */
  const select_staff_read_id = ref<string[]>([])

  /**các file được chọn để gửi đi */
  const upload_file_list = ref<UploadFile[]>([])

  /**gắn cờ file đang gửi */
  const is_send_file = ref(false)

  /**có phải input đang chạy AI không */
  const is_input_run_ai = ref(false)

  /**gắn cờ hiện nút đi scroll xuống bottom */
  const is_show_to_bottom = ref(false)

  /**dữ liệu cần thiết để trả lời bình luận */
  const reply_comment = ref<IReplyComment>()

  /** dữ liệu tin nhắn đang được chọn */
  const message_data = ref<MessageInfo>()

  /** Địa chỉ trỏ tới hội thoại zalo */
  const modal_zalo_personal_ref = ref<InstanceType<typeof ZaloPersonalModal>>()
  /** Địa chỉ trỏ tới modal Tạo nhóm zalo */
  const modal_zalo_create_group_ref =
    ref<InstanceType<typeof ZaloCreateGroup>>()
  /** Địa chỉ trỏ tới modal thêm thành viên vào nhóm zalo */
  const modal_zalo_add_member_ref = ref<InstanceType<typeof ZaloAddMember>>()

  /** cờ check input có thể gửi tin nhắn hay không */
  const is_can_send_message = ref(true)

  /**xoá dữ liệu trả lời bình luận */
  function clearReplyComment() {
    reply_comment.value = undefined
  }

  /**cập nhật giá trị của tin nhắn tạm */
  function updateTempMessage(
    id: string,
    field: keyof TempSendMessage,
    value: TempSendMessage[keyof TempSendMessage]
  ) {
    // lặp qua toàn bộ tin nhắn tạm
    send_message_list.value.forEach(message => {
      // cập nhật tin nhắn trùng id
      if (message.temp_id === id) message[field] = value as never
    })
  }
  /**xoá tin nhắn tạm */
  function removeTempMessage(id: string) {
    remove(send_message_list.value, message => message.temp_id === id)
  }

  /** kiểm tra tin nhắn có phải AI gửi hay không */
  function isAiMessage(message: MessageInfo) {
    /**tiền tố đánh dấu tin nhắn này là của AI gửi */
    const PREFIX = '\u200B\u200C\u200D\u200B'

    return message?.message_text?.startsWith(PREFIX)
  }

  return {
    list_message_id,
    list_message,
    send_message_list,
    attachment_list,
    select_attachment,
    select_staff_read_id,
    upload_file_list,
    is_send_file,
    is_show_to_bottom,
    is_input_run_ai,
    reply_comment,
    message_data,
    modal_zalo_personal_ref,
    is_can_send_message,
    modal_zalo_create_group_ref,
    updateTempMessage,
    removeTempMessage,
    clearReplyComment,
    isAiMessage,
    modal_zalo_add_member_ref,
  }
})
