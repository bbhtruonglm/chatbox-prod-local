<template>
  <div class="overflow-hidden bg-slate-100 rounded-oval">
    <img
      v-if="page_info?.type === 'ZALO_PERSONAL'"
      loading="lazy"
      :src="loadImageUrl()"
      class="w-full h-full object-contain"
    />
    <img
      loading="lazy"
      v-else-if="page_info?.type === 'FB_INSTAGRAM'"
      :src="loadImageUrl()"
      class="w-full h-full"
    />
    <img
      loading="lazy"
      v-else-if="page_info?.type === 'TIKTOK'"
      :src="loadImageUrl()"
      class="w-full h-full"
    />
    <img
      v-else-if="page_info?.avatar"
      loading="lazy"
      :src="page_info?.avatar"
      class="w-full h-full object-contain"
    />
    <img
      loading="lazy"
      v-else-if="page_info?.type === 'FB_MESS'"
      :src="loadImageUrl()"
      class="w-full h-full"
    />

    <template v-else-if="page_info?.type === 'WEBSITE'">
      <img
        v-if="page_info?.avatar"
        loading="lazy"
        :src="page_info?.avatar"
        class="w-full h-full"
      />
      <WebIcon
        v-else
        class="w-full h-full"
      />
    </template>

    <img
      loading="lazy"
      v-else-if="page_info?.type === 'ZALO_OA'"
      :src="page_info?.avatar || zaloSvg"
      class="w-full h-full"
    />
  </div>
</template>

<script setup lang="ts">
import { SingletonCdn } from '@/utils/helper/Cdn'

import zaloSvg from '@/assets/icons/zalo.svg'
import WebIcon from '@/components/Icons/Web.vue'

import type { IPage } from '@/service/interface/app/page'

const $cdn = SingletonCdn.getInst()

const $props = withDefaults(
  defineProps<{
    /**dữ liệu của trang */
    page_info?: IPage
  }>(),
  {}
)

/**tạo url ảnh */
function loadImageUrl(page_id?: string) {
  /**id của trang */
  const PAGE_ID = page_id || $props.page_info?.fb_page_id

  switch ($props.page_info?.type) {
    case 'ZALO_PERSONAL':
      return $cdn.zlpPageAvt(PAGE_ID)
    case 'FB_MESS':
      return $cdn.fbPageAvt(PAGE_ID)
    case 'FB_INSTAGRAM':
      return $cdn.igPageAvt(PAGE_ID)
    default:
      return $props.page_info?.avatar
  }
}
</script>
