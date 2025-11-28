<template>
  <!-- 
    class "container-fluid" để intergrate với ext, không phải là bootstrap
    không được xoá
  -->
  <div class="w-dvw h-dvh container-fluid bg-gradient-primary">
    <Network />
    <AdBlocker />
    <Loading
      v-if="commonStore.is_loading_full_screen"
      type="FULL"
    />
    <div class="h-full overflow-y-auto">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommonStore } from '@/stores'

import Loading from '@/components/Loading.vue'
import { useKeyboardShortcut } from '@/views/composables/useKeyboardShortcut'
import { container } from 'tsyringe'
import { onMounted } from 'vue'
import AdBlocker from './components/AdBlocker.vue'
import Network from './components/Network.vue'
import { loadZip } from './db/ChatZipLoader'
import { setItem } from './service/helper/localStorage'
import { N4SerivcePublicPartner } from './utils/api/N4Service/Partner'
import { error } from './utils/decorator/Error'
import { Toast } from './utils/helper/Alert/Toast'
import { QueryString, type IQueryString } from './utils/helper/QueryString'
const commonStore = useCommonStore()
const $toast = container.resolve(Toast)

useKeyboardShortcut()

class Main {
  /**
   * @param SERVICE_QUERY_STRING query string service
   */
  constructor(
    private readonly SERVICE_QUERY_STRING: IQueryString = container.resolve(
      QueryString
    )
  ) {}

  /**lưu lại ref được truyền ở param */
  saveRef() {
    /**mã ref */
    const REF =
      this.SERVICE_QUERY_STRING.get('rf') ||
      this.SERVICE_QUERY_STRING.get('ref')

    /** nếu không có ref thì thôi */
    if (!REF) return

    /** lưu ref vào local storage */
    setItem('ref', REF)
  }

  /** lưu lại id client cần gửi tin nhắn tới */
  saveCliendID() {
    /** id của client cần gửi tin nhắn tới */
    const CLIENT_ID = this.SERVICE_QUERY_STRING.get('client_id')

    /** nếu không có id thì thôi */
    if (!CLIENT_ID) return

    /** lưu id vào local storage */
    setItem('client_id', CLIENT_ID)
  }

  /**lưu lại id tổ chức nếu được truyền ở param */
  saveOrgId() {
    /**id tổ chức */
    const ORG_ID = this.SERVICE_QUERY_STRING.get('org_id')

    // nếu không có ref thì thôi
    if (!ORG_ID) return

    // lưu ref vào local storage
    setItem('selected_org_id', ORG_ID)
  }
  /**ghi đè lại token lấy từ param, phục vụ cho trường hợp mở từ app mobile */
  getParamToken() {
    /**mã xác thực */
    const ACCESS_TOKEN =
      this.SERVICE_QUERY_STRING.get('access_token') ||
      this.SERVICE_QUERY_STRING.get('token')

    // nếu không có token thì thôi
    if (!ACCESS_TOKEN) return

    // lưu token vào local storage
    setItem('access_token', ACCESS_TOKEN)
  }
  /**Lấy thông tin đối tác */
  @error($toast)
  async getPartnerInfo() {
    // lấy thông tin đối tác
    commonStore.partner = await new N4SerivcePublicPartner().readPartner()

    // nếu không có thông tin đối tác thì báo lỗi
    if (!commonStore.partner) throw 'NOT_FOUND.PARTNER'

    // thay đổi title
    document.title = commonStore.partner?.name || ''

    // thay đổi favicon
    $main.setFavicon()
  }
  /**Thay đổi favicon */
  setFavicon() {
    /**thẻ link */
    const LINK = document.createElement('link')

    // thêm thông tin cho thẻ link
    LINK.id = 'favicon'
    LINK.rel = 'icon'
    LINK.href = commonStore.partner?.logo?.icon || ''

    // thêm vào head
    document.head.appendChild(LINK)
  }
}
const $main = new Main()

// lấy token từ param nếu có
$main.getParamToken()
// lưu lại ref để dùng sau
$main.saveRef()
// lưu lại id client cần gửi tin nhắn tới
$main.saveCliendID()
// lưu lại id tổ chức nếu được truyền ở param
$main.saveOrgId()

// lấy thông tin đối tác khi component được mount
onMounted($main.getPartnerInfo)
</script>

<style lang="scss">
@import '@/assets/css/index.scss';
</style>
