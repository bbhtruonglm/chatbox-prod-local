<template>
  <div class="flex flex-col">
    <!-- Reply Message bên ngoài message content -->
    <ReplyMessage
      v-if="snap_replay_message"
      :message="snap_replay_message"
      :is_error="is_error"
    />

    <!-- Message content -->
    <div
      class="rounded-lg p-2 gap-2.5 flex flex-col flex-shrink-0 bg-[#FFF8E1] max-w-[300px]"
      :class="{
        'border border-red-500 rounded-lg': is_error,
      }"
    >
      <div
        v-if="text"
        class="text-sm break-words whitespace-pre-line"
        v-html="renderTextWithMentions"
      ></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import ReplyMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/ReplyMessage.vue'
import type { MessageInfo } from '@/service/interface/app/message'

const $props = withDefaults(
  defineProps<{
    /**nội dung tin nhắn của page */
    text: string
    /**dữ liệu mentions */
    mentions?: {
      offset?: number
      id?: string
      length?: number
    }[]
    /**tin nhắn được reply */
    snap_replay_message?: MessageInfo
    /**có lỗi hay không */
    is_error?: boolean
  }>(),
  {}
)

console.log($props.snap_replay_message, 'snap_replay_message')

function escapeHtml(text: string) {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

const renderTextWithMentions = computed(() => {
  if (!$props.mentions || !$props.mentions.length) {
    return escapeHtml($props.text)
  }

  let text = $props.text
  let result = ''
  let lastIndex = 0

  // Sort mentions by offset ASCENDING
  const mentions_sorted = [...$props.mentions].sort(
    (a, b) => (a.offset || 0) - (b.offset || 0)
  )

  for (const mention of mentions_sorted) {
    if (mention.offset === undefined || mention.length === undefined) continue

    // Text before mention
    if (mention.offset > lastIndex) {
      result += escapeHtml(text.substring(lastIndex, mention.offset))
    }

    // Mention text
    const mention_text = text.substring(
      mention.offset,
      mention.offset + mention.length
    )
    result += `<span class="bg-blue-100 text-blue-600 px-1 rounded font-medium">${escapeHtml(
      mention_text
    )}</span>`

    lastIndex = mention.offset + mention.length
  }

  // Remaining text
  if (lastIndex < text.length) {
    result += escapeHtml(text.substring(lastIndex))
  }

  return result
})
</script>
