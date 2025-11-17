<template>
  <div class="flex items-center justify-between">
    <small class="flex text-xxs">
      <template v-if="creator_name">
        {{ $t('v1.view.main.dashboard.chat.post.post_by') }}
        <strong class="ml-1 font-bold">
          {{ creator_name }}
        </strong>
        <span class="px-1">-</span>
      </template>
      {{ $date_handle.formatCompareCurrentYear(post_content?.updated_time) }}
    </small>
    <a
      @click="$main.openCommentOnFb()"
      href="javascript:;"
      class="text-xs"
    >
      {{ $t('v1.view.main.dashboard.chat.post.open_on_facebook') }}
    </a>
  </div>
  <div class="flex items-center gap-2">
    <img
      v-if="post_content?.attachments?.data?.[0]?.media?.image?.src"
      :src="
        $cdn.fbPostImg(
          conversationStore.select_conversation?.fb_page_id,
          post_id
        )
      "
      class="w-14 h-10 rounded flex-shrink-0 object-contain"
    />
    <div class="flex-grow">
      <div
        ref="ref_message_content"
        class="enter-line"
        :class="{
          'overflow-hidden': !is_view_full,
        }"
        :style="{
          'max-height': is_view_full ? 'unset' : `${MAX_HEIGHT_CONTENT}px`,
        }"
        v-if="post_content?.message"
        v-html="fixXss($markdown.render(renderTextV2(post_content?.message)))"
      />
      <p
        v-if="
          ref_message_content?.clientHeight &&
          ref_message_content.clientHeight >= MAX_HEIGHT_CONTENT
        "
        @click="is_view_full = !is_view_full"
        class="cursor-pointer select-none text-xs text-blue-500 mt-1"
      >
        <template v-if="!is_view_full"> ... {{ $t('Xem thêm') }} </template>
        <template v-else>
          {{ $t('Thu gọn') }}
        </template>
      </p>

      <small
        v-if="message?.ad_id"
        class="flex items-center gap-1"
      >
        <SpeakerIcon class="w-3 h-3 text-orange-600" />
        <p class="text-xs text-orange-700">
          {{ $t('v1.view.main.dashboard.chat.post.from_ad') }}
        </p>
      </small>
      <div
        v-else-if="is_show_btn_comment"
        class="text-right"
      >
        <button
          @click="$main.toggleModal()"
          class="text-xs text-blue-700"
        >
          {{ $t('Xem bài viết') }}
        </button>
      </div>
    </div>
  </div>
  <CommentModal
    v-if="post_id"
    ref="fb_cmt_ref"
    :post_id
    :message
    :message_index
  />
</template>
<script setup lang="ts">
import { useConversationStore } from '@/stores'
import { Cdn } from '@/utils/helper/Cdn'
import { DateHandle } from '@/utils/helper/DateHandle'
import { composableService } from '@/views/ChatWarper/Chat/CenterContent/MessageList/PostTemplate/service'
import { container } from 'tsyringe'
import { computed, ref, watch } from 'vue'

import CommentModal from '@/views/ChatWarper/Chat/CenterContent/MessageList/PostTemplate/CommentModal.vue'
import DOMPurify from 'dompurify'

import SpeakerIcon from '@/components/Icons/Speaker.vue'

import { renderTextV2 } from '@/service/function'
import type { MessageInfo } from '@/service/interface/app/message'

import { MarkedService } from '@/utils/helper/Markdown'
const { PostService } = composableService()

/** Store hội thoại */
const conversationStore = useConversationStore()
/** CDN helper */
const $cdn = container.resolve(Cdn)
/** Xử lý ngày tháng */
const $date_handle = container.resolve(DateHandle)
/** Service xử lý bài viết */
const $post_service = container.resolve(PostService)

/** Props đầu vào của component */
const $props = withDefaults(
  defineProps<{
    /** dữ liệu tin nhắn */
    message?: MessageInfo
    /** vị trí của tin nhắn */
    message_index?: number
    /** có hiển thị nút xem toàn bộ comment không */
    is_show_btn_comment?: boolean
  }>(),
  {}
)

/**
 * Trạng thái hiển thị nội dung bài viết.
 * Nếu tin nhắn có gắn cờ AI thì mặc định ẩn content.
 */
const is_expanded = ref(!$props.message?.ai)

/** Tham chiếu DOM để đo chiều cao nội dung */
const ref_message_content = ref<HTMLElement | null>(null)

/** Cờ xác định nội dung có bị dài hơn phần hiển thị mặc định hay không */
const is_view_full = ref(false)

/** Theo dõi sự thay đổi cờ AI của tin nhắn */
watch(
  () => $props.message?.ai,
  is_ai => {
    /** Nếu AI xử lý xong → ẩn content */
    if (is_ai) is_expanded.value = false
  }
)

/** Chiều cao tối đa khi chưa mở rộng nội dung */
const MAX_HEIGHT_CONTENT = 20

/** Service markdown dùng để render nội dung */
const $markdown = container.resolve(MarkedService)

/** Tham chiếu modal comment */
const fb_cmt_ref = ref<InstanceType<typeof CommentModal>>()

/** Tên người tạo bài viết */
const creator_name = computed(() =>
  $post_service.getCreatorName($props.message?.post)
)

/** Nội dung bài viết */
const post_content = computed(() => $props.message?.post?.content)

/** ID bài viết (ưu tiên fb_post_id, fallback về id trong content) */
const post_id = computed(
  () => $props.message?.fb_post_id || $props.message?.post?.content?.id
)

/**
 * Class gom các hàm thao tác logic của bài viết
 */
class Main {
  /**
   * @param SERVICE_POST service xử lý bài viết
   */
  constructor(private readonly SERVICE_POST = $post_service) {}

  /** Bật / tắt modal comment */
  toggleModal() {
    fb_cmt_ref.value?.toggleModal()
  }

  /** Mở bài viết và nhảy đến vị trí comment hiện tại trên Facebook */
  openCommentOnFb() {
    this.SERVICE_POST.openCommentOnFb(post_id.value, $props.message?.comment_id)
  }
}

/**
 * Làm sạch HTML để tránh lỗi XSS
 * @param text nội dung HTML gốc
 * @returns HTML đã được sanitize
 */
function fixXss(text?: string) {
  return DOMPurify.sanitize(text || '', {
    ADD_ATTR: ['target'],
  })
}

/** Instance chính để gọi các hàm logic */
const $main = new Main()
</script>
