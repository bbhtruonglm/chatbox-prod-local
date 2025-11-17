<template>
  <div
    id="chat__message-date"
    class="text-xxs text-slate-500 absolute group-hover:block hidden w-max z-10 -bottom-3.5"
    :class="sender_id === fb_page_id ? 'right-0' : 'left-0'"
  >
    <span
      v-if="parserStaffName()"
      class="mr-1"
    >
      <span class="font-medium">{{ parserStaffName() }}</span>
      {{ $t('v1.view.main.dashboard.chat.message.sent') }}
    </span>
    <span
      v-if="time"
      class="mr-1"
    >
      {{ $date_handle.formatShort(time) }}
    </span>
    <span v-if="is_edit">
      ({{ $t('v1.view.main.dashboard.chat.message.edited') }})
    </span>
    <span v-if="is_show_duration">
      {{ $t('v1.view.main.dashboard.chat.message.reply_time_basic') }}
      {{ duration }}
    </span>
  </div>
</template>
<script setup lang="ts">
import { DateHandle } from '@/utils/helper/DateHandle'
import { container } from 'tsyringe'
import { useI18n } from 'vue-i18n'

/** i18n */
const { t } = useI18n()

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
  }>(),
  {}
)

const $date_handle = container.resolve(DateHandle)

/**phân tích tên nv từ meta */
function parserStaffName() {
  /** nếu là AI gửi */
  if ($props.is_ai) return t('Trợ lý AI')
  /** Trường hợp website là tin nhắn khởi tạo */
  // if (!$props.meta && $props.message_type !== 'client')
  //   return t('Tin nhắn khởi tạo')
  // /** Trường hợp chatbot, kịch bản */
  // if ($props.meta === '__undefined__undefined') return t('Chatbot')

  /** tên nhân sự nhắn tin */
  const STAFF_NAME = $props.meta?.split('__')?.[1] || $props?.group_client_name

  // console.log($props.group_client_name, 'hehe')
  // console.log($props.meta, 'metaa')

  /** nếu không có thì là AI nhắn */
  if (STAFF_NAME === 'undefined') return ''
  /** Trả ra tên của người gửi */
  return $props.meta?.split('__')?.[1] || $props.group_client_name
}
</script>
