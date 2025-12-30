<template>
  <div
    v-if="list_noti?.length"
    class="flex-col gap-3 hidden md:flex"
  >
    <div
      v-for="noti of list_noti"
      :class="
        getConfig(noti.noti_code).bg + ' ' + getConfig(noti.noti_code).border
      "
      class="item gap-1 shadow-lg flex justify-between"
    >
      <div
        :class="getConfig(noti.noti_code).text"
        class="flex flex-col gap-1 min-w-0"
      >
        <div class="text-sm font-semibold truncate">{{ noti.noti_title }}</div>
        <div class="text-xs truncate">{{ noti.noti_content }}</div>
      </div>
      <div class="flex-shrink-0">
        <button
          v-if="getConfig(noti.noti_code).btn_title"
          @click="readNoti(noti)"
          :class="getConfig(noti.noti_code).btn"
          class="item text-white hover:brightness-90"
        >
          {{ getConfig(noti.noti_code).btn_title }}
        </button>
        <button
          @click="readNoti(noti, true)"
          class="item text-sm font-medium"
        >
          {{ $t('v1.common.close') }}
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCommonStore, useOrgStore } from '@/stores'
import {
  get_all_noti,
  get_noti,
  read_noti,
} from '@/service/api/chatbox/billing'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ToastSingleton } from '@/utils/helper/Alert/Toast'
import { useRouter } from 'vue-router'

import type { NotiInfo } from '@/service/interface/app/billing'
import { isEmpty } from 'lodash'

const $props = withDefaults(
  defineProps<{
    /**các dạng noti muốn hiển thị */
    codes: string[]

    /** kiểm tra có phải đang ở màn chat hay không */
    is_chat?: boolean
  }>(),
  {}
)

const orgStore = useOrgStore()
const commonStore = useCommonStore()
const { t: $t } = useI18n()
const $router = useRouter()

/**dữ liệu thiết lập */
interface ISetting {
  /**màu nền */
  bg: string
  /**màu viền */
  border: string
  /**màu nút */
  btn: string
  /**tiêu đề nút */
  btn_title?: string
  /**màu chữ */
  text: string
}

/**thiết lập mặc định */
const DEFAULT_SETTING = {
  bg: 'bg-white',
  border: 'border-slate-200',
  btn: 'bg-slate-700',
  text: 'text-black',
  btn_title: $t('v1.view.main.dashboard.org.menu.more'),
}
/**đạt giới hạn, sắp đạt giới hạn, ... */
const QUOTA_SETTING = {
  bg: 'bg-blue-100',
  border: 'border-blue-200',
  btn: 'bg-blue-500',
  text: 'text-blue-700',
  btn_title: $t('v1.view.main.dashboard.org.menu.more'),
}
/**thiết lập UI của thông báo */
const SETTINGS: Record<string, ISetting> = {
  /**trang bị cướp */
  CHANGE_PAGE_OWNER: DEFAULT_SETTING,
  /**nạp tiền thành công */
  TOPUP_SUCCESS: {
    bg: 'bg-green-100',
    border: 'border-green-200',
    btn: 'bg-green-500',
    text: 'text-green-700',
    btn_title: $t('v1.common.close'),
  },
  /**đang chờ thanh toán */
  TOPUP_WAITING: {
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    btn: 'bg-orange-500',
    text: 'text-orange-700',
    btn_title: $t('v1.view.main.dashboard.org.menu.pay'),
  },
  /**thanh toán thành công */
  PURCHASE_SUCCESS: {
    bg: 'bg-green-100',
    border: 'border-green-200',
    btn: 'bg-green-500',
    text: 'text-green-700',
    btn_title: $t('v1.common.close'),
  },
  /**đã đá trang */
  REMOVE_PAGE: DEFAULT_SETTING,
  /**sắp đạt giới hạn AI */
  ALMOST_REACH_QUOTA_AI: QUOTA_SETTING,
  /**đã đạt giới hạn AI */
  LOCK_FEATURE: QUOTA_SETTING,
  /**sắp hết hạn gói */
  ALMOST_EXPIRED_PACKAGE: {
    bg: 'bg-red-100',
    border: 'border-red-200',
    btn: 'bg-red-500',
    text: 'text-red-700',
    btn_title: $t('v1.view.main.dashboard.org.menu.extend'),
  },
  PAGE_EXPIRED_SESSION: {
    bg: 'bg-red-100',
    border: 'border-red-200',
    btn: 'bg-red-500',
    text: 'text-red-700',
    // btn_title: DEFAULT_SETTING.btn_title,
  },
}

/**danh sách các thông báo mới */
const list_noti = ref<NotiInfo[]>([])
/**loading */
const is_loading = ref(false)

// đọc danh sách thông báo khi load component
onMounted(getNoti)

watch(
  () => [
    // orgStore.selected_org_id,
    // orgStore.is_selected_all_org,
    orgStore.list_org,
  ],
  getNoti
)

/**lấy dữ liệu thiết lập */
function getConfig(code?: string): ISetting {
  /** nếu không có code thì trả về mặc định */
  if (!code) return DEFAULT_SETTING

  // trả về thiết lập theo code
  return SETTINGS?.[code] || DEFAULT_SETTING
}
/**lấy xx thông báo mới nhất */
async function getNoti() {
  try {
    // nếu không phải chọn tất cả các tổ chức thì chỉ lấy của tổ chức đang chọn
    // hoặc đang trong chat thì cũng chỉ lấy của tổ chức hiện tại
    // if (!orgStore.is_selected_all_org || $props.is_chat) {
    //   list_noti.value = await getNotiCurrentOrg()
    // } else {
    //   // lấy tất cả các thông báo
    // }
    list_noti.value = await getAllNoti()

    // nếu trong chat thì sau 2s thì xóa thông báo
    if (!$props.is_chat) return
    setTimeout(() => {
      list_noti.value = []
    }, 2_000)
  } catch (e) {
    // thông báo lỗi
    // ToastSingleton.getInst().error(e)
  }
}

/** lấy tất cả các thông báo của tổ chức */
async function getAllNoti() {
  /** danh sách các thông báo */
  let list_noti: NotiInfo[] = []
  try {
    /** danh sách các tổ chức */
    const LIST_ORG = orgStore.list_org || []

    /** Lấy list org id */
    const ORG_IDS = LIST_ORG.map(item => item.org_id || '')
    /** nếu không có org ids thì trả về [] */
    if (isEmpty(ORG_IDS)) return []
    // lặp qua từng tổ chức để lấy danh sách các thông báo
    // for (const org of LIST_ORG) {
    //   // nếu không có id tổ chức thì thôi qua tổ chức tiếp theo
    //   if (!org.org_id) continue

    //   /** dữ liệu api trả về */
    //   const RES = await get_noti(
    //     org.org_id,
    //     3,
    //     { $exists: false },
    //     $props.codes
    //   )
    //   // thêm vào cuối danh sách
    //   list_noti = [...list_noti, ...RES]
    // }
    /** dữ liệu api trả về */
    const RES = await get_all_noti({
      org_id: ORG_IDS,
      limit: 30,
      is_read: { $exists: false },
      noti_code: $props.codes,
    })
    list_noti = RES || []
  } catch (e) {
  } finally {
    return list_noti
  }
}

/** lấy thông báo của tổ chức hiện tại */
async function getNotiCurrentOrg() {
  /** danh sách các thông báo */
  let list_noti: NotiInfo[] = []
  try {
    // nếu không có id tổ chức thì thôi
    if (!orgStore.selected_org_id) return []

    // ghi đè thống báo cũ nếu có khi lấy dữ liệu
    list_noti = await get_noti(
      orgStore.selected_org_id,
      3,
      { $exists: false },
      $props.codes
    )
  } catch (e) {
    // tạm thời không xử lý gì
  } finally {
    return list_noti
  }
}

/**đọc thông báo */
async function readNoti(noti?: NotiInfo, is_close?: boolean) {
  try {
    // nếu đang loading thì thôi
    if (commonStore.is_loading_full_screen) return

    // mở loading
    commonStore.is_loading_full_screen = true

    // đánh dấu noti là đã đọc
    await read_noti(orgStore.selected_org_id, noti?.noti_id)

    // giảm số thông báo
    if (orgStore.count_noti) orgStore.count_noti--

    // chỉ đóng không xử lý gì thêm
    if (is_close) getNoti()
    // xử lý tuỳ theo type noti
    else
      switch (noti?.noti_code) {
        case 'CHANGE_PAGE_OWNER':
          $router.push('/dashboard/org/pay/info')
          break
        case 'TOPUP_SUCCESS':
          $router.push({
            path: '/dashboard/org/pay/recharge',
            query: {
              txn_id: noti?.noti_data?.txn_id,
            },
          })
          break
        case 'TOPUP_WAITING':
          $router.push({
            path: '/dashboard/org/pay/recharge',
            query: {
              txn_id: noti?.noti_data?.txn_id,
            },
          })
          break
        case 'PURCHASE_SUCCESS':
          $router.push('/dashboard/org/pay/info')
          break
        case 'ALMOST_REACH_QUOTA_AI':
          $router.push('/dashboard/org/pay/info')
          break
        case 'ALMOST_EXPIRED_PACKAGE':
          $router.push('/dashboard/org/pay/info')
          break
        case 'LOCK_FEATURE':
          $router.push('/dashboard/org/pay/info')
          break

        // code không cần xử lý gì thì tắt luôn
        default:
          await getNoti()
          break
      }
  } catch (e) {
  } finally {
    /** tắt loading */
    commonStore.is_loading_full_screen = false
  }
}
</script>
<style lang="scss" scoped>
.item {
  @apply py-2 px-4 rounded-md;
}
</style>
