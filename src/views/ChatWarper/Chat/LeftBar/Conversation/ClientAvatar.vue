<template>
  <div class="relative flex-shrink-0">
    <ClientAvatar
      :conversation="source"
      class="w-10 h-10"
    />
    <PageAvatar
      v-tooltip.bottom="getPageName(getPageInfo(source?.fb_page_id))"
      :page_info="getPageInfo(source?.fb_page_id)"
      :class="controlPageAvatarVisible()"
      class="w-5 h-5 absolute -bottom-1 -right-1"
    />
  </div>
</template>
<script setup lang="ts">
import { useChatbotUserStore, useOrgStore } from '@/stores'
import { getPageInfo, getPageName } from '@/service/function'

import ClientAvatar from '@/components/Avatar/ClientAvatar.vue'
import PageAvatar from '@/components/Avatar/PageAvatar.vue'

import type { ConversationInfo } from '@/service/interface/app/conversation'

const $props = withDefaults(
  defineProps<{
    source?: ConversationInfo
  }>(),
  {}
)

const chatbotUserStore = useChatbotUserStore()
const orgStore = useOrgStore()

/**kiểm soát việc page avatar được hiển thị như thế nào */
function controlPageAvatarVisible() {
  /**thiết lập tổ chức */
  const ORG_CONFIG = orgStore.selected_org_info?.org_config

  /**thiết lập cá nhân */
  const USER_CONFIG = chatbotUserStore.personal_settings

  /**code css ẩn div */
  const HIDE_CSS = 'hidden group-hover:block'

  // ưu tiên nếu user có thiết lập cá nhân
  if (USER_CONFIG?.is_enable_personal_setting) {
    // ẩn avatar page theo thiết lập user
    if (USER_CONFIG?.is_hide_page_avatar) return HIDE_CSS

    // không ẩn theo thiết lập user
    return
  }

  // nếu tổ chức thiết lập ẩn thì ẩn luôn
  if (ORG_CONFIG?.org_is_hide_page_avatar) return HIDE_CSS

  // không thì thôi
}
</script>
