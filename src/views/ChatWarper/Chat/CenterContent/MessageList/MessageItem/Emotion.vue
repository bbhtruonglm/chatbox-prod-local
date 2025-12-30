<template>
  <template v-if="$main.countEmotion()">
    <button
      v-tooltip.top="$t('Xem chi tiết')"
      @click="ref_emotion_modal?.toggleModal()"
      :class="{
        '-right-5': position === 'RIGHT',
        '-left-5': position === 'LEFT',
      }"
      class="px-1 gap-1 flex items-center bg-white rounded-full w-max shadow absolute z-20 -top-2.5"
    >
      <span
        v-if="ai_emotion_icon"
        class="text-sm"
      >
        {{ ai_emotion_icon }}
      </span>
      <span
        v-if="reaction_emoji"
        class="text-sm"
        >{{ reaction_emoji }}</span
      >
      <small class="text-xxs">
        {{ $main.countEmotion() }}
      </small>
    </button>
    <BaseModal
      ref="ref_emotion_modal"
      class_modal="gap-2 bg-white px-3 border p-2"
      class_header="text-sm font-semibold text-center py-2 border-b"
      class_close="rounded-full bg-slate-100"
      class_body="flex flex-col gap-4 py-2"
    >
      <template #header>
        {{ $t('Các cảm xúc') }}
      </template>
      <template #body>
        <article
          v-if="ai_emotion_icon"
          class="flex items-center gap-3"
        >
          <div
            class="flex-shrink-0 size-11 border rounded-lg flex items-center justify-center"
          >
            <SparklesIcon class="size-6" />
          </div>
          <div class="flex-grow min-w-0 text-sm w-72">
            <h3 class="font-semibold">
              {{ $t('Phát hiện cảm xúc AI') }}
            </h3>
            <p class="text-slate-500">
              {{ $t('Tự động nhận dạng cảm xúc') }}
              {{
                $t(
                  `v1.view.main.dashboard.chat.message.emotion_ai.${ai_emotion}`
                )
              }}
            </p>
          </div>
          <div class="flex-shrink-0 text-xl">
            {{ ai_emotion_icon }}
          </div>
        </article>
        <article
          v-if="reaction_emoji"
          class="flex items-center gap-3"
        >
          <ClientAvatar
            :conversation="conversationStore.select_conversation"
            class="flex-shrink-0 size-11"
          />
          <div class="flex-grow min-w-0 text-sm w-72">
            <h3 class="font-semibold">
              {{ conversationStore.select_conversation?.client_name }}
            </h3>
            <p class="text-slate-500">
              {{
                $t('Đã để lại cảm xúc lúc _', {
                  name: $date_handle.format(
                    message.reaction?.updatedAt,
                    'HH:mm dd/MM/yyyy'
                  ),
                })
              }}
            </p>
          </div>
          <div class="flex-shrink-0 text-xl">
            {{ reaction_emoji }}
          </div>
        </article>
      </template>
    </BaseModal>
  </template>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConversationStore } from '@/stores'
import { container } from 'tsyringe'
import { DateHandle } from '@/utils/helper/DateHandle'
import { Emotion } from '@/utils/helper/Emotion'

import BaseModal from '@/components/Base/BaseModal.vue'
import ClientAvatar from '@/components/Avatar/ClientAvatar.vue'

import { SparklesIcon } from '@heroicons/vue/24/solid'

import type { MessageInfo } from '@/service/interface/app/message'
import { clippingParents } from '@popperjs/core'

const $props = withDefaults(
  defineProps<{
    /**vị trí của cảm xúc */
    position: 'LEFT' | 'RIGHT'
    /**dữ liệu của tin nhắn */
    message: MessageInfo
  }>(),
  {}
)

const conversationStore = useConversationStore()
const $date_handle = container.resolve(DateHandle)
const $emotion = container.resolve(Emotion)

/**tham chiếu tới modal cảm xúc */
const ref_emotion_modal = ref<InstanceType<typeof BaseModal>>()

/**cảm xúc khác hàng để lại của FB */
const reaction_emoji = computed(() => $props.message?.reaction?.emoji)
/**cảm xúc AI */
const ai_emotion = computed(() => $props.message?.ai?.[0]?.emotion)
/**icon cảm xúc AI */
const ai_emotion_icon = computed(() => {
  // lọc cảm xúc AI không chuẩn
  if (!$emotion.isValidEmotion(ai_emotion.value)) return

  // trả về cảm xúc AI
  return $emotion.getIcon(ai_emotion.value)
})

class Main {
  countEmotion() {
    /**kết quả */
    let count = 0

    /** nếu có cảm xúc người dùng để lại thì tăng */
    if (reaction_emoji.value) count++

    /** nếu có cảm xúc AI thì tăng */
    if (ai_emotion_icon.value) count++

    /** trả về kết quả */
    return count
  }
}
const $main = new Main()
</script>
