<template>
  <DashboardLayout class_content="flex flex-col gap-2 relative">
    <template #menu><Menu /></template>
    <template #content>
      <HotAlert
        :codes="[
          'ALMOST_EXPIRED_PACKAGE',
          'TOPUP_WAITING',
          'ALMOST_REACH_QUOTA_AI',
          'CHANGE_PAGE_OWNER',
          'LOCK_FEATURE',
          'PAGE_EXPIRED_SESSION',
        ]"
      />
      <AlertAccountLimitReached ref="ref_alert_reach_limit" />
      <div
        class="gap-2 flex flex-col md:flex-row md:justify-between flex-shrink-0"
      >
        <div
          class="text-lg font-semibold flex items-center gap-2 flex-grow min-w-0"
        >
          <FlagIcon class="size-5 flex-shrink-0" />
          <div class="flex-shrink-0">
            {{ $t('Trình quản lý Trang') }}
          </div>
          <AssignGroup
            v-if="!orgStore.isAdminOrg() && !orgStore.is_selected_all_org"
          />
        </div>
        <div
          class="grid grid-cols-2 gap-5 md:flex md:justify-between flex-shrink-0"
        >
          <Search
            class="md:w-52"
            v-model="selectPageStore.search"
            :placeholder="$t('v1.common.page_search_placeholder')"
          />
          <SelectOrg is_allow_all />
        </div>
      </div>
      <div
        v-if="selectPageStore.is_loading"
        class="absolute left-1/2 -translate-x-1/2 top-14"
      >
        <!-- <Loading class="mx-auto" /> -->
      </div>
      <!-- <template v-if="orgStore.is_selected_all_org"> -->
      <AllOrg />
      <GroupPageAction />
      <!-- </template> -->
      <!-- <template v-else>
        <EmptyPage
          v-if="
            !(
              pageStore.countActivePage() ||
              orgStore.selected_org_group?.[orgStore.selected_org_id || '']
            ) && !selectPageStore.is_loading
          "
          tab="PAGE"
        />
        <div
          :class="{
            'pb-16': selectPageStore.is_group_page_mode,
          }"
          class="overflow-y-auto flex flex-col gap-3"
        >
          <SelectGroup v-if="orgStore.isAdminOrg()" />
          <SkeletonGroupPage v-if="selectPageStore.is_loading" />
          <template v-else>
            <GroupPage
              filter="RECENT"
              :icon="ClockIcon"
              :title="$t('v1.common.recent')"
              tab="PAGE"
            />
            <GroupPage
              filter="FB_MESS"
              :icon="FacebookIcon"
              :title="$t('v1.common.fb_mess')"
              tab="FB_MESS"
              :advanced-filter="(page) => 
                pageStore.map_orgs?.map_page_org?.[page?.page?.fb_page_id!] === orgStore.selected_org_id
              "
            />
            <GroupPage
              filter="WEBSITE"
              :icon="WebIcon"
              :title="$t('v1.common.website')"
              tab="WEBSITE"
              :advanced-filter="(page) => 
                pageStore.map_orgs?.map_page_org?.[page?.page?.fb_page_id!] === orgStore.selected_org_id
              "
            />
            <GroupPage
              filter="FB_INSTAGRAM"
              :icon="InstagramIcon"
              :title="`Instagram`"
              tab="FB_INSTAGRAM"
              :advanced-filter="(page) => 
                pageStore.map_orgs?.map_page_org?.[page?.page?.fb_page_id!] === orgStore.selected_org_id
              "
            />
            <GroupPage
              filter="ZALO"
              :icon="ZaloIcon"
              :title="`Zalo`"
              tab="ZALO"
              :advanced-filter="(page) => 
                pageStore.map_orgs?.map_page_org?.[page?.page?.fb_page_id!] === orgStore.selected_org_id
              "
            />
          </template>

          <GroupPageAction />
        </div>
      </template> -->
    </template>
  </DashboardLayout>
</template>

<script setup lang="ts">
import {
  useChatbotUserStore,
  useCommonStore,
  useOrgStore,
  usePageStore,
  useSelectPageStore,
} from '@/stores'
import { SessionStorageManager } from '@/utils/helper/SessionStorage'
import { TriggerEventRef } from '@/utils/helper/TriggerEventRef'
import { useEmbedChat } from '@/views/composables/useEmbedChat'
import { usePageManager } from '@/views/Dashboard/composables/usePageManager'
import { KEY_GET_CHATBOT_USER_FUNCT } from '@/views/Dashboard/symbol'
import { size } from 'lodash'
import { storeToRefs } from 'pinia'
import { container } from 'tsyringe'
import { computed, inject, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import AlertAccountLimitReached from '@/components/AlertModal/AlertAccountLimitReached.vue'
import HotAlert from '@/components/HotAlert.vue'
import DashboardLayout from '@/components/Main/Dashboard/DashboardLayout.vue'
import Search from '@/components/Main/Dashboard/Search.vue'
import SelectOrg from '@/components/Main/Dashboard/SelectOrg.vue'
import AllOrg from '@/views/Dashboard/SelectPage/AllOrg.vue'
import AssignGroup from '@/views/Dashboard/SelectPage/AssignGroup.vue'
import EmptyPage from '@/views/Dashboard/SelectPage/EmptyPage.vue'
import GroupPage from '@/views/Dashboard/SelectPage/GroupPage.vue'
import GroupPageAction from '@/views/Dashboard/SelectPage/GroupPageAction.vue'
import Menu from '@/views/Dashboard/SelectPage/Menu.vue'
import SelectGroup from '@/views/Dashboard/SelectPage/SelectGroup.vue'
import SkeletonGroupPage from '@/views/Dashboard/SkeletonGroupPage.vue'

import FacebookIcon from '@/components/Icons/Facebook.vue'
import InstagramIcon from '@/components/Icons/Instagram.vue'
import WebIcon from '@/components/Icons/Web.vue'
import ZaloIcon from '@/components/Icons/Zalo.vue'
import { FlagIcon } from '@heroicons/vue/24/solid'

const { t: $t } = useI18n()
const pageStore = usePageStore()
const selectPageStore = useSelectPageStore()
const chatbotUserStore = useChatbotUserStore()
const $route = useRoute()
const orgStore = useOrgStore()
const { ref_alert_reach_limit } = storeToRefs(useCommonStore())

const $trigger_event_ref = container.resolve(TriggerEventRef)
const $session_storage = container.resolve(SessionStorageManager)

/** composable */
const { toggleModalConnectPage, getALlOrgAndPage } = usePageManager()

/**hàm load lại thông tin chatbot user từ component cha */
const getMeChatbotUser = inject(KEY_GET_CHATBOT_USER_FUNCT)

// cắm bong bóng chat vào trang
useEmbedChat()

computed(() => selectPageStore.current_menu)

onMounted(async () => {
  /**
   * load lại info của chatbot user
   * phòng trường hợp user mới được kích hoạt gói
   * nhưng sẽ bị gọi api 2 lần lúc đầu
   */
  getMeChatbotUser?.()

  // kích hoạt tự động mở kết nối nền tảng nếu cần
  triggerConnectPlatform()

  // lấy toàn bộ dữ liệu tổ chức và trang khi component được mount
  await getALlOrgAndPage()

  handleLoginWithoutPage()
})

/**kích hoạt tự động mở kết nối nền tảng nếu cần */
function triggerConnectPlatform() {
  // nếu không có cờ thì thôi
  if (!$route.query.connect_page) return

  /** cờ kiểm tra mở kết nối */
  const CONNECT_PAGE = $route.query.connect_page?.toString() || ''

  // mở modal connect zalo
  toggleModalConnectPage?.(CONNECT_PAGE)
}

/** hàm xử lý bắn sự kiện khi đăng nhập và không có page nào */
function handleLoginWithoutPage() {
  /** Cờ đăng nhập lưu trong session storage */
  const IS_LOGIN = $session_storage.getItem('is_login')

  // nếu đã đăng nhập thì thôi
  if (IS_LOGIN) return

  // nếu không có page nào thì gửi tin nhắn trigger
  if (size(pageStore.all_page_list)) return

  // gửi tin nhắn trigger
  $trigger_event_ref.sendMessageLoginWithoutPage({
    id: chatbotUserStore.chatbot_user?._id,
    name: chatbotUserStore.chatbot_user?.full_name,
  })

  // cờ đăng nhập lưu trong session storage
  $session_storage.setItem('is_login', true)
}
</script>
