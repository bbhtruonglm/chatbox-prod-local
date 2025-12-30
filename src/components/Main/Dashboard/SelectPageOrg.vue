<template>
  <div class="flex items-center gap-3">
    <div
      v-if="size(pageStore.all_page_list)"
      class="w-full min-w-16 text-slate-700 relative h-full"
      ref="select_ref"
    >
      <div class="absolute right-4 top-1/2 -translate-y-2/4 z-10">
        <ArrowDownIcon
          :class="{
            'rotate-180': is_show_option,
          }"
          class="w-3 h-3 text-slate-500"
        />
      </div>
      <button
        v-show="!is_show_option"
        @click="showOption"
        class="rounded-lg w-full h-full py-2 px-3 pr-8 bg-white flex items-center text-sm gap-2.5"
      >
        <div
          v-if="widgetStore.selected_page_id && getSelectedPageName()"
          class="w-[inherit] text-left text-ellipsis overflow-hidden whitespace-nowrap flex items-center gap-2.5"
        >
          <PageAvatar
            :page_info="
              pageStore.all_page_list?.[widgetStore.selected_page_id]?.page
            "
            class="w-5 h-5"
          />
          {{ getSelectedPageName() }}
        </div>
        <span
          v-else="!widgetStore.selected_page_id"
          class="text-gray-400 text-sm"
        >
          {{ $t('v1.view.main.dashboard.select_page.select_page') }}
        </span>
      </button>
      <div
        v-show="is_show_option"
        class="w-full h-full relative"
      >
        <input
          ref="select_input_ref"
          type="text"
          class="rounded-lg w-full pl-8 pr-8 h-9 focus:outline-none text-sm"
          :placeholder="$t('v1.view.main.dashboard.select_page.select_page')"
          v-model="search"
        />
        <img
          src="@/assets/icons/search.svg"
          class="absolute left-2 w-5 h-5 top-1/2 -translate-y-2/4"
        />
      </div>
      <div
        v-show="is_show_option"
        class="p-2 rounded-lg shadow-lg bg-white mt-1 h-auto max-h-52 overflow-y-auto absolute z-40 w-[-webkit-fill-available] flex flex-col gap-1"
      >
        <span class="text-gray-400 text-sm">
          {{ $t('v1.view.main.dashboard.select_page.select_page') }}
        </span>
        <template v-for="page of page_list">
          <div
            v-if="filterPage(page)"
            @click="selectOption(page)"
            :class="{
              'bg-slate-100':
                page?.page?.fb_page_id === widgetStore.selected_page_id,
            }"
            class="text-sm custom-select-option cursor-pointer break-words whitespace-pre-line hover:bg-slate-100 rounded-md py-1.5 px-2 flex items-center gap-2.5"
          >
            <PageAvatar
              :page_info="page?.page"
              class="w-8 h-8 flex-shrink-0"
            />
            <div class="flex-grow min-w-0">
              <div class="truncate">
                {{ getPageName(page?.page) }}
              </div>
              <div class="text-xs text-slate-500 truncate">
                {{ page?.page?.fb_page_id }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div
      v-else
      class="rounded-lg w-full min-w-16 h-9 bg-white flex items-center justify-between p-3 text-sm"
    >
      <div>
        {{ $t('v1.common.loading') }}
      </div>
      <Loading />
    </div>
  </div>
</template>
<script setup lang="ts">
import { getPageName } from '@/service/function'
import { nonAccentVn } from '@/service/helper/format'
import { useOrgStore, usePageStore, useWidgetStore } from '@/stores'
import { N4SerivceAppPage } from '@/utils/api/N4Service/Page'
import { pickBy, size } from 'lodash'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import PageAvatar from '@/components/Avatar/PageAvatar.vue'
import Loading from '@/components/Loading.vue'

import ArrowDownIcon from '@/components/Icons/ArrowDown.vue'

import type { PageData } from '@/service/interface/app/page'
import type { ComponentRef } from '@/service/interface/vue'
import { usePageManager } from '@/views/Dashboard/composables/usePageManager'

const pageStore = usePageStore()
const orgStore = useOrgStore()
const widgetStore = useWidgetStore()

// composable
const { getALlOrgAndPage } = usePageManager()

/**ref tổng của select */
const select_ref = ref<ComponentRef>()
/**ref của input */
const select_input_ref = ref<ComponentRef>()
/**gắn cờ cho logic hiện danh sách lựa chọn của select */
const is_show_option = ref<boolean>()
/**giá trị của tìm kiếm */
const search = ref<string>()

/** danh sách các trang trong tổ chức đã chọn */
const page_list = computed(() => {
  return pickBy(pageStore.all_page_list, page => {
    /** ID của trang hiện tại */
    const PAGE_ID = page?.page?.fb_page_id

    /** id của tổ chức đã chọn */
    const SELECTED_ORG_ID = orgStore.selected_org_id

    /** id tổ chức của trang hiện tại */
    const ORG_ID = pageStore.map_orgs?.map_page_org?.[PAGE_ID || '']

    return ORG_ID === SELECTED_ORG_ID
  })
})

// nạp dữ liệu trang của tổ chức hiện tại khi component được mount
onMounted(() => {
  // nếu có dữ liệu trang rồi thì thôi
  if (!size(pageStore.all_page_list)) {
    getALlOrgAndPage()
  }
})

/**lắng nghe sự kiện khi click ra ngoài */
onMounted(() => document.body.addEventListener('click', clickOutSide, true))

/**lắng nghe sự kiện khi huỷ component */
onUnmounted(() => document.body.removeEventListener('click', clickOutSide))

// khi chọn nền tảng thì xoá trang đã chọn
watch(
  () => orgStore.selected_org_id,
  () => (widgetStore.selected_page_id = undefined)
)

/**lấy tên trang được chọn */
function getSelectedPageName() {
  // nếu không có trang nào được chọn thì thôi
  if (!widgetStore.selected_page_id) return

  // trả về tên trang được chọn
  return getPageName(
    pageStore.all_page_list?.[widgetStore.selected_page_id]?.page
  )
}
/**ẩn hiện org theo tìm kiếm */
function filterPage(page: PageData): boolean {
  // nếu không có giá trị tìm kiếm thì hiển thị tất cả
  if (!search.value) return true

  /**tên trang */
  const NAME = nonAccentVn(getPageName(page?.page) || '')
  /**nội dung tìm kiếm */
  const SEARCH = nonAccentVn(search.value || '')

  // nếu tên trang chứa nội dung tìm kiếm thì hiển thị
  return NAME.includes(SEARCH)
}
/**sử lý sự kiện click ra ngoài */
function clickOutSide($event: MouseEvent) {
  if (
    select_ref.value == $event.target ||
    select_ref.value?.contains($event.target)
  )
    return

  hideOption()
}
/**xử lý sự kiện khi click vào một option */
function selectOption(page: PageData) {
  // gán tổ chức được chọn
  widgetStore.selected_page_id = page?.page?.fb_page_id

  // xoá giá trị tìm kiếm
  search.value = ''

  // ẩn danh sách option
  hideOption()
}
/**hiển thị danh sách option */
function showOption() {
  // hiển thị danh sách option
  is_show_option.value = true

  // focus vào input
  nextTick((): void => select_input_ref.value.focus())
}
/**ẩn danh sách option */
function hideOption() {
  is_show_option.value = false
}
</script>
