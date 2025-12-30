<template>
  <div class="bg-white p-1 rounded-md flex items-center gap-3 justify-between">
    <!-- <div class="flex-grow">
      <button
        @click="$main.cancelGroup()"
        :class="$main.isHightlightGroup()"
        class="group__btn--base"
      >
        {{ $t('Tất cả nhóm') }}
      </button>
      <button
        v-for="group of groups"
        @click="$main.selectGroup(group?.group_id)"
        :class="$main.isHightlightGroup(group?.group_id)"
        class="group__btn--base w-24 truncate"
      >
        {{ group?.group_name }}
      </button>
    </div> -->
    <div class="flex-grow">
      <Group :org_id="orgStore?.selected_org_id || ''" />
    </div>
    <button class="px-5 flex-shrink-0">
      <Cog6ToothIcon
        v-tooltip="$t('Cài đặt nhóm')"
        @click="$router.push('/dashboard/org/setting#org--group')"
        class="size-5 text-slate-500"
      />
    </button>
  </div>
</template>
<script setup lang="ts">
import { useOrgStore } from '@/stores'
import { BillingAppGroup } from '@/utils/api/Billing'
import { Cog6ToothIcon } from '@heroicons/vue/24/solid'
import { onMounted, ref, watch } from 'vue'
import Group from './AllOrg/Org/Group.vue'

const orgStore = useOrgStore()

/**danh sách nhóm của tổ chức này */
const groups = ref<IGroup[]>()

class Main {
  /**hủy chọn nhóm */
  cancelGroup(): void {
    // nếu không có id tổ chức được chọn thì thôi
    if (!orgStore.selected_org_id) return

    // xóa id nhóm được chọn của tổ chức này
    delete orgStore.selected_org_group[orgStore.selected_org_id]
  }
  /**đọc danh sách nhóm */
  // async readGroup(): Promise<void> {
  //   // đọc toàn bộ nhóm từ server
  //   groups.value = await new BillingAppGroup().readGroup()
  // }
  async readGroup(): Promise<void> {
    // đọc toàn bộ nhóm từ server
    groups.value = await new BillingAppGroup().readAllGroup()
  }
  /**chọn nhóm */
  selectGroup(group_id?: string): void {
    // nếu không có id nhóm thì thôi
    if (!group_id) return
    // nếu không có id tổ chức được chọn thì thôi
    if (!orgStore.selected_org_id) return

    // chọn id nhóm cho tổ chức này
    orgStore.selected_org_group[orgStore.selected_org_id] = group_id
  }
  /**lấy id nhóm đang được chọn */
  getSelectedGroupId(): string | undefined {
    // nếu không có id tổ chức được chọn thì thôi
    if (!orgStore.selected_org_id) return

    // trả về id nhóm đang được chọn của tổ chức
    return orgStore.selected_org_group[orgStore.selected_org_id]
  }
  /**ui của nút sẽ thay đổi tùy theo việc có được lựa chọn hay không */
  isHightlightGroup(value?: string) {
    return this.getSelectedGroupId() === value
      ? 'bg-slate-100'
      : 'text-gray-500'
  }
}
const $main = new Main()

// lấy danh sách nhóm khi thành phần được khởi tạo
onMounted(() => $main.readGroup())

watch(
  () => orgStore.selected_org_id,
  () => $main.readGroup()
)
</script>
<style lang="scss" scoped>
.group__btn--base {
  @apply py-1 px-3 rounded text-sm font-medium;
}
</style>
