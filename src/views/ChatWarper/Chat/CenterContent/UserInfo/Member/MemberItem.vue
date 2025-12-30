<template>
  <div class="flex items-center p-2 gap-3 hover:bg-gray-100 rounded-md">
    <!-- avatar -->
    <div class="flex items-center flex-1 overflow-hidden gap-5">
      <img
        :src="avatar_member"
        alt="avatar"
        class="w-8 h-8 flex-shrink-0 rounded-full"
      />
      <!-- Tên thành viên -->
      <p
        class="flex flex-1 flex-col text-sm truncate overflow-hidden font-semibold flex-shrink-0"
      >
        {{ name_member }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConversationStore, usePageStore } from '@/stores'
import { N13ZaloPersonal } from '@/utils/api/N13ZaloPersonal'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { container } from 'tsyringe'
import { Toast } from '@/utils/helper/Alert/Toast'
import { keys } from 'lodash'
import { computed } from 'vue'

import { confirm } from '@/service/helper/alert'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['delete-success'])

/*Prod truyền vào từ cha**/
defineProps<{
  /**Avarta thành viên*/
  avatar_member: string
  /**Tên thành viên*/
  name_member: string
}>()
/** Hàm dịch */
const $t = useI18n().t
/** Thông tin page */
const pageStore = usePageStore()
/** THông tin conversation */
const conversationStore = useConversationStore()
/**id khách */
const client_id = computed(
  () => conversationStore.select_conversation?.fb_client_id
)

/** Khởi tạo trực tiếp instance API Zalo */
const API_ZALO = new N13ZaloPersonal('app/page/group')
const $toast = container.resolve(Toast)

/**
 * Xử lý Thêm thành viên vào nhóm trên Zalo
 */
async function handleRemoveMember(member_id?: string) {
  /** Lấy page_id mặc định (page đầu tiên) */
  const PAGE_IDS = keys(pageStore.selected_page_id_list)

  /** Lấy page_id mặc định (page đầu tiên) */
  let page_id = PAGE_IDS[0] || ''

  const GROUP_ID = keys(conversationStore.selected_client_id)
  let group_id = GROUP_ID[0] || client_id.value || ''

  /** Payload gửi lên API Zalo */
  const PAYLOAD = {
    member_id: member_id || '',
    page_id,
    group_id,
  }

  try {
    /** Gọi API tạo group */
    const DATA = await API_ZALO.removeMemberZalo(PAYLOAD)
    console.log('Xóa thành viên thành công:', DATA)
    $toast.success($t('v1.common.remove_member_success'))
    emit('delete-success')
  } catch (err) {
    console.error('Lỗi khi xóa thành viên:', err)
  }
}

/** xác nhận xóa các tập tin */
function confirmDeleteMember() {
  confirm('question', $t('v1.common.confirm_remove_member'), '', is_cancel => {
    /** nếu hủy thì thôi */
    if (is_cancel) return
    /** xóa các tập tin đã chọn */
    // handleRemoveMember(props.member_id)
  })
}
</script>
