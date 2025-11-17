<template>
  <Dropdown
    ref="member_ref"
    width="280px"
    height="auto"
    :is_fit="false"
    position="BOTTOM"
    :back="210"
    :distance="9"
    class_content="flex flex-col  gap-1 max-h-[210px] "
  >
    <div class="flex justify-between gap-2 p-2 text-right items-center">
      <div class="size-5"></div>
      <span>{{ $t('v1.common.list_member') }}</span>
      <div
        class="bg-slate-100 p-1 rounded-full cursor-pointer"
        v-tooltip="$t('Thêm thành viên')"
        @click="emit('add-member')"
      >
        <UserPlusIcon class="size-4" />
      </div>
    </div>
    <div
      v-if="is_loading"
      class="relative z-10"
    >
      <div class="absolute top-6 left-[43%] translate-x-1/2">
        <Loading class="mx-auto" />
      </div>
    </div>
    <div class="overflow-hidden overflow-y-auto">
      <!-- Lặp qua member_lists và hiển thị từng memberItem -->
      <MemberItem
        v-for="(item, index) in member_lists"
        :key="index"
        :avatar_member="item.client_avatar"
        :name_member="item.client_name"
        :member_id="item.client_id"
      />

      <!-- Nếu không có thành viên nào thì hiển thị thông báo -->
      <div
        v-if="member_lists.length === 0"
        class="text-gray-500 text-center py-8"
      >
        <p v-if="!is_loading">{{ $t('Chưa có thành viên nào') }}</p>
      </div>
    </div>
  </Dropdown>
</template>

<script setup lang="ts">
import { useConversationStore } from '@/stores'
import { container } from 'tsyringe'
import { ref } from 'vue'

/**component*/
import Dropdown from '@/components/Dropdown.vue'
import Loading from '@/components/Loading.vue'

import { UserPlusIcon } from '@heroicons/vue/24/outline'

/**component con*/
import MemberItem from '@/views/ChatWarper/Chat/CenterContent/UserInfo/Member/MemberItem.vue'

/**Api*/
import { N4SerivceAppZaloPersonal } from '@/utils/api/N4Service/ZaloPersonal'
import { Toast } from '@/utils/helper/Alert/Toast'
import { useI18n } from 'vue-i18n'

/*Biến store**/
const conversationStore = useConversationStore()

/**trạng thái loading */
const is_loading = ref(false)

/** Thêm emits cho component */
const emit = defineEmits<{
  (e: 'add-member'): void
}>()

const $toast = container.resolve(Toast)

const { t: $t } = useI18n()

/**ref của dropdown danh sách thành viên nhóm */
const member_ref = ref<InstanceType<typeof Dropdown>>()

/**Biến lưu danh sách api đang trả về*/
const member_lists = ref<any[]>([])

class Main {
  /**
   * @param API gọi API
   */
  constructor(
    private readonly API = container.resolve(N4SerivceAppZaloPersonal)
  ) {
    this.toggle = this.toggle.bind(this)
  }

  /** Ẩn/hiện dropdown danh sách thành viên của nhóm */
  toggle($event?: MouseEvent) {
    // Gọi phương thức toggleDropdown() ẩn/hiện dropdown
    member_ref.value?.toggleDropdown($event)
    // Reset danh sách thành viên trước khi gọi API
    member_lists.value = []
    // Gọi lại API lấy danh sách thành viên mỗi khi mở
    this.fetchGroupMenbers()
  }

  /** Lấy danh sách thành viên của nhóm */
  async fetchGroupMenbers() {
    // Bật loading
    is_loading.value = true

    try {
      /** ID Của Group: trong nhóm thì id khách hàng là id nhóm */
      const GROUP_ID = conversationStore.select_conversation?.fb_client_id

      /** ID trang hiện tại */
      const PAGE_ID = conversationStore.select_conversation?.fb_page_id

      // Kiểm tra xem cả hai giá trị có tồn tại không
      if (!GROUP_ID || !PAGE_ID) {
        $toast.error(
          $t('Vui lòng chọn trang và khách hàng trước khi thực hiện')
        )
        // Tắt loading nếu có lỗi
        is_loading.value = false
        return
      }

      /** Gọi API để lấy danh sách thành viên của nhóm */
      const RES = await this.API.getGroupMenbers(PAGE_ID, GROUP_ID)

      // Kiểm tra xem API có trả về dữ liệu không
      if (RES) {
        // Nếu có, gán dữ liệu vào biến member_lists
        member_lists.value = RES
      } else {
        // Nếu không có, hiển thị thông báo
        $toast.error($t('Không có dữ liệu'))
      }
    } catch (error) {
      $toast.error(error)
    } finally {
      // Tắt loading
      is_loading.value = false
    }
  }
}

const $main = new Main()

defineExpose({ toggle: $main.toggle })
</script>
