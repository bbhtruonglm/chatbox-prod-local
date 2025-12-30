<template>
  <Teleport
    :to="teleport_to"
    v-if="is_open"
  >
    <div class="absolute top-0 left-0 h-screen w-screen z-20" :class="class_container">
      <div
        @click="toggleDropdown()"
        class="w-full h-full"
        :class="class_background"
      ></div>
      <div
        ref="triangle_ref"
        class="absolute z-30 rotate-45 w-4 h-4 bg-white"  
      />
      <div
        ref="dropdown_ref"
        :style="{
          width: _width,
          height: _height,
        }"
        :class="class_content"
        class="absolute shadow-[0px_0px_20px_rgba(0,0,0,0.3)] rounded-md p-2 bg-white z-20"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { ref, nextTick } from 'vue'

import type { ComponentRef, ModalPosition } from '@/service/interface/vue'

const $emit = defineEmits(['close_dropdown', 'open_dropdown'])

const $props = withDefaults(
  defineProps<{
    /**dịch chuyển component này đến vị trí nào */
    teleport_to?: string
    /**độ rộng của component */
    width?: string
    /**độ dài của component */
    height?: string
    /**hướng của dropdown */
    position?: ModalPosition
    /**width hoặc height sẽ bằng với phần tử cha */
    is_fit?: boolean
    /**khoảng cách so với mục tiêu */
    distance?: number
    /**lùi div lại một khoảng */
    back?: number
    /**class thêm cho nội dung */
    class_content?: string
    /** class của background */
    class_background?: string
    /** class container */
    class_container?: string
  }>(),
  {
    teleport_to: 'body',
    width: '200px',
    height: '200px',
    position: 'BOTTOM',
    is_fit: true,
    distance: 5,
    back: 0,
  }
)

/**chiều rộng thực tế */
const _width = ref($props.width)
/**chiều cao thực tế */
const _height = ref($props.height)
/**ẩn hiện modal */
const is_open = ref(false)
/**ref của dropdown */
const dropdown_ref = ref<ComponentRef>()
/**ref của triangle */
const triangle_ref = ref<ComponentRef>()

/**đóng modal khi nhấn esc */
function closeOnEsc($event: KeyboardEvent) {
  if ($event.key === 'Escape') immediatelyHide()
}
/**dịch chuyển dropdown đến vị trí */
function teleportToTarget($event?: MouseEvent) {
  // tịnh tiến vị trí
  const TARGET = $event?.currentTarget as HTMLElement

  if (!TARGET) return

  // lấy vị trí của block click
  const { x, y, width, height } = TARGET?.getBoundingClientRect()
  /**kích thước của tam giác */
  const TRIANGLE_SIZE = 8

  // hiển thị dropdown
  nextTick(() => {
    // bên phải
    if ($props.position === 'RIGHT') {
      // khoảng cách left: left của target + độ rộng target + khoảng cách thêm
      const LEFT = x + width + $props.distance + TRIANGLE_SIZE

      // bên trái
      dropdown_ref.value.style.left = `${LEFT}px`
      // top = top của target - lùi lại
      dropdown_ref.value.style.top = `${y - $props.back}px`

      // left của modal - kích thước tam giác
      triangle_ref.value.style.left = `${LEFT - TRIANGLE_SIZE}px` 
      // top của target + một nửa độ cao của target - kích thước tam giác
      triangle_ref.value.style.top = `${y + height / 2 - TRIANGLE_SIZE}px`

      // căn lại kích thước nếu cần
      if ($props.is_fit) _height.value = `${height}px`
    }
    // bên dưới hoặc vị trí bấm nằm phía trên
    if (
      $props.position === 'BOTTOM' ||
      ($props.position === 'TOP' && y <= window.innerHeight / 2)
    ) {
      /**khoảng cách top: top của target + độ cao target + độ cao tam giác + khoảng cách thêm */
      const TOP = y + height + TRIANGLE_SIZE + $props.distance

      // lấy left của target trừ khoảng lùi lại
      dropdown_ref.value.style.left = `${x - $props.back}px`
      dropdown_ref.value.style.top = `${TOP}px`

      // left của target + một nửa độ rộng của target - kích thước tam giác
      triangle_ref.value.style.left = `${x + width / 2 - TRIANGLE_SIZE}px`
      // top cơ bản của dropdown - kích thước tam giác
      triangle_ref.value.style.top = `${TOP - TRIANGLE_SIZE}px`

      // căn lại kích thước nếu cần
      if ($props.is_fit) _width.value = `${width}px`
    }
    // bên trái
    if ($props.position === 'LEFT') {
      // căn chỉnh vị trí
      dropdown_ref.value.style.left = `${
        x - dropdown_ref.value.offsetWidth - $props.distance
      }px`
      dropdown_ref.value.style.top = `${y - $props.back}px`

      // căn lại kích thước nếu cần
      if ($props.is_fit) _height.value = `${height}px`
    }
    // bên trên hoặc vị trí bấm nằm ở phía dưới
    if (
      $props.position === 'TOP' ||
      ($props.position === 'BOTTOM' && y > window.innerHeight / 2)
    ) {
      // căn chỉnh vị trí
      dropdown_ref.value.style.left = `${x - $props.back}px`
      dropdown_ref.value.style.top = `${
        y - dropdown_ref.value.offsetHeight - $props.distance - TRIANGLE_SIZE
      }px`

      // left của target + một nửa độ rộng của target - kích thước tam giác
      triangle_ref.value.style.left = `${x + width / 2 - TRIANGLE_SIZE}px`
      // top cơ bản của dropdown - kích thước tam giác
      triangle_ref.value.style.top = `${
        y - TRIANGLE_SIZE * 2 - $props.distance
      }px`

      // căn lại kích thước nếu cần
      if ($props.is_fit) _width.value = `${width}px`
    }
  })
}
/**ẩn hiện modal */
function toggleDropdown($event?: MouseEvent) {
  // mở modal
  if (!is_open.value) {    
    // khi component được render thì lắng nghe sự kiện nhấn esc
    document.addEventListener('keyup', closeOnEsc)

    // mở modal
    is_open.value = true

    // bắn sự kiện ra ngoài khi tắt modal
    $emit('open_dropdown')

    teleportToTarget($event)
  }
  // tắt modal
  else immediatelyHide()
}
/**tắt ngay lập tức */
function immediatelyHide() {
  if (!is_open.value) return

  // khi component bị xóa thì loại bỏ sự kiện nhấn esc
  document.removeEventListener('keyup', closeOnEsc)

  is_open.value = false

  // bắn sự kiện ra ngoài khi tắt modal
  $emit('close_dropdown')
}

// public chức năng ẩn hiện modal để có thể được gọi từ bên ngoài component
defineExpose({ toggleDropdown, immediatelyHide, is_open })
</script>
