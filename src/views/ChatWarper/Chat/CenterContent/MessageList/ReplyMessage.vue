<template>
  <div
    class="message-box bg-slate-100 text-slate-500 relative -bottom-2"
    :class="{
      'border border-b-0 border-red-500 rounded-b-none': is_error,
    }"
  >
    <template v-if="message?.message_text">
      {{ message?.message_text }}
    </template>
    <AttachmentMessage
      v-else-if="message?.message_attachments"
      :message="message"
      :is_reply="true"
      type="CLIENT"
      class="justify-start"
    />
    <template v-else>
      {{ $t('v1.view.main.dashboard.chat.message.file') }}
      📦
    </template>
  </div>
</template>
<script setup lang="ts">
import AttachmentMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/AttachmentMessage.vue'

import type { MessageInfo } from '@/service/interface/app/message'

const $props = withDefaults(
  defineProps<{
    /**nội dung tin nhắn bí mật của page */
    message: MessageInfo
    /**có lỗi hay không */
    is_error?: boolean
  }>(),
  {}
)
</script>
