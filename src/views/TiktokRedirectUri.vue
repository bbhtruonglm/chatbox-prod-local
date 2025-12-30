<template>
  <DeauthorizeTiktok v-if="error_reason" />
  <Loading
    v-else
    type="FULL"
  />
</template>

<script setup lang="ts">
import { useOrgStore } from '@/stores'
import { N4SerivceAppPage } from '@/utils/api/N4Service/Page'
import { error } from '@/utils/decorator/Error'
import { container } from 'tsyringe'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Loading from '@/components/Loading.vue'
import DeauthorizeTiktok from './DeauthorizeTiktok.vue'
/** Khai báo các biến  */
const $route = useRoute()
const $router = useRouter()
const orgStore = useOrgStore()

/** Lấy param từ URL */
const code = ref($route.query.code as string)
const state_from_url = ref($route.query.state as string)
const error_reason = ref($route.query.error_reason as string)

class Main {
  constructor(
    private readonly API_PAGE = container.resolve(N4SerivceAppPage)
  ) {}

  @error()
  async handleCode() {
    /** Nếu có lỗi từ OAuth thì dừng */
    if (error_reason.value) return

    /** Nếu không có code hoặc state, dừng */
    if (!code.value || !state_from_url.value) {
      console.error('Missing code or state in URL!')
      return
    }

    /** ID tổ chức đang chọn */
    const ORG_ID = orgStore.selected_org_id

    /** Gọi API sync TikTok page */
    await this.API_PAGE.syncTiktokPage(
      code.value,
      $env.tiktok.redirect_uri,
      ORG_ID,
      state_from_url.value
    )

    /** Nếu chưa có org, mở trang connect page */
    const QUERY = ORG_ID ? undefined : { connect_page: 'PAGE' }

    /** Chuyển hướng */
    $router.push({ path: '/dashboard/select-page', query: QUERY })
  }
}

const $main = new Main()

/** Xử lý khi component mount */
onMounted(() => $main.handleCode())
</script>
