<template>
  <div class="flex-shrink-0 px-2 gap-1 flex justify-start items-center">
    <div
      v-tooltip.bottom="`v${version}`"
      class="font-semibold text-2xl truncate"
    >
      <template v-if="orgStore.selected_org_info?.org_info?.org_name">
        {{ orgStore.selected_org_info?.org_info?.org_name }}
      </template>
      <template v-else>
        {{ commonStore.partner?.name }}
      </template>
    </div>
    <!-- <Badge
      v-if="count_all_unread"
      :value="count_all_unread"
    /> -->
  </div>
  <div class="flex-shrink-0 flex items-center justify-between">
    <template v-if="!is_search">
      <div class="text-sm gap-3 flex items-center h-8">
        <button
          @click="$main.activeTab('CHAT')"
          :class="{
            'font-semibold border-b-2 border-black':
              !conversationStore.option_filter_page_data.conversation_type ||
              conversationStore.option_filter_page_data.conversation_type ===
                'CHAT',
          }"
          class="h-full flex gap-1 items-center"
        >
          <p>{{ $t('Chat') }}</p>
          <p
            v-if="conversationStore.count_conversation?.chat"
            class="rounded-full bg-slate-200 text-slate-700 font-medium text-xxs px-1 leading-[14px] max-w-20 truncate"
          >
            {{ currency(conversationStore.count_conversation.chat) }}
          </p>
        </button>
        <button
          @click="$main.activeTab('POST')"
          :class="{
            'font-semibold border-b-2 border-black':
              conversationStore.option_filter_page_data.conversation_type ===
              'POST',
          }"
          class="h-full flex gap-1 items-center"
        >
          <p>{{ $t('Bài viết') }}</p>
          <p
            v-if="conversationStore.count_conversation?.post"
            class="rounded-full bg-slate-200 text-slate-700 font-medium text-xxs px-1 leading-[14px] max-w-20 truncate"
          >
            {{ currency(conversationStore.count_conversation.post) }}
          </p>
        </button>
      </div>
      <div class="flex gap-3 text-slate-500">
        <button
          v-show="
            conversationStore.select_conversation?.platform_type?.includes(
              'ZALO'
            )
          "
          class="p-2 bg-slate-100 rounded-full"
          @click="
            () => {
              modal_zalo_create_group_ref?.toggleModal()
              message_data = undefined
            }
          "
          v-tooltip="$t('v1.common.create_new_group')"
        >
          <UserGroupIcon class="size-4 flex-shrink-0" />
        </button>
        <button
          class="p-2 bg-slate-100 rounded-full"
          @click="
            () => {
              modal_zalo_personal_ref?.toggleModal()
              message_data = undefined
            }
          "
          v-tooltip="$t('v1.common.add_customer')"
        >
          <UserPlusIcon class="size-4 flex-shrink-0" />
        </button>
        <button
          @click="$main.toggleSearch()"
          class="w-8 h-8 bg-slate-100 rounded-full flex justify-center items-center"
          v-tooltip="$t('v1.common.search')"
        >
          <SearchIcon class="w-4 h-4" />
        </button>
      </div>
    </template>
    <div
      v-else
      class="relative w-full"
    >
      <SearchIcon
        class="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-slate-500"
      />
      <input
        v-model="search_conversation"
        @blur="$main.toggleSearch()"
        ref="ref_search_conversation"
        class="w-full bg-slate-100 placeholder-slate-500 py-1.5 pl-9 pr-8 text-sm rounded-full"
        type="text"
        :placeholder="$t('v1.common.search')"
      />
      <XCircleIcon
        @click="search_conversation = undefined"
        v-if="search_conversation"
        class="absolute top-1/2 right-2 -translate-y-1/2 size-5 text-red-500 cursor-pointer"
      />
    </div>
  </div>
  <div
    v-if="isFilterActive()"
    class="bg-slate-100 rounded-lg py-1.5 px-2 text-xs flex gap-2 items-center"
    :class="{
      hidden: conversationStore.selected_quick_filter !== 'ALL',
    }"
  >
    <div class="flex gap-2 w-full min-w-0">
      <FunnelIcon class="w-3.5 h-3.5 flex-shrink-0" />
      <p class="truncate">{{ filter }}</p>
    </div>
    <button @click="$filter_service.clearAllFilter()">
      <XMarkIcon class="w-3.5 h-3.5 flex-shrink-0" />
    </button>
  </div>
  <!-- <QuickFilter /> -->
</template>
<script setup lang="ts">
import { isFilterActive } from '@/service/function'
import { currency } from '@/service/helper/format'
import {
  useCommonStore,
  useConversationStore,
  useMessageStore,
  useOrgStore,
  usePageStore,
} from '@/stores'
import { FilterService } from '@/utils/helper/Filter'
import { format } from 'date-fns'
import { debounce, map } from 'lodash'
import { container } from 'tsyringe'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import QuickFilter from '@/views/ChatWarper/Chat/LeftBar/Header/QuickFilter.vue'

import SearchIcon from '@/components/Icons/Search.vue'
import {
  FunnelIcon,
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { XCircleIcon } from '@heroicons/vue/24/solid'

import type { ILabel } from '@/service/interface/app/label'
import type { StaffInfo } from '@/service/interface/app/staff'
import { storeToRefs } from 'pinia'

/**tab đang kích hoạt */
type IActiveTab = 'CHAT' | 'POST'

const conversationStore = useConversationStore()
const commonStore = useCommonStore()
const pageStore = usePageStore()
const orgStore = useOrgStore()
const { t: $t } = useI18n()

const { modal_zalo_personal_ref, message_data, modal_zalo_create_group_ref } =
  storeToRefs(useMessageStore())

/** router */
const $router = useRouter()

const $filter_service = container.resolve(FilterService)

/**phiên bản trong package.json */
const version = npm_package_version
/**giá trị của ô tìm kiếm hội thoại */
const search_conversation = ref<string>()
/**trạng thái tìm kiếm */
const is_search = ref<boolean>(
  !!conversationStore.option_filter_page_data.search
)
/**tham chiếu đến ô tìm kiếm */
const ref_search_conversation = ref<HTMLInputElement>()

/**delay tìm kiếm hội thoại */
const onSearchConversation = debounce((value?: string) => {
  // lưu giá trị search vào biến
  conversationStore.option_filter_page_data.search = value
}, 300)

/** dữ liệu lọc thể hiện ra dạng chuỗi */
const filter = computed(() => {
  /** dữ liệu lọc chung */
  const FILTER_GENERAL: string[] = []
  /** lọc gắn nhãn */
  const FILTER_TAG: string[] = []
  /** lọc trừ nhãn */
  const FILTER_NOT_TAG: string[] = []
  /** lọc thời gian */
  const FITLER_TIME: string[] = []
  /** lọc nhân sự */
  const FILTER_STAFF: string[] = []

  /** nếu là lọc tương tác từ tin nhắn */
  if (conversationStore.option_filter_page_data.display_style === 'INBOX') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.interact.message')
    )
  }
  /** nếu là lọc tương tác từ bình luận */
  if (conversationStore.option_filter_page_data.display_style === 'COMMENT') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.interact.comment')
    )
  }
  /** nếu là lọc tương tác từ bạn bè */
  if (conversationStore.option_filter_page_data.display_style === 'FRIEND') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.interact.friend')
    )
  }
  /** nếu là lọc tương tác từ nhóm */
  if (conversationStore.option_filter_page_data.display_style === 'GROUP') {
    FILTER_GENERAL.push($t('v1.view.main.dashboard.chat.filter.interact.group'))
  }

  /** nếu là lọc chưa đọc */
  if (conversationStore.option_filter_page_data.unread_message === 'true') {
    FILTER_GENERAL.push($t('v1.view.main.dashboard.chat.filter.message.unread'))
  }
  /** nếu là lọc chưa phản hồi */
  if (
    conversationStore.option_filter_page_data.not_response_client === 'true'
  ) {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.message.not_reply')
    )
  }
  /** nếu là lọc tin nhắn chứa gắn nhãn */
  if (conversationStore.option_filter_page_data.not_exist_label === 'true') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.message.not_tag')
    )
  }
  /** nếu là lọc tin nhắn spam */
  if (conversationStore.option_filter_page_data.is_spam_fb === 'YES') {
    FILTER_GENERAL.push($t('v1.view.main.dashboard.chat.filter.message.spam'))
  }
  /** nếu là lọc có số điện thoại */
  if (conversationStore.option_filter_page_data.have_phone === 'YES') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.phone.include_phone')
    )
  }
  /** nếu là lọc không có số điện thoại */
  if (conversationStore.option_filter_page_data.have_phone === 'NO') {
    FILTER_GENERAL.push(
      $t('v1.view.main.dashboard.chat.filter.phone.exclude_phone')
    )
  }
  /** nếu là lọc ngày */
  if (conversationStore.option_filter_page_data.time_range) {
    /** thời điểm bắt đầu lọc */
    const START = conversationStore.option_filter_page_data?.time_range?.gte
    /** thời điểm kết thúc lọc */
    const END = conversationStore.option_filter_page_data?.time_range?.lte

    // nếu có thì mới thêm vào
    if (START && END) {
      FITLER_TIME.push(
        `${format(START, 'HH:mm, dd/MM/yyyy')} - ${format(
          END,
          'HH:mm, dd/MM/yyyy'
        )}`
      )
    }
  }
  /** nếu là lọc nhãn */
  if (conversationStore.option_filter_page_data.label_id?.length) {
    /** danh sách các tiêu đề nhãn đã chọn */
    const TITLE_TAGS = conversationStore.option_filter_page_data.label_id?.map(
      id => tags.value?.[id]?.title || ''
    )

    FILTER_TAG.push(...TITLE_TAGS)
  }
  /** nếu là lọc trừ nhãn */
  if (conversationStore.option_filter_page_data.not_label_id?.length) {
    /** danh sách các tiêu đề nhãn trừ nhãn */
    const TITLE_NOT_TAGS =
      conversationStore.option_filter_page_data.not_label_id?.map(
        id => tags.value?.[id]?.title || ''
      )

    FILTER_NOT_TAG.push(...TITLE_NOT_TAGS)
  }
  /** nếu là lọc nhân sự */
  if (conversationStore.option_filter_page_data.staff_id?.length) {
    /** danh sách tên các nhân sự được lọc */
    const STAFF_NAMES = conversationStore.option_filter_page_data.staff_id?.map(
      id => staffs.value?.[id]?.name || ''
    )

    FILTER_STAFF.push(...STAFF_NAMES)
  }

  /** nội dung của các bộ lọc */
  const RESULT: string[] = []
  // thêm nội dung lọc chung
  addContent(
    RESULT,
    FILTER_GENERAL,
    $t('v1.view.main.dashboard.chat.filter.post.filter')
  )
  // thêm nội dung lọc nhãn
  addContent(RESULT, FILTER_TAG, $t('Nhãn'))
  // thêm nội dung lọc trừ nhãn
  addContent(RESULT, FILTER_NOT_TAG, $t('Trừ nhãn'))
  // thêm nội dung lọc thời gian
  addContent(RESULT, FITLER_TIME, $t('Thời gian'))
  // thêm nội dung lọc nhân sự
  addContent(RESULT, FILTER_STAFF, $t('Nhân viên'))
  // thêm lọc bài viết
  if (conversationStore.option_filter_page_data.post_id) {
    RESULT.push($t('Lọc bài viết'))
  }
  return RESULT.join(', ')
})

/** danh sách nhãn của các trang đã chọn */
const tags = computed(() => {
  /** các nhãn lưu dưới dạng hash table */
  let tags: Record<string, ILabel> = {}

  // lặp qua các trang được chọn để gộp các nhãn của các trang lại 1 danh sách
  map(pageStore.selected_page_list_info, item => {
    tags = { ...tags, ...item.label_list }
  })

  return tags
})

/** danh sách các nhân sự của các trang đã chọn */
const staffs = computed(() => {
  /** các nhãn lưu dưới dạng hash table */
  let staffs: Record<string, StaffInfo> = {}

  // lặp qua các trang được chọn để gộp các nhãn của các trang lại 1 danh sách
  map(pageStore.selected_page_list_info, item => {
    staffs = { ...staffs, ...item.staff_list }
  })

  return staffs
})

function addContent(result: string[], content: string[], title: string) {
  // nếu không có thì thôi
  if (!content.length) return
  // nếu có thì thêm vào kết quả
  result.push(`${title}: ${content.join(', ')}`)
}

// theo dõi giá trị ô tìm kiếm
watch(() => search_conversation.value, onSearchConversation)

// läng nghe trạng thái của phím tắt
watch(
  () => commonStore.keyboard_shortcut,
  value => {
    // nếu không phải tìm kiếm thì bỏ qua
    if (value !== 'search_conversation') return

    // nếu chưa search thì bật chế độ search
    if (!is_search.value) $main.toggleSearch()
    // nếu đã có search rồi thi focus vào ô tìm kiếm
    else ref_search_conversation.value?.focus()

    // clear data
    commonStore.keyboard_shortcut = ''
  }
)

class Main {
  /**chuyển đổi tab đang kích hoạt */
  activeTab(tab: IActiveTab) {
    // thay đổi cờ
    conversationStore.option_filter_page_data.conversation_type = tab

    // nếu tab là dạng bài biết thì thêm param lên url
    $router.push({
      query: {
        ...$router.currentRoute.value.query,
        tab: tab === 'POST' ? 'POST' : undefined,
      },
    })
  }
  /**chuyển đổi trạng thái tìm kiếm */
  async toggleSearch() {
    // nếu đang tìm kiếm và có giá trị ô tìm kiếm thì không cho đóng ô tìm kiếm
    if (is_search.value && search_conversation.value) return

    // toggle trạng thái tìm kiếm
    is_search.value = !is_search.value

    // nếu là mở ô tìm kiếm
    if (is_search.value) {
      // chờ render xong
      await nextTick()

      // focus vào ô tìm kiếm
      ref_search_conversation.value?.focus()
    }
  }
}
const $main = new Main()

onMounted(() => {
  if (conversationStore.option_filter_page_data.search) {
    // load giá trị search được lưu từ local vào biến khi load lại trang
    search_conversation.value = conversationStore.option_filter_page_data.search
  }
})
</script>
