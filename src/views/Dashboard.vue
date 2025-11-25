<template>
  <div class="flex flex-col h-full p-3 gap-3">
    <Header class="flex-shrink-0">
      <template #right>
        <template v-if="$main.isShowSelectPageButton()">
          <button
            @click="toggleDropdown"
            class="btn-custom text-sm font-semibold py-2 px-3 bg-slate-200"
          >
            <PlusCircleIcon class="size-4" />
            {{ $t('v1.view.main.dashboard.nav.select_platform') }}
            <ChevronDownIcon class="size-3" />
          </button>
          <button
            v-if="size(pageStore.active_page_list)"
            @click="$main.toggleModelGroupPage()"
            class="btn-custom text-sm font-semibold py-2 px-3 bg-slate-200"
          >
            <SquaresPlusIcon class="size-4" />
            {{ $t('v1.view.main.dashboard.select_page.group_page.title') }}
          </button>
        </template>
        <ReChargeBtn
          v-if="$route.path.includes('/dashboard/org/') && IS_SHOW_PAYMENT"
        />
      </template>
    </Header>
    <div class="overflow-hidden h-full">
      <RouterView />
    </div>
    <DropdownPickConnectPlatform
      @done="reloadPageData()"
      ref="ref_dropdown_pick_connect_platform"
      :position="pageManagerStore.position"
      :back="pageManagerStore.back"
    />
    <ConnectPage
      @done="reloadPageData()"
      ref="connect_page_ref"
    />
  </div>
</template>

<script setup lang="ts">
import {
  useOrgStore,
  usePageManagerStore,
  usePageStore,
  useSelectPageStore,
} from '@/stores'
import { initRequireData } from '@/views/composable'
import { usePageManager } from '@/views/Dashboard/composables/usePageManager'
import { KEY_GET_CHATBOT_USER_FUNCT } from '@/views/Dashboard/symbol'
import { size } from 'lodash'
import { storeToRefs } from 'pinia'
import { onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ConnectPage from '@/views/Dashboard/ConnectPage.vue'
import Header from '@/views/Dashboard/Header.vue'
import ReChargeBtn from '@/views/Dashboard/Org/ReChargeBtn.vue'
import DropdownPickConnectPlatform from '@/views/Dashboard/SelectPage/DropdownPickConnectPlatform.vue'

import PlusCircleIcon from '@/components/Icons/PlusCircle.vue'
import SquaresPlusIcon from '@/components/Icons/SquaresPlus.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'

import { db } from '@/db/ChatDB'
import { BackupApp } from '@/utils/api/Backup'
import ZipWorker from '@/db/zip.worker?worker'
import { loadOrgData } from '@/db/loadDataOrg'
const pageStore = usePageStore()
const selectPageStore = useSelectPageStore()
const orgStore = useOrgStore()
const pageManagerStore = usePageManagerStore()
const $route = useRoute()

/** có hiện phần thanh toán hay không */
const IS_SHOW_PAYMENT = $env.is_show_payment

const { ref_dropdown_pick_connect_platform, connect_page_ref } =
  storeToRefs(pageManagerStore)
const worker = new ZipWorker()

const loadingState = ref<
  Record<string, { status: string; count?: number; error?: string }>
>({})

// composable
const { getMeChatbotUser } = initRequireData()
const { toggleDropdown, reloadPageData } = usePageManager()

class Main {
  /**vào chế độ chat nhiều trang */
  toggleModelGroupPage() {
    // reset lại danh sách trang đã chọn nếu đang ở chế độ nhiều tổ chức
    if (orgStore.is_selected_all_org) pageStore.selected_page_id_list = {}

    // toggle chế độ chat nhiều page
    selectPageStore.toggleGroupPageMode()
  }
  /**ẩn hiện modal kết nối nền tảng */
  toggleModalConnectPage(key?: string) {
    pageManagerStore.connect_page_ref?.toggleModal?.(key)
  }

  /**có hiển thị các nút của trang chọn page không */
  isShowSelectPageButton() {
    return (
      // đang ở trang chọn page
      $route.path.includes('select-page') &&
      // không ở chế độ chat nhiều page
      (!selectPageStore.is_group_page_mode ||
        // người dùng chưa có trang nào
        !size(pageStore.active_page_list))
    )
  }
}
const $main = new Main()

watch(
  () => orgStore.list_org,
  async val => {
    if (!val || !val.length) return

    const results = await loadOrgData(
      val,
      ({ orgId, status, count, error }) => {
        // Cập nhật UI hoặc reactive state
        loadingState.value[orgId] = { status, count, error }
        console.log('Worker progress', orgId, status, count, error)
      }
    )

    console.log('All orgs loaded', results)
  },
  { immediate: true }
)

// cung cấp hàm này cho component con dùng
provide(KEY_GET_CHATBOT_USER_FUNCT, getMeChatbotUser)
</script>
<style scoped lang="scss">
.dashboard-header {
  .btn-custom {
    @apply rounded items-center gap-2 hidden md:flex;
  }
}
</style>
