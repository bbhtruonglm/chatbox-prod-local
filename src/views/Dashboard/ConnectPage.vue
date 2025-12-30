<template>
  <Modal
    ref="modal_connect_page_ref"
    class_modal="h-3/4"
    class_body="flex gap-2"
    @close_modal="$main.resetStore()"
  >
    <template #header>
      <template v-if="!connectPageStore.is_hidden_menu">
        {{ $t('v1.view.main.dashboard.select_platform.add_page') }}
      </template>
      <template v-else>
        {{ $t('Cấp lại quyền') }}
      </template>
    </template>
    <template #body>
      <Menu v-if="!connectPageStore.is_hidden_menu" />
      <div class="w-[784px] bg-white rounded-md p-2 flex flex-col relative">
        <div
          v-if="connectPageStore.is_loading"
          class="absolute top-14 left-1/2 -translate-x-1/2"
        >
          <Loading class="mx-auto" />
        </div>
        <div
          v-if="!connectPageStore.is_hidden_menu"
          class="font-medium p-2 border-b border-slate-200 flex-shrink-0 flex items-center justify-between"
        >
          <template v-if="connectPageStore.current_menu === 'PAGE'">
            {{ $t('v1.view.main.dashboard.select_platform.active_page') }}
          </template>
          <template v-else-if="connectPageStore.current_menu === 'MEMBER'">
            {{ $t('v1.view.main.dashboard.org.setting.member') }}
          </template>
          <template v-else-if="connectPageStore.current_menu === 'WEBSITE'">
            {{ $t('v1.view.main.dashboard.select_platform.website.title') }}
          </template>
          <template v-else>
            {{
              $t('v1.view.main.dashboard.select_platform.connect_with', {
                platform: $t(
                  `v1.common.${connectPageStore.current_menu?.toLowerCase()}`
                ),
              })
            }}
          </template>
          <div class="flex items-center gap-2.5">
            <Search
              v-if="['PAGE', 'MEMBER'].includes(connectPageStore.current_menu)"
              :placeholder="
                connectPageStore.current_menu === 'MEMBER'
                  ? $t('v1.common.search')
                  : undefined
              "
              class_input="py-2.5 rounded-lg"
            />
            <SelectOrg class="border rounded-lg" />
          </div>
        </div>
        <LowPermision
          v-if="!orgStore.isAdminOrg() && !connectPageStore.is_hidden_menu"
        />
        <template v-else>
          <ActivePage
            v-if="connectPageStore.current_menu === 'PAGE'"
            @done="$emit('done')"
            @close="toggleModal"
          />
          <Member
            v-else-if="connectPageStore.current_menu === 'MEMBER'"
            @done="$emit('done')"
            @close="toggleModal"
          />
          <Facebook v-else-if="connectPageStore.current_menu === 'FB_MESS'" />
          <Website
            v-else-if="connectPageStore.current_menu === 'WEBSITE'"
            @done="$emit('done')"
          />

          <Zalo
            v-else-if="connectPageStore.current_menu?.includes('ZALO')"
            @done="$emit('done')"
          />

          <Instagram
            v-else-if="connectPageStore.current_menu === 'FB_INSTAGRAM'"
          />
          <Tiktok v-else-if="connectPageStore.current_menu === 'TIKTOK'" />
          <div
            v-else
            class="p-2"
          >
            {{ $t('v1.common.upcoming_feature') }}
          </div>
        </template>
      </div>
    </template>
  </Modal>
</template>
<script setup lang="ts">
import { provide, ref } from 'vue'
import { useConnectPageStore, useOrgStore } from '@/stores'
import { KEY_TOGGLE_MODAL_FUNCT } from '@/views/Dashboard/ConnectPage/symbol'

import LowPermision from '@/views/Dashboard/ConnectPage/ActivePage/LowPermision.vue'
import SelectOrg from '@/components/Main/Dashboard/SelectOrg.vue'
import Loading from '@/components/Loading.vue'
import Modal from '@/components/Modal.vue'
import Menu from '@/views/Dashboard/ConnectPage/Menu.vue'
import ActivePage from '@/views/Dashboard/ConnectPage/ActivePage.vue'
import Member from '@/views/Dashboard/ConnectPage/Member.vue'
import Facebook from '@/views/Dashboard/ConnectPage/Facebook.vue'
import Website from '@/views/Dashboard/ConnectPage/Website.vue'
import Zalo from '@/views/Dashboard/ConnectPage/Zalo.vue'
import Search from '@/views/Dashboard/ConnectPage/Search.vue'
import Instagram from '@/components/OAuth/Instagram.vue'
import Tiktok from '@/components/OAuth/Tiktok.vue'

const $emit = defineEmits(['done'])

const connectPageStore = useConnectPageStore()
const orgStore = useOrgStore()

/**ref của modal kết nối nền tảng */
const modal_connect_page_ref = ref<InstanceType<typeof Modal>>()

/**ẩn hiện modal của component */
function toggleModal(key?: string) {
  // tự động chọn menu
  if (key) connectPageStore.selectMenu(key)

  // ẩn hiện modal
  modal_connect_page_ref.value?.toggleModal()
}

class Main {
  /**nạp lại dữ liệu gốc */
  resetStore() {
    // xóa cờ
    connectPageStore.is_hidden_menu = false
  }
}
const $main = new Main()

// cung cấp hàm toggle modal cho component cha
defineExpose({ toggleModal })

// cung cấp hàm toggle modal cho component con
provide(KEY_TOGGLE_MODAL_FUNCT, toggleModal)
</script>
