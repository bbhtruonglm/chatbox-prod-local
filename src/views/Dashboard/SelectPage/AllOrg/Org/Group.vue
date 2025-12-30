<template>
  <section
    v-show="access_groups?.length"
    class="flex text-xs w-full overflow-hidden"
    ref="ref_groups"
  >
    <ul class="flex font-medium">
      <li
        class="flex-shrink-0 py-1 px-3 rounded text-slate-700 cursor-pointer hover:bg-slate-100"
        :class="{
          'bg-slate-100 !text-black': selected_group_id === 'ALL',
        }"
        @click="selectGroup($event, { group_id: 'ALL' }, 'visible')"
        v-if="!is_single_group"
      >
        {{ $t('Tất cả Nhóm') }}
      </li>
      <li
        v-for="group of visible_groups"
        class="max-w-48 truncate py-1 px-3 rounded text-slate-700 cursor-pointer hover:bg-slate-100"
        :class="{
          'bg-slate-100 !text-black': group?.group_id === selected_group_id,
        }"
        @click="selectGroup($event, group, 'visible')"
      >
        {{ group?.group_name }}
      </li>
    </ul>

    <div
      v-if="hidden_groups?.length"
      class="max-w-48 flex items-center gap-1 py-1 px-3 rounded text-slate-700 cursor-pointer hover:bg-slate-100"
      :class="{
        'bg-slate-100 !text-black': selected_hidden_group?.group_id,
      }"
      @click="dropdown_ref?.toggleDropdown"
    >
      <p class="truncate font-medium">
        {{ selected_hidden_group?.group_name || $t('Thêm') }}
      </p>
      <ChevronDownIcon class="size-3 flex-shrink-0" />
    </div>
  </section>

  <Dropdown
    ref="dropdown_ref"
    width="250px"
    height="auto"
    :is_fit="false"
    :back="150"
    class_content="flex flex-col gap-1"
  >
    <ul class="flex flex-col gap-1 text-sm">
      <li
        v-for="group of hidden_groups"
        class="truncate py-1.5 px-3 hover:bg-slate-100 cursor-pointer rounded"
        @click="selectGroup($event, group, 'hidden')"
      >
        {{ group?.group_name }}
      </li>
    </ul>
  </Dropdown>
</template>

<script setup lang="ts">
import { useChatbotUserStore, useOrgStore, usePageManagerStore } from '@/stores'
import { nextTick } from 'vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Dropdown from '@/components/Dropdown.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import { isEmpty } from 'lodash'

const $props = withDefaults(
  defineProps<{
    org_id: string
  }>(),
  {}
)

const orgStore = useOrgStore()
const chatbotUserStore = useChatbotUserStore()
const pageManagerStore = usePageManagerStore()

/** danh sách nhóm */
const groups = ref<IGroup[]>([]) // <- QUAN TRỌNG

const dropdown_ref = ref<InstanceType<typeof Dropdown>>()
const selected_hidden_group = ref<IGroup>({})
const ref_groups = ref<HTMLUListElement>()
const visible_groups = ref<IGroup[]>([])
const hidden_groups = ref<IGroup[]>([])
const group_widths = ref<number[]>([])
const DROP_DOWN_WIDTH = 200

/** dữ liệu org */
const org = computed(() => orgStore.findOrg($props.org_id))

/** --- ĐỒNG BỘ GROUPS VỚI STORE --- */
watch(
  () => orgStore.list_group,
  new_val => {
    if (!new_val) return

    groups.value = new_val.filter(item => item.org_id === $props.org_id)

    nextTick(() => {
      group_widths.value = measureAllGroupWidths()
      updateGroups()
    })
  },
  { immediate: true }
)

/** Class xử lý chính */
class Main {
  cancelGroup(): void {
    if (!$props.org_id) return
    delete orgStore.selected_org_group[$props.org_id]
  }

  async readGroup(): Promise<void> {
    nextTick(() => {
      if (is_single_group.value) {
        selected_group_id.value = access_groups.value?.[0]?.group_id || ''
      }

      group_widths.value = measureAllGroupWidths()
      updateGroups()
    })
  }

  selectGroup(group_id?: string): void {
    if (!group_id) return
    if (!$props.org_id) return
    orgStore.selected_org_group[$props.org_id] = group_id
  }
}

const $main = new Main()

onMounted(async () => {
  await $main.readGroup()
  nextTick(() => window.addEventListener('resize', updateGroups))
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGroups)
})

/** id group đang chọn */
const selected_group_id = computed({
  get: () => {
    const GROUP_ID = orgStore.selected_org_group[$props.org_id]
    return GROUP_ID || 'ALL'
  },
  set: val => {
    if (val === 'ALL') $main.cancelGroup()
    else $main.selectGroup(val)
  },
})

/** id user */
const user_id = computed(() => chatbotUserStore.chatbot_user?.user_id)

/** nhóm có quyền */
const access_groups = computed(() => {
  if (org.value?.current_ms?.ms_role === 'ADMIN') {
    return groups.value
  }
  return groups.value?.filter(group =>
    group?.group_staffs?.includes(user_id.value || '')
  )
})

/** nhân viên chỉ có 1 group */
const is_single_group = computed(() => {
  return (
    access_groups.value?.length === 1 &&
    org.value?.current_ms?.ms_role !== 'ADMIN'
  )
})

/** chọn group */
function selectGroup(e: MouseEvent, group: IGroup, type: 'hidden' | 'visible') {
  /** chọn group   */
  selected_group_id.value = group?.group_id || ''

  /** chọn group ẩn */
  if (type === 'hidden') {
    /** chọn group ẩn */
    selected_hidden_group.value = group
    /** toggle dropdown */
    dropdown_ref.value?.toggleDropdown(e)
  } else {
    /** reset group ẩn */
    selected_hidden_group.value = {}
  }
}

/** đo width từng group */
function measureAllGroupWidths() {
  /** tạo container ảo */
  const VISTUAL_CONTAINER = document.createElement('div')

  /** style container ảo */
  Object.assign(VISTUAL_CONTAINER.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    visibility: 'hidden',
    display: 'flex',
    fontFamily: `'Inter', 'Arial', 'Helvetica Neue', sans-serif`,
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.5',
    letterSpacing: 'normal',
    padding: '0',
    margin: '0',
    boxSizing: 'content-box',
  })

  /** thêm các item vào container ảo */
  groups.value?.forEach(group => {
    /** tạo item */
    const ITEM = document.createElement('div')
    /** style item */
    ITEM.className = 'max-w-48 truncate py-1 px-3 rounded text-xs'
    /** nội dung item */
    ITEM.innerText = group?.group_name || ''
    /** thêm item vào container */
    VISTUAL_CONTAINER.appendChild(ITEM)
  })

  /** thêm container vào body */
  document.body.appendChild(VISTUAL_CONTAINER)

  /** đo width từng item */
  const WIDTHS: number[] = []
  /** đo width từng item */
  Array.from(VISTUAL_CONTAINER.children).forEach(child => {
    /** item */
    const EL = child as HTMLElement
    /** width item */
    WIDTHS.push(EL.offsetWidth)
  })

  /** xóa container */
  document.body.removeChild(VISTUAL_CONTAINER)
  /** trả về width của từng item */
  return WIDTHS
}

/** update phân chia visible / hidden */
function updateGroups() {
  nextTick(() => {
    if (!ref_groups.value) return

    const CONTAINER_WIDTH = ref_groups.value.offsetWidth
    const WIDGETS = group_widths.value

    let used = 0
    let visible_count = 0

    for (let i = 0; i < WIDGETS.length; i++) {
      if (used + WIDGETS[i] <= CONTAINER_WIDTH) {
        used += WIDGETS[i]
        visible_count++
      } else break
    }

    while (visible_count > 0 && used + DROP_DOWN_WIDTH > CONTAINER_WIDTH) {
      visible_count--
      used -= WIDGETS[visible_count]
    }

    if (visible_count === access_groups.value?.length) {
      visible_groups.value = [...(access_groups.value || [])]
      hidden_groups.value = []
      return
    }

    visible_groups.value = access_groups.value?.slice(0, visible_count) || []
    hidden_groups.value = access_groups.value?.slice(visible_count) || []
  })
}
</script>

<style lang="scss" scoped>
.group__btn--base {
  @apply py-1 px-3 rounded text-sm font-medium;
}
</style>
