<template>
  <img
    @error="onImageError"
    @load="removeAnimatePulse"
    loading="lazy"
    v-if="avatar"
    :src="avatar"
    class="overflow-hidden bg-slate-200 rounded-oval"
  />
  <div
    v-else-if="comment"
    :class="animate_pulse"
    class="overflow-hidden bg-slate-200 rounded-oval"
  >
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      :src="$main.loadCommentFromAvatar()"
      class="w-full h-full"
    />
  </div>
  <PageAvatar
    v-else-if="conversation?.conversation_type === 'POST'"
    :page_info="conversationStore.getPage()"
  />
  <div
    v-else
    :class="animate_pulse"
    class="overflow-hidden bg-slate-200 rounded-oval"
  >
    <div
      :style="{ background: letterToColorCode() }"
      class="w-full h-full flex justify-center items-center font-semibold text-white"
      v-if="
        conversation?.client_name && conversation?.platform_type === 'WEBSITE'
      "
    >
      {{ nameToLetter(conversation?.client_name) }}
    </div>
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      v-if="conversation?.platform_type === 'FB_MESS'"
      :src="loadImageUrl()"
      class="w-full h-full"
    />
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      v-if="conversation?.platform_type === 'FB_INSTAGRAM'"
      :src="loadImageUrl(conversation?.platform_type)"
      class="w-full h-full"
    />
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      v-if="conversation?.platform_type === 'TIKTOK'"
      :src="loadImageUrl(conversation?.platform_type)"
      class="w-full h-full"
    />
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      v-if="
        conversation?.platform_type === 'ZALO_OA' && conversation?.client_avatar
      "
      :src="conversation?.client_avatar"
      class="w-full h-full"
    />
    <img
      @error="onImageError"
      @load="removeAnimatePulse"
      loading="lazy"
      v-if="
        conversation?.platform_type === 'ZALO_PERSONAL' &&
        conversation?.client_avatar
      "
      :src="conversation?.client_avatar"
      class="w-full h-full"
    />
    <div
      v-else
      :style="{ background: letterToColorCode() }"
      class="w-full h-full flex justify-center items-center font-semibold text-white"
    >
      {{ nameToLetter(conversation?.client_name || '') }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { nameToLetter } from '@/service/helper/format'
import { useConversationStore } from '@/stores'
import { Cdn, SingletonCdn, type ICdn } from '@/utils/helper/Cdn'
import { onMounted, ref } from 'vue'

import PageAvatar from '@/components/Avatar/PageAvatar.vue'

import type { ConversationInfo } from '@/service/interface/app/conversation'
import type { PageType } from '@/service/interface/app/page'
import type { FacebookCommentPost } from '@/service/interface/app/post'
import { container } from 'tsyringe'

const $cdn = SingletonCdn.getInst()
/** Các nền tảng có avatar */
const NO_AVT_PLATFORMS = ['ZALO', 'TIKTOK']

const $props = withDefaults(
  defineProps<{
    /**thông tin cuộc trò chuyện */
    conversation?: ConversationInfo
    /**kích thước thực tế của hình ảnh */
    actual_size?: number
    /**dữ liệu bình luận */
    comment?: FacebookCommentPost
    /**link avt để dùng luôn */
    avatar?: string
  }>(),
  {
    actual_size: 64,
  }
)

const conversationStore = useConversationStore()

/**thêm hiệu ứng ẩn hiện khi ảnh đang được load */
const animate_pulse = ref('animate-pulse')

onMounted(() => {
  /** tắt hiệu ứng với dạng web */
  if ($props.conversation?.platform_type === 'WEBSITE') removeAnimatePulse()
  /** tắt hiệu ứng với các nền tảng không có avatar */
  if (
    NO_AVT_PLATFORMS.some(p =>
      $props.conversation?.platform_type?.includes(p)
    ) &&
    !$props.conversation?.client_avatar
  ) {
    removeAnimatePulse()
  }
})

/**tạo bg dựa trên chữ cái */
function letterToColorCode() {
  let character = $props.conversation?.client_name

  // nếu không có tên thì trả về màu mặc định
  if (!character) return 'rgb(212, 219, 255)'

  // lấy chữ cái đầu tiên và Chuyển ký tự thành chữ thường
  const INPUT = character?.charAt(0).toLowerCase()

  // Chuyển đổi ký tự thành mã màu, Lấy mã Unicode và trừ đi mã 'a' (97)
  let charCode = (INPUT?.charCodeAt(0) || 0) - 97

  // Chuyển đổi số nguyên thành giá trị RGB
  var red = (charCode * 30) % 256
  var green = (charCode * 20) % 256
  var blue = (charCode * 10) % 256

  return 'rgb(' + red + ', ' + green + ', ' + blue + ')'
}
/**tắt hiệu ứng ẩn hiện khi ảnh load thành công */
function removeAnimatePulse() {
  animate_pulse.value = ''
}
/**tạo url ảnh */
function loadImageUrl(platform_type?: PageType) {
  if (platform_type === 'FB_INSTAGRAM')
    return $cdn.igClientAvt(
      $props.conversation?.fb_page_id,
      $props.conversation?.fb_client_id
    )
  if (platform_type === 'TIKTOK') {
    return $cdn.tiktokClientAvt(
      $props.conversation?.fb_page_id,
      $props.conversation?.fb_client_id
    )
  }
  return $cdn.fbClientAvt(
    $props.conversation?.fb_page_id,
    $props.conversation?.fb_client_id
  )
}
/**khi ảnh load thất bại thì thay thế ảnh mặc định vào */
function onImageError($event: Event) {
  const image = $event.target as HTMLImageElement

  image.src = `${$env.img_host}/1111111111?width=${$props.actual_size}&height=${$props.actual_size}`
}

class Main {
  /**
   * @param SERVICE_CDN dịch vụ cdn
   */
  constructor(private readonly SERVICE_CDN: ICdn = container.resolve(Cdn)) {}

  /**lấy avt của người gửi của bình luận này */
  loadCommentFromAvatar() {
    // nếu không có bình luận thì trả về rỗng
    if (!$props.comment) return ''

    /**id trang */
    const PAGE_ID = $props.conversation?.fb_page_id
    /**id người gửi */
    const FROM_ID = $props.comment?.from?.id

    // trả về url ảnh
    return this.SERVICE_CDN.fbClientAvt(PAGE_ID, FROM_ID)
  }
}
const $main = new Main()
</script>
