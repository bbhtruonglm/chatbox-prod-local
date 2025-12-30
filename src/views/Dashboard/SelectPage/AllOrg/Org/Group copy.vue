<template>
  <!-- v-show="org?.current_ms?.ms_role === 'ADMIN' && groups?.length" -->
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
  <!-- <div
    v-show="!(org?.current_ms?.ms_role === 'ADMIN' && groups?.length)"
    class="flex items-center gap-1 flex-grow min-w-0 overflow-hidden overflow-x-auto"
  >
    <div
      v-for="group of access_groups"
      class="py-1 px-3 rounded bg-slate-100 text-xs font-medium"
    >
      {{ group?.group_name }}
    </div>
  </div> -->
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
import { BillingAppGroup } from '@/utils/api/Billing'
import { nextTick } from 'async'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import Dropdown from '@/components/Dropdown.vue'

import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import { isEmpty } from 'lodash'

const $props = withDefaults(
  defineProps<{
    /** id tổ chức */
    org_id: string
  }>(),
  {}
)

const orgStore = useOrgStore()
const chatbotUserStore = useChatbotUserStore()
const pageManagerStore = usePageManagerStore()

/**danh sách nhóm của tổ chức này */
const groups = ref<IGroup[]>()

/** dropdown chọn nhóm */
const dropdown_ref = ref<InstanceType<typeof Dropdown>>()

/** loại nhóm đang được chọn */
const selected_hidden_group = ref<IGroup>({})

/** thẻ chứa các nhóm của tổ chức */
const ref_groups = ref<HTMLUListElement>()

/** danh sách các nhóm hiển thị */
const visible_groups = ref<IGroup[]>([])

/** danh sách các nhóm ẩn */
const hidden_groups = ref<IGroup[]>([])

/** mảng lưu độ rộng của từng nhóm */
const group_widths = ref<number[]>([])

/** độ rộng của dropdown */
const DROP_DOWN_WIDTH = 200

/**dữ liệu của tổ chức */
const org = computed(() => orgStore.findOrg($props.org_id))

// console.log(orgStore.list_group, 'list group')

watch(
  () => orgStore.list_group,
  new_val => {
    if (new_val && new_val.length) {
      console.log(new_val, 'new val')
    }
  }
)

class Main {
  /**hủy chọn nhóm */
  cancelGroup(): void {
    // nếu không có id tổ chức được chọn thì thôi
    if (!$props.org_id) return

    // xóa id nhóm được chọn của tổ chức này
    delete orgStore.selected_org_group[$props.org_id]
  }
  /**đọc danh sách nhóm */
  async readGroup(): Promise<void> {
    /** danh sách các tổ chức */
    // const LIST_ORG = orgStore.list_org || []
    /** Lấy list org id */
    // const ORG_IDS = LIST_ORG.map(item => item.org_id || '')

    // if (isEmpty(ORG_IDS)) return
    /** toàn bộ nhóm từ server */
    // const RES = await new BillingAppGroup().readGroup($props.org_id)
    // const RES = await new BillingAppGroup().readAllGroup(ORG_IDS)
    // console.log(RES, 'RESSSSSSS')
    // lưu lại vào reactive để hiển thị
    // groups.value = RES

    nextTick(() => {
      // nếu là group duy nhất và là tk nhân viên thì chọn group đó luôn
      if (is_single_group.value) {
        selected_group_id.value = access_groups.value?.[0]?.group_id || ''
      }

      // tính toán lại độ rộng các nhóm
      group_widths.value = measureAllGroupWidths()

      // cập nhật lại các nhóm hiển thị
      updateGroups()

      // lặp qua các nhóm lưu lại ánh xạ id của từng page với id nhóm của page đó
      // RES?.forEach(group => {
      //   group?.group_pages?.forEach(page_id => {
      //     // nếu không có id page hoặc id nhóm thì thôi
      //     if (!page_id || !group?.group_id || !group?.org_id) return

      //     // lưu ánh xạ từ id page tới id nhóm
      //     pageManagerStore.pape_to_group_map[page_id] = [
      //       ...(pageManagerStore.pape_to_group_map[page_id] || []),
      //       group?.group_id,
      //     ]
      //   })
      // })
    })
  }
  /**chọn nhóm */
  selectGroup(group_id?: string): void {
    // nếu không có id nhóm thì thôi
    if (!group_id) return
    // nếu không có id tổ chức được chọn thì thôi
    if (!$props.org_id) return

    // chọn id nhóm cho tổ chức này
    orgStore.selected_org_group[$props.org_id] = group_id
  }
}
const $main = new Main()

// lấy danh sách nhóm khi thành phần được khởi tạo
onMounted(async () => {
  await $main.readGroup()
  nextTick(() => {
    // Lắng nghe resize
    window.addEventListener('resize', updateGroups)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGroups)
})

// watch(
//   () => $props.org_id,
//   () => $main.readGroup()
// )

/**id của nhóm đang được chọn */
const selected_group_id = computed({
  get: () => {
    /**id nhóm */
    const GROUP_ID = orgStore.selected_org_group[$props.org_id]

    // nếu không có id nhóm thì trả về 'ALL'
    if (!GROUP_ID) return 'ALL'

    // trả về id nhóm
    return GROUP_ID
  },
  set: val => {
    // nếu lây 'ALL' thì hủy chọn nhóm
    if (val === 'ALL') $main.cancelGroup()
    // nếu lấy id nhóm thì chọn nhóm
    else $main.selectGroup(val)
  },
})

/**id người dùng hiện tại */
const user_id = computed(() => chatbotUserStore.chatbot_user?.user_id)

/**các nhóm người dùng hiện tại được phép truy cập */
const access_groups = computed(() => {
  // nếu là admin
  if (org.value?.current_ms?.ms_role === 'ADMIN') {
    return groups.value
  }

  // nếu không phải admin
  return groups.value?.filter(group =>
    group?.group_staffs?.includes(user_id.value || '')
  )
})

/** có 1 nhóm duy nhất với chế độ là nhân viên */
const is_single_group = computed(() => {
  return (
    access_groups.value?.length === 1 &&
    org.value?.current_ms?.ms_role !== 'ADMIN'
  )
})

/** hàm chọn nhóm */
function selectGroup(e: MouseEvent, group: IGroup, type: 'hidden' | 'visible') {
  selected_group_id.value = group?.group_id || ''

  // nếu là các nhóm trong dropdown thì tắt dropdown
  if (type === 'hidden') {
    selected_hidden_group.value = group
    // tắt dropdown
    dropdown_ref.value?.toggleDropdown(e)
  } else {
    // nội dung trong dropdown
    selected_hidden_group.value = {}
  }
}

/** hàm đo độ rộng của từng thẻ nhóm */
function measureAllGroupWidths() {
  /** danh sách ảo tạo ra để tính toán độ rộng của các thẻ nhóm */
  const VISTUAL_CONTAINER = document.createElement('div')

  // set các thuộc tính cho thẻ container ảo
  Object.assign(VISTUAL_CONTAINER.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    visibility: 'hidden',
    display: 'flex',
    fontFamily: `'Inter', 'Arial', 'Helvetica Neue', sans-serif`,
    fontSize: '12px', // tương đương text-xs của Tailwind
    fontWeight: '500', // tương đương font-medium
    lineHeight: '1.5', // tương đương khoảng dòng mặc định
    letterSpacing: 'normal',
    padding: '0',
    margin: '0',
    boxSizing: 'content-box',
  })

  // lặp qua danh sách các nhóm để tạo các thẻ nhóm ảo
  groups.value?.forEach(group => {
    const ITEM = document.createElement('div')
    ITEM.className = 'max-w-48 truncate py-1 px-3 rounded text-xs'
    ITEM.innerText = group?.group_name || ''
    VISTUAL_CONTAINER.appendChild(ITEM)
  })

  // thêm danh sách ảo vào body
  document.body.appendChild(VISTUAL_CONTAINER)

  /** danh sách các độ rộng của các thẻ nhóm */
  const WIDTHS: number[] = []
  Array.from(VISTUAL_CONTAINER.children).forEach(child => {
    /** thẻ nhóm ảo */
    const EL = child as HTMLElement
    // thêm chiều rộng vào mảng
    WIDTHS.push(EL.offsetWidth)
  })

  // xóa danh sách ảo tạo ra
  document.body.removeChild(VISTUAL_CONTAINER)
  return WIDTHS
}

/** hàm update ẩn hiện các nhóm */
function updateGroups() {
  // đảm bảo container đã render
  nextTick(() => {
    // nếu không có container thì thôi
    if (!ref_groups.value) return

    /** thẻ bọc danh sách nhóm */
    const CONTAINER_WIDTH = ref_groups.value.offsetWidth

    /** các độ rộng của các thẻ nhóm */
    const WIDGETS = group_widths.value

    /** tổng chiều rộng của các thẻ hiện */
    let used = 0
    /** số lượng thẻ hiện */
    let visible_count = 0

    // 1) Tính giả sử chưa cần dropdown
    for (let i = 0; i < WIDGETS.length; i++) {
      // nếu chưa vượt chiều rộng container thì thêm với
      if (used + WIDGETS[i] <= CONTAINER_WIDTH) {
        used += WIDGETS[i]
        visible_count++
      } else {
        break
      }
    }

    // 2) Nếu overflow, giảm dần cho vừa chỗ dropdown
    while (visible_count > 0 && used + DROP_DOWN_WIDTH > CONTAINER_WIDTH) {
      visible_count--
      used -= WIDGETS[visible_count]
    }

    // Nếu tất cả tab vừa
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
