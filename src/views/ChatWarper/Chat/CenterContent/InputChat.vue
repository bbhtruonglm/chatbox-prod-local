<template>
  <div
    v-if="client_id"
    id="chat__input-chat"
    class="w-full relative flex-shrink-0 flex flex-col"
  >
    <ScrollToBottomBtn />
    <!-- Trả lời bình luận bài viết fb -->
    <ReplyComment v-if="messageStore.reply_comment?.root_comment_id" />
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

const $props = defineProps({
  /** Client id */
  client_id: {
    /** type string */
    type: String,
    /** giá trị mặc định */
    default: '',
  },
})
/** Khai báo tin nhắn từ store */
const messageStore = useMessageStore()
/** Khai báo list conversation từ store */
const conversationStore = useConversationStore()
</script>
