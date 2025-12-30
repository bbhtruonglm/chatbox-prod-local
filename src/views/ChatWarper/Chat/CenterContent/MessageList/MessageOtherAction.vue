<template>
  <div
    id="chat__message-other-action"
    class="text-xxs text-slate-500 absolute z-10 h-fit"
    :class="position_class"
    style="bottom: 0"
  >
    <div
      :class="{ 'opacity-100': is_popover_open }"
      class="flex gap-1 border border-slate-100 items-center top-3 w-fit bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer"
    >
      <span
        v-tooltip="t('Trả lời')"
        class="hover:bg-slate-300 rounded-lg p-0.5"
        @click="replyComment('REPLY_MESSAGE')"
        ><ArrowUturnLeftIcon class="size-4"
      /></span>
      <span
        v-if="can_share_message"
        v-tooltip="t('Chuyển tiếp')"
        @click="
          () => {
            modal_zalo_share_message_ref?.toggleModal()
            message_data = message
          }
        "
        class="hover:bg-slate-300 rounded-lg p-0.5"
        ><ArrowUturnRightIcon class="size-4"
      /></span>
      <span
        v-if="message?.message_type === 'page'"
        ref="trigger_ref"
        @click="togglePopover"
        class="hover:bg-slate-300 rounded-lg p-0.5"
      >
        <EllipsisHorizontalIcon class="size-4" />
      </span>
    </div>

    <!-- Popover menu -->
    <Teleport
      to="body"
      v-if="is_popover_open"
    >
      <div
        @click.stop
        ref="popover_content_ref"
        :style="popover_style"
        class="w-[200px] shadow-lg rounded-md p-1 bg-white flex flex-col gap-1"
      >
        <button
          v-if="message?.message_type === 'page'"
          @click="handleUndoMessage"
          class="px-3 py-2 text-left text-xs hover:bg-slate-100 flex items-center gap-2 rounded-md"
        >
          <TrashIcon class="size-4" />
          {{ t('Thu hồi tin nhắn') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import type {
  IReplyCommentType,
  MessageInfo,
} from '@/service/interface/app/message'
import { useConversationStore, useMessageStore } from '@/stores'
import { DateHandle } from '@/utils/helper/DateHandle'
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'

import { container } from 'tsyringe'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { undo_message } from '@/service/api/chatbox/n4-service'
import { Toast } from '@/utils/helper/Alert/Toast'

/** i18n */
const { t } = useI18n()

const messageStore = useMessageStore()
const conversationStore = useConversationStore()
const $toast = container.resolve(Toast)
const $props = withDefaults(
  defineProps<{
    /**thời gian của tin nhắn */
    time?: string
    /**dữ liệu hiển thị thêm, vd tên nv gửi tin nhắn */
    info?: string
    /**dữ liệu đính kèm của tin nhắn */
    meta?: string
    /**tin nhắn này có phải bị sửa không */
    is_edit?: boolean
    /**số thời gian tin nhắn này được rep */
    duration?: string
    /**có hiển thị thời gian tin nhắn không */
    is_show_duration?: boolean
    /** có phải tin nhắn của AI gửi hay không */
    is_ai?: boolean
    /** platform type : loại platform */
    platform_type?: string
    /** sender id : id người gửi */
    sender_id?: string
    /** Tên người gửi nếu có */
    group_client_name?: string
    /** page_id trong tin nhắn */
    fb_page_id?: string
    /** message_type */
    message_type?: string
    /** dữ liệu tin nhắn */
    message?: MessageInfo
  }>(),
  {}
)

/**id duy nhất cho component này */
const component_id = ref(`popover-${Math.random().toString(36).substr(2, 9)}`)
/**ref của trigger button */
const trigger_ref = ref<HTMLElement>()
/**ref của popover content */
const popover_content_ref = ref<HTMLElement>()
/**trạng thái popover đang mở */
const is_popover_open = ref(false)
/**vị trí của popover */
const popover_position = ref({ x: 0, y: 0 })

/** style cho popover */
const popover_style = computed(() => ({
  position: 'absolute' as const,
  left: `${popover_position.value.x}px`,
  top: `${popover_position.value.y}px`,
  zIndex: 50,
}))

/** class vị trí của action */
const position_class = computed(() => {
  const type = $props.message?.message_type || ''
  /** tin nhắn nằm bên phải */
  const is_right_side = ['page', 'note'].includes(type) || $props.message?.ad_id

  /**
   * nếu tin nhắn bên phải -> action bên trái
   * nếu tin nhắn bên trái -> action bên phải
   */
  return is_right_side ? 'right-full mr-1' : 'left-full ml-1'
})

const { modal_zalo_share_message_ref, message_data } = storeToRefs(
  useMessageStore()
)

/**
 * Kiểm tra tin nhắn có thể chia sẻ được không
 * Chỉ cho phép chia sẻ tin nhắn text hoặc tin nhắn có attachment là image
 */
const can_share_message = computed(() => {
  /** Nếu không có tin nhắn thì không cho chia sẻ */
  if (!$props.message) return false

  /** Lấy danh sách attachment */
  const ATTACHMENTS = $props.message.message_attachments || []

  /** Nếu không có attachment, chỉ có text thì cho phép chia sẻ */
  if (ATTACHMENTS.length === 0) return true

  /** Kiểm tra tất cả attachment */
  const HAS_VALID_ATTACHMENTS = ATTACHMENTS.every(attachment => {
    /** Nếu attachment chỉ có _id mà không có type, cho phép chia sẻ */
    if (!attachment.type) return true

    /** Chỉ cho phép image (không cho video, audio, file vì có vấn đề đuôi file) */
    if (attachment.type !== 'image') return false

    /** Kiểm tra có URL hợp lệ không */
    const url =
      attachment.url ||
      attachment.payload?.url ||
      attachment.payload?.elements?.[0]?.image_url

    /** Nếu không có URL, vẫn cho phép (có thể đang load) */
    return true
  })

  return HAS_VALID_ATTACHMENTS
})

/**kích hoạt trả lời bình luận này */
function replyComment(type: IReplyCommentType) {
  /** nếu đang loading thì không cho phép trả lời */
  // if (messageStore.reply_comment?.is_loading) return

  /** lưu thông tin bình luận */
  messageStore.reply_message = {
    type,
    root_message_id: $props.message?.message_mid,
    root_message_content: $props.message?.message_text,
    message_index: undefined,
    message_id: $props.message?.message_mid,
  }

  /** focus vào input chat */
  document.getElementById('chat-text-input-message')?.focus()
}

/**toggle popover */
function togglePopover($event: MouseEvent) {
  $event.stopPropagation()

  if (is_popover_open.value) {
    is_popover_open.value = false
    document.body.removeAttribute('data-active-popover')
    return
  }

  /** đóng tất cả popover khác trước khi mở popover này */
  const current_active = document.body.getAttribute('data-active-popover')
  if (current_active && current_active !== component_id.value) {
    /** dispatch event để đóng popover khác */
    document.dispatchEvent(
      new CustomEvent('close-all-popovers', {
        detail: { exclude: component_id.value },
      })
    )
  }

  /** lấy vị trí của trigger button */
  if (trigger_ref.value) {
    const rect = trigger_ref.value.getBoundingClientRect()
    popover_position.value = {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5,
    }
  }

  /** set active trước khi mở */
  document.body.setAttribute('data-active-popover', component_id.value)
  is_popover_open.value = true
}

/**lắng nghe event đóng tất cả popover */
function handleCloseAllPopovers(event: Event) {
  const custom_event = event as CustomEvent
  const exclude_id = custom_event.detail?.exclude

  /** chỉ đóng nếu không phải popover được exclude */
  if (exclude_id !== component_id.value && is_popover_open.value) {
    is_popover_open.value = false
  }
}
function handleClickOutside($event: MouseEvent) {
  if (!is_popover_open.value) return

  const target = $event.target as HTMLElement

  /** nếu click vào trigger hoặc popover content thì không đóng */
  if (
    trigger_ref.value?.contains(target) ||
    popover_content_ref.value?.contains(target)
  ) {
    return
  }

  /** đóng popover */
  is_popover_open.value = false
}

/**xử lý hoàn tác tin nhắn */
async function handleUndoMessage() {
  /** đóng popover */
  is_popover_open.value = false

  /** kiểm tra dữ liệu */
  if (!$props.message?.message_mid) {
    $toast.error(t('Không tìm thấy tin nhắn'))
    return
  }

  /**page_id */
  const PAGE_ID = conversationStore.select_conversation?.fb_page_id
  /**client_id */
  const CLIENT_ID = conversationStore.select_conversation?.fb_client_id

  if (!PAGE_ID || !CLIENT_ID) {
    $toast.error(t('Không tìm thấy thông tin hội thoại'))
    return
  }

  /** cập nhật trạng thái đang thu hồi */
  if ($props.message) $props.message.is_undo = true

  try {
    /** gọi API hoàn tác tin nhắn */
    await new Promise((resolve, reject) => {
      undo_message(
        {
          page_id: PAGE_ID,
          client_id: CLIENT_ID,
          message_mid: $props.message?.message_mid || '',
        },
        (e, r) => {
          if (e) return reject(e)
          resolve(r)
        }
      )
    })

    /** thông báo thành công */
    $toast.success(t('Thu hồi tin nhắn thành công'))

    /** cập nhật trạng thái thành công */
    // if ($props.message) {
    //   $props.message.is_undo_message = false
    //   $props.message.is_undone_success = true
    // }

    /** TODO: Cập nhật lại danh sách tin nhắn nếu cần */
  } catch (error) {
    console.error('Error undoing message:', error)
    $toast.error(t('Thu hồi tin nhắn thất bại'))

    /** hoàn tác trạng thái nếu lỗi */
    if ($props.message) $props.message.is_undo = false
  }
}

/** watch popover state để cleanup attribute */
watch(is_popover_open, new_value => {
  if (!new_value) {
    /** xóa attribute nếu popover này đang active */
    const active_popover_id = document.body.getAttribute('data-active-popover')
    if (active_popover_id === component_id.value) {
      document.body.removeAttribute('data-active-popover')
    }
  }
})

/** mount event listener */
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('close-all-popovers', handleCloseAllPopovers)
})

/** unmount event listener */
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('close-all-popovers', handleCloseAllPopovers)

  /** cleanup attribute nếu component bị unmount khi popover đang mở */
  const active_popover_id = document.body.getAttribute('data-active-popover')
  if (active_popover_id === component_id.value) {
    document.body.removeAttribute('data-active-popover')
  }
})

const $date_handle = container.resolve(DateHandle)
</script>
