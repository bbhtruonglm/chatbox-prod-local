<template>
  <div
    id="chat__message-item"
    class="w-fit max-w-96 group relative"
  >
    <!-- <Emotion
      v-if="primary_emotion"
      :emotion="primary_emotion"
      :position="message_type === 'client' ? 'RIGHT' : 'LEFT'"
      :message_type="message?.message_type"
    /> -->
    <ReplyMessage
      v-if="reply_message"
      :message="reply_message"
    />
    <AttachmentMessage
      v-if="isSpecialCase()"
      :message="message"
      :type="message_type === 'client' ? 'CLIENT' : 'PAGE'"
    />

    <SliderWarper
      v-else
      :count_element="message_source?.length"
    >
      <!-- 
    không được xoá :key, nếu không sẽ lỗi, 
    do vue 3 for 2 mảng lồng nhau gặp vấn đề về binding
    sẽ bị binding nhầm data cũ
    -->
      <MessageTemplate
        v-for="data_source of message_source"
        :key="message?._id"
        :class="addOnClassTemplate()"
        :data_source="data_source"
        :is_fix_size="message_source?.length > 1"
        :message_type="message?.message_type"
        :attachment_size
        :message
      />
      <PhoneAction
        :message
        v-if="messageStore.list_message_id === 'list-message'"
      />
    </SliderWarper>
    <!-- <div
      v-if="message?.reaction?.emoji"
      class="absolute text-xs -bottom-2 -right-1"
    >
      {{ message?.reaction?.emoji }}
    </div> -->
    <Emotion
      :position="message_type === 'client' ? 'RIGHT' : 'LEFT'"
      :message
    />
    <SlowReply
      v-if="
        CHECK_SLOW_REPLY.isSlowReply() || CHECK_SLOW_REPLY.isSystemSlowReply()
      "
      :duration="CHECK_SLOW_REPLY.getDuration()"
      :next_message="messageStore.list_message?.[message_index + 1]"
      :time="message_time"
      :color="`
        ${CHECK_SLOW_REPLY.isSlowReply() ? 'text-red-500' : ''} 
        ${
          CHECK_SLOW_REPLY.isSystemSlowReply() &&
          !CHECK_SLOW_REPLY.isSlowReply()
            ? 'text-yellow-500'
            : ''
        }
      `"
    />
    <MessageDate
      v-else
      :class="{
        'right-0': message_type !== 'client',
      }"
      :time="message_time"
      :meta="meta"
      :is_ai="messageStore.isAiMessage(message)"
      :is_edit="message?.is_edit"
      :duration="CHECK_SLOW_REPLY.getDuration()"
      :is_show_duration="
        CHECK_SLOW_REPLY.isShowDuration() &&
        !CHECK_SLOW_REPLY.isSlowReply() &&
        !CHECK_SLOW_REPLY.isSystemSlowReply()
      "
      :group_client_name="message.group_client_name"
      :platform_type="message.platform_type"
      :fb_page_id="message.fb_page_id"
      :sender_id="message.sender_id"
      :message_type="message.message_type"
    />
    <!-- :sender_id="message.sender_id" -->
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useMessageStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import {
  CheckSlowReply,
  type ICheckSlowReply,
} from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/CheckSlowReply'

import SlowReply from '@/views/ChatWarper/Chat/CenterContent/MessageList/SlowReply.vue'
import ReplyMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/ReplyMessage.vue'
import MessageDate from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageDate.vue'
import MessageTemplate from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/MessageTemplate.vue'
import SliderWarper from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/SliderWarper.vue'
import AttachmentMessage from '@/views/ChatWarper/Chat/CenterContent/MessageList/AttachmentMessage.vue'
// import Emotion from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/MessageTemplate/Emotion.vue'
import Emotion from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/Emotion.vue'
import PhoneAction from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/PhoneAction.vue'

import type {
  ChatbotButton,
  MessageInfo,
  MessageTemplateInput,
} from '@/service/interface/app/message'
import { composableService } from '@/views/ChatWarper/Chat/CenterContent/MessageList/service'
import { container } from 'tsyringe'

const { MessageService } = composableService()

const messageStore = useMessageStore()
const { t: $t } = useI18n()
const $mesage_service = container.resolve(MessageService)

const $props = withDefaults(
  defineProps<{
    /**dữ liệu của tin nhắn */
    message: MessageInfo
    /**vị trí của tin nhắn trong mảng */
    message_index: number
  }>(),
  {}
)

/**tin nhắn này thuộc về dạng nào */
const message_type = computed(() => $props.message?.message_type)
/**kích thước của file đầu tiên */
const attachment_size = computed(() => $props.message?.attachment_size?.[0])
/**thời gian tin nhắn được gửi */
const message_time = computed(
  () => $props.message?.time || $props.message?.createdAt
)
/**tin nhắn được trả lời */
const reply_message = computed(() => $props.message?.snap_replay_message)
/**dữ liệu đính kèm của tin nhắn */
const meta = computed(() => $props.message?.message_metadata)
/**nội dung văn bản thuần tuý */
const text = computed(() => $props.message?.message_text)
/**tiêu đề nút bắt đầu */
const postback_title = computed(() => $props.message?.postback_title)
/**danh sách file đính kèm */
const attachments = computed(() => $props.message?.message_attachments)
/**cảm xúc chính của tin nhắn */
const primary_emotion = computed(() => $props.message?.ai?.[0]?.emotion)
/**AI đánh dấu tin này bị rep chậm */
const is_ai_slow_reply = computed(() => $props.message?.is_ai_slow_reply)
/**dữ liệu của tin nhắn */
// const message_source = computed<MessageTemplateInput[]>(() => {
//   /**
//    * - chỉ lấy dữ liệu của attr đầu tiên
//    * - nếu có nhiều attr thì xử lý kiểu khác (hiện tại chỉ có FB là có list attr là dạng ảnh)
//    */
//   const SOURCE = attachments.value?.[0]

//   /**kết quả trả về */
//   let result: MessageTemplateInput[] = []

//   // nếu không attr -> văn bản thuần tuý | nếu không có thì báo lỗi
//   if (!SOURCE?.payload)
//     result.push({
//       is_ai: false,
//       content:
//         text.value || postback_title.value || $t('v1.common.unsupport_message'),
//     })

//   // nếu chỉ có các nút bấm -> chỉ tạo 1 record
//   if (SOURCE?.payload?.buttons)
//     result.push({
//       is_ai: false,
//       // nút bấm sẽ kèm theo một nội dung tin nhắn nào đó
//       content: text.value,
//       // map lại dữ liệu nút bấm
//       list_button: formatButton(SOURCE.payload.buttons),
//     })

//   // nếu là dạng element (slider, file đã xử lý AI) -> tạo 1 mảng dữ liệu
//   if (SOURCE?.payload?.elements)
//     result.push(
//       ...SOURCE?.payload?.elements?.map((element, index) => {
//         /**dữ liệu của 1 template */
//         let res: MessageTemplateInput = {}

//         // tạm thời chỉ hiện AI với image
//         if ($props.message?.ai?.[0]?.ocr) res.is_ai = true
//         else res.is_ai = false

//         // thêm dữ liệu AI nếu có
//         if ($props.message?.ai?.[index]) res.ai = $props.message?.ai?.[index]

//         // tiêu đề
//         res.title = element.title
//         // nội dung văn bản, hoặc url file fb không hiển thị được
//         res.content = element.subtitle || text.value || element.url
//         // dữ liệu ocr của AI
//         res.ocr = $props.message?.ai?.[0]?.ocr
//         // danh sách nút bấm
//         if (element?.buttons) res.list_button = formatButton(element?.buttons)

//         // hình ảnh của slider
//         if (element.image_url) res.image = { url: element.image_url }

//         // video của AI
//         if (element.video_url) res.video = { url: element.video_url }
//         // âm thanh của AI
//         if (element.audio_url) res.audio = { url: element.audio_url }
//         // file của AI
//         if (element.file_url) res.file = { url: element.file_url }

//         // trả về dữ liệu
//         return res
//       })
//     )

//   // nếu chỉ có url (là file nhưng chưa xử lý AI, link dạng fallback) -> tạo 1 record
//   if (SOURCE?.payload?.url && !SOURCE?.payload?.elements) {
//     /**dữ liệu của 1 template */
//     let res: MessageTemplateInput = {}

//     // tính là chưa xử lý AI
//     res.is_ai = false

//     // hình ảnh
//     if (SOURCE?.type === 'image') res.image = { url: SOURCE.payload.url }
//     // video
//     if (SOURCE?.type === 'video') res.video = { url: SOURCE.payload.url }
//     // âm thanh
//     if (SOURCE?.type === 'audio') res.audio = { url: SOURCE.payload.url }
//     // tập tin khác
//     if (SOURCE?.type === 'file') res.file = { url: SOURCE.payload.url }
//     // link
//     if (SOURCE?.type === 'fallback') {
//       res.title = text.value
//       res.content = SOURCE.payload.title
//       res.list_button = [
//         {
//           title: $t('v1.view.main.dashboard.chat.action.open_url'),
//           url: SOURCE.payload.url,
//           type: 'web_url',
//         },
//       ]
//     }

//     // trường hợp vừa có ảnh vừa có text
//     if (text.value) res.content = text.value

//     // trả về dữ liệu
//     result.push(res)
//   }

//   // trả về mảng
//   return result
// })

const message_source = computed<MessageTemplateInput[]>(() =>
  $mesage_service.genMessageSource(
    $props.message?.ai,
    attachments.value,
    text.value,
    postback_title.value
  )
)

/**
 * serivce kiểm tra tin nhắn rep chậm
 * - phải computed vì data prop có thể bị thay đổi
 */
const CHECK_SLOW_REPLY = computed<ICheckSlowReply>(
  () =>
    new CheckSlowReply(
      $props.message,
      messageStore.list_message?.[$props.message_index + 1]
    )
)

/**xử lý dữ liệu nút bấm */
function formatButton(list_raw_button: ChatbotButton[]) {
  return list_raw_button?.map(button => ({
    title: button.title,
    url: button?.url,
    type: button?.type,
  }))
}
/**tính toán bg, viền cho tin nhắn */
function addOnClassTemplate() {
  return {
    'bg-[#FFF8E1]': message_type.value === 'page',
    'bg-white': ['client', 'group'].includes(message_type.value),
    'bg-[#D8F6CB]': message_type.value === 'note',
    'border border-red-500': CHECK_SLOW_REPLY.value.isSlowReply(),
    'border border-yellow-500':
      CHECK_SLOW_REPLY.value.isSystemSlowReply() &&
      !CHECK_SLOW_REPLY.value.isSlowReply(),
  }
}

/**
 * có phải là trường hợp tin nhắn đặc biệt không
 * - khi có mảng nhiều file đính kèm
 * => sẽ hiển thị kiểu khác
 */
function isSpecialCase() {
  return (attachments.value?.length || 0) > 1
}
</script>
