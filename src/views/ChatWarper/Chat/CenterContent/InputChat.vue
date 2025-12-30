<template>
  <div
    v-if="client_id"
    id="chat__input-chat"
    class="w-full relative flex-shrink-0 flex flex-col gap-2"
  >
    <ScrollToBottomBtn />
    <!-- Trả lời bình luận bài viết fb -->
    <ReplyComment v-if="messageStore.reply_comment?.root_comment_id" />
    <ReplyMessage v-if="messageStore.reply_message?.root_message_id" />
    <ListLabel
      v-if="conversationStore.select_conversation?.conversation_type !== 'POST'"
    />
    <PreviewAttachment />
    <MainInput
      v-if="conversationStore.select_conversation?.conversation_type !== 'POST'"
    />
  </div>
</template>
<script setup lang="ts">
import { useConversationStore, useMessageStore } from '@/stores'

import ScrollToBottomBtn from '@/views/ChatWarper/Chat/CenterContent/InputChat/ScrollToBottomBtn.vue'
import ListLabel from '@/views/ChatWarper/Chat/CenterContent/InputChat/ListLabel.vue'
import PreviewAttachment from '@/views/ChatWarper/Chat/CenterContent/InputChat/PreviewAttachment.vue'
import MainInput from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput.vue'
import ReplyComment from '@/views/ChatWarper/Chat/CenterContent/InputChat/ReplyComment.vue'
import ReplyMessage from './InputChat/ReplyMessage.vue'

const $props = defineProps({
  client_id: {
    type: String,
    default: '',
  },
})

const messageStore = useMessageStore()
const conversationStore = useConversationStore()
</script>
