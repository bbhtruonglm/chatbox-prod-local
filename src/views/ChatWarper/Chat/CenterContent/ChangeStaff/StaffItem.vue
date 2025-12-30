<template>
  <div class="h-[calc(100%_-_33px)] overflow-y-auto">
    <div
      class="w-full flex items-center justify-between py-2.5 border-b cursor-pointer hover:bg-orange-100 px-2"
      v-for="(staff, index) in staffListWithNone"
      :key="staff?.user_id || staff?.fb_staff_id || 'none'"
      @click="$emit('select_staff', staff)"
    >
      <div class="flex items-center">
        <StaffAvatar
          v-if="staff"
          class="rounded-full mr-3 w-9 h-9"
          :id="staff.user_id || staff.fb_staff_id"
        />
        <div
          v-else
          class="rounded-full mr-3 w-9 h-9 flex items-center justify-center bg-gray-200 text-gray-600 text-xs font-medium"
        >
          ✖
        </div>
        <p
          :class="{
            'italic text-gray-600': !staff,
            'line-through': staff && !staff.user_id,
          }"
          class="text-sm"
        >
          {{ staff ? staff.name : 'Không chọn nhân viên' }}
        </p>
      </div>

      <img
        v-if="
          select_staff_id === (staff?.user_id || staff?.fb_staff_id) ||
          (!staff && !select_staff_id)
        "
        class="w-5 h-5"
        src="@/assets/icons/check-circle.svg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import StaffAvatar from '@/components/Avatar/StaffAvatar.vue'
import type { StaffInfo } from '@/service/interface/app/staff'
import { computed } from 'vue'

const $emit = defineEmits(['select_staff'])

const $props = withDefaults(
  defineProps<{
    /** Danh sách nhân viên */
    staffs: StaffInfo[]
    /** Nhân viên được phân công phụ trách cuộc hội thoại */
    select_staff_id: string
  }>(),
  {}
)

/** ✅ Thêm option “Không chọn nhân viên” vào đầu danh sách */
const staffListWithNone = computed(() => [...$props.staffs, null])
</script>
