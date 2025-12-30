import { defineStore } from 'pinia'
import { ref } from 'vue'
import { saveLocal, getLocal } from '@/service/helper/store'
import type { IPartner } from '@/utils/api/N4Service/Partner'
import type AlertAccountLimitReached from '@/components/AlertModal/AlertAccountLimitReached.vue'

export const useCommonStore = defineStore('common_store', () => {
  /**toggle loading toàn trang */
  const is_loading_full_screen = ref(false)

  /**
   * load toggle từ local
   *
   * - tablet/pc
   * false: hiển thị full nav
   * true: hiển thị nav nhỏ
   *
   * - mobile
   * false: không hiển thị nav
   * true: hiển thị full nav
   */
  const dashboard_toggle_nav = ref(getLocal('dashboard_toggle_nav', false))
  const chat_toggle_nav = ref(getLocal('chat_toggle_nav', false))

  /** Trạng thái khi nhấn tổ hợp phím tắt */
  const keyboard_shortcut = ref('')

  /** lưu toggle xuống local, để khi f5 trang không bị mất */
  saveLocal(dashboard_toggle_nav, 'dashboard_toggle_nav')
  saveLocal(chat_toggle_nav, 'chat_toggle_nav')

  /**trigger sự kiện đến modal báo lỗi không có gói */
  const trigger_require_pricing = ref(false)

  /**action tự động thay đổi value của trigger */
  function triggerRequirePricing() {
    trigger_require_pricing.value = !trigger_require_pricing.value
  }

  /**đánh dấu ext được phát hiện */
  const extension_status = ref<'NOT_FOUND' | 'FINDING' | 'FOUND'>('NOT_FOUND')
  /**đánh dấu chuyển toàn bộ tin nhắn qua ext */
  const force_send_message_over_inbox = ref(false)
  /**có đang kết nối vào mạng hay không */
  const is_connected_internet = ref(true)
  /**gắn cờ input chat đang có dữ liệu */
  const is_typing = ref(false)
  /**gắn cờ hiển thị trả lời nhanh */
  const is_show_quick_answer = ref(false)
  /**gắn cờ hiển thị nhắc đến người dùng */
  const is_show_mention = ref(false)
  /**dữ liệu đối tác */
  const partner = ref<IPartner>()
  /** ref modal cảnh báo đạt giới hạn gói */
  const ref_alert_reach_limit =
    ref<InstanceType<typeof AlertAccountLimitReached>>()

  return {
    is_loading_full_screen,
    dashboard_toggle_nav,
    chat_toggle_nav,
    trigger_require_pricing,
    extension_status,
    force_send_message_over_inbox,
    is_connected_internet,
    is_typing,
    is_show_quick_answer,
    /**gắn cờ hiển thị nhắc đến người dùng */
    is_show_mention,
    partner,
    keyboard_shortcut,
    ref_alert_reach_limit,

    triggerRequirePricing,
  }
})
