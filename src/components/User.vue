<template>
  <button @click="openMenu">
    <div class="relative w-fit mx-auto">
      <Badge
        v-if="orgStore.count_noti"
        :value="orgStore.count_noti"
        class="absolute z-10 -right-2 -top-1"
      />
      <StaffAvatar
        :id="chatbotUserStore.chatbot_user?.user_id"
        class="w-9 h-9 hover:brightness-90 rounded-full"
      />
    </div>
  </button>
  <Dropdown
    ref="user_menu_ref"
    width="297px"
    height="auto"
    :is_fit="false"
    :position="position"
    :back="back"
    :distance="10"
    class_content="flex flex-col gap-1"
  >
    <template v-if="!$device.isMobile()">
      <!-- <template v-if="orgStore.isAdminOrg() || orgStore.is_selected_all_org">
        <MenuTitle :title="$t('v1.view.main.dashboard.header.business')" />
        <MenuItem
          @click="redirectMenu('org')"
          :icon="BriefCaseIcon"
          :title="$t('v1.view.main.dashboard.header.menu.setting_business')"
        />
        <MenuItem
          @click="redirectMenu('org')"
          :icon="UsersIcon"
          :title="$t('v1.view.main.dashboard.header.menu.staff_manager')"
        />
        <MenuItem
          @click="redirectMenu('org/pay')"
          :icon="CheckBadgeIcon"
          :title="$t('v1.view.main.dashboard.header.menu.pricing_manager')"
        > -->
      <!-- <Badge
        :value="1"
        class="flex-shrink-0"
      /> -->
      <!-- </MenuItem>
        <MenuItem
          @click="redirectMenu('widget')"
          :icon="SquareIcon"
          :title="$t('v1.view.main.dashboard.nav.widget')"
        />
        <hr class="my-1" />
      </template> -->
      <MenuTitle :title="$t('v1.view.main.dashboard.header.personal')" />
      <MenuItem
        @click="openUserInfoModal()"
        :icon="UserIcon"
        :title="$t('v1.view.main.dashboard.header.menu.user_info')"
      />
      <MenuItem
        @click="openNoti"
        :icon="BellIcon"
        :title="$t('v1.view.main.dashboard.header.menu.alert')"
      >
        <Badge
          v-if="orgStore.count_noti"
          :value="orgStore.count_noti"
          class="flex-shrink-0"
        />
      </MenuItem>
    </template>
    <MenuItem
      @click="openKeyboardShortcutModal()"
      :icon="QuestionMarkCircleIcon"
      :title="$t('v1.view.main.dashboard.header.menu.keyboard_shortcut')"
    />
    <MenuItem
      v-if="chatbotUserStore.isBbhMember()"
      @click="$external_site.openSystemDashboard()"
      :icon="ServerSettingIcon"
      :title="$t('v1.view.main.dashboard.header.menu.admin')"
    />
    <MenuItem
      @click="signout"
      :icon="LogOutIcon"
      :title="$t('v1.view.main.dashboard.header.menu.logout')"
    />
  </Dropdown>
  <Alert ref="modal_alert_ref" />
  <UserInfo ref="modal_user_info_ref" />
  <ModalKeyboardShortcut ref="modal_keyboard_shortcut" />
</template>
<script setup lang="ts">
import { count_all_noti, count_noti } from '@/service/api/chatbox/billing'
import { signout } from '@/service/helper/oauth'
import { useChatbotUserStore, useOrgStore } from '@/stores'
import { Device } from '@/utils/helper/Device'
import { ExternalSite } from '@/utils/helper/ExternalSite'
import { container } from 'tsyringe'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import StaffAvatar from '@/components/Avatar/StaffAvatar.vue'
import Badge from '@/components/Badge.vue'
import Dropdown from '@/components/Dropdown.vue'
import MenuItem from '@/components/Main/Dashboard/MenuItem.vue'
import MenuTitle from '@/components/Main/Dashboard/MenuTitle.vue'
import Alert from '@/components/User/Alert.vue'
import UserInfo from '@/components/User/UserInfo.vue'
import ModalKeyboardShortcut from '@/views/ChatWarper/Menu/ModalKeyboardShortcut.vue'

import BellIcon from '@/components/Icons/Bell.vue'
import BriefCaseIcon from '@/components/Icons/BriefCase.vue'
import CheckBadgeIcon from '@/components/Icons/CheckBadge.vue'
import LogOutIcon from '@/components/Icons/LogOut.vue'
import ServerSettingIcon from '@/components/Icons/ServerSetting.vue'
import SquareIcon from '@/components/Icons/Square.vue'
import UserIcon from '@/components/Icons/User.vue'
import UsersIcon from '@/components/Icons/Users.vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/solid'

import type { ModalPosition } from '@/service/interface/vue'
import { isEmpty } from 'lodash'

const $props = withDefaults(
  defineProps<{
    /**vị trí của modal */
    position: ModalPosition
    /**lùi lại bao nhiêu */
    back: number
  }>(),
  {}
)

const chatbotUserStore = useChatbotUserStore()
const orgStore = useOrgStore()
const $router = useRouter()
const $external_site = container.resolve(ExternalSite)
const $device = container.resolve(Device)

/** Ref của menu dropdown */
const user_menu_ref = ref<InstanceType<typeof Dropdown>>()
/** Ref của modal thông báo */
const modal_alert_ref = ref<InstanceType<typeof Alert>>()
/** Ref của modal thông tin người dùng */
const modal_user_info_ref = ref<InstanceType<typeof UserInfo>>()
/** Ref của modal keyboard shortcut */
const modal_keyboard_shortcut =
  ref<InstanceType<typeof ModalKeyboardShortcut>>()

// đếm số thông báo khi khởi động
onMounted(countNoti)

// khi chọn lại org thì đếm lại số thông báo
watch(
  () => [
    orgStore.selected_org_id,
    orgStore.list_org,
    orgStore.is_selected_all_org,
  ],
  countNoti
)

/** đếm số thông báo */
async function countNoti() {
  // nếu đang là chọn tất cả tổ chức
  if (orgStore.is_selected_all_org) {
    orgStore.count_noti = await countNotiAllOrg()
    return
  }

  // đếm số thông báo cho tổ chức hien tại
  orgStore.count_noti = await countNotiCurrentOrg()
}

/** đếm số thông báo cho tất cả tổ chức */
async function countNotiAllOrg() {
  /** tổng số thông báo */
  let total_count = 0
  try {
    /** danh sách các tổ chức */
    const LIST_ORG = orgStore.list_org || []
    /** Lấy list org id */
    const ORG_IDS = LIST_ORG.map(item => item.org_id || '')
    if (isEmpty(ORG_IDS)) return
    // lặp qua từng tổ chức để đếm số thông báo
    // for (const org of LIST_ORG) {

    //   // nếu không có id tổ chức thì thôi qua tổ chức tiếp theo
    //   if (!org.org_id) continue
    //   // cộng số thông báo lấy được vào total_count
    //   // total_count += await count_noti(org.org_id)
    // }
    total_count += await count_all_noti(ORG_IDS)
  } catch (e) {
    // tạm thời không xử lý
  } finally {
    return total_count
  }
}

/**đếm số noti của tổ chức đang chọn */
async function countNotiCurrentOrg() {
  try {
    // nếu chưa chọn tổ chức thì không làm gì
    if (!orgStore.selected_org_id) return

    // đếm số thông báo
    return await count_noti(orgStore.selected_org_id)
  } catch (e) {
    // tạm thời không xử lý
  }
}
/** Mở menu */
function openMenu($event: MouseEvent) {
  // nếu là mobile thì không cho click
  // if ($device.isMobile()) return

  user_menu_ref.value?.toggleDropdown($event)
}
/**mở menu */
function redirectMenu(path: string) {
  // tắt menu dropdown
  user_menu_ref.value?.toggleDropdown()

  // chuyển đến trang
  $router.push(`/dashboard/${path}`)
}
/**mở modal thông tin người dùng */
function openUserInfoModal() {
  // tắt menu dropdown
  user_menu_ref.value?.toggleDropdown()

  // mở modal thông tin người dùng
  modal_user_info_ref.value?.toggleModal()
}

/** mở modal phím tắt */
function openKeyboardShortcutModal() {
  // tắt menu dropdown
  user_menu_ref.value?.toggleDropdown()

  // mở modal phím tắt
  modal_keyboard_shortcut.value?.toggleModal?.()
}

/**mở modal của noti */
function openNoti() {
  // tắt dropdown
  user_menu_ref.value?.toggleDropdown()

  // mở modal
  modal_alert_ref.value?.toggleModal()
}
</script>
