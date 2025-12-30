<template>
  <CardItem
    v-if="$main.countPage()"
    id="all-org__org-item"
    :class="{
      'opacity-50':
        orgStore.selected_org_id !== org_id &&
        size(pageStore.selected_page_id_list) &&
        selectPageStore.is_group_page_mode,
    }"
    class="group/org-item pt-0"
    class_title="flex items-center gap-2 flex-grow min-w-0 w-full overflow-hidden"
    class_content="!gap-0"
    class_header_content="!py-3 sticky top-0 bg-white z-10"
  >
    <template #icon>
      <div class="sticky top-0 pt-3">
        <img
          v-if="
            pageStore.map_orgs?.map_org_info?.[org_id]?.org_info?.org_avatar
          "
          :src="
            pageStore.map_orgs?.map_org_info?.[org_id]?.org_info?.org_avatar
          "
          class="w-5 h-5 rounded-oval"
        />
        <BriefCaseIcon
          v-else
          class="w-5 h-5 text-slate-700"
        />
      </div>
    </template>
    <template #title>
      <div class="flex-shrink-0">
        {{ pageStore.map_orgs?.map_org_info?.[org_id]?.org_info?.org_name }}
      </div>
      <Group :org_id />
    </template>
    <template #action>
      <OrgTitleAction
        v-if="size(active_page_list)"
        :org_id
        :active_page_list
      />
    </template>
    <template #item>
      <OrgPages
        @sort_list_page="$main.getListPage"
        v-model:active_page_list="active_page_list"
        :org_id
      />
    </template>
  </CardItem>
</template>
<script setup lang="ts">
import {
  useOrgStore,
  usePageManagerStore,
  usePageStore,
  useSelectPageStore,
} from '@/stores'
import { usePageManager } from '@/views/Dashboard/composables/usePageManager'
import { filter, pickBy, size } from 'lodash'
import { computed, onMounted, watch } from 'vue'

import CardItem from '@/components/Main/Dashboard/CardItem.vue'
import Group from '@/views/Dashboard/SelectPage/AllOrg/Org/Group.vue'
import OrgPages from '@/views/Dashboard/SelectPage/AllOrg/Org/OrgPages.vue'
import OrgTitleAction from '@/views/Dashboard/SelectPage/AllOrg/Org/OrgTitleAction.vue'

import BriefCaseIcon from '@/components/Icons/BriefCase.vue'

import type { PageData } from '@/service/interface/app/page'

const $props = withDefaults(
  defineProps<{
    /** id tổ chức */
    org_id: string
  }>(),
  {}
)

const orgStore = useOrgStore()
const pageStore = usePageStore()
const pageManagerStore = usePageManagerStore()
const selectPageStore = useSelectPageStore()

/** composable */
const { sortListPage, filterPageByGroup } = usePageManager()

/**danh sách page sau khi được lọc */
const active_page_list = defineModel<PageData[]>('active_page_list')

/** danh sách các page thuộc tổ chức hiện tại */
const page_of_current_org = computed(() => {
  // console.log(pageStore.active_page_list, 'active_page_list')
  return pickBy(pageStore.active_page_list, page => {
    return $main.isInCurrentOrg(page)
  })
})

/** danh sách sau khi đã lọc theo nhóm */
const filter_page_list = computed(() => {
  return filterPageByGroup(
    page_of_current_org.value,
    pageManagerStore.pape_to_group_map,
    pageStore.map_orgs?.map_page_org || {},
    orgStore.selected_org_group
  )
})

class Main {
  /**sắp xếp page gắn sao lên đầu */
  getListPage() {
    // lọc ra các page thuộc về nhóm này
    active_page_list.value = sortListPage(filter_page_list.value)
  }

  /** đếm số page của tổ chức hiện tại với nền tảng đang được lọc */
  countPage(): number {
    // console.log('active_page_list', pageStore.active_page_list)
    /** các page của tổ chức hiện tại */
    const PAGE_OF_THIS_ORG = filter(pageStore.active_page_list, page =>
      this.isInCurrentOrg(page)
    )

    return size(PAGE_OF_THIS_ORG)
  }

  /**trang có thuộc tổ chức hiện tại không */
  isInCurrentOrg(page?: PageData): boolean {
    // không có page thì không hiển thị
    if (!page?.page?.fb_page_id) return false

    // chỉ hiển thị trang của tổ chức này
    if (
      !pageStore.map_orgs?.map_org_page?.[$props.org_id]?.[
        page?.page?.fb_page_id
      ]
    )
      return false

    // cho phép hiển thị
    return true
  }
}
const $main = new Main()

// load danh sách trang khi component được tạo
onMounted(() => $main.getListPage())

// thay đổi bộ lọc nhóm
watch(
  () => filter_page_list.value,
  () => $main.getListPage()
)

defineExpose({ countPage: $main.countPage.bind($main) })
</script>
