<template>
  <Dropdown
    ref="change_staff_dropdown_ref"
    @open_dropdown="onOpenDropdown()"
    :is_fit="false"
    width="350px"
    height="360px"
    :back="250"
  >
    <SearchStaff
      ref="search_ref"
      @search_staff="searchStaff"
    />
    <StaffItem
      @select_staff="assignConversationtoStaff"
      :staffs
      :select_staff_id="fb_staff_id"
    />
  </Dropdown>
</template>

<script setup lang="ts">
import { find, map, size, sortBy, without } from 'lodash'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  usePageStore,
  useConversationStore,
  useChatbotUserStore,
} from '@/stores'
import { set_assign_staff_conversation } from '@/service/api/chatbox/n4-service'
import { nonAccentVn } from '@/service/helper/format'
import { flow } from '@/service/helper/async'

import Dropdown from '@/components/Dropdown.vue'
import SearchStaff from '@/views/ChatWarper/Chat/CenterContent/ChangeStaff/SearchStaff.vue'
import StaffItem from '@/views/ChatWarper/Chat/CenterContent/ChangeStaff/StaffItem.vue'

import type { ComponentRef } from '@/service/interface/vue'
import type { StaffInfo } from '@/service/interface/app/staff'
import type { CbError } from '@/service/interface/function'

const $route = useRoute()
const pageStore = usePageStore()
const conversationStore = useConversationStore()

/**ref của dropdown */
const change_staff_dropdown_ref = ref<ComponentRef>()
/** Danh sách nhân viên */
const staffs = ref<StaffInfo[]>([])
/** Danh sách nhân viên */
const snap_staffs = ref<{ [index: string]: StaffInfo }>({})
/** Nhân viên được phân công phụ trách cuộc hội thoại */
const fb_staff_id = ref<string>('')
/** Tên nhân viên đang tìm kiếm */
const search_staff_name = ref<string>('')
/** ref của modal */
const search_ref = ref<ComponentRef>()

/**hiện thị */
function toggle($event: MouseEvent) {
  change_staff_dropdown_ref.value?.toggleDropdown($event)
}
/**tự động focus vào search trên pc */
function onOpenDropdown() {
  setTimeout(() => search_ref.value?.focus(), 50)

  getStaffsByPageId()
}
/** Lấy ra danh sách user theo page hiện tại đang chọn */
function getStaffsByPageId() {
  /** Xóa tên nhân viên đang tìm kiếm */
  search_staff_name.value = ''

  /** ID page hiện tại */
  const PAGE_ID = conversationStore.select_conversation?.fb_page_id

  /** Nếu không có page id thì dừng lại */
  if (!PAGE_ID) return

  /**danh sách nhân viên */
  const STAFFS = pageStore.selected_page_list_info?.[PAGE_ID]?.staff_list

  /** Nếu không có nhân viên thì dừng lại */
  if (!STAFFS || !size(STAFFS)) return

  /** Lưu lại danh sách nhân viên theo dạng object */
  snap_staffs.value = STAFFS

  /** Lưu lại danh sách nhân viên theo dạng mảng */
  staffs.value = map(STAFFS)

  /** * Lưu lại id nhân viên được phân phụ trách cuộc hội thoại */
  fb_staff_id.value =
    conversationStore.select_conversation?.user_id ||
    conversationStore.select_conversation?.fb_staff_id ||
    ''
  /** * Đưa nhân viên được assign lên đầu danh sách */
  pushStaffSelectedToTop()
}
/** Phân công cuộc trò chuyện cho nhân viên */
// function assignConversationtoStaff(staff: StaffInfo) {
//   // * Nếu data conversation không tồn tại thì dừng lại
//   if (!conversationStore.select_conversation) return

//   /** ID nhân viên mới */
//   const NEW_USER_ID = staff.user_id || staff.fb_staff_id
//   /** ID nhân viên cũ */
//   const OLD_USER_ID =
//     conversationStore.select_conversation?.user_id ||
//     conversationStore.select_conversation?.fb_staff_id

//   // * Nếu nhân viên đã được assign thì không chạy logic nữa
//   if (fb_staff_id.value === NEW_USER_ID) return

//   // * Lưu lại id nhân viên được phân phụ trách cuộc hội thoại
//   fb_staff_id.value = NEW_USER_ID

//   // * Đưa nhân viên được assign lên đầu danh sách
//   pushStaffSelectedToTop()

//   flow(
//     [
//       // * Gọi api để update nhân viên được assign
//       (cb: CbError) =>
//         set_assign_staff_conversation(
//           {
//             page_id: conversationStore.select_conversation
//               ?.fb_page_id as string,
//             client_id: conversationStore.select_conversation
//               ?.fb_client_id as string,
//             new_staff_id: NEW_USER_ID,
//             old_staff_id: OLD_USER_ID,
//           },
//           (e, r) => {
//             if (e) return cb(e)

//             cb()
//           }
//         ),
//       // * ẩn dropdown sau khi chạy xong
//       (cb: CbError) => {
//         change_staff_dropdown_ref.value?.immediatelyHide()

//         cb()
//       },
//     ],
//     undefined,
//     true
//   )
// }

function assignConversationtoStaff(staff: StaffInfo | null) {
  /** Nếu k có hội thoại được chọn thì return luôn */
  if (!conversationStore.select_conversation) return
  /** Khai báo conversation */
  const CONVERSATION = conversationStore.select_conversation
  /** Lấy data user trước khi change assign */
  const OLD_USER_ID = CONVERSATION.user_id || CONVERSATION.fb_staff_id

  /** ✅ Trường hợp gỡ phân công */
  if (!staff) {
    fb_staff_id.value = ''
    console.log('vao day')
    flow(
      [
        (cb: CbError) =>
          set_assign_staff_conversation(
            {
              page_id: CONVERSATION.fb_page_id,
              client_id: CONVERSATION.fb_client_id,
              new_staff_id: undefined,
              old_staff_id: OLD_USER_ID,
            },
            (e, r) => {
              if (e) return cb(e)
              /** Khi gỡ phân công thì reset lại user_id và fb_staff_id */
              if (conversationStore.select_conversation) {
                /** Reset lại user_id và fb_staff_id */
                conversationStore.select_conversation.user_id = undefined
                /** Reset lại fb_staff_id */
                conversationStore.select_conversation.fb_staff_id = undefined
              }
              /** Ẩn dropdown */
              change_staff_dropdown_ref.value?.immediatelyHide()
              cb()
            }
          ),
        (cb: CbError) => {
          /** Ẩn dropdown */
          change_staff_dropdown_ref.value?.immediatelyHide()
          cb()
        },
      ],
      undefined,
      true
    )
    return
  }
  /** Tìm User id cũ */
  const NEW_USER_ID = staff.user_id || staff.fb_staff_id
  /** Nếu trùng id thì return luôn */
  if (fb_staff_id.value === NEW_USER_ID) return
  /** Gán fb_staff_id = user Id mới */
  fb_staff_id.value = NEW_USER_ID
  /** Đẩy nhân viên được chọn lên đầu */
  pushStaffSelectedToTop()

  flow(
    [
      (cb: CbError) =>
        set_assign_staff_conversation(
          {
            page_id: CONVERSATION.fb_page_id,
            client_id: CONVERSATION.fb_client_id,
            new_staff_id: NEW_USER_ID,
            old_staff_id: OLD_USER_ID,
          },
          (e, r) => {
            if (e) return cb(e)
            cb()
          }
        ),
      (cb: CbError) => {
        change_staff_dropdown_ref.value?.immediatelyHide()
        cb()
      },
    ],
    undefined,
    true
  )
}

/**
 * Lọc hội thoại theo nhân viên
 * @param search nội dung tìm kiếm
 */
function searchStaff(search: string) {
  /** Nếu không có tên nhân viên thì hiển thị tất cả nhân viên */
  if (!search) return (staffs.value = map(snap_staffs.value))

  /** Lọc nhân viên theo tên */
  staffs.value = staffs.value?.filter(staff => {
    /**nội dung tìm kiếm */
    const SEARCH: string = nonAccentVn(search)
    /**tên nhân viên */
    const NAME: string = nonAccentVn(staff?.name)

    /** Nếu tên nhân viên chứa nội dung tìm kiếm thì hiển thị */
    return NAME.includes(SEARCH)
  })
}
/** Đưa nhân viên được assign lên đầu danh sách */
function pushStaffSelectedToTop() {
  /** Nếu không có nhân viên được assign thì dừng lại */
  if (!fb_staff_id.value) return

  /**nhân viên đang được assign */
  const TARGET = staffs.value?.find(findStaff)

  /** Nếu không có nhân viên được assign thì dừng lại */
  if (!TARGET) return

  /** chuyển nhân viên được assign lên đầu danh sách */
  staffs.value = [TARGET, ...staffs.value?.filter(staff => !findStaff(staff))]
}
/** Tìm nhân viên */
function findStaff(staff: StaffInfo) {
  /** tìm theo cả id cũ và id mới */
  return (
    staff?.user_id === fb_staff_id.value ||
    staff?.fb_staff_id === fb_staff_id.value
  )
}

defineExpose({ toggle })
</script>
