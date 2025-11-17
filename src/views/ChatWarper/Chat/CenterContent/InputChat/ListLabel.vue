<template>
  <div class="py-1">
    <div
      v-show="labels?.length"
      id="chat__select-label"
      :class="is_expand_label ? 'max-h-40 min-h-6' : 'h-6'"
      class="flex gap-1 group"
    >
      <div
        v-if="is_loading_label"
        class="absolute z-10 left-1/2 -translate-x-1/2"
      >
        <Loading />
      </div>
      <div class="flex items-end flex-grow gap-1 min-w-0">
        <div
          ref="ref_labels"
          :class="is_expand_label ? 'overflow-y-auto' : 'overflow-hidden'"
          class="w-full flex flex-wrap justify-start gap-1 h-full"
        >
          <LabelItem
            v-for="label of labels"
            :label
            @click="$main.toggleLabel(label._id)"
          />
        </div>
        <!-- <button
          v-if="orgStore.isAdminOrg()"
          v-tooltip="$t('v1.common.setting')"
          @click="$external_site.openPageSetting('dialogue-tag')"
          class="rounded border border-slate-700 w-6 h-6 flex-shrink-0 justify-center items-center hidden group-hover:flex"
        >
          <CogBoldIcon class="w-4 h-4 text-slate-700" />
        </button> -->
        <button
          v-tooltip="
            is_expand_label ? $t('v1.common.contract') : $t('v1.common.expand')
          "
          v-if="total_over_label"
          @click="$main.expandList"
          class="rounded border border-slate-500 text-slate-700 w-6 h-6 flex-shrink-0 justify-center items-center flex text-xs font-semibold"
        >
          <ArrowDownIcon
            v-if="is_expand_label"
            class="w-2.5 h-2.5"
          />
          <span v-else> +{{ total_over_label }} </span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { map, partition, sortBy } from 'lodash'
import { useCommonStore, useConversationStore, useOrgStore } from '@/stores'
import { loading } from '@/utils/decorator/Loading'
import { error } from '@/utils/decorator/Error'
import { container } from 'tsyringe'
import { Toast } from '@/utils/helper/Alert/Toast'
import { N4SerivceAppOneConversation } from '@/utils/api/N4Service/Conversation'
import { nextTick } from 'async'
import { ExternalSite } from '@/utils/helper/ExternalSite'

import Loading from '@/components/Loading.vue'
import LabelItem from '@/views/ChatWarper/Chat/CenterContent/InputChat/ListLabel/LabelItem.vue'

import CogBoldIcon from '@/components/Icons/CogBold.vue'
import ArrowDownIcon from '@/components/Icons/ArrowDown.vue'

import type { ICustomLabel } from './ListLabel/type'
import {
  CountHiddenItem,
  type ICounHiddenItem,
} from '@/utils/helper/CountHiddenItem'
/** Khai báo các dữ liệu từ store */
const commonStore = useCommonStore()
const conversationStore = useConversationStore()
const $toast = container.resolve(Toast)
const orgStore = useOrgStore()
const $external_site = container.resolve(ExternalSite)

/**tham chiếu đến div danh sách nhãn */
const ref_labels = ref<HTMLDivElement>()
/**gắn cờ hiển thị nhiều nhãn */
const is_expand_label = ref(false)
/**gắn cờ đang loading label */
const is_loading_label = ref(false)
/**danh sách nhãn của trang của hội thoại này */
const labels = ref<ICustomLabel[]>([])
/**tổng số nhãn bị ẩn */
const total_over_label = ref<number>()

class Main {
  /**
   * @param SERVICE_COUNT_HIDDEN_ITEM đếm số nhãn bị ẩn
   */
  constructor(
    private readonly SERVICE_COUNT_HIDDEN_ITEM: ICounHiddenItem = container.resolve(
      CountHiddenItem
    )
  ) {}

  /**kiểm tra label có được chọn hay không */
  private isActiveLabel(label_id?: string): number | undefined {
    /** nếu không có nhãn thì trả về false */
    if (!label_id) return undefined

    /**trạng thái nhãn có được chọn hay không */
    const iS_SELECT = conversationStore.getActiveLabelIds()?.includes(label_id)

    /** trả về trạng thái nhãn có được chọn hay không */
    return iS_SELECT ? 1 : undefined
  }
  /**đếm số nhãn bị ẩn bởi css flex overflow-hidden  */
  private async countHiddenLabel(): Promise<void> {
    total_over_label.value = await this.SERVICE_COUNT_HIDDEN_ITEM.exec(
      'button',
      ref_labels.value
    )
  }

  /**khởi tạo danh sách nhãn của trang của hội thoại đang chọn */
  getLabels(): void {
    /**dữ liệu nhãn gốc của trang */
    const MAP_LABELS = conversationStore.getLabels()

    /** tiêm trạng thái nhãn được chọn */
    map(MAP_LABELS, (label: ICustomLabel) => {
      /** đánh dấu các nhãn đã được chọn */
      label.is_active = this.isActiveLabel(label._id)

      /** chuyển description sang dạng số */
      label.description = Number(label?.description)
    })

    /** sắp xếp */
    labels.value = sortBy(MAP_LABELS, ['is_active', 'index', 'title'])

    /** đếm số nhãn bị ẩn */
    this.countHiddenLabel()
  }
  /**xem toàn bộ, chỉ xem 1 dòng của nhãn */
  expandList() {
    /** nếu về chế độ 1 dòng, thì scroll về đầu */
    if (is_expand_label.value && ref_labels.value)
      ref_labels.value.scrollTop = 0

    /** thay đổi trạng thái hiển thị */
    is_expand_label.value = !is_expand_label.value
  }
  /**
   * thay đổi gắn nhãn của khách hàng này
   * @param label_id id của nhãn
   */
  @loading(is_loading_label)
  @error($toast)
  async toggleLabel(label_id: string) {
    /** nếu không có trang hoặc khách hàng nào được chọn thì không thực hiện */
    if (
      !conversationStore.select_conversation?.fb_page_id ||
      !conversationStore.select_conversation?.fb_client_id
    )
      return

    /** thực hiện thay đổi nhãn */
    await new N4SerivceAppOneConversation(
      conversationStore.select_conversation?.fb_page_id as string,
      conversationStore.select_conversation?.fb_client_id as string
    ).toggleLabel(label_id)
  }
}
const $main = new Main()

/** lấy danh sách nhãn khi component được render */
onMounted(() => $main.getLabels())

/** lấy danh sách nhãn khi thay đổi khách hàng */
watch(
  () => conversationStore.select_conversation?.fb_client_id,
  () => $main.getLabels()
)
/** lấy danh sách nhãn khi có thay đổi nhãn ở máy khác */
watch(
  () => conversationStore.select_conversation?.label_id,
  () => $main.getLabels()
)

/** lắng nghe trạng thái phím tắt */
watch(
  () => commonStore.keyboard_shortcut,
  value => {
    /** nếu không liên quan đến ẩn/hiện danh sách nhãn thì bỏ qua */
    if (value !== 'toggle_labels') return
    $main.expandList()

    /** reset trạng thái phím tắt */
    commonStore.keyboard_shortcut = ''
  }
)
</script>
