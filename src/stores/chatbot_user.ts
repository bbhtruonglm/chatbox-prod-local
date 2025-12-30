import { defineStore } from 'pinia'
import { ref } from 'vue'
import { saveIndexedDB, getIndexedDB } from '@/service/helper/store'
import { getItem, setItem } from '@/service/helper/localStorage'
import { saveLocal, getLocal } from '@/service/helper/store'

import type {
  ChatbotUserInfo,
  PersonalSettings,
} from '@/service/interface/app/chatbot_user'

/**lưu trữ các dữ liệu liên quan đến user hiện tại đang đăng nhập */
export const useChatbotUserStore = defineStore('chatbot_user_store', () => {
  /** ------------ STAGE ----------- */
  /**lưu dữ liệu của user hiện tại đang đăng nhập */
  const chatbot_user = ref<ChatbotUserInfo>()

  // * đọc dữ liệu được lưu ở indexeddb
  getIndexedDB('chatbot_user', undefined, (e, r) => (chatbot_user.value = r))

  /** ghi đè lại setting của page */
  const personal_settings = ref<PersonalSettings>(
    getLocal('personal_settings', {
      is_enable_personal_setting: false,
      is_hide_page_avatar: false,
      display_label_type: 'ICON_TOOLTIP',
    })
  )

  // lưu dữ liệu xuống local khi có thay đổi
  saveLocal(personal_settings, 'personal_settings')

  // lưu dữ liệu xuống indexed khi có thay đổi
  saveIndexedDB(chatbot_user, 'chatbot_user')

  /** ------------ GETTER ----------- */
  /**đọc id của nhân viên hiện tại đang đăng nhập */
  function getStaffId() {
    return chatbot_user.value?.user_id || chatbot_user.value?.fb_staff_id
  }

  /** ------------ ACTION ----------- */
  /**có phải là thành viên của bbh không */
  function isBbhMember(): boolean {
    return ['ADMIN', 'MEMBER', 'AFFILIATE'].includes(
      chatbot_user.value?.role || ''
    )
  }

  return {
    chatbot_user,
    personal_settings,

    getStaffId,
    isBbhMember,
  }
})
