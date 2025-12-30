<template>
  <Teleport
    :to="teleport_to"
    v-if="is_open"
  >
    <div
      class="absolute top-0 left-0 h-screen w-screen z-20"
      :class="class_container"
    >
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
          maxHeight: _maxHeight, // <- giới hạn max-height theo viewport
          height: _height,
        }"
        :class="class_content + ' overflow-y-auto'"
        class="absolute shadow-[0px_0px_20px_rgba(0,0,0,0.3)] rounded-md p-2 bg-white z-20"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

const $emit = defineEmits(['close_dropdown', 'open_dropdown'])

const $props = withDefaults(
  defineProps<{
    teleport_to?: string
    width?: string
    height?: string
    position?: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'
    is_fit?: boolean
    distance?: number
    back?: number
    class_content?: string
    class_background?: string
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

const _width = ref($props.width)
const _height = ref($props.height)
const _maxHeight = ref('300px') // mặc định, sẽ update theo viewport

const is_open = ref(false)
const dropdown_ref = ref<HTMLElement>()
const triangle_ref = ref<HTMLElement>()

function closeOnEsc($event: KeyboardEvent) {
  if ($event.key === 'Escape') immediatelyHide()
}

function teleportToTarget($event?: MouseEvent) {
  const TARGET = $event?.currentTarget as HTMLElement
  if (!TARGET) return
  const { x, y, width, height } = TARGET.getBoundingClientRect()
  const TRIANGLE_SIZE = 8

  nextTick(() => {
    // Bottom
    if (
      $props.position === 'BOTTOM' ||
      ($props.position === 'TOP' && y <= window.innerHeight / 2)
    ) {
      const TOP = y + height + TRIANGLE_SIZE + $props.distance
      dropdown_ref.value!.style.left = `${x - $props.back}px`
      dropdown_ref.value!.style.top = `${TOP}px`
      triangle_ref.value!.style.left = `${x + width / 2 - TRIANGLE_SIZE}px`
      triangle_ref.value!.style.top = `${TOP - TRIANGLE_SIZE}px`

      if ($props.is_fit) _width.value = `${width}px`
    }

    // Bên phải
    if ($props.position === 'RIGHT') {
      const LEFT = x + width + $props.distance + TRIANGLE_SIZE
      dropdown_ref.value!.style.left = `${LEFT}px`
      dropdown_ref.value!.style.top = `${y - $props.back}px`
      triangle_ref.value!.style.left = `${LEFT - TRIANGLE_SIZE}px`
      triangle_ref.value!.style.top = `${y + height / 2 - TRIANGLE_SIZE}px`

      if ($props.is_fit) _height.value = `${height}px`
    }

    // Bên trái
    if ($props.position === 'LEFT') {
      dropdown_ref.value!.style.left = `${
        x - dropdown_ref.value!.offsetWidth - $props.distance
      }px`
      dropdown_ref.value!.style.top = `${y - $props.back}px`
      if ($props.is_fit) _height.value = `${height}px`
    }

    // Top
    if (
      $props.position === 'TOP' ||
      ($props.position === 'BOTTOM' && y > window.innerHeight / 2)
    ) {
      dropdown_ref.value!.style.left = `${x - $props.back}px`
      dropdown_ref.value!.style.top = `${
        y - dropdown_ref.value!.offsetHeight - $props.distance - TRIANGLE_SIZE
      }px`
      triangle_ref.value!.style.left = `${x + width / 2 - TRIANGLE_SIZE}px`
      triangle_ref.value!.style.top = `${
        y - TRIANGLE_SIZE * 2 - $props.distance
      }px`

      if ($props.is_fit) _width.value = `${width}px`
    }
  })
}

function toggleDropdown($event?: MouseEvent) {
  if (!is_open.value) {
    document.addEventListener('keyup', closeOnEsc)
    is_open.value = true
    $emit('open_dropdown')
    teleportToTarget($event)
  } else immediatelyHide()
}

function immediatelyHide() {
  if (!is_open.value) return
  document.removeEventListener('keyup', closeOnEsc)
  is_open.value = false
  $emit('close_dropdown')
}

// --- Giới hạn maxHeight theo viewport ---
function updateMaxHeight() {
  const viewportHeight = window.innerHeight
  _maxHeight.value = Math.floor(viewportHeight * 0.6) + 'px'
}

onMounted(() => {
  updateMaxHeight()
  window.addEventListener('resize', updateMaxHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMaxHeight)
})

defineExpose({ toggleDropdown, immediatelyHide, is_open })
</script>

<style scoped>
/* Scroll nội bộ dropdown */
</style>
