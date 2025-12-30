<template>
  <div
    id="select-page__all-org"
    class="overflow-y-auto flex flex-col gap-6 pb-16"
  >
    <SkeletonGroupPage v-if="selectPageStore.is_loading" />
    <template v-else>
      <template
        v-for="org of sortBy(orgStore.list_org, 'org_info.org_name')"
        class="flex flex-col gap-2"
      >
        <Org
          ref="org_refs"
          v-if="org?.org_id && $main.isVisibleOrg(org?.org_id)"
          :key="org?.org_id"
          :org_id="org?.org_id"
          v-model:active_page_list="active_pages_of_orgs[org?.org_id]"
        />
      </template>
      <EmptyPage
        v-if="$main.isVisibleEmptyPage() && !selectPageStore.is_loading"
      />
    </template>
  </div>
</template>
<script setup lang="ts">
import {
  useOrgStore,
  usePageStore,
  useSelectPageStore,
  usePageManagerStore,
} from '@/stores'
import { isEmpty, omitBy, sortBy } from 'lodash'
import { nextTick, onMounted, provide, ref, watch } from 'vue'
import { KEY_ADVANCE_SELECT_AGE_FUNCT } from './symbol'

import Org from '@/views/Dashboard/SelectPage/AllOrg/Org.vue'
import EmptyPage from '@/views/Dashboard/SelectPage/EmptyPage.vue'
import SkeletonGroupPage from '@/views/Dashboard/SkeletonGroupPage.vue'

import type { PageData } from '@/service/interface/app/page'
import { BillingAppGroup } from '@/utils/api/Billing'

const selectPageStore = useSelectPageStore()
const pageStore = usePageStore()
const orgStore = useOrgStore()
const pageManagerStore = usePageManagerStore()

// /**
//  * hàm lấy dữ liệu tổ chức và trang
//  * @deprecated sử dụng getALlOrgAndPage trong composable usePageManager
// */
// const getALlOrgAndPage = inject(KEY_GET_ALL_ORG_AND_PAGE_FN)

/**danh sách page của từng tổ chức */
const active_pages_of_orgs = ref<Record<string, PageData[]>>({})

/** mảng các reference tới các component của từng tổ chức */
const org_refs = ref<InstanceType<typeof Org>[]>([])

class Main {
  /**có hiện ui không có page không */
  isVisibleEmptyPage() {
    // đếm tổng của các page được lọc theo nền tảng
    return !org_refs.value?.reduce(
      (count_page, org) => count_page + org?.countPage(),
      0
    )
  }
  /**lọc ra các trang thuộc 1 tổ chức nào đó */
  filterOrgPageOnly(page: PageData): boolean {
    /**id trang */
    const PAGE_ID = page?.page?.fb_page_id

    // nếu không có id trang thì ẩn
    if (!PAGE_ID) return false

    /**id tổ chức của trang này */
    const ORG_ID = pageStore.map_orgs?.map_page_org?.[PAGE_ID]

    // nếu không có tổ chức thì ẩn
    if (!ORG_ID) return false

    // hiện
    return true
  }
  /**xử lý khi trang được chọn ở chế độ nhiều */
  triggerSelectPage(page: PageData): void {
    // nếu không có page thì không chọn
    if (!page?.page?.fb_page_id) return

    // chọn lại tổ chức đang chọn
    orgStore.selected_org_id =
      pageStore.map_orgs?.map_page_org?.[page?.page?.fb_page_id!]

    // loại bỏ tất cả trang đang chọn khác tổ chức này
    pageStore.selected_page_id_list = omitBy(
      pageStore.selected_page_id_list,
      (v, page_id) => {
        /**id tổ chức của trang này */
        const ORG_ID = pageStore.map_orgs?.map_page_org?.[page_id]

        // nếu tổ chức không phải tổ chức đang chọn thì loại bỏ
        return ORG_ID !== orgStore.selected_org_id
      }
    )
  }

  /** có hiện ui của tổ chức hay không */
  isVisibleOrg(org_id?: string) {
    /** nếu là chọn tất cả thì hiện */
    // console.log(orgStore.is_selected_all_org, ' hahah')

    // console.log(orgStore.list_org, 'lisst orge')
    if (orgStore.is_selected_all_org) return true
    // chọn 1 tố tổ chức thì chỉ hiện tổ chức đã chọn
    return org_id === orgStore.selected_org_id
  }

  /**đọc danh sách nhóm */
  async readGroup(): Promise<void> {
    /** danh sách các tổ chức */
    const LIST_ORG = orgStore.list_org || []
    /** Lấy list org id */
    const ORG_IDS = LIST_ORG.map(item => item.org_id || '')
    if (isEmpty(ORG_IDS)) return
    /** toàn bộ nhóm từ server */
    // const RES = await new BillingAppGroup().readGroup($props.org_id)
    const RES = await new BillingAppGroup().readAllGroup(ORG_IDS)

    /** Lưu list vào store */
    orgStore.list_group = RES

    // reset lại map
    pageManagerStore.pape_to_group_map = {}

    // lặp qua các nhóm lưu lại ánh xạ id của từng page với id nhóm của page đó
    RES?.forEach(group => {
      group?.group_pages?.forEach(page_id => {
        // nếu không có id page hoặc id nhóm thì thôi
        if (!page_id || !group?.group_id || !group?.org_id) return
        // lưu ánh xạ từ id page tới id nhóm
        pageManagerStore.pape_to_group_map[page_id] = [
          ...(pageManagerStore.pape_to_group_map[page_id] || []),
          group?.group_id,
        ]
      })
    })
  }
}
const $main = new Main()

// lấy danh sách nhóm khi thành phần được khởi tạo
// onMounted(async () => {
//   await $main.readGroup()
//   // nextTick(() => {
//   //   // Lắng nghe resize
//   //   window.addEventListener('resize', updateGroups)
//   // })
// })

watch(
  () => orgStore.list_org,
  list => {
    if (list && list.length) {
      $main.readGroup()
    }
  },
  { immediate: true } // chạy luôn khi component mount
)

// cung cấp hàm xử lý khi chọn trang
provide(KEY_ADVANCE_SELECT_AGE_FUNCT, $main.triggerSelectPage)
</script>
