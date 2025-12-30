<template>
  <Dropdown
    ref="client_menu_ref"
    width="349px"
    height="auto"
    :is_fit="false"
    position="BOTTOM"
    :back="309"
    :distance="9"
    class_content="flex flex-col gap-1"
  >
    <MenuItem
      @click="openClientInfo"
      :icon="UserIcon"
      :title="$t('v1.view.main.dashboard.chat.client.title')"
    />
    <template v-if="uid">
      <MenuItem
        v-if="
          conversationStore.select_conversation?.platform_type === 'FB_MESS'
        "
        @click="openPageInbox"
        :icon="InboxIcon"
        :title="$t('v1.view.main.dashboard.chat.action.open_inbox')"
      >
        <NewTabIcon class="w-4 h-4 text-gray-500" />
      </MenuItem>
      <MenuItem
        v-if="
          conversationStore.select_conversation?.platform_type === 'FB_MESS'
        "
        @click="openFbProfile"
        :icon="FacebookIcon"
        class_icon="size-4"
        :title="$t('v1.view.main.dashboard.chat.action.open_facebook')"
      >
        <NewTabIcon class="w-4 h-4 text-gray-500" />
      </MenuItem>
      <MenuItem
        v-if="conversationStore.select_conversation?.platform_type === 'TIKTOK'"
        @click="openTiktokProfile"
        :icon="TiktokIcon"
        class_icon="size-4"
        :title="$t('v1.view.main.dashboard.chat.action.open_tiktok')"
      >
        <NewTabIcon class="w-4 h-4 text-gray-500" />
      </MenuItem>
      <hr class="my-1" />
    </template>
    <MenuItem
      @click="toggleSpam"
      :icon="MinusIcon"
      :title="
        conversationStore.select_conversation?.is_spam_fb
          ? $t('v1.view.main.dashboard.chat.action.alow_user')
          : $t('v1.view.main.dashboard.chat.action.block_user')
      "
      :class_icon="'text-red-500 size-5'"
      class="text-red-500"
    >
      <Loading
        v-if="is_loading_spam_conversation"
        :size="16"
      />
    </MenuItem>
  </Dropdown>
  <ClientInfo ref="client_info_modal_ref" />
</template>
<script setup lang="ts">
import { toggle_spam_conversation } from '@/service/api/chatbox/n4-service'
import { openNewTab } from '@/service/function'
import { flow } from '@/service/helper/async'
import { useConversationStore } from '@/stores'
import { keyBy, map } from 'lodash'
import { computed, ref, watch } from 'vue'

import Dropdown from '@/components/Dropdown.vue'
import Loading from '@/components/Loading.vue'
import MenuItem from '@/components/Main/Dashboard/MenuItem.vue'
import ClientInfo from '@/views/ChatWarper/Chat/CenterContent/UserInfo/ClientInfo.vue'

import FacebookIcon from '@/components/Icons/Facebook.vue'
import TiktokIcon from '@/components/Icons/Tiktok.vue'
import InboxIcon from '@/components/Icons/Inbox.vue'
import MinusIcon from '@/components/Icons/Minus.vue'
import NewTabIcon from '@/components/Icons/NewTab.vue'
import UserIcon from '@/components/Icons/User.vue'

import type { CbError } from '@/service/interface/function'

const conversationStore = useConversationStore()

/**ref của dropdown menu của khách hàng */
const client_menu_ref = ref<InstanceType<typeof Dropdown>>()
/**ref của modal thông tin khách hàng */
const client_info_modal_ref = ref<InstanceType<typeof ClientInfo>>()
/**bật loading khi gọi api toggle spam */
const is_loading_spam_conversation = ref(false)
/**vị trí của hội thoại vừa mới được ẩn */
const index_of_spam_conversation = ref(0)

/**uid của khách */
const uid = computed(
  () => conversationStore.select_conversation?.client_bio?.fb_uid
)

/**ẩn hiện dropdown menu của khách hàng */
function toggle($event?: MouseEvent) {
  client_menu_ref.value?.toggleDropdown($event)
}
/**mở popup thông tin chi tiết của khách hàng */
function openClientInfo() {
  client_info_modal_ref.value?.toggleModal()
}
/**toggle hội thoại này là spam */
function toggleSpam() {
  /** api đang chạy thì không cho gọi */
  if (is_loading_spam_conversation.value) return

  /**giá trị spam mới */
  const NEW_IS_SPAM = !conversationStore.select_conversation?.is_spam_fb

  flow(
    [
      /** * bật loading */
      (cb: CbError) => {
        is_loading_spam_conversation.value = true

        cb()
      },
      /** * gọi api */
      (cb: CbError) =>
        toggle_spam_conversation(
          {
            page_id: conversationStore.select_conversation
              ?.fb_page_id as string,
            client_id: conversationStore.select_conversation
              ?.fb_client_id as string,
            is_spam: NEW_IS_SPAM,
          },
          (e, r) => {
            if (e) return cb(e)

            cb()
          }
        ),
      /** * di chuyển hội thoại ra khỏi danh sách nếu cần thiết */
      (cb: CbError) => {
        if (!conversationStore.select_conversation) return

        /**key của hội thoại */
        const KEY = conversationStore.select_conversation?.data_key

        if (!KEY) return cb()

        /** thay đổi cờ của conversation đang chọn */
        conversationStore.select_conversation.is_spam_fb = NEW_IS_SPAM

        /** nếu trong danh sách đang tồn tại hội thoại thì xoá đi */
        if (conversationStore.conversation_list[KEY]) {
          /** lấy vị trí trước khi bị ẩn */
          index_of_spam_conversation.value = Object.keys(
            conversationStore.conversation_list
          ).indexOf(KEY)

          /** xoá khỏi danh sách */
          delete conversationStore.conversation_list[KEY]
        } else {
          /** nếu trong danh sách không tồn tại hội thoại thì hiện lên */
          // đổi danh sách hội thoại thành mảng
          // let conversation_array = map(conversationStore.conversation_list)
          // // thêm phần tử bị xoá vào đúng vị trí cũ của mảng
          // conversation_array.splice(
          //   index_of_spam_conversation.value,
          //   0,
          //   conversationStore.select_conversation
          // )
          // // biến đổi mảng thành obj
          // conversationStore.conversation_list = keyBy(
          //   conversation_array,
          //   'data_key'
          // )
        }

        cb()
      },
    ],
    e => {
      // tắt loading
      is_loading_spam_conversation.value = false
    }
  )
}
/**mở fb của khách */
function openFbProfile() {
  /** nếu có uid thì mở fb của khách */
  if (uid.value) openNewTab(`https://fb.com/${uid.value}`)
  /** chạy qua ext -> click vào btn tạo ở file index.html */ else
    (
      document.getElementsByClassName(
        'open-fb-profile'
      )?.[0] as HTMLButtonElement
    )?.click()
}
/**mở tiktok của khách */
function openTiktokProfile() {
  /** nếu có uid thì mở tiktok của khách */
  if (uid.value) openNewTab(`https://tiktok.com/@${uid.value}`)
  /** chạy qua ext -> click vào btn tạo ở file index.html */ else
    (
      document.getElementsByClassName(
        'open-tiktok-profile'
      )?.[0] as HTMLButtonElement
    )?.click()
}
/**mở inbox chat page */
function openPageInbox() {
  /** nếu có uid thì mở fb của khách */
  if (uid.value)
    openNewTab(
      `https://business.facebook.com/latest/inbox/all?selected_item_id=${uid.value}&asset_id=${conversationStore.select_conversation?.fb_page_id}&mailbox_id=&thread_type=FB_MESSAGE`
    )
  /** chạy qua ext -> click vào btn tạo ở file index.html */ else
    (
      document.getElementsByClassName(
        'open-fb-inbox-page'
      )?.[0] as HTMLButtonElement
    )?.click()
}

defineExpose({ toggle, openClientInfo, toggleSpam })
</script>
