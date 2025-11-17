<template>
  <div
    v-if="!is_disable_input"
    id="main_input_chat"
    :class="{
      'pr-3': isVisibleSendBtn(),
      '!rounded-xl':
        (is_visible_ai_answer || is_loading_ai_answer) &&
        !commonStore.is_typing &&
        conversationStore.getPage()?.quick_reply?.is_complete_sentence,
      'hover:rounded-xl': is_loading_ai_answer,
    }"
    class="flex flex-col gap-1 bg-white rounded-3xl group py-2 px-4 transition-all"
  >
    <AiAnswer v-model:is_loading="is_loading_ai_answer" />
    <div class="flex items-end">
      <div class="flex gap-2 items-end flex-grow min-w-0">
        <!-- <AiManager /> -->
        <AttachmentMenu />
        <FaceSmileIcon
          @click="emoji_ref?.toggleDropdown"
          class="size-5 cursor-pointer text-slate-400 flex-shrink-0 hover:text-slate-700 my-1.5"
        />

        <Dropdown
          ref="emoji_ref"
          position="TOP"
          width="auto"
          height="auto"
          :is_fit="false"
          :back="100"
        >
          <emoji-picker
            @emoji-click="onEmojiClick"
            class="custom-emoji"
          ></emoji-picker>
        </Dropdown>

        <Input
          ref="input_chat_ref"
          @keyup="quick_answer_ref?.handleChatValue"
          :class="{
            'animate-fast-pulse': messageStore.is_input_run_ai,
          }"
        />
      </div>
      <div
        v-if="isVisibleSendBtn()"
        class="w-8 h-8 cursor-pointer flex-shrink-0"
      >
        <StopIcon
          v-if="messageStore.is_input_run_ai"
          @click="messageStore.is_input_run_ai = !messageStore.is_input_run_ai"
          v-tooltip="$t('v1.view.main.dashboard.chat.action.stop_action')"
          class="w-full h-full"
        />
        <SendIcon
          v-else-if="messageStore.is_can_send_message"
          v-tooltip="$t('v1.view.main.dashboard.chat.action.send_message')"
          @click="input_chat_ref?.sendMessage"
          class="w-full h-full"
        />
      </div>
      <QuickAnswer ref="quick_answer_ref" />
    </div>
  </div>
  <div
    v-else
    class="flex gap-2 text-sm py-2 px-4 rounded-full bg-slate-50 text-slate-400 items-center cursor-not-allowed"
  >
    <!-- <SparklesIcon class="size-5" /> -->
    <ClipIcon class="size-5" />
    <p class="w-full text-slate-700 py-1.5 px-1">
      <i18n-t keypath="Đã quá 7 ngày kể từ tin nhắn cuối cùng. _">
        <template #link>
          <span class="text-sky-800">({{ $t('Tìm hiểu thêm') }}.)</span>
        </template>
      </i18n-t>
    </p>
    <SlashQuareIcon class="size-5" />
  </div>
</template>
<script setup lang="ts">
import 'emoji-picker-element'
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessageStore, useCommonStore, useConversationStore } from '@/stores'
import { IS_VISIBLE_SEND_BTN_FUNCT } from '@/views/ChatWarper/Chat/CenterContent/InputChat/symbol'

import AiAnswer from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/AiAnswer.vue'
import QuickAnswer from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/QuickAnswer.vue'
import AiManager from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/AiManager.vue'
import AttachmentMenu from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/AttachmentMenu.vue'
import Input from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/Input.vue'

import SendIcon from '@/components/Icons/Send.vue'
import StopIcon from '@/components/Icons/Stop.vue'
import ClipIcon from '@/components/Icons/Clip.vue'
import { FaceSmileIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import SlashQuareIcon from '@/components/Icons/SlashQuare.vue'
import Dropdown from '@/components/Dropdown.vue'

const messageStore = useMessageStore()
const commonStore = useCommonStore()
const conversationStore = useConversationStore()
const { t: $t } = useI18n()
/** Ref của emoji */
const emoji_ref = ref<InstanceType<typeof Dropdown>>()

/**ref của ô chat tin nhắn */
const input_chat_ref = ref<InstanceType<typeof Input>>()
/**ref của modal chọn câu trả lời nhanh */
const quick_answer_ref = ref<InstanceType<typeof QuickAnswer>>()

/**có đang tạo câu trả lời không */
const is_loading_ai_answer = ref<boolean>(false)

/**hội thoại hiện tại đang dược chọn */
const conversation = computed(() => conversationStore.select_conversation)

/**câu trả lời hiện tại */
const ai_answer = computed(() => conversation.value?.ai_answer)

/**câu trả lời tồn tại và không phải là khoảng trắng */
const is_visible_ai_answer = computed(
  () => ai_answer.value && ai_answer.value !== ' '
)

/** nếu quá hạn 7 ngày liên hệ với nền tảng facebook */
const is_disable_input = computed(() => {
  // nếu không phải nền tảng facebook thì bỏ qua
  if (conversation.value?.platform_type !== 'FB_MESS') return false

  // nếu đã cài extension thì bỏ qua
  if (commonStore.extension_status === 'FOUND') return false

  /** thời điểm gửi tin nhắn cuối cùng */
  const LAST_MESS_TIME = conversation.value?.last_message_time || Date.now()

  /** khoảng thời gian từ tin nhắn cuối cùng đến hiện tại */
  const DISTANCE_TO_LAST_MESS = Date.now() - LAST_MESS_TIME

  /** khoảng thời gian 7 ngày */
  const DISTANCE_7_DAY = 7 * 24 * 60 * 60 * 1000

  // nếu vẫn trong khoảng 7 ngày từ tin nhắn cuối thì bỏ qua
  if (DISTANCE_TO_LAST_MESS < DISTANCE_7_DAY) return false

  return true
})

/**có hiển thị nút gửi tin không */
function isVisibleSendBtn() {
  return (
    // đã chọn file để gửi
    messageStore.upload_file_list?.length ||
    // có nội dung văn bản muốn gửi
    commonStore.is_typing
  )
}

/** hàm xử lý khi chọn emoji */
function onEmojiClick(e: any) {
  // nếu không có input chat thì thôi
  if (!input_chat_ref.value) return

  // bật trạng thái đang gõ
  commonStore.is_typing = true

  /**div input */
  const INPUT = input_chat_ref.value.input_chat_ref as HTMLDivElement
  // ghi đè nội dung của input
  INPUT.innerText = INPUT.innerText?.trim() + e.detail.unicode
  // focus vào cuối input
  placeCaretAtEnd(INPUT)
}

/**focus vào cuối input */
function placeCaretAtEnd(el: HTMLElement) {
  // nếu không có phần tử thì thôi
  if (!el) return
  // focus vào phần tử
  el.focus()

  /** vùng chọn  */
  const RANGE = document.createRange()
  // thêm phần tử vào vùng chọn
  RANGE.selectNodeContents(el)
  // đặt con trỏ ở cuối
  RANGE.collapse(false)

  /** vùng chọn */
  const SELECTION = window.getSelection()
  // nếu có vùng chọn
  if (SELECTION) {
    // loại bỏ vùng chọn đó
    SELECTION.removeAllRanges()
    // thêm vùng chọn mới
    SELECTION.addRange(RANGE)
  }
}

// xuất hàm cho component con xử dụng
provide(IS_VISIBLE_SEND_BTN_FUNCT, isVisibleSendBtn)
</script>
<style scoped lang="scss">
.animate-fast-pulse {
  animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
emoji-picker {
  --border-size: 0px;
}
</style>
