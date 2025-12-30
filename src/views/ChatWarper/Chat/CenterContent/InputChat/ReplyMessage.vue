<template>
  <div
    id="chat__reply-comment"
    class="bg-white flex items-center text-sm shadow-2xl rounded-xl px-3 py-2 gap-3"
  >
    <ForwardArrowIcon class="w-5 h-4 flex-shrink-0 text-slate-500" />

    <div class="flex-grow min-w-0">
      <div class="text-xs font-medium">
        <template v-if="messageStore.reply_message?.type === 'REPLY_MESSAGE'">
          {{ $t('v1.view.main.dashboard.chat.reply_message') }}
        </template>
      </div>
      <div class="truncate text-sm text-slate-500">
        {{ messageStore.reply_message?.root_message_content }}
      </div>
    </div>
    <Loading v-if="messageStore.reply_message?.is_loading" />
    <CloseIcon
      v-else
      @click="messageStore.clearReplyMessage()"
      class="h-4 w-4 text-slate-500 cursor-pointer flex-shrink-0"
    />
  </div>
</template>
<script setup lang="ts">
import { useConversationStore, useMessageStore } from '@/stores'
import { watch } from 'vue'

import Loading from '@/components/Loading.vue'

import ForwardArrowIcon from '@/components/Icons/ForwardArrow.vue'
import CloseIcon from '@/components/Icons/Close.vue'

const conversationStore = useConversationStore()
const messageStore = useMessageStore()

// xóa reply comment khi chuyển đổi conversation
watch(
  () => conversationStore.select_conversation?.fb_client_id,
  () => messageStore.clearReplyComment()
)
</script>
