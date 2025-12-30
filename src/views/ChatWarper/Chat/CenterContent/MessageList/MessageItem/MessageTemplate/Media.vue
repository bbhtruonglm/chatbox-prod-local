<template>
  <div
    @click="openMediaDetail"
    class="gap-2.5 flex flex-col cursor-pointer hover:brightness-90 rounded-lg overflow-hidden"
  >
    <div
      v-if="data_source?.image?.url"
      class="bg-gray-50"
      :style="initSize()"
    >
      <img
        :src="
          isUseNewCdn()
            ? getCdnUrl() || data_source?.image?.url
            : data_source?.image?.url
        "
        class="w-full h-full object-contain"
      />
    </div>
    <div
      v-if="data_source?.video?.url"
      class="bg-gray-100"
      :style="initSize()"
    >
      <video
        class="w-full h-full"
        controls
        preload="metadata"
      >
        <source
          :src="getVideoUrl()"
          type="video/mp4"
        />
      </video>
    </div>
    <Audio
      v-if="data_source?.audio?.url"
      :src="
        isUseNewCdn()
          ? getCdnUrl() || data_source?.audio?.url
          : data_source?.audio?.url
      "
      class="min-w-52"
    />
    <div
      v-if="data_source?.file?.url"
      class="message-box bg-white flex flex-col items-end text-slate-700"
    >
      <div class="p-2 rounded-full bg-slate-300 w-9 h-9">
        <DocumentIcon class="w-5 h-5" />
      </div>
      <div class="text-sm truncate min-w-0 w-full underline">
        {{ getFileName(data_source?.file?.url) }}
      </div>
    </div>
  </div>
  <MediaDetail
    ref="media_detail_ref"
    :data_source
    :url="getDetailUrl()"
    :message_id="message?._id"
    :message
  />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { last } from 'lodash'
import { FitSize } from '@/utils/helper/Attachment'

import MediaDetail from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/MediaDetail.vue'
import Audio from '@/views/ChatWarper/Chat/CenterContent/MessageList/MessageItem/MessageTemplate/Media/Audio.vue'

import DocumentIcon from '@/components/Icons/Document.vue'

import type {
  AttachmentSize,
  MessageInfo,
  MessageTemplateInput,
} from '@/service/interface/app/message'
import { SingletonCdn } from '@/utils/helper/Cdn'
import { useConversationStore } from '@/stores'
import ENV from '@/configs/envs'

const $props = withDefaults(
  defineProps<{
    /**dữ liệu tin nhắn đã được định dạng lại */
    data_source?: MessageTemplateInput
    /**kích thước của file đính kèm */
    attachment_size?: AttachmentSize
    /**dữ liệu của tin nhắn */
    message: MessageInfo
  }>(),
  {}
)

const $cdn = SingletonCdn.getInst()
const conversationStore = useConversationStore()

/**ref của component MediaDetail */
const media_detail_ref = ref<InstanceType<typeof MediaDetail>>()

/**loại nền tảng */
const platform_type = computed(
  /** ưu tiên platform type của tin nhắn, nếu không có thì fallback platform type của hội thoại */
  () =>
    $props.message?.platform_type ||
    conversationStore.select_conversation?.platform_type
)

/**có sử dụng cnd mới không */
function isUseNewCdn() {
  // các nền tảng sử dụng cdn mới
  return ['FB_MESS', 'WEBSITE', 'FB_INSTAGRAM', 'TIKTOK'].includes(
    platform_type.value || ''
  )
}
/**lấy tên của file */
function getFileName(url: string) {
  try {
    /**Sử dụng URL API để tách phần pathname */
    const PATH = new URL(url)?.pathname

    // lấy tên file từ pathname
    return last(PATH?.split('/'))
  } catch (e) {
    return ''
  }
}
/**mở modal xem chi tiết file */
function openMediaDetail() {
  // mở modal xem chi tiết file
  media_detail_ref.value?.toggleModal()
}
/**tạo ra kích thước cho phần từ trước khi hình ảnh, video được load */
function initSize() {
  // tính toán
  return new FitSize(
    247,
    160,
    $props.attachment_size?.width,
    $props.attachment_size?.height
  ).toCss()
}
/**đọc dữ liệu mới của tập tin */
function getCdnUrl(): string | undefined {
  // TODO * Tạm fix cứng sau này sẽ xóa
  // nếu có chứa merchant.vn thì dùng link gốc
  if ($props.data_source?.audio?.url?.includes('merchant.vn'))
    return $props.data_source?.audio?.url

  // nếu là slider thực thì dùng luôn
  if ($props.message?.message_attachments?.[0]?.type === 'template') return

  /**lấy id của tin nhắn */
  const TARGET_ID = $props.message?.message_mid

  // nếu không có id thì không cần xử lý
  if (!TARGET_ID) return

  if (platform_type.value === 'WEBSITE')
    return $cdn.webMessageMedia($props.message?.fb_page_id, TARGET_ID, 0)

  if (platform_type.value === 'FB_INSTAGRAM')
    return $cdn.igMessageMedia($props.message?.fb_page_id, TARGET_ID, 0)

  if (platform_type.value === 'TIKTOK')
    return $cdn.tiktokMessageMedia($props.message?.fb_page_id, TARGET_ID, 0)

  return $cdn.fbMessageMedia($props.message?.fb_page_id, TARGET_ID, 0)
}

/**
 * Lấy đường dẫn video, xử lý proxy cho ZALO_PERSONAL
 */
function getVideoUrl() {
  let url = isUseNewCdn()
    ? getCdnUrl() || $props.data_source?.video?.url
    : $props.data_source?.video?.url

  if (platform_type.value === 'ZALO_PERSONAL' && url) {
    return `${ENV.host.proxy_video}?url=${url}`
  }
  return url
}

/**
 * Lấy đường dẫn chi tiết cho MediaDetail
 */
function getDetailUrl() {
  if (isUseNewCdn()) {
    return getCdnUrl()
  }

  if ($props.data_source?.video?.url) {
    return getVideoUrl()
  }

  return (
    $props.data_source?.image?.url ||
    $props.data_source?.audio?.url ||
    $props.data_source?.file?.url
  )
}
</script>
