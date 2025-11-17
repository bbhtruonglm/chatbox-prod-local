<template>
  <div
    id="chat__center-content"
    class="h-full flex flex-col flex-grow min-w-0"
  >
    <UserInfo />
    <MessageList />
    <InputChat :client_id="$route.query.user_id?.toString()" />
  </div>
  <template>
    <!-- <AttachmentViewModal /> -->
    <StaffReadModal />
    <ZaloPersonalModal
      :message="message_data"
      ref="modal_zalo_personal_ref"
    />
    <ZaloCreateGroup
      :message="message_data"
      ref="modal_zalo_create_group_ref"
    />
  </template>
</template>
<script setup lang="ts">
import { useMessageStore } from '@/stores'
import { storeToRefs } from 'pinia'

import InputChat from '@/views/ChatWarper/Chat/CenterContent/InputChat.vue'
import MessageList from '@/views/ChatWarper/Chat/CenterContent/MessageList.vue'
// import AttachmentViewModal from '@/views/ChatWarper/Chat/CenterContent/AttachmentViewModal.vue'
import ZaloPersonalModal from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/PhoneAction/ZaloPersonalModal.vue'
import StaffReadModal from '@/views/ChatWarper/Chat/CenterContent/StaffReadModal.vue'
import UserInfo from '@/views/ChatWarper/Chat/CenterContent/UserInfo.vue'
import { useRoute } from 'vue-router'
import ZaloCreateGroup from './CenterContent/MessageList/MessageItem/PhoneAction/ZaloCreateGroup.vue'

const { modal_zalo_personal_ref, message_data, modal_zalo_create_group_ref } =
  storeToRefs(useMessageStore())

const $route = useRoute()
</script>
