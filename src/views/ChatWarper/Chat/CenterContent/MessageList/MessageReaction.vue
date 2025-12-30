<template>
  <div
    id="chat__message-reaction"
    class="text-xxs text-slate-500 absolute group w-max z-20 -top-2.5 px-1"
    :class="position_class"
  >
    <!-- Trigger icon -->
    <!-- :class="[
        selected_reaction
          ? 'px-3 py-0.5 bg-white border border-slate-200 rounded-full opacity-100'
          : 'px-3 py-1 bg-white border border-slate-200 rounded-full',
      ]" -->
    <span
      class="flex items-center justify-center cursor-pointer text-base rounded-full relative opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-1 py-0.5 bg-white rounded-full shadow"
      @mouseenter="openReactions"
      @mouseleave="closeReactions"
      ref="trigger_icon"
    >
      <!-- Nếu đã chọn reaction, hiện emoji UTF-8, ngược lại Lucide icon -->
      <span
        class="text-sm flex items-center justify-center gap-1 size-4 py-0.5"
      >
        {{ MAIN_REACTIONS[0].icon }}
      </span>
      <!-- <ThumbsUpIcon class="size-3 text-blue-500" /> -->

      <!-- Reaction popup: hiện khi hover trigger icon -->
      <div
        v-if="is_open"
        ref="reactionPopup"
        class="absolute z-50 bg-white border border-slate-200 rounded-full shadow-lg p-0.5 flex gap-1 transition-all duration-150"
        :style="popup_style"
        @mouseenter="hovering = true"
        @mouseleave="closeReactions"
      >
        <span
          v-for="reaction in MAIN_REACTIONS"
          :key="reaction.code"
          class="cursor-pointer hover:scale-125 transition-transform size-7 rounded-full flex items-center justify-center text-xl"
          @click="selectReaction(reaction)"
        >
          {{ reaction.icon }}
        </span>
      </div>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { MessageInfo } from '@/service/interface/app/message'
import { N4SerivceAppMessage } from '@/utils/api/N4Service/Conversation'
import { ThumbsUpIcon } from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

/** Trạng thái mở popup reaction */
const is_open = ref(false)

/** Trạng thái hover lên popup (để tránh đóng ngoài ý muốn) */
const hovering = ref(false)

/** Style position của popup (cập nhật theo icon trigger) */
const popup_style = ref({} as any)

/** Ref tới icon để tính vị trí hiển thị popup */
const trigger_icon = ref<HTMLElement | null>(null)

const $route = useRoute()

/**
 * Danh sách reaction user đã chọn:
 * - null → chưa chọn
 * - [] → đã chọn nhưng bị remove
 * - array Reaction → chọn nhiều reaction
 */
const selected_reaction = ref<{ code: string; icon: string }[] | null>(null)

/** Kiểu Reaction */
interface Reaction {
  code: string
  icon: string
  color: string
}

/**
 * 6 reaction mặc định
 * code: text gửi lên API
 * icon: emoji hiển thị
 */
const MAIN_REACTIONS: Reaction[] = [
  { code: '/-strong', icon: '👍', color: '#ffffff' },
  { code: '/-heart', icon: '❤️', color: '#ffffff' },
  { code: ':>', icon: '😆', color: '#ffffff' },
  { code: ':o', icon: '😮', color: '#ffffff' },
  { code: ':-((', icon: '😢', color: '#ffffff' },
  { code: ':-h', icon: '😡', color: '#ffffff' },
]

/**
 * Mở popup → đồng thời cập nhật vị trí theo icon
 */
function openReactions() {
  is_open.value = true
  updatePopupPosition()
}

/**
 * Đóng popup:
 * - delay 100ms để k bị tắt khi rê chuột nhanh
 * - chỉ đóng nếu user không hover vào popup
 */
function closeReactions() {
  setTimeout(() => {
    if (!hovering.value) {
      is_open.value = false
    }
  }, 100)

  hovering.value = false
}

/**
 * Cập nhật vị trí của popup theo vị trí icon
 * - dùng getBoundingClientRect để lấy toạ độ icon
 * - giới hạn không vượt ra ngoài màn hình
 */
function updatePopupPosition() {
  if (trigger_icon.value) {
    const rect = trigger_icon.value.getBoundingClientRect()

    const top = rect.top - 35
    const left = Math.min(window.innerWidth - 220, Math.max(10, rect.left - 20))

    popup_style.value = {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed',
    }
  }
}

/**
 * User click 1 reaction:
 * - Nếu chưa chọn → thêm
 * - Nếu chọn rồi → gỡ
 * - Nếu gỡ hết → reset về null
 */
async function selectReaction(reaction: Reaction) {
  /** call api gửi reaction */
  await new N4SerivceAppMessage().sendReaction(
    $props.fb_page_id || '',
    $route.query.user_id?.toString() || '',
    reaction.code,
    $props.message?.message_mid || ''
  )
  // if (!selected_reaction.value) {
  //   selected_reaction.value = [reaction]
  // } else {
  //   const index = selected_reaction.value.findIndex(
  //     r => r.code === reaction.code
  //   )

  //   if (index === -1) {
  //     selected_reaction.value.push(reaction)
  //   } else {
  //     selected_reaction.value.splice(index, 1)

  //     if (selected_reaction.value.length === 0) {
  //       selected_reaction.value = null
  //     }
  //   }
  // }

  console.log('Selected reactions:', selected_reaction.value)

  /** Chọn xong thì đóng popup */
  is_open.value = false
}

/** Props: dùng để biết sender là ai, đang ở page nào */
const $props = withDefaults(
  defineProps<{
    sender_id?: string
    fb_page_id?: string
    /** dữ liệu tin nhắn */
    message?: MessageInfo
  }>(),
  {}
)

/**
 * Class vị trí của reaction trigger
 * - Nếu là page (của mình) -> hiện bên trái (-left)
 * - Nếu là client/group (người khác) -> hiện bên phải (-right)
 */
const position_class = computed(() => {
  if (
    $props.message?.message_type === 'page' ||
    $props.sender_id === $props.fb_page_id
  ) {
    return '-left-[52px]'
  }
  return '-right-[52px]'
})
</script>

<style scoped>
/* Optional: transition mềm cho icon trigger */
</style>
