<template>
  <Dropdown
    ref="ref_dropdown"
    width="349px"
    height="auto"
    :is_fit="false"
    :position="position"
    :back="back"
    :distance="10"
    class_content="flex flex-col overflow-hidden overflow-y-auto !py-2 !px-0 max-h-[413px]"
  >
    <div>
      <div
        v-if="is_require_select"
        class="flex flex-col gap-1 py-1 px-2"
      >
        <div class="text-xs font-medium text-slate-500 p-1.5">
          {{ $t('Chọn Tổ chức cần kết nối') }}
        </div>
        <MenuItem
          v-for="org of orgStore.admin_orgs"
          @click="$main.selectOrg(org)"
          :icon="BriefcaseIcon"
          :img="org?.org_info?.org_avatar"
          :title="org?.org_info?.org_name || ''"
          class_icon="size-5 rounded-oval"
        />
      </div>
      <template v-else>
        <div class="flex items-center gap-2 py-1 px-2">
          <div class="text-sm flex-shrink-0">
            {{ $t('Tổ chức') }}
          </div>
          <SelectOrg
            is_filter_admin
            class="border rounded-lg min-w-0 flex-grow"
          />
        </div>
        <div class="p-1">
          <div class="text-xs font-medium text-slate-500 py-0.5 px-2">
            {{ $t('Chọn nền tảng cần kết nối') }}:
          </div>
          <div
            v-for="platform of LIST_PLATFORM"
            @click="$main.toggleModalConnectPage?.(platform.key)"
            class="py-1.5 px-2 gap-3 flex items-center text-left w-full hover:bg-slate-100 hover:rounded-lg cursor-pointer"
          >
            <component
              :is="platform.icon"
              class="size-8"
            />
            <div>
              <div class="text-sm font-semibold">{{ platform.title }}</div>
              <div class="text-xs text-slate-500">
                {{ platform.description }}
              </div>
            </div>
          </div>
        </div>
        <div class="px-3 py-1">
          <hr />
        </div>
        <div class="p-1 flex flex-col gap-1">
          <div class="text-xs font-medium text-slate-500 py-0.5 px-2">
            {{ $t('Quản lý Trang và Thành viên') }}:
          </div>
          <MenuItem
            @click="$main.toggleModalConnectPage?.('PAGE')"
            :icon="ClockIcon"
            :title="$t('Kích hoạt Trang')"
          />
          <MenuItem
            @click="$main.toggleModalConnectPage?.('MEMBER')"
            :icon="UsersIcon"
            :title="$t('Thêm thành viên')"
          />
        </div>
      </template>
    </div>
  </Dropdown>
  <ConnectPage
    @done="$emit('done')"
    ref="connect_page_ref"
  />
</template>
<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { composableService } from '@/views/Dashboard/ConnectPage/service'
import { useOrgStore } from '@/stores'

import ConnectPage from '@/views/Dashboard/ConnectPage.vue'
import MenuItem from '@/components/Main/Dashboard/MenuItem.vue'
import Dropdown from '@/components/Dropdown.vue'
import SelectOrg from '@/components/Main/Dashboard/SelectOrg.vue'

import { ClockIcon, UsersIcon, BriefcaseIcon } from '@heroicons/vue/24/solid'

import type { ModalPosition } from '@/service/interface/vue'
import { gt } from 'lodash'
import type { OrgInfo } from '@/service/interface/app/billing'

/** một phần tử của nền tảng */
interface PlatformItem {
  /** Khóa */
  key: string
  /** Tiêu đề */
  title: string
  /** Icon vue */
  icon?: Component
  /**mô tả */
  description?: string
}

const $emit = defineEmits(['done'])

const { ICON_MAP } = composableService()

const orgStore = useOrgStore()
const { t: $t } = useI18n()

const $props = withDefaults(
  defineProps<{
    /**vị trí của modal */
    position?: ModalPosition
    /**lùi lại bao nhiêu */
    back?: number
  }>(),
  {}
)

/** Mô tả của nền tảng */
const DESCRIPTION_MAP: Record<string, string> = {
  FB_MESS: $t('Kết nối Trang Facebook'),
  FB_INSTAGRAM: $t('Kết nối Trang Instagram'),
  TIKTOK: $t('Kết nối Trang Tiktok'),
  FB_WHATSAPP: $t('Kết nối Trang WhatsApp Business và Cá nhân'),
  WEBSITE: $t('Kết nối Website'),
  ZALO: $t('Kết nối Zalo OA và Zalo cá nhân'),
}
/** Danh sách nền tảng */
const LIST_PLATFORM: PlatformItem[] = $env.platform?.map(platform_key => ({
  key: platform_key,
  title: $t(`v1.common.${platform_key.toLowerCase()}`),
  icon: ICON_MAP[platform_key],
  description: DESCRIPTION_MAP[platform_key],
}))

/**ref của modal kết nối nền tảng */
const connect_page_ref = ref<InstanceType<typeof ConnectPage>>()
/** Ref của menu dropdown */
const ref_dropdown = ref<InstanceType<typeof Dropdown>>()

/**
 * Kiểm tra xem có bắt buộc phải chọn tổ chức không
 * - nếu đã chọn 1 lần rồi thì không cần chọn nữa
 * - nếu chỉ có 1 tổ chức thì không cần chọn
 */
const is_require_select = computed(
  () => !orgStore.is_first_select_org && gt(orgStore.list_org?.length, 1)
)
// /**các tổ chức mà người dùng là admin */
// const admin_orgs = computed(() =>
//   orgStore.list_org?.filter(org => org?.current_ms?.ms_role === 'ADMIN')
// )

class Main {
  /**chọn tổ chức */
  selectOrg(org: OrgInfo) {
    // đánh dấu là đã chọn tổ chức lần đầu
    orgStore.is_first_select_org = true

    // chọn tổ chức
    orgStore.selected_org_id = org?.org_id
  }
  /**bật tắt dropdown */
  toggleDropdown($event?: MouseEvent) {
    // sử dùng hàm của dropdown
    ref_dropdown.value?.toggleDropdown($event)
  }
  /**ẩn hiện modal kết nối nền tảng */
  toggleModalConnectPage(key?: string) {
    // tắt dropdown
    this.toggleDropdown()

    // hiện modal kết nối
    connect_page_ref.value?.toggleModal?.(key)
  }
}
const $main = new Main()

defineExpose({ toggleDropdown: $main.toggleDropdown.bind($main) })
</script>
