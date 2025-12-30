<template>
  <div
    :id="`staff-read-item-${id}`"
    :class="animate_pulse"
    class="overflow-hidden bg-slate-200"
  >
    <img
      loading="lazy"
      :src="loadImageUrl()"
      @error="onImageError"
      @load="removeAnimatePulse"
      class="w-full h-full"
    />
  </div>
</template>
<script setup lang="ts">
import { usePageStore } from '@/stores'
import { SingletonCdn } from '@/utils/helper/Cdn'
import { ref } from 'vue'

const $props = withDefaults(
  defineProps<{
    id?: string
  }>(),
  {}
)

const pageStore = usePageStore()
const $cdn = SingletonCdn.getInst()

/**kích thước thực tế */
const SIZE = 64
/**thêm hiệu ứng ẩn hiện khi ảnh đang được load */
const animate_pulse = ref('animate-pulse')

/**tắt hiệu ứng ẩn hiện khi ảnh load thành công */
function removeAnimatePulse() {
  animate_pulse.value = ''
}
/**khi ảnh load thất bại thì thay thế ảnh mặc định vào */
function onImageError($event: Event) {
  const image = $event.target as HTMLImageElement

  image.src = `${$env.img_host}/1111111111?width=${SIZE}&height=${SIZE}`
}
/**lấy id của fb */
function getFbAsId() {
  return $props.id
}
/**tạo url ảnh */
function loadImageUrl() {
  return $cdn.userAvt(getFbAsId())
}
</script>
