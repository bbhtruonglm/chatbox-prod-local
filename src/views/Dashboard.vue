<template>
  <div class="flex flex-col h-full p-3 gap-3">
    <Header class="flex-shrink-0">
      <template #right>
        <template v-if="$main.isShowSelectPageButton()">
          <button
            @click="toggle_dropdown"
            class="btn-custom text-sm font-semibold py-2 px-3 bg-slate-200"
          >
            <PlusCircleIcon class="size-4" />
            {{ $t('v1.view.main.dashboard.nav.select_platform') }}
            <ChevronDownIcon class="size-3" />
          </button>
          <button
            v-if="size(page_store.active_page_list)"
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
      @done="reload_page_data()"
      ref="ref_dropdown_pick_connect_platform"
      :position="page_manager_store.position"
      :back="page_manager_store.back"
    />
    <ConnectPage
      @done="reload_page_data()"
      ref="connect_page_ref"
    />
  </div>

  <div
    v-if="is_syncing_data"
    class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm text-white"
  >
    <div
      class="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-2xl text-slate-800 animate-fade-in-up"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
      ></div>
      <div class="text-center space-y-1">
        <h3 class="font-bold text-lg">Đang đồng bộ dữ liệu...</h3>
        <p class="text-sm text-slate-500">
          Vui lòng chờ (Không thoát để tránh sai lệch dữ liệu)
        </p>
      </div>
    </div>
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
import { provide, ref, watch } from 'vue'
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

const page_store = usePageStore()
const select_page_store = useSelectPageStore()
const org_store = useOrgStore()
const page_manager_store = usePageManagerStore()
const $route = useRoute()

/** có hiện phần thanh toán hay không */
const IS_SHOW_PAYMENT = $env.is_show_payment

const { ref_dropdown_pick_connect_platform, connect_page_ref } =
  storeToRefs(page_manager_store)
const WORKER = new ZipWorker()

const loading_state = ref<
  Record<string, { status: string; count?: number; error?: string }>
>({})

/** composable */
const { getMeChatbotUser: get_me_chatbot_user } = initRequireData()
const { toggleDropdown: toggle_dropdown, reloadPageData: reload_page_data } =
  usePageManager()

class Main {
  /**vào chế độ chat nhiều trang */
  toggleModelGroupPage() {
    /** reset lại danh sách trang đã chọn nếu đang ở chế độ nhiều tổ chức */
    if (org_store.is_selected_all_org) page_store.selected_page_id_list = {}

    /** toggle chế độ chat nhiều page */
    select_page_store.toggleGroupPageMode()
  }
  /**ẩn hiện modal kết nối nền tảng */
  toggleModalConnectPage(key?: string) {
    page_manager_store.connect_page_ref?.toggleModal?.(key)
  }

  /**có hiển thị các nút của trang chọn page không */
  isShowSelectPageButton() {
    return (
      /** đang ở trang chọn page */
      $route.path.includes('select-page') &&
      /** không ở chế độ chat nhiều page */
      (!select_page_store.is_group_page_mode ||
        /** người dùng chưa có trang nào */
        !size(page_store.active_page_list))
    )
  }
}
const $main = new Main()

const is_syncing_data = ref(false)

watch(
  () => org_store.list_org,
  async val => {
    if (!val || !val.length) return

    try {
      is_syncing_data.value = true

      const RESULTS = await loadOrgData(
        val.filter(o => o.org_id).map(o => ({ org_id: o.org_id! })),
        ({ orgId, status, count, error }) => {
          /** Cập nhật UI hoặc reactive state */
          loading_state.value[orgId] = { status, count, error }
          console.log('Worker progress', orgId, status, count, error)
        }
      )

      console.log('All orgs loaded', RESULTS)
    } finally {
      is_syncing_data.value = false
    }
  },
  { immediate: true }
)

/** cung cấp hàm này cho component con dùng */
provide(KEY_GET_CHATBOT_USER_FUNCT, get_me_chatbot_user)
</script>

<style scoped lang="scss">
.dashboard-header {
  .btn-custom {
    @apply rounded items-center gap-2 hidden md:flex;
  }
}
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out forwards;
}
</style>
