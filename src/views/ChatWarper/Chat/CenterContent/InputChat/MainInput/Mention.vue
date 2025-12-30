<template>
  <Teleport
    to="body"
    v-if="commonStore.is_show_mention"
  >
    <div
      id="chat__mention__modal"
      v-show="list_members?.length"
      @click="toggleModal(true)"
      class="absolute top-0 left-0 w-screen h-screen z-20"
    >
      <div
        ref="modal_content_ref"
        @click.stop
        class="bg-white absolute shadow-lg rounded-xl max-h-[408px] overflow-hidden flex flex-col py-1 px-3 gap-1 bottom-[73px]"
      >
        <div class="flex justify-between py-1 flex-shrink-0 text-sm border-b">
          <div class="font-semibold">
            {{ $t('Nhắc đến người dùng') }}
          </div>
        </div>
        <div class="overflow-y-auto flex flex-col py-2 gap-2">
          <button
            v-for="(member, index) of list_members"
            :id="`member-${index}`"
            @click="selectMember(member)"
            :class="{
              'bg-slate-100': index === selected_member_index,
            }"
            class="py-1 px-2 gap-3 rounded-lg flex hover:bg-slate-100 items-center"
          >
            <img
              v-if="member.client_avatar"
              :src="member.client_avatar"
              class="size-8 rounded-full object-cover"
            />
            <div
              v-else
              class="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold"
            >
              {{ member.client_name?.charAt(0)?.toUpperCase() || 'A' }}
            </div>
            <div class="flex-grow min-w-0 text-sm text-left">
              <div class="font-semibold truncate">
                {{ member.client_id === '-1' ? '@All' : member.client_name }}
                <span
                  v-if="member.client_id === '-1'"
                  class="text-xs text-gray-500 ml-1"
                >
                  ({{ $t('Báo cho cả nhóm') }})
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { useCommonStore, useConversationStore, usePageStore } from '@/stores'
import { nonAccentVn } from '@/service/helper/format'
import { composableService as inputComposableService } from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/service'
import { last } from 'lodash'
import { container } from 'tsyringe'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  N4SerivceAppZaloPersonal,
  type IGroupMember,
} from '@/utils/api/N4Service/ZaloPersonal'

const { InputService } = inputComposableService()

const conversationStore = useConversationStore()
const commonStore = useCommonStore()
const pageStore = usePageStore()
const { t: $t } = useI18n()
const $input_service = container.resolve(InputService)
const $api_zalo = container.resolve(N4SerivceAppZaloPersonal)

/**ref của nội dung modal */
const modal_content_ref = ref<HTMLDivElement>()
/** Danh sách thành viên nhóm */
const list_members = ref<IGroupMember[]>([])
/** Danh sách thành viên gốc từ API */
const original_members = ref<IGroupMember[]>([])
/** Index của member đang được chọn */
const selected_member_index = ref(0)
/** Cache danh sách thành viên theo group_id */
const members_cache = ref<Record<string, IGroupMember[]>>({})
/** Cache trạng thái đang load theo group_id */
const loading_map = ref<Record<string, boolean>>({})
/** Lưu thông tin members đã chọn trong input hiện tại */
const selected_members_map = ref<Map<string, string>>(new Map())

/**id trang đang được chọn */
const page_id = computed(
  () => conversationStore.select_conversation?.fb_page_id
)
/**id nhóm */
const group_id = computed(
  () => conversationStore.select_conversation?.fb_client_id
)

/** Preload dữ liệu thành viên nhóm khi chọn conversation */
watch(
  () => conversationStore.select_conversation?.fb_client_id,
  new_group_id => {
    /** nếu là nhóm và chưa có cache thì preload */
    if (
      conversationStore.select_conversation?.is_group &&
      new_group_id &&
      !members_cache.value[new_group_id]
    ) {
      preloadGroupMembers()
    }
  },
  { immediate: true }
)

/** ẩn hiện modal */
function toggleModal(is_clear_input?: boolean) {
  /** thay đổi trạng thái hiển thị modal */
  commonStore.is_show_mention = !commonStore.is_show_mention

  /** modal mở hay tắt thì đều focus vào input chat */
  focusChat()

  /** nếu mở modal thì lấy dữ liệu */
  if (commonStore.is_show_mention) {
    changeModalPosition()
    /** lấy từ cache hoặc API */
    loadGroupMembers()
  }

  /**input chat */
  const INPUT_CHAT = document.getElementById('chat-text-input-message')

  /** nếu không có input chat thì thôi */
  if (!INPUT_CHAT) return

  /** xóa nội dung input nếu được yêu cầu */
  if (is_clear_input && INPUT_CHAT.innerText?.trim() === '@')
    $input_service.setInputText('')
}

/**thay đổi vị chí, kích thước của modal cho vừa với input chat */
async function changeModalPosition() {
  /** chờ vue render modal xong mới chạy */
  await new Promise(resolve => nextTick(() => resolve(undefined)))

  /**mục tiêu */
  const INPUT_CHAT_WARPER = document.getElementById('main_input_chat')

  /** nếu không có mục tiêu thì thôi */
  if (!INPUT_CHAT_WARPER || !modal_content_ref.value) return

  /** lấy vị trí, kích thước của mục tiêu */
  const { x, width } = INPUT_CHAT_WARPER.getBoundingClientRect()

  /** đặt độ rộng của modal bằng với mục tiêu */
  modal_content_ref.value.style.setProperty('width', `${width}px`)

  /** dịch chuyển modal đến vị trí mục tiêu */
  modal_content_ref.value.style.setProperty('left', `${x}px`)
}

/** Preload danh sách thành viên nhóm (gọi trước) */
async function preloadGroupMembers() {
  const current_page_id = page_id.value
  const current_group_id = group_id.value

  if (!current_page_id || !current_group_id) return

  /** nếu đã có cache thì thôi */
  if (members_cache.value[current_group_id]) return

  /** nếu đang load thì thôi */
  if (loading_map.value[current_group_id]) return

  loading_map.value[current_group_id] = true

  try {
    /**danh sách thành viên nhóm từ API */
    const GROUP_MEMBERS = await $api_zalo.getGroupMenbers(
      current_page_id,
      current_group_id
    )

    /** nếu không có thành viên thì lưu mảng rỗng */
    if (!GROUP_MEMBERS || !GROUP_MEMBERS.length) {
      members_cache.value[current_group_id] = []
      return
    }

    /** thêm option @all vào đầu danh sách */
    const ALL_OPTION: IGroupMember = {
      client_id: '-1',
      client_name: 'All' /** tên để insert vào input */,
      client_avatar: '',
    }

    /** lưu vào cache */
    members_cache.value[current_group_id] = [ALL_OPTION, ...GROUP_MEMBERS]
  } catch (error) {
    console.error('Error preloading group members:', error)
    /** lưu mảng rỗng vào cache để không gọi lại */
    if (current_group_id) {
      members_cache.value[current_group_id] = []
    }
  } finally {
    loading_map.value[current_group_id] = false
  }
}

/** Load danh sách thành viên từ cache hoặc API */
async function loadGroupMembers() {
  if (!group_id.value) {
    list_members.value = []
    original_members.value = []
    return
  }

  /** nếu có cache thì dùng cache */
  if (members_cache.value[group_id.value]) {
    original_members.value = [...members_cache.value[group_id.value]]
    list_members.value = [...original_members.value]
    setDefaultMember()
    return
  }

  /** nếu chưa có cache thì xóa list hiện tại và gọi API */
  list_members.value = []
  original_members.value = []
  await preloadGroupMembers()

  /** sau khi gọi API xong, load lại từ cache */
  if (group_id.value && members_cache.value[group_id.value]) {
    original_members.value = [...members_cache.value[group_id.value]]
    list_members.value = [...original_members.value]
    setDefaultMember()
  }
}

/** Lấy danh sách thành viên nhóm */
async function getGroupMembers() {
  await loadGroupMembers()
}

/** Tìm kiếm thành viên khi nhập trong input chat */
function searchMember(search_value?: string) {
  /** nếu không có giá trị tìm kiếm thì lấy lại danh sách ban đầu */
  if (!search_value) {
    list_members.value = [...original_members.value]
    setDefaultMember()
    return
  }

  /**giá trị tìm kiếm đã được xử lý */
  const SEARCH_VALUE = nonAccentVn(search_value)

  /** tìm kiếm trong danh sách gốc */
  list_members.value = original_members.value.filter(member =>
    nonAccentVn(member?.client_name || '')?.includes(SEARCH_VALUE)
  )

  /** tự động chọn member đầu tiên */
  setDefaultMember()
}

/**focus vào input chat */
function focusChat() {
  document.getElementById('chat-text-input-message')?.focus()
}

/**chọn thành viên */
function selectMember(member: IGroupMember) {
  /**input chat mục tiêu */
  const INPUT_CHAT = document.getElementById('chat-text-input-message')

  /** nếu không có nội dung thì thôi */
  if (!INPUT_CHAT) return

  /**nội dung hiện tại */
  let text = INPUT_CHAT.innerText

  /**vị trí của @ cuối cùng */
  const LAST_AT_INDEX = text.lastIndexOf('@')

  /**tên để hiển thị */
  const DISPLAY_NAME = member.client_name || 'Unknown'

  if (LAST_AT_INDEX !== -1) {
    /** thay thế từ @ cuối cùng đến hết bằng tên thành viên */
    text = text.substring(0, LAST_AT_INDEX) + `@${DISPLAY_NAME} `
  } else {
    text += `@${DISPLAY_NAME} `
  }

  /** gán giá trị vào input */
  $input_service.setInputText(text)

  /** lưu thông tin member đã chọn để dùng khi gửi tin nhắn */
  /** Map tên -> client_id */
  if (member.client_name && member.client_id) {
    selected_members_map.value.set(member.client_name, member.client_id)
  }

  /** tắt modal */
  commonStore.is_show_mention = false

  /** focus vào lại input chat */
  focusChat()
}

/** Lấy client_id từ tên member */
function getClientIdByName(name: string): string | undefined {
  return selected_members_map.value.get(name)
}

/** Xóa toàn bộ mapping khi clear input */
function clearMembersMap() {
  selected_members_map.value.clear()
}

/**lắng nghe sự thay đổi của input chat, để điều khiển hoạt động của modal */
function handleChatValue($event: KeyboardEvent) {
  /** nếu không phải là nhóm thì thôi */
  if (!conversationStore.select_conversation?.is_group) return

  /**phím người dùng nhấn */
  const KEY = $event.key
  /**nội dung chat */
  const INPUT_VALUE = ($event.target as HTMLDivElement)?.innerText

  /** nếu modal đã mở */
  if (commonStore.is_show_mention) {
    onModalShowed(KEY, INPUT_VALUE, $event)
  } else onModalHid(INPUT_VALUE)
  /** nếu modal chưa mở */
}

/**xử lý sự kiện khi modal đã hiển thị */
function onModalShowed(key: string, value: string, $event?: KeyboardEvent) {
  /**số lượng thành viên */
  const SIZE_LIST_MEMBERS = list_members.value?.length

  /** * bấm Esc thì tắt modal */
  if (key === 'Escape') return toggleModal()

  /** * bấm mũi tên xuống */
  if (key === 'ArrowDown') {
    /** ngăn chặn hành vi mặc định */
    $event?.preventDefault()

    /** nếu đã hết danh sách thì quay về đầu */
    if (selected_member_index.value >= SIZE_LIST_MEMBERS - 1) {
      selected_member_index.value = 0
    } else {
      /** tăng index lên 1 */
      selected_member_index.value++
    }

    /** scroll đến vị trí */
    return scrollIntoView(`member-${selected_member_index.value}`)
  }

  /** * bấm Mũi tên lên */
  if (key === 'ArrowUp') {
    /** ngăn chặn hành vi mặc định */
    $event?.preventDefault()

    /** nếu là đầu tiên thì chạy xuống cuối */
    if (selected_member_index.value <= 0) {
      selected_member_index.value = SIZE_LIST_MEMBERS - 1
    } else {
      /** giảm index xuống 1 */
      selected_member_index.value--
    }

    /** scroll đến vị trí */
    return scrollIntoView(`member-${selected_member_index.value}`)
  }

  /** bấm Enter thì chọn đang được select */
  if (key === 'Enter') {
    /** ngăn chặn hành vi xuống dòng và gửi tin nhắn */
    $event?.preventDefault()
    $event?.stopPropagation()
    return selectMember(list_members.value[selected_member_index.value])
  }

  /** nếu không có @ mà đang mở thì tắt modal */
  if (!value.includes('@')) return toggleModal()

  /** tìm kiếm nếu đang mở modal */
  if (value?.includes('@')) searchMember(last(value.split('@')))
}

/**xử lý sự kiện khi modal đã tắt / không hiển thị */
function onModalHid(value: string) {
  /** nếu gõ @ ở cuối câu mà chưa mở thì mở modal */
  if (!value.endsWith('@')) return

  /** mở modal */
  toggleModal()

  /** chọn member đầu tiên nếu có */
  setDefaultMember()
}

/**chọn mặc định */
function setDefaultMember() {
  /** nếu không có dữ liệu thì thôi */
  if (!list_members.value?.length) return

  /** tự động đặt vị trí thành đầu tiên */
  selected_member_index.value = 0
}

/**cuộn tới vị trí đang chọn */
function scrollIntoView(id: string) {
  // @ts-ignore
  document.getElementById(id)?.scrollIntoViewIfNeeded()
}

defineExpose({
  toggleModal,
  handleChatValue,
  getClientIdByName,
  clearMembersMap,
  selected_members_map,
})
</script>
```
