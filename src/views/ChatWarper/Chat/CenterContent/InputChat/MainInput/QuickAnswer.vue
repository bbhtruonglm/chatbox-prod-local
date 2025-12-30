<template>
  <SlashQuareIcon
    id="chat__quick-answer__btn"
    v-if="!isVisibleSendBtn?.()"
    v-tooltip="$t('v1.view.main.dashboard.chat.action.open_quick_anwser')"
    @click="clickBtnOpenQuickAnswer"
    class="text-slate-400 w-5 h-5 cursor-pointer my-1.5 flex-shrink-0"
  />

  <Teleport
    to="body"
    v-if="commonStore.is_show_quick_answer"
  >
    <div
      id="chat__quick-answer__modal"
      v-show="list_answer?.length"
      @click="toggleModal(true)"
      class="absolute top-0 left-0 w-screen h-screen z-20"
    >
      <div
        ref="modal_content_ref"
        @click.stop
        class="bg-white absolute shadow-lg rounded-xl h-[408px] overflow-hidden flex flex-col py-1 px-3 gap-1 bottom-[73px]"
      >
        <div
          v-if="is_loading"
          class="absolute left-1/2 -translate-x-1/2"
        >
          <Loading />
        </div>
        <div class="flex justify-between py-1 flex-shrink-0 text-sm border-b">
          <div class="font-semibold">
            {{ $t('v1.view.main.dashboard.chat.quick_answer.enter') }}
          </div>
          <div class="text-gray-500 flex items-center gap-3">
            {{ $t('v1.view.main.dashboard.chat.quick_answer.guild') }}
            <CogIcon
              v-if="orgStore.isAdminOrg()"
              v-tooltip="$t('v1.common.setting')"
              @click="$external_site.openPageSetting('quick-reply')"
              class="w-6 h-6 text-black cursor-pointer"
            />
            <button
              v-tooltip="$t('Lấy danh sách trả lời nhanh từ trang khác')"
              @click="modal_change_quick_answer_ref?.toggleModal"
            >
              <ChangeIcon
                v-if="
                  page_id === conversationStore.select_conversation?.fb_page_id
                "
                class="size-4 text-black m-0.5"
              />
              <PageAvatar
                v-else
                :page_info="
                  orgStore.list_os?.find(item => item.page_id === page_id)
                    ?.page_info
                "
                class="size-5"
              />
            </button>
          </div>
        </div>
        <div class="overflow-y-auto flex flex-col py-2 gap-2">
          <button
            v-for="answer of list_answer"
            :id="answer.id"
            @click="selectQuickAnswer(answer)"
            :class="{
              'bg-slate-100': answer.id === selected_answer_id,
            }"
            class="py-1 px-2 gap-3 rounded-lg flex hover:bg-slate-100"
          >
            <div class="p-2.5 rounded-lg border bg-white flex-shrink-0">
              <AiBoldIcon
                v-if="answer.is_ai"
                class="w-6 h-6"
              />
              <TextIcon
                v-else
                class="w-6 h-6"
              />
            </div>
            <div class="flex-grow min-w-0 text-sm text-left">
              <div class="font-semibold truncate">/{{ answer.title }}</div>
              <div class="text-slate-500 truncate">
                <span
                  v-if="answer.is_ai"
                  class="font-medium"
                >
                  {{ $t('v1.view.main.dashboard.chat.quick_answer.ai') }}
                </span>
                {{ answer.content }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <ModalChangeQuickAnswer
    ref="modal_change_quick_answer_ref"
    v-model:page_id="page_id"
    v-on:update:page_id="onChangePageId"
  />
</template>
<script setup lang="ts">
import { gen_answer, text_translate } from '@/service/api/chatbox/ai'
import { getPageInfo, getStaffInfo } from '@/service/function'
import { toastError } from '@/service/helper/alert'
import { nonAccentVn } from '@/service/helper/format'
import { getItem, setItem } from '@/service/helper/localStorage'
import {
  useCommonStore,
  useConversationStore,
  useMessageStore,
  useOrgStore,
} from '@/stores'
import { QuickAnswer } from '@/utils/api/Widget'
import { ExternalSite } from '@/utils/helper/ExternalSite'
import { composableService as inputComposableService } from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/service'
import { IS_VISIBLE_SEND_BTN_FUNCT } from '@/views/ChatWarper/Chat/CenterContent/InputChat/symbol'
import { format } from 'date-fns'
import { debounce, last, size, sortBy } from 'lodash'
import { container } from 'tsyringe'
import { computed, inject, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import PageAvatar from '@/components/Avatar/PageAvatar.vue'
import Loading from '@/components/Loading.vue'
import ModalChangeQuickAnswer from '@/views/ChatWarper/Chat/CenterContent/InputChat/MainInput/ModalChangeQuickAnswer.vue'

import AiBoldIcon from '@/components/Icons/AiBold.vue'
import ChangeIcon from '@/components/Icons/ChangeIcon.vue'
import CogIcon from '@/components/Icons/Cog.vue'
import SlashQuareIcon from '@/components/Icons/SlashQuare.vue'
import TextIcon from '@/components/Icons/Text.vue'

import type { SourceChat } from '@/service/interface/app/ai'
import type { QuickAnswerInfo } from '@/service/interface/app/message'
import type { WidgetEventData } from '@/service/interface/app/widget'

const { InputService } = inputComposableService()

const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const commonStore = useCommonStore()
const { t: $t } = useI18n()
const orgStore = useOrgStore()
const $external_site = container.resolve(ExternalSite)
const $input_service = container.resolve(InputService)
/** Thời gian delay khi đóng modal Trả lời nhanh */
const NO_RESULT_CLOSE_DELAY = 500 // ms

/**cache câu trả lời, hạnc chế gọi API liên tục mỗi lần click */
const CACHE_LIST_ANSWER = new Map<string, QuickAnswerInfo[]>()
/**số câu trả lời tối đa sẽ lấy */
const MAX_ANSWER = 200
/**các tính năng AI */
const AI_FEATURE: QuickAnswerInfo[] = [
  {
    id: 'translate',
    title: 'dich',
    content: $t('v1.view.main.dashboard.chat.quick_answer.translate'),
    is_ai: true,
  },
  {
    id: 'complete',
    title: 'hoanthanh',
    content: $t('v1.view.main.dashboard.chat.quick_answer.auto_complete'),
    is_ai: true,
  },
]

/**ref của nội dung modal */
const modal_content_ref = ref<HTMLDivElement>()
/** Danh sách trả lời nhanh */
const list_answer = ref<QuickAnswerInfo[]>([])
/** Trạng thái loading */
const is_loading = ref(false)
/** Id của answer đang được chọn */
const selected_answer_id = ref<string>('')
/** Index của answer đang được chọn */
const selected_answer_index = ref(0)
/** modal thay đổi danh sách câu trả lời nhanh */
const modal_change_quick_answer_ref = ref<InstanceType<
  typeof ModalChangeQuickAnswer
> | null>(null)

/**id trang đang được chọn */
const page_id = ref<string>('')
/**id khách đang được chọn */
const client_id = computed(
  () => conversationStore.select_conversation?.fb_client_id
)

/**có hiển thị nút gửi tin không */
const isVisibleSendBtn = inject(IS_VISIBLE_SEND_BTN_FUNCT)

/**click vào nút mở modal */
function clickBtnOpenQuickAnswer() {
  // thêm / vào input chat
  $input_service.setInputText('/')

  // hiện modal
  toggleModal()
}
/** ẩn hiện modal */
function toggleModal(is_clear_input?: boolean) {
  // thay đổi trạng thái hiển thị modal
  commonStore.is_show_quick_answer = !commonStore.is_show_quick_answer

  // modal mở hay tắt thì đều focus vào input chat
  focusChat()

  // nếu mở modal thì lấy dữ liệu trả lời nhanh
  if (commonStore.is_show_quick_answer) {
    changeModalPosition()
    getQuickAnswer()
  }

  /**input chat */
  const INPUT_CHAT = document.getElementById('chat-text-input-message')

  // nếu không có input chat thì thôi
  if (!INPUT_CHAT) return

  // xóa nội dung input nếu được yêu cầu
  if (is_clear_input && INPUT_CHAT.innerText === '/')
    $input_service.setInputText('')
}
/**thay đổi vị chí, kích thước của modal cho vừa với input chat */
async function changeModalPosition() {
  // chờ vue render modal xong mới chạy
  await new Promise(resolve => nextTick(() => resolve(undefined)))

  /**mục tiêu */
  const INPUT_CHAT_WARPER = document.getElementById('main_input_chat')

  // nếu không có mục tiêu thì thôi
  if (!INPUT_CHAT_WARPER || !modal_content_ref.value) return

  // lấy vị trí, kích thước của mục tiêu
  const { x, width } = INPUT_CHAT_WARPER.getBoundingClientRect()

  // đặt độ rộng của modal bằng với mục tiêu
  modal_content_ref.value.style.setProperty('width', `${width}px`)

  // dịch chuyển modal đến vị trí mục tiêu
  modal_content_ref.value.style.setProperty('left', `${x}px`)
}
/** Lấy dữ liệu trả lời nhanh */
async function getQuickAnswer() {
  try {
    /** lấy page_id từ local */
    const PAGE_ID_MAP = getItem('quick_answer_page_id') || {}

    page_id.value =
      PAGE_ID_MAP?.[conversationStore.select_conversation?.fb_page_id || ''] ||
      conversationStore.select_conversation?.fb_page_id

    /** nếu không có id trang thì thôi */
    if (!page_id.value) return

    /** nếu đã cache dữ liệu rồi thì thôi không gọi api nữa */
    if (CACHE_LIST_ANSWER.has(page_id.value)) {
      /** lấy dữ liệu trong cache */
      list_answer.value = CACHE_LIST_ANSWER.get(page_id.value) || []

      return
    }

    /** bật loading */
    is_loading.value = true

    /** gọi api lấy dữ liệu câu trả lời */
    const ANSWERS = await new QuickAnswer(page_id.value).readAnswer(
      0,
      MAX_ANSWER
    )

    /** sắp xếp */
    list_answer.value = sortBy(ANSWERS, 'index')

    /** thêm tính năng AI lên đầu trả lời nhanh */
    list_answer.value?.unshift(...AI_FEATURE)

    /** cache lại dữ liệu */
    CACHE_LIST_ANSWER.set(page_id.value, list_answer.value)

    /** chọn câu đầu đầu tiên */
    setDefaultQuickAnswer()

    /** tắt loading */
    is_loading.value = false
  } catch (e) {
    /** tắt loading */
    is_loading.value = false
  }
}
/** Tìm kiếm câu trả lời nhanh khi nhập trong input chat */
// function seachQuickAnswer(search_value?: string) {
//   /** nếu không có id trang thì thôi */
//   if (!page_id.value) return

//   /** nạp lại dữ liệu mới nhất từ cache */
//   list_answer.value = CACHE_LIST_ANSWER.get(page_id.value) || []

//   /** nếu không có giá trị tìm kiếm thì tự động chọn câu đầu đầu tiên */
//   if (!search_value) return setDefaultQuickAnswer()

//   /**giá trị tìm kiếm đã được xử lý */
//   const SEARCH_VALUE = nonAccentVn(search_value)

//   /** tìm kiếm theo tiêu đề của câu trả lời */
//   list_answer.value = list_answer.value.filter(answer =>
//     nonAccentVn(answer?.title || '')?.includes(SEARCH_VALUE)
//   )

//   /** tự động chọn câu đầu đầu tiên */
//   setDefaultQuickAnswer()
// }

// async function seachQuickAnswer(search_value?: string) {
//   if (!page_id.value) return

//   // load lại dữ liệu từ cache
//   list_answer.value = CACHE_LIST_ANSWER.get(page_id.value) || []

//   // không có search => reset UI
//   if (!search_value) return setDefaultQuickAnswer()

//   const SEARCH_VALUE = nonAccentVn(search_value)

//   // tìm trong local
//   let result = list_answer.value.filter(answer =>
//     nonAccentVn(answer?.title || '').includes(SEARCH_VALUE)
//   )

//   // nếu TÌM RA thì dùng local
//   if (result.length) {
//     list_answer.value = result
//     return setDefaultQuickAnswer()
//   }

//   // ----- Không tìm thấy → gọi API search -----
//   try {
//     is_loading.value = true

//     const RES = await new QuickAnswer(page_id.value).readAnswer(
//       0,
//       MAX_ANSWER,
//       search_value // <-- search ở server
//     )

//     // nếu server trả về rỗng => vẫn giữ list rỗng
//     if (!RES?.length) {
//       list_answer.value = []
//       return
//     }

//     // sort
//     const NEW_LIST = sortBy(RES, 'index')

//     // merge vào cache cũ
//     const CACHE = CACHE_LIST_ANSWER.get(page_id.value) || []
//     const MERGED = [...CACHE]

//     // tránh duplicate
//     NEW_LIST.forEach(item => {
//       if (!MERGED.find(x => x.id === item.id)) MERGED.push(item)
//     })

//     // update cache
//     CACHE_LIST_ANSWER.set(page_id.value, MERGED)

//     // update UI
//     list_answer.value = NEW_LIST
//     setDefaultQuickAnswer()
//   } catch (e) {
//     console.error(e)
//   } finally {
//     is_loading.value = false
//   }
// }

// debounce 300ms
/** Xử lý debounce tránh user spam */

/**
 * Hàm search Quick Answer dựa trên input từ người dùng
 * - Nếu input chứa space → coi như không search, đóng modal
 * - Nếu input viết liền → gọi debounce search
 *
 * @param input_value Chuỗi nhập từ người dùng
 */
function seachQuickAnswer(input_value: string) {
  /** 2️⃣ Nếu input viết liền → gọi debounce search */
  DEBOUNCE_SEARCH(input_value)
}

/**
 * Debounce search Quick Answer
 * - Giảm thiểu số lần gọi API khi người dùng gõ
 * - Delay 300ms
 */
const DEBOUNCE_SEARCH = debounce(async (search_value: string) => {
  /** 1️⃣ Nếu chưa có page_id hoặc search_value rỗng → bỏ qua */
  if (!page_id.value || !search_value) return

  /** 2️⃣ Lấy danh sách Quick Answer từ cache */
  let cached_list = CACHE_LIST_ANSWER.get(page_id.value) || []

  /** 2a. Lọc danh sách cache theo keyword (bỏ dấu + lowercase) */
  let filtered = cached_list.filter(answer =>
    nonAccentVn(answer.title || '').includes(nonAccentVn(search_value))
  )

  if (filtered.length) {
    /** 3️⃣ Nếu có kết quả trong cache → hiển thị */
    list_answer.value = filtered

    /** ✅ Mở modal nếu đang đóng */
    if (!commonStore.is_show_quick_answer) {
      commonStore.is_show_quick_answer = true
      await nextTick() // chờ DOM update
      changeModalPosition() // cập nhật vị trí modal
    }

    /** Chọn Quick Answer mặc định */
    setDefaultQuickAnswer()
  } else {
    /** 4️⃣ Nếu cache không có → gọi API search */
    try {
      is_loading.value = true // bật loading

      /** Gọi API search Quick Answer */
      const API_RESULT = await new QuickAnswer(page_id.value).readAnswer(
        0, // offset
        MAX_ANSWER, // số lượng trả về tối đa
        search_value // keyword search
      )

      if (API_RESULT?.length) {
        /** 4a. Nếu API trả về dữ liệu → hiển thị modal và cập nhật cache */
        list_answer.value = API_RESULT

        /** ✅ Mở modal nếu đang đóng */
        if (!commonStore.is_show_quick_answer) {
          commonStore.is_show_quick_answer = true
          await nextTick()
          changeModalPosition()
        }

        /** Chọn mặc định Quick Answer */
        setDefaultQuickAnswer()

        /** Cập nhật cache cho lần search tiếp theo */
        CACHE_LIST_ANSWER.set(page_id.value, API_RESULT)
      } else {
        /** 4b. Nếu API không có kết quả → xóa danh sách sau 0.5s */
        setTimeout(() => {
          /** commonStore.is_show_quick_answer = false // giữ modal có thể mở bằng input khác */
          list_answer.value = []
        }, NO_RESULT_CLOSE_DELAY)
      }
    } catch (e) {
      /** 4c. Nếu API lỗi → vẫn giữ modal, có thể reset sau delay */
      setTimeout(() => {
        /** commonStore.is_show_quick_answer = false */
      }, NO_RESULT_CLOSE_DELAY)
    } finally {
      /** 5️⃣ Tắt loading */
      is_loading.value = false
    }
  }
}, 300) // Delay debounce 300ms

/**focus vào input chat */
function focusChat() {
  document.getElementById('chat-text-input-message')?.focus()
}
/**chọn trả lời nhanh */
function selectQuickAnswer(answer: QuickAnswerInfo) {
  /**nội dung của câu trả lời nhanh này */
  let { id, content, list_images, is_ai } = answer

  //  xử lý AI
  if (is_ai) return handleAi(id)

  /**input chat mục tiêu */
  const INPUT_CHAT = document.getElementById('chat-text-input-message')

  // nếu không có nội dung thì thôi
  if (!content || !INPUT_CHAT) return

  // thay đổi nội dung template dang {{xxx}} thành giá trị thực nếu có
  content = replaceTemplateMessage(content)

  // gán giá trị vào input
  $input_service.setInputText(content)

  // nếu trả lời nhanh có ảnh thì thêm vào danh sách tập tin đính kèm
  if (size(list_images))
    messageStore.upload_file_list =
      list_images?.map(url => ({
        type: 'image',
        is_done: false,
        is_loading: false,
        preview: url,
        url,
      })) || []

  // tắt modal
  commonStore.is_show_quick_answer = false

  // focus vào lại input chat
  focusChat()
}
/**xử lý AI */
function handleAi(action?: string) {
  // nếu không có hành động gì thì thôi
  if (!action) return

  // xử lý hành động
  switch (action) {
    case 'translate':
      transalate()
      break
    case 'complete':
      complete()
      break
  }
}
/**dịch nội dung */
async function transalate() {
  /** nếu đang loading thì thôi */
  if (messageStore.is_input_run_ai || !page_id.value) return

  /** đánh dấu đang chạy AI */
  messageStore.is_input_run_ai = true

  try {
    /** tắt modal */
    commonStore.is_show_quick_answer = false

    /** focus vào lại input chat */
    focusChat()

    /**input chat */
    const INPUT_CHAT = document.getElementById('chat-text-input-message')

    /** nếu không có input chat thì thôi */
    if (!INPUT_CHAT) throw 'DONE'

    /**nội dung chat */
    let text = INPUT_CHAT?.innerText

    /** nếu chỉ có '/' thì xóa luôn để tránh lỗi */
    if (text?.trim() === '/') text = ''

    /** xóa dấu /dich ở cuối câu, loại bỏ khoảng trắng */
    text = text?.trim()?.replace(/\/(?:d(?:ich|ic|i)?|\/)?$/, '')

    /** cập nhật lại input trước 1 lần */
    $input_service.setInputText(text)

    /** check lại nếu không có nội dung thì thôi */
    if (!text) throw 'DONE'

    /** gọi api dịch */
    const RES = await text_translate({
      from: 'vn',
      to: 'en',
      text,
      page_id: page_id.value,
      client_id: client_id.value,
    })

    /** nếu không có dữ liệu thì thôi */
    if (!RES?.text)
      throw $t('v1.view.main.dashboard.chat.quick_answer.translate_error')

    /** thay đổi nội dung chat thành dịch, nếu chưa bị huỷ */
    if (messageStore.is_input_run_ai) $input_service.setInputText(RES.text)
  } catch (e) {
    /** hiển thị thông báo lỗi */
    if (e !== 'DONE') toastError(e)
  }

  // đánh dấu AI đã chạy xong
  messageStore.is_input_run_ai = false
}
/**hoàn thành câu */
async function complete() {
  // nếu đang loading thì thôi
  if (
    messageStore.is_input_run_ai ||
    !messageStore.list_message ||
    !page_id.value
  )
    return

  // đánh dấu đang chạy AI
  messageStore.is_input_run_ai = true

  try {
    // tắt modal
    commonStore.is_show_quick_answer = false

    // focus vào lại input chat
    focusChat()

    /**nội dung chat */
    const SOURCE: SourceChat[] = messageStore.list_message
      ?.filter(message => message?.message_text)
      ?.filter(message => ['page', 'client'].includes(message?.message_type))
      ?.map(message => {
        return {
          type: message.message_type === 'client' ? 'CLIENT' : 'PAGE',
          content: message.message_text || '',
        }
      })

    /**input chat */
    const INPUT_CHAT = document.getElementById('chat-text-input-message')

    // nếu không có input chat thì thôi
    if (!INPUT_CHAT) throw 'DONE'

    /**nội dung chat */
    let text = INPUT_CHAT?.innerText

    // nếu không có nội dung thì thôi
    if (!text) throw 'DONE'

    // xóa dấu /hoanthanh ở cuối câu, loại bỏ khoảng trắng
    text = text
      .replace(
        /\/(?:h(?:oanthanh|oanthan|oantha|oanth|oant|oan|oa|o)?|\/)?$/,
        ''
      )
      .trim()

    // cập nhật lại input trước 1 lần
    $input_service.setInputText(text)

    // gọi api tạo nội dung
    const RES = await gen_answer({
      source: SOURCE,
      current: text,
      page_id: page_id.value,
      client_id: client_id.value,
    })

    // nếu không có dữ liệu thì thôi
    if (!RES?.text)
      throw $t('v1.view.main.dashboard.chat.quick_answer.complete_error')

    // thay đổi nội dung mới vào input chat, nếu chưa bị huỷ
    if (messageStore.is_input_run_ai) $input_service.setInputText(RES.text)
  } catch (e) {
    // hiển thị thông báo lỗi
    if (e !== 'DONE') toastError(e)
  }

  // đánh dấu AI đã chạy xong
  messageStore.is_input_run_ai = false
}
/** hàm xử lý thay đổi id page */
function onChangePageId(id: string) {
  if (!id || !conversationStore.select_conversation?.fb_page_id) return

  // cập nhật id page
  page_id.value = id

  const PAGE_ID_MAP = getItem('quick_answer_page_id') || {}

  setItem('quick_answer_page_id', {
    ...PAGE_ID_MAP,
    [conversationStore.select_conversation.fb_page_id]: id,
  })

  // lấy dữ liệu trả lời nhanh
  getQuickAnswer()
}

/**thay thế template message thành data của conversation */
function replaceTemplateMessage(content: string) {
  /**dữ liệu hội thoại đang được chọn */
  const CONVERSATION = conversationStore.select_conversation
  /** id page của page hiện tại */
  const PAGE_ID = CONVERSATION?.fb_page_id

  // loại bỏ các template chưa xử lý được
  content = content
    .replace(/#{{FIRST_NAME}}/g, '')
    .replace(/#{{LAST_NAME}}/g, '')
    .replace(/#{{STAFF_FIRST_NAME}}/g, '')
    .replace(/#{{STAFF_LAST_NAME}}/g, '')
  // .replace(/#\{\{[^|}]+\|[^|}]+\|[^|}]+\}\}/g, '')
  // .replace(/#\{\{TODAY\{[^}]+\}\}\}/g, '')

  /**tên khách hàng */
  const CLIENT_NAME =
    CONVERSATION?.client_origin_name || CONVERSATION?.client_name || ''
  /**tên nhân viên */
  const STAFF_NAME =
    getStaffInfo(PAGE_ID, CONVERSATION?.fb_staff_id)?.name || ''
  /**số điện thoại khách hàng */
  const PHONE = CONVERSATION?.client_phone || ''
  /**email khách hàng */
  const EMAIL = CONVERSATION?.client_email || ''
  /**tên trang */
  const PAGE_NAME = getPageInfo(PAGE_ID)?.name || ''

  return (
    content
      // tên khách hàng
      .replace(/#{FULL_NAME}/g, CLIENT_NAME)
      .replace(/#{{FULL_NAME}}/g, CLIENT_NAME)

      // tên nhân viên chăm sóc
      .replace(/#{STAFF_NAME}/g, STAFF_NAME)
      .replace(/#{{STAFF_NAME}}/g, STAFF_NAME)

      // số điện thoại khách hàng
      .replace(/#{PHONE}/g, PHONE)
      .replace(/#{{PHONE}}/g, PHONE)

      // email khách hàng
      .replace(/#{EMAIL}/g, EMAIL)
      .replace(/#{{EMAIL}}/g, EMAIL)

      // tên trang
      .replace(/#{PAGE_NAME}/g, PAGE_NAME)
      .replace(/#{{PAGE_NAME}}/g, PAGE_NAME)

      // giới tính
      .replace(
        /#SEX\{\{([^|}]+)\|([^|}]+)\|([^|}]+)\}\}/g,
        (_, male, female, unknown) =>
          getGender(CONVERSATION?.client_gender, male, female, unknown)
      )
      .replace(/#SEX\{[^|}]+\|[^|}]+\|[^|}]+\}/g, (_, male, female, unknown) =>
        getGender(CONVERSATION?.client_gender, male, female, unknown)
      )

      // giá trị ngẫu nhiên
      .replace(/#\{\{([^}|]+\|[^}]+)\}\}/g, (_, value) => getRandomValue(value))
      .replace(/#\{([^}|]+\|[^}]+)\}/g, (_, value) => getRandomValue(value))

      // thời gian
      .replace(
        /#\{\{(TODAY|YESTERDAY|TOMORROW)\{((?:DD|MM|YYYY|HH|mm)([/:])(?:DD|MM|YYYY|HH|mm)(?:\3(?:DD|MM|YYYY))?)\}\}\}/g,
        (_, DATE, FORMAT) => formatTime(DATE, FORMAT)
      )
      .replace(
        /#\{(TODAY|YESTERDAY|TOMORROW)\{((?:DD|MM|YYYY|HH|mm)([/:])(?:DD|MM|YYYY|HH|mm)(?:\3(?:DD|MM|YYYY))?)\}\}/g,
        (_, DATE, FORMAT) => formatTime(DATE, FORMAT)
      )
  )
}

/**
 * hàm lấy xưng hô theo giới tính
 * @param gender giới tính của khách
 * @param male xưng hô nam
 * @param female xưng hô nữ
 * @param unknown xưng hô khi không rõ giới tinh
 */
function getGender(
  gender: 'male' | 'female' | undefined,
  male: string,
  female: string,
  unknown: string
) {
  // nếu là giới tính nam
  if (gender === 'male') return male
  // nếu là giới tính nữ
  if (gender === 'female') return female
  // nếu là không rõ giới tính
  return unknown
}

/** hàm lấy giá trị ngẫu nhiên */
function getRandomValue(content: string) {
  /** các giá trị  */
  const OPTIONS = content.split('|')
  /** tạo 1 chỉ số ngẫu nhiên */
  const randomIndex = Math.floor(Math.random() * OPTIONS.length)
  // trả về phần tử ngẫu nhiên
  return OPTIONS[randomIndex]
}

/** hàm lấy ngày thời gian theo điều kiện */
function formatTime(date: string, format_str: string) {
  /** thời gian được hiển thị */
  let time: Date
  /** định dạng mong muốn */
  let format_rule = ''

  // tạo thời gian theo điều kiện
  switch (date) {
    case 'TODAY':
      time = new Date()
      break
    case 'YESTERDAY':
      time = new Date(new Date().setDate(new Date().getDate() - 1))
      break
    case 'TOMORROW':
      time = new Date(new Date().setDate(new Date().getDate() + 1))
      break
    default:
      time = new Date(date)
  }

  // lowercase DD và YYYY vẫn giữ MM
  format_rule = format_str?.replace('DD', 'dd')
  format_rule = format_rule?.replace('YYYY', 'yyyy')

  return format(time, format_rule)
}

/**cuộn tới vị trí trả lời nhanh đang chọn */
function scrollIntoView(id: string) {
  /**
   * hàm scrollIntoViewIfNeeded không phải là hàm tiêu chuẩn, nên bị thiếu
   * type
   */
  // @ts-ignore
  document.getElementById(id)?.scrollIntoViewIfNeeded()
}
/**lắng nghe sự thay đổi của input chat, để điều khiển hoạt động của modal */
function handleChatValue($event: KeyboardEvent) {
  /**phím người dùng nhấn */
  const KEY = $event.key

  /**nội dung chat */
  const INPUT_VALUE = ($event.target as HTMLDivElement)?.innerText
  console.log(commonStore.is_show_quick_answer, 'nnnnnnnnnnnnn')
  /** nếu modal đã mở */
  if (commonStore.is_show_quick_answer) onModalShowed(KEY, INPUT_VALUE)
  /** nếu modal chưa mở */ else onModalHid(INPUT_VALUE)
}
/**xử lý sự kiện khi modal đã hiển thị */
function onModalShowed(key: string, value: string) {
  /**số lượng câu trả lời */
  const SIZE_LIST_ANSWER = list_answer.value?.length

  /** * bấm Esc thì tắt modal */
  if (key === 'Escape') return toggleModal()

  /** * bấm mũi tên xuống */
  if (key === 'ArrowDown') {
    /** nếu đã hết câu trả lời thì đặt index về -1 để quay lại ban đầu */
    if (selected_answer_index.value >= SIZE_LIST_ANSWER - 1)
      selected_answer_index.value = -1

    /** chọn id câu trả lời tiếp theo, tăng index lên 1 */
    selected_answer_id.value =
      list_answer.value?.[++selected_answer_index.value]?.id || ''

    /** scroll đến vị trí */
    return scrollIntoView(selected_answer_id.value)
  }

  /** * bấm Mũi tên lên */
  if (key === 'ArrowUp') {
    /** nếu là câu trả lời đầu tiên thì chạy xuống cuối */
    if (!selected_answer_index.value)
      selected_answer_index.value = SIZE_LIST_ANSWER

    /** chọn câu trả lời tiếp theo, giảm index xuống 1 */
    selected_answer_id.value =
      list_answer.value?.[--selected_answer_index.value]?.id || ''

    /** scroll đến vị trí */
    return scrollIntoView(selected_answer_id.value)
  }

  /** bấm Enter thì chọn câu trả lời nhanh đang được select */
  if (key === 'Enter')
    return selectQuickAnswer(list_answer.value[selected_answer_index.value])

  /** nếu không có gạch mà đang mở thì tắt modal */
  if (!value.includes('/')) return toggleModal()

  /** tìm kiếm câu trả lời nhanh nếu đang mở modal */
  if (value?.includes('/')) seachQuickAnswer(last(value.split('/')) || '')
}
/**xử lý sự kiện khi modal đã tắt / không hiển thị */
function onModalHid(value: string) {
  /** nếu gõ gạch ở cuối câu mà chưa mở thì mở modal */
  if (!value.endsWith('/')) return

  /** mở modal */
  toggleModal()

  /** chọn câu đầu tiên nếu có */
  setDefaultQuickAnswer()
}
/**chọn câu trả lời nhanh mặc định */
function setDefaultQuickAnswer() {
  /** nếu không có dữ liệu thì thôi */
  if (!list_answer.value?.length) return

  /** tự động lấy id của câu đầu tiên */
  selected_answer_id.value = list_answer.value?.[0]?.id || ''
  /** tự động đặt vị trí thành đầu tiên */
  selected_answer_index.value = 0
}

onMounted(() => window.addEventListener('message', onWidgetEvent))
onUnmounted(() => window.removeEventListener('message', onWidgetEvent))

/**xử lý dữ liệu widget truyền vào */
function onWidgetEvent($event: MessageEvent<WidgetEventData>) {
  // lấy ra các dữ liệu cần thiết
  let { _type, content, list_images } = $event?.data

  // chỉ xử lý dữ liệu từ widget
  if (_type !== 'WIDGET') return true

  /**nội dung văn bản, đã lọc bỏ cú pháp hình ảnh cũ */
  const CONTENT = content?.split('\n\n##attachment##')?.[0]

  // chạy logic chung vơi trả lời nhanh nội bộ
  selectQuickAnswer({ content: CONTENT, list_images })
}

defineExpose({ toggleModal, handleChatValue })
</script>
