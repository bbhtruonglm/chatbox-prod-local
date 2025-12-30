<template>
  <Modal
    @open_modal="getNoti"
    ref="modal_alert_ref"
    class_modal="w-[881px] h-[630px]"
    class_body="flex gap-2"
    class_footer="flex justify-between items-center"
  >
    <template #header>
      {{ $t('v1.view.main.dashboard.header.noti.title') }}
      <template v-if="orgStore.count_noti">
        ({{ orgStore.count_noti }})
      </template>
    </template>
    <template #body>
      <div
        class="bg-white rounded-md p-4 gap-2 grid grid-cols-2 relative w-full h-full"
      >
        <div class="h-full overflow-y-auto flex flex-col gap-2.5">
          <button
            v-for="noti of list_noti"
            @click="selectNoti(noti)"
            :class="{
              'border-2 border-blue-700':
                selected_noti_info.noti_id === noti.noti_id,
              'bg-slate-50': !noti.is_read,
            }"
            class="border rounded-lg py-3 px-4 hover:bg-slate-50"
          >
            <div class="flex items-center gap-2.5 justify-between">
              <div class="text-sm font-medium min-w-0 truncate">
                {{ noti.noti_title }}
              </div>
              <div
                v-if="!noti.is_read"
                class="flex-shrink-0 rounded-full w-[11px] h-[11px] bg-red-500"
              />
            </div>
            <div
              class="text-sm text-gray-500 flex items-center gap-2.5 justify-between"
            >
              <div class="min-w-0 truncate">
                {{ noti.noti_content }}
              </div>
              <div class="flex-shrink-0">
                {{ formatDate(noti.createdAt) }}
              </div>
            </div>
          </button>
        </div>
        <div
          class="h-full overflow-hidden border rounded-lg py-2 px-3 flex flex-col gap-2.5"
        >
          <div
            v-if="!selected_noti_info?.noti_id"
            class="text-sm text-slate-500 text-center mt-4"
          >
            {{ $t('v1.view.main.dashboard.header.noti.not_select') }}
          </div>
          <div
            v-else
            class="bg-slate-100 text-xs py-1 px-2 rounded flex-shrink-0 flex justify-between"
          >
            <div class="font-medium">
              {{ selected_noti_info.noti_title }}
            </div>
            <div>
              {{ formatDate(selected_noti_info.createdAt) }}
            </div>
          </div>
          <div
            v-html="selected_noti_info.noti_content"
            class="min-h-0 overflow-y-auto text-sm break-words whitespace-pre-line"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <button
        @click="modal_alert_ref?.toggleModal()"
        class="btn-custom bg-slate-700 text-white"
      >
        {{ $t('v1.common.close') }}
      </button>
      <button
        @click="readAllNoti"
        class="btn-custom bg-blue-700 text-white"
      >
        {{ $t('v1.view.main.dashboard.header.noti.read_all') }}
      </button>
    </template>
  </Modal>
</template>
<script setup lang="ts">
import { useCommonStore, useOrgStore } from '@/stores'
import { ref } from 'vue'
import {
  get_all_noti,
  get_noti,
  read_noti,
} from '@/service/api/chatbox/billing'
import { toastError } from '@/service/helper/alert'
import { format as date_format } from 'date-fns'
import { eachOfLimit } from 'async'

import Modal from '@/components/Modal.vue'

import type { NotiInfo } from '@/service/interface/app/billing'
import { isEmpty } from 'lodash'

const $emit = defineEmits(['done'])

const orgStore = useOrgStore()
const commonStore = useCommonStore()

/**ref của modal kết nối nền tảng */
const modal_alert_ref = ref<InstanceType<typeof Modal>>()
/**danh sách các thông báo mới */
const list_noti = ref<NotiInfo[]>([])
/**dữ liệu của thông báo đang chọn */
const selected_noti_info = ref<NotiInfo>({})

/**đọc tất cả thông báo của tổ chức */
async function readAllNoti() {
  // hiển thị loading
  commonStore.is_loading_full_screen = true

  try {
    // nếu không có id tổ chức thì thôi
    if (!orgStore.selected_org_id) return

    // xử lý từng thông báo
    await eachOfLimit(list_noti.value, 1, async (noti: NotiInfo, i) => {
      // nếu không có id hoặc đã đọc rồi thì thôi
      if (!noti?.noti_id || noti?.is_read) return

      // đánh dấu là đã đọc
      noti.is_read = true

      // update backend
      await read_noti(orgStore.selected_org_id, noti.noti_id)
    })

    // giảm số thông báo chưa đọc
    orgStore.count_noti = 0
  } catch (e) {
    // thông báo lỗi
    toastError(e)
  }

  // ẩn loading
  commonStore.is_loading_full_screen = false
}
/**ẩn hiện modal của component */
function toggleModal() {
  modal_alert_ref.value?.toggleModal()
}
/**lấy danh sách các thông báo không thuộc tổ chức hiện tại */
async function getNoti() {
  // hiển thị loading
  commonStore.is_loading_full_screen = true

  try {
    // nếu không có id tổ chức thì thôi
    // if (!orgStore.selected_org_id) return

    // // xoá dữ liệu noti đang chọn nếu có
    // selected_noti_info.value = {}
    /** danh sách các tổ chức */
    const LIST_ORG = orgStore.list_org || []

    /** Lấy list org id */
    const ORG_IDS = LIST_ORG.map(item => item.org_id || '')
    /** nếu không có org ids thì trả về [] */
    if (isEmpty(ORG_IDS)) return []

    /**các thông báo đã nằm trong tổ chức */
    list_noti.value = await get_all_noti({ org_id: ORG_IDS, sort: 'is_read' })
  } catch (e) {
    // thông báo lỗi
    toastError(e)
  }

  // ẩn loading
  commonStore.is_loading_full_screen = false
}
/**định dạng lại thời gian */
function formatDate(date?: string) {
  // nếu không có thời gian thì thôi
  if (!date) return ''

  return date_format(new Date(date), 'HH:mm d/M/yyyy')
}
/**đọc, chọn noti */
async function selectNoti(noti: NotiInfo) {
  try {
    // lưu lại dữ liệu thông báo đang chọn
    selected_noti_info.value = noti

    // nếu chưa đọc
    if (!noti.is_read) {
      // đánh dấu là đã đọc
      noti.is_read = true

      // update backend
      await read_noti(orgStore.selected_org_id, noti.noti_id)

      // giảm số thông báo chưa đọc
      orgStore.count_noti -= 1
    }
  } catch (e) {
    // tạm thời không xử lý
  }
}

// cung cấp hàm toggle modal cho component cha
defineExpose({ toggleModal })
</script>
<style scoped lang="scss">
.btn-custom {
  @apply text-sm font-medium rounded-md py-2 px-4 flex items-center gap-2 hover:brightness-90;
}
</style>
