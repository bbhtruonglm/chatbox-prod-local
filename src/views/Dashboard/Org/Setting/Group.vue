<template>
  <CardItem id="org--group">
    <template #icon>
      <UserGroupIcon class="w-5 h-5" />
    </template>
    <template #title>
      {{ $t('Nhóm') }}
      <div class="text-xs text-slate-500 hidden md:block">
        {{
          $t(
            'Mặc định sau khi Đăng nhập, Thành viên sẽ xem được toàn bộ Trang của Tổ chức.'
          )
        }}
      </div>
      <div class="text-xs text-slate-500 hidden md:block">
        {{
          $t(
            'Chức năng Nhóm sẽ chỉ định Thành viên chỉ xem được Trang trong Nhóm sau khi đăng nhập. Lưu ý: Quản trị viên vẫn xem được toàn bộ Trang.'
          )
        }}
      </div>
    </template>
    <template #action>
      <button
        @click="$main.openModalUpsertGroup()"
        class="py-1 px-4 rounded-md text-sm font-medium bg-blue-600 text-white h-fit"
      >
        {{ $t('Thêm') }}
      </button>
    </template>
    <template
      #item
      v-if="groups?.length"
    >
      <div
        class="rounded-md bg-gray-100 p-1 text-gray-500 text-sm font-medium w-fit"
      >
        <button
          v-for="group of groups"
          @click="$main.selectGroup(group.group_id)"
          :class="{ active: selected_group?.group_id === group.group_id }"
          class="group-item truncate max-w-40"
          v-tooltip="group?.group_name"
        >
          {{ $t('Nhóm') }} {{ group?.group_name }}
        </button>
      </div>
      <GroupSection :title="$t('Trang')">
        <template v-for="os of orgStore.list_os">
          <PageItem
            v-if="
              selected_group?.group_pages?.includes(
                os?.page_info?.fb_page_id || ''
              )
            "
            :page_info="os?.page_info"
            :checkbox_is_visible="false"
            class="cursor-pointer"
          />
        </template>
      </GroupSection>
      <GroupSection :title="$t('Thành viên')">
        <template v-for="ms of orgStore.list_ms">
          <ActorItem
            v-if="selected_group?.group_staffs?.includes(ms?.staff_id || '')"
            class="cursor-pointer"
          >
            <template #avatar>
              <StaffAvatar
                :id="ms?.user_info?.user_id"
                class="w-8 h-8 rounded-oval"
              />
            </template>
            <template #name>
              {{ ms?.user_info?.full_name }}
            </template>
          </ActorItem>
        </template>
      </GroupSection>
      <div class="flex justify-between items-center text-sm font-medium">
        <button
          @click="$main.openModalUpsertGroup(selected_group)"
          class="btn-footer bg-slate-200"
        >
          <PencilSquareIcon class="size-4" />
          {{ $t('Sửa Nhóm') }}
        </button>
        <button
          @click="$main.openModalDeleteGroup()"
          class="btn-footer text-red-500"
        >
          {{ $t('Xóa Nhóm') }}
        </button>
      </div>
    </template>
  </CardItem>
  <GroupUpsertModal
    ref="ref_group_upsert_modal"
    @done="$main.readGroupAndSelectCurrentGroup()"
  />
  <ConfirmDeleteGroupModal
    :selected_group
    @done="$main.readGroupAndSelectFirstGroup()"
    ref="ref_confirm_delete_group_modal"
  />
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { container } from 'tsyringe'
import { BillingAppGroup } from '@/utils/api/Billing'
import { useOrgStore } from '@/stores'
import { error } from '@/utils/decorator/Error'

import CardItem from '@/components/Main/Dashboard/CardItem.vue'
import GroupUpsertModal from '@/views/Dashboard/Org/Setting/Group/GroupUpsertModal.vue'
import ConfirmDeleteGroupModal from '@/views/Dashboard/Org/Setting/Group/ConfirmDeleteGroupModal.vue'
import PageItem from '@/components/Main/Dashboard/PageItem.vue'
import GroupSection from '@/views/Dashboard/Org/Setting/Group/GroupSection.vue'
import ActorItem from '@/components/Main/Dashboard/ActorItem.vue'
import StaffAvatar from '@/components/Avatar/StaffAvatar.vue'

import { UserGroupIcon, PencilSquareIcon } from '@heroicons/vue/24/solid'

const orgStore = useOrgStore()

/**modal thêm/sửa Nhóm */
const ref_group_upsert_modal = ref<InstanceType<typeof GroupUpsertModal>>()
/**modal xác nhận xóa Nhóm */
const ref_confirm_delete_group_modal =
  ref<InstanceType<typeof ConfirmDeleteGroupModal>>()
/**danh sách nhóm của tổ chức này */
const groups = ref<IGroup[]>()
/**dữ liệu của nhóm được chọn */
const selected_group = ref<IGroup>()

class Main {
  /**mở modal thêm/sửa Nhóm */
  openModalUpsertGroup(group?: IGroup) {
    ref_group_upsert_modal.value?.toggleModal?.(group)
  }
  /**chọn nhóm */
  selectGroup(group_id?: string) {
    selected_group.value = groups.value?.find(
      group => group.group_id === group_id
    )
  }
  /**mở modal xác nhận xóa Nhóm */
  openModalDeleteGroup() {
    ref_confirm_delete_group_modal.value?.toggleModal?.()
  }
  /**đọc danh sách nhóm */
  @error()
  async readGroup() {
    // Đọc danh sách nhóm
    // groups.value = await new BillingAppGroup().readGroup()
    groups.value = await new BillingAppGroup().readAllGroup()
    // groups.value = await this.API_GROUP.readGroup()
  }

  /** lấy danh sách là chọn lại group đang chọn */
  async readGroupAndSelectCurrentGroup() {
    await $main.readGroup()
    $main.selectGroup(selected_group.value?.group_id)
  }

  /** lấy danh sách nhóm và chọn nhóm đầu tiên */
  async readGroupAndSelectFirstGroup() {
    await $main.readGroup()
    $main.selectGroup(groups.value?.[0]?.group_id)
  }
}
const $main = new Main()

// Đọc danh sách nhóm khi component được tạo
onMounted(() => $main.readGroupAndSelectFirstGroup())

// đọc danh sách nhóm khi tổ chức được thay đổi
watch(
  () => orgStore.selected_org_id,
  () => $main.readGroupAndSelectFirstGroup()
)
</script>
<style lang="scss" scoped>
.group-item {
  @apply rounded-md px-3 py-1;
}
.group-item.active {
  @apply bg-white shadow text-black;
}
.btn-footer {
  @apply flex gap-2 items-center py-2 px-4 rounded-md;
}
</style>
