<template>
  <div class="flex flex-col gap-1 flex-shrink-0">
    <template v-for="button of list_button">
      <button
        v-if="button.type"
        @click="onClickBtn(button)"
        :class="{
          'bg-slate-800 text-yellow-200': isAction(button),
          'bg-slate-600 text-slate-100 cursor-not-allowed': !isAction(button),
        }"
        class="py-2 px-4 flex justify-center items-center gap-1 rounded-lg text-sm font-medium"
      >
        {{ genBtnTitle(button) }}
        <NewTabIcon
          v-if="isAction(button) && button.type?.includes('bbh_')"
          class="w-3.5 h-3.5"
        />
      </button>
    </template>
    <Widget
      ref="modal_widget_ref"
      :selected_widget
      :ai="ai"
    />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getIframeUrl, getPageInfo, openNewTab } from '@/service/function'
import { useConversationStore, useMessageStore, usePageStore } from '@/stores'
import { toast, toastError } from '@/service/helper/alert'

import NewTabIcon from '@/components/Icons/NewTab.vue'
import Widget from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/MessageTemplate/Widget.vue'

import type {
  MessageAiData,
  MessageInfo,
  MessageTemplateButton,
} from '@/service/interface/app/message'
import { ref } from 'vue'
import type { AppInstalledInfo } from '@/service/interface/app/widget'
import { copy } from '@/service/helper/format'
import type { IPageAiCtaConfig } from '@/service/interface/app/page'
import { Parser } from '@/utils/helper/Parser'

const $props = withDefaults(
  defineProps<{
    /**Danh sách các nút bấm */
    list_button?: MessageTemplateButton[]
    /**dữ liệu của AI nếu có */
    ai?: MessageAiData
    /**id của tin nhắn */
    message_id?: string
    /**id của bình luận */
    comment_id?: string
    /**dữ liệu của tin nhắn */
    message?: MessageInfo
  }>(),
  {}
)

const { t: $t } = useI18n()
const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const pageStore = usePageStore()

/**ref của modal widget */
const modal_widget_ref = ref<InstanceType<typeof Widget>>()
/**dữ liệu của widget được chọn */
const selected_widget = ref<AppInstalledInfo>()

/**tạo ra tiêu đề cho nút */
function genBtnTitle(button: MessageTemplateButton) {
  /** nếu có title thì trả về title */
  if (button?.title) return button?.title

  /** xử lý trường hợp BBH tự thêm hành động nút */
  switch (button?.type) {
    case 'bbh_place_order':
      return $t('v1.view.main.dashboard.chat.message.cta.place_order')
    case 'bbh_create_transaction':
      return $t('v1.view.main.dashboard.chat.message.cta.create_transaction')
    case 'bbh_schedule_appointment':
      return $t('v1.view.main.dashboard.chat.message.cta.schedule_appointment')
    case 'bbh_address':
      return $t('v1.view.main.dashboard.chat.message.cta.address')
    case 'bbh_document':
      return $t('v1.view.main.dashboard.chat.message.cta.document')
    case 'bbh_email':
      return $t('v1.view.main.dashboard.chat.message.cta.email')
    case 'bbh_link':
      return $t('v1.view.main.dashboard.chat.message.cta.link')
    case 'bbh_phone':
      return $t('v1.view.main.dashboard.chat.message.cta.phone')
    case 'bbh_sale':
      return $t('v1.view.main.dashboard.chat.message.cta.sale')
    case 'bbh_shipping':
      return $t('v1.view.main.dashboard.chat.message.cta.shipping')
    case 'zlp_accept':
      return $t('v1.view.main.dashboard.chat.message.cta.accept')
    case 'zlp_decline':
      return $t('v1.view.main.dashboard.chat.message.cta.decline')
    default:
      return ''
  }
}
/**kiểm tra xem button có bấm được không */
function isAction(button: MessageTemplateButton) {
  // nếu là trong iframe thì không cho bấm
  if (messageStore.list_message_id !== 'list-message') return false

  // nếu có url thì mở được tab mới
  // if (button.type === 'web_url') return true

  // nếu có prefix bbh thì là AI
  if (button.type?.includes('bbh_')) return true

  // nếu có prefix zlp thì là AI
  if (button.type?.includes('zlp_')) return true

  // mặc định không bấm được
  return false
}
/**xử lý khi click vào nút bấm */
async function onClickBtn(button?: MessageTemplateButton) {
  if (!button) return

  // nếu không phải hành động thì không làm gì cả
  if (!isAction(button)) return

  /**kiểu của hành động */
  const TYPE = button.type

  // nếu không có kiểu thì không làm gì cả
  if (!TYPE) return

  // mở tab mới
  if (TYPE === 'web_url' && button?.url) openNewTab(button?.url)

  // xử lý chấp nhận/từ chối lời mời kết bạn zalo
  if (TYPE === 'zlp_accept' || TYPE === 'zlp_decline') {
    /** id trang */
    const PAGE_ID = conversationStore.select_conversation?.fb_page_id
    /** id khách hàng */
    const CLIENT_ID = conversationStore.select_conversation?.fb_client_id

    // nếu không có page_id hoặc client_id thì không làm gì
    if (!PAGE_ID || !CLIENT_ID) return

    try {
      /** import API service động */
      const { container } = await import('tsyringe')
      const { N4SerivceAppConversation } = await import(
        '@/utils/api/N4Service/Conversation'
      )

      /** instance của API service */
      const $conversation_api = container.resolve(N4SerivceAppConversation)

      /** gọi API tương ứng */
      if (TYPE === 'zlp_accept') {
        /** chấp nhận lời mời kết bạn */
        await $conversation_api.acceptFriendRequest(PAGE_ID, CLIENT_ID)
        toast('success', 'Đã đồng ý kết bạn')
      } else {
        /** từ chối lời mời kết bạn */
        await $conversation_api.declineFriendRequest(PAGE_ID, CLIENT_ID)
        toast('success', 'Đã từ chối kết bạn')
      }
    } catch (error) {
      // nếu là lỗi của chấp nhận kết bạn thì thông báo riêng
      if (TYPE === 'zlp_accept') return toastError('Đã đồng ý kết bạn rồi')

      toastError(error)
    }

    return
  }

  // cta bbh
  if (TYPE?.includes('bbh_')) {
    /**map các cta */
    const MAP_CTA: Record<string, string> = {
      bbh_place_order: 'ai_cta_place_order',
      bbh_create_transaction: 'ai_cta_payment_transaction',
      bbh_schedule_appointment: 'ai_cta_schedule_appointment',
      bbh_address: 'ai_cta_address',
      bbh_document: 'ai_cta_identify_document',
      bbh_email: 'ai_cta_email',
      bbh_link: 'ai_cta_link',
      bbh_phone: 'ai_cta_phone',
      bbh_sale: 'ai_cta_invoice',
      bbh_shipping: 'ai_cta_transportation',
    }

    /**loại thiết lập cta */
    const CTA: keyof IPageAiCtaConfig = MAP_CTA?.[
      TYPE
    ] as keyof IPageAiCtaConfig

    // nếu không có cta thì không làm gì cả
    if (!CTA) return

    /**thông tin cấu hình cta */
    const CTA_CONFIG = getPageInfo(
      conversationStore.select_conversation?.fb_page_id
    )?.[CTA]

    // nếu không có cấu hình cta thì không làm gì cả
    if (!CTA_CONFIG?.is_active || !CTA_CONFIG?.widget_id) return

    /**dữ liệu của widget */
    const WIDGET = pageStore.market_widgets?.[CTA_CONFIG?.widget_id]

    /**dữ liệu của widget theo luồng mới */
    const NEW_PARAM = Parser.toQueryString({
      partner_token:
        pageStore.selected_page_list_info?.[
          conversationStore.select_conversation?.fb_page_id!
        ]?.partner_token,
      client_id: conversationStore.select_conversation?.fb_client_id,
      message_id: $props.message_id,
      comment_id: $props.comment_id,
      message_phone: $props.message?.client_phone,
    })

    /**dữ liệu của widget được cài */
    const APP_INSTALLED = pageStore.widget_list?.find(
      widget => widget.app_id === CTA_CONFIG?.widget_id
    )

    // chạy luồng chưa cài widget
    if (!APP_INSTALLED) {
      // tạo dữ liệu giống như app đã cài
      selected_widget.value = {
        url: WIDGET?.url_app + `?${NEW_PARAM}`,
        snap_app: WIDGET,
      }
    }
    // chạy luồng đã cài widget
    else {
      // cắt dữ liệu ra ô nhớ mới trong ram
      selected_widget.value = copy(APP_INSTALLED)

      /**
       * tạo ra token mới, tránh lỗi widget đang bị mở bên phải + post message, thì
       * vẫn là token cũ
       * widget đã cài chỉ cần thêm id tin nhắn
       */
      if (selected_widget.value)
        selected_widget.value.url =
          getIframeUrl(selected_widget.value) +
          `&message_id=${$props.message_id}&comment_id=${$props.comment_id}`
    }

    // mở modal
    modal_widget_ref.value?.toggleModal()
  }
}
</script>
