<template>
  <div class="flex items-center justify-between h-4">
    <div class="flex items-center overflow-x-auto gap-1 flex-grow min-w-1">
      <img
        v-tooltip="$t('v1.view.main.dashboard.chat.action.has_reply')"
        v-if="source?.last_message_type === 'page'"
        class="w-3 h-3 flex-shrink-0"
        src="@/assets/icons/reply.svg"
      />
      <Label
        v-for="label_id of getPreviewLabel()"
        :page_id="source?.fb_page_id"
        :label_id="label_id"
      />
      <div
        @mouseover="label_popover_ref?.mouseover"
        @mouseleave="label_popover_ref?.mouseleave"
        v-if="getSizeLabel() > 3"
        class="border text-[9px] text-gray-700 rounded px-1"
      >
        + {{ getSizeLabel() - 3 }}
      </div>
    </div>
    <div class="flex items-center gap-1 flex-shrink-0">
      <img
        v-tooltip.bottom="source?.client_phone"
        v-if="source?.client_phone"
        src="@/assets/icons/phone.svg"
        class="w-3 h-3"
      />
      <template v-if="isFindUid() || source?.client_bio?.fb_uid">
        <Loading
          v-tooltip.bottom="
            $t('v1.view.main.dashboard.chat.extension.findding_uid')
          "
          v-if="isFindUid()"
          :size="12"
        />
        <img
          v-else
          v-tooltip.bottom="`Uid: ${source?.client_bio?.fb_uid}`"
          src="@/assets/icons/id.svg"
          class="w-3 h-3"
        />
      </template>
      <!-- Nếu AI bật và thiết lập AI bật thì mới hiển thị icon -->
      <SparklesIcon
        v-if="
          calcStatus?.(source) &&
          getPageInfo(source?.fb_page_id)?.is_active_ai_agent
        "
        class="size-3"
        v-tooltip.bottom="$t('AI đang bật')"
      />
      <div
        v-tooltip.bottom="$t('v1.common.' + getPageInfo(source?.fb_page_id)?.type?.toLowerCase() as string)"
      >
        <PageTypeIcon
          :page_type="source?.platform_type"
          class="flex-shrink-0 size-3"
        />
      </div>
    </div>
  </div>
  <Popover
    ref="label_popover_ref"
    position="RIGHT"
    :is_fit="false"
    width="auto"
    height="auto"
    :back="8"
    class_content="max-h-52 flex flex-wrap justify-center gap-1"
  >
    <Label
      v-for="label_id of getFullLabel()"
      :page_id="source?.fb_page_id"
      :label_id="label_id"
    />
  </Popover>
</template>
<script setup lang="ts">
import { composableService } from '@/views/ChatWarper/Chat/CenterContent/UserInfo/ChatbotStatus/service'
import { ref } from 'vue'
import { getLabelValid, getPageInfo } from '@/service/function'
import { useExtensionStore } from '@/stores'

import Label from '@/views/ChatWarper/Chat/LeftBar/Conversation/Label.vue'
import Loading from '@/components/Loading.vue'
import Popover from '@/components/Popover.vue'
import PageTypeIcon from '@/components/Avatar/PageTypeIcon.vue'

import { SparklesIcon } from '@heroicons/vue/24/solid'

import type { ComponentRef } from '@/service/interface/vue'
import type { ConversationInfo } from '@/service/interface/app/conversation'

const $props = withDefaults(
  defineProps<{
    source?: ConversationInfo
  }>(),
  {}
)

const extensionStore = useExtensionStore()

/** logic bật/tắt bot */
const { calcStatus } = composableService(true)

/**ref của popover */
const label_popover_ref = ref<ComponentRef>()

/**kiểm tra xem có đang tìm uid không */
function isFindUid() {
  // nếu không có key thì dừng
  if (!$props.source?.data_key) return false

  // trả về trạng thái tìm uid
  return extensionStore.is_find_uid[$props.source?.data_key]
}
/**chỉ lấy 3 label đầu tiên */
function getPreviewLabel() {
  return getLabelValid(
    $props.source?.fb_page_id,
    $props.source?.label_id
  )?.slice(0, 3)
}
/**lấy toàn bộ nhãn, trừ 3 nhãn đầu */
function getFullLabel() {
  return getLabelValid(
    $props.source?.fb_page_id,
    $props.source?.label_id
  )?.slice(3)
}
/**tính số lượng nhãn */
function getSizeLabel() {
  return (
    getLabelValid($props.source?.fb_page_id, $props.source?.label_id)?.length ||
    0
  )
}
</script>
