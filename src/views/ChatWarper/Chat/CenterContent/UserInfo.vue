<template>
  <div
    v-if="conversationStore.select_conversation"
    id="chat__user-info"
    class="bg-white rounded-t-lg flex-shrink-0 py-2 px-3 flex justify-between gap-3"
  >
    <div class="flex items-center gap-2.5 flex-grow min-w-0">
      <div class="relative">
        <BlingEffect
          @click="clickAvatar()"
          :show_effect="isFindUid()"
          class="rounded-oval w-10 h-10"
        >
          <ClientAvatar
            :conversation="conversationStore.select_conversation"
            class="w-10 h-10 flex-shrink-0 cursor-pointer"
          />
        </BlingEffect>
        <span
          v-if="conversationStore.select_conversation?.has_new_info_from_ext"
          class="w-2 h-2 absolute top-0 left-0 bg-red-500 rounded-full badge-pulse"
        ></span>
      </div>

      <div class="min-w-0">
        <div
          @click="
            $clipboard.copy(
              conversationStore.select_conversation?.client_name || ''
            )
          "
          class="text-sm font-medium truncate cursor-copy"
        >
          {{ conversationStore.select_conversation?.client_name || 'No name' }}
        </div>
        <div
          v-if="
            conversationStore.select_conversation?.conversation_type === 'POST'
          "
          @click="
            $clipboard.copy(conversationStore.select_conversation?.fb_client_id)
          "
          class="text-xs text-slate-500 cursor-copy"
        >
          {{ $t('ID:') }}
          {{ conversationStore.select_conversation?.fb_client_id }}
        </div>
        <div
          v-else
          class="flex items-center gap-2"
        >
          <button
            v-tooltip.bottom="
              $t('v1.view.main.dashboard.chat.assign_staff.title')
            "
            :tooltip-disabled="!is_admin"
            @click="$main.openAssignStaff"
            :class="is_admin ? '' : 'cursor-not-allowed'"
            class="text-xs text-slate-500 flex items-center gap-1 min-w-0"
          >
            <div
              v-if="conversationStore.getAssignStaff()?.name?.trim()"
              class="truncate"
            >
              {{ conversationStore.getAssignStaff()?.name }}
            </div>
            <div v-else>
              {{ $t('v1.view.main.dashboard.chat.assign_staff.title') }}
            </div>
            <ArrowDownIcon
              v-if="is_admin"
              class="w-2.5 h-2.5 flex-shrink-0"
            />
          </button>
          <IconInfo />
        </div>
      </div>
    </div>
    <div
      v-if="conversationStore.select_conversation?.conversation_type !== 'POST'"
      class="flex items-center flex-shrink-0 gap-3.5"
    >
      <ChatbotStatus v-if="conversationStore.getPage()?.is_active_ai_agent" />
      <!--  -->
      <button
        v-if="orgStore.selected_org_info?.org_package?.org_allow_message_action"
        @click="toggleListPhone"
        v-tooltip.left="$t('Gọi điện thoại')"
        class="p-1.5 flex justify-center items-center rounded-lg border border-green-600 bg-green-100"
      >
        <PhoneIcon class="size-3.5 text-green-600"></PhoneIcon>
      </button>
      <!-- <button  @click="phone_list_ref?.toggle" v-tooltip.left="$t('v1.view.main.dashboard.chat.action.mark_call')"  class="p-1.5 flex justify-center items-center rounded-lg border border-green-600 bg-green-100">
        <PhoneIcon class="w-3.5 h-3.5 text-green-600"></PhoneIcon>
      </button> -->
      <!--  -->
      <button
        v-if="conversationStore.select_conversation?.is_group === true"
        @click="member_list_ref?.toggle"
        v-tooltip.left="$t('Thành viên nhóm')"
        class="p-1.5 flex justify-center items-center rounded-lg border border-slate-500 hover:bg-slate-100"
      >
        <UsersIcon class="size-3.5 text-slate-500"></UsersIcon>
      </button>
      <!--  -->
      <button
        @click="$main.unreadConversation"
        v-tooltip.left="$t('v1.view.main.dashboard.chat.action.mark_unread')"
        class="text-slate-500 border border-slate-500 p-1.5 rounded-lg hover:bg-slate-100"
      >
        <Loading
          v-if="is_loading_unread_conversation"
          :size="14"
        />
        <MailOpenIcon
          v-else
          class="size-3.5"
        />
      </button>
      <button
        v-tooltip.bottom="$t('v1.common.more')"
        @click="client_menu_ref?.toggle"
        class="text-slate-500 border border-slate-500 p-1.5 rounded-lg hover:bg-slate-100"
      >
        <DotIcon class="size-3.5" />
      </button>
    </div>
  </div>
  <Menu ref="client_menu_ref" />
  <ListPhone ref="phone_list_ref" />
  <Member
    ref="member_list_ref"
    @add-member="openAddZaloModal"
  />
  <ChangeStaff ref="change_staff_ref" />
  <ZaloAddMember ref="modal_zalo_add_member_ref" />
</template>
<script setup lang="ts">
import {
  useCommonStore,
  useConversationStore,
  useExtensionStore,
  useMessageStore,
  useOrgStore,
} from '@/stores'
import { N4SerivceAppOneConversation } from '@/utils/api/N4Service/Conversation'
import { Toast } from '@/utils/helper/Alert/Toast'
import { Clipboard } from '@/utils/helper/Clipboard'
import { container } from 'tsyringe'
import { computed, ref, watch } from 'vue'

import ClientAvatar from '@/components/Avatar/ClientAvatar.vue'
import BlingEffect from '@/components/BlingEffect.vue'
import Loading from '@/components/Loading.vue'
import ChangeStaff from '@/views/ChatWarper/Chat/CenterContent/ChangeStaff/ChangeStaff.vue'
import ChatbotStatus from '@/views/ChatWarper/Chat/CenterContent/UserInfo/ChatbotStatus.vue'
import IconInfo from '@/views/ChatWarper/Chat/CenterContent/UserInfo/IconInfo.vue'
import ListPhone from '@/views/ChatWarper/Chat/CenterContent/UserInfo/ListPhone.vue'
import Member from '@/views/ChatWarper/Chat/CenterContent/UserInfo/Member.vue'
import Menu from '@/views/ChatWarper/Chat/CenterContent/UserInfo/Menu.vue'

/**Icon*/
import ArrowDownIcon from '@/components/Icons/ArrowDown.vue'
import DotIcon from '@/components/Icons/Dot.vue'
import MailOpenIcon from '@/components/Icons/MailOpen.vue'
import { selectConversation } from '@/service/function'
import { error } from '@/utils/decorator/Error'
import { loading } from '@/utils/decorator/Loading'
import { UsersIcon } from '@heroicons/vue/24/outline'
import { PhoneIcon } from '@heroicons/vue/24/solid'
import ZaloAddMember from './MessageList/MessageItem/PhoneAction/ZaloAddMember.vue'
import { storeToRefs } from 'pinia'

const $emit = defineEmits(['toggle_change_assign_staff'])

const orgStore = useOrgStore()
const commonStore = useCommonStore()
const conversationStore = useConversationStore()
const extensionStore = useExtensionStore()
const $clipboard = container.resolve(Clipboard)
const $toast = container.resolve(Toast)

/**ref của dropdown menu của khách hàng */
const client_menu_ref = ref<InstanceType<typeof Menu>>()
/**ref của dropdown danh sách cuộc gọi của nhóm */
const phone_list_ref = ref<InstanceType<typeof ListPhone>>()
/**ref của dropdown danh sách thành viên nhóm */
const member_list_ref = ref<InstanceType<typeof Member>>()
/**modal assign nhân viên */
const change_staff_ref = ref<InstanceType<typeof ChangeStaff>>()
/**bật loading khi gọi api đánh dấu hội thoại chưa đọc */
const is_loading_unread_conversation = ref(false)
/** trạng thái của tài khoản hiện tại có phải là admin hay ko? */
const is_admin = computed(() => conversationStore.isCurrentStaffAdmin())

const { modal_zalo_add_member_ref } = storeToRefs(useMessageStore())

const openAddZaloModal = () => {
  console.log('modal add member to group')
  // mở modal Add Zalo
  // isAddZaloModalOpen.value = true
  modal_zalo_add_member_ref?.value?.toggleModal()
}

/** lắng nghe trạng thái của phím tắt */
watch(
  () => commonStore.keyboard_shortcut,
  value => {
    /** xem thông tin người dùng */
    const IS_VIEW_CLIENT_INFO = value === 'view_client_info'
    /** toggle trạng thái đọc */
    const IS_TOGGLE_UNREAD = value === 'toggle_unread'
    /** toggle block người dùng */
    const IS_TOGGLE_BLOCK_USER = value === 'toggle_block_user'

    /** nếu không phải các hành động thực hiện trong module thì thôi */
    if (!IS_VIEW_CLIENT_INFO && !IS_TOGGLE_UNREAD && !IS_TOGGLE_BLOCK_USER)
      return

    /** nếu là xem thông tin */
    if (IS_VIEW_CLIENT_INFO) client_menu_ref.value?.openClientInfo()

    /** nếu là toggle trạng thái đọc */
    if (IS_TOGGLE_UNREAD) {
      /** hội thoại được chọn */
      const SELECTED = conversationStore.select_conversation

      /** danh sách hội thoại */
      const CONVERSATION_LIST = conversationStore.conversation_list

      /** nếu là đã đọc */
      if (!SELECTED?.is_force_unread) {
        /** gọi api đánh dấu hội thoại chưa đọc */
        $main.unreadConversation()
      } else {
        /** nếu là chưa đọc */
        /** id của hội thoại đang chọn */
        const KEY = SELECTED?.data_key || ''

        /** chọn lại hội thoại này */
        selectConversation(CONVERSATION_LIST?.[KEY])
      }
    }

    /** nếu là toggle block người dùng */
    if (IS_TOGGLE_BLOCK_USER) {
      /** gọi api block người dùng */
      client_menu_ref.value?.toggleSpam()
    }

    /** clear data */
    commonStore.keyboard_shortcut = ''
  }
)

/**class chính */
class Main {
  /**mở modal thay đổi assign nhân viên */
  openAssignStaff($event: MouseEvent) {
    /** Nếu tài khoản hiện tại không phải admin thì ko cho assign nhân viên */
    if (!is_admin.value) return

    /** Mở modal */
    change_staff_ref.value?.toggle($event)
  }

  @loading(is_loading_unread_conversation)
  @error($toast)
  /**đánh dấu hội thoại này là chưa đọc */
  async unreadConversation() {
    /** nếu không có hội thoại nào đang chọn thì thoát */
    if (!conversationStore.select_conversation) return

    /** * gắn cờ hội thoại chưa đọc, để không bị conflig vào code hiện thị */
    conversationStore.select_conversation.is_force_unread = true

    /** gọi api đánh dấu hội thoại chưa đọc */
    await new N4SerivceAppOneConversation(
      conversationStore.select_conversation.fb_page_id,
      conversationStore.select_conversation.fb_client_id
    ).resetRead(1)
  }
}

/** Hàm mở danh sách điện thoại khi người dùng click */
function toggleListPhone(event: MouseEvent) {
  /** Gọi phương thức toggle() trên component được tham chiếu bằng phone_list_ref */
  /** Nếu component tồn tại, truyền vào MouseEvent để xử lý tương tác */
  phone_list_ref.value?.toggle(event)
}

/**kiểm tra xem có đang tìm uid không */
function isFindUid() {
  /** nếu không có key thì dừng */
  if (!conversationStore.select_conversation?.data_key) return false

  /** trả về trạng thái tìm uid */
  return extensionStore.is_find_uid[
    conversationStore.select_conversation?.data_key
  ]
}

/** click vào avatar */
function clickAvatar() {
  /** nếu đang có dữ liệu của khách hàng nhận được từ ext */
  if (conversationStore.select_conversation?.has_new_info_from_ext) {
    conversationStore.select_conversation.has_new_info_from_ext = false
  }
  /** mở modal xem thông tin người dùng */
  client_menu_ref.value?.openClientInfo()
}

const $main = new Main()
</script>

<style scoped>
.badge-pulse:after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-width: 1px;
  border-style: solid;
  border-color: #ef4444;
  border-radius: 50%;
  animation: pulse-scale 2s ease-in-out infinite;
  will-change: transform, opacity;
  content: '';
}

@keyframes pulse-scale {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.7);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}
</style>
