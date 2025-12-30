<template>
  <EmptyPage
    :icon="TiktokIcon"
    :guild="
      $t('Kết nối _ với Trang _', {
        partner: commonStore.partner?.name,
        platform: $t('Tiktok'),
      })
    "
    :description="
      $t(
        'Kết nối với Tiktok để chat nhiều Trang tự động với AI, tối ưu chi phí Marketing với CAPI, tự động tích hợp các ứng dụng của Doanh nghiệp.'
      )
    "
    class_guild="w-[482px]"
  >
    <template #button>
      <button
        @click="$main.oAuthByRedirect"
        class="py-2 px-4 rounded-md gap-2 flex items-center bg-slate-100 text-slate-900 text-sm font-semibold"
      >
        <TiktokIcon class="size-4" />
        <span>{{ $t('Kết nối với Tiktok') }}</span>
      </button>
    </template>
  </EmptyPage>
  <AlertRechQuota ref="alert_reach_quota_page_ref" />
</template>
<script setup lang="ts">
import { useCommonStore, useOrgStore } from '@/stores'
import { WindowAction, type IWindowAction } from '@/utils/helper/Navigation'
import { container } from 'tsyringe'

import EmptyPage from '@/views/Dashboard/ConnectPage/EmptyPage.vue'
import AlertRechQuota from '@/components/AlertModal/AlertRechQuota.vue'

import TiktokIcon from '@/components/Icons/Tiktok.vue'
import { ref } from 'vue'
import { N4SerivceAppPage } from '@/utils/api/N4Service/Page'
interface TikTokOAuthResponse {
  redirect_url: string
  // nếu backend trả thêm field khác thì thêm ở đây
}

const commonStore = useCommonStore()
const orgStore = useOrgStore()

/**ref của modal thông báo hết quota */
const alert_reach_quota_page_ref = ref<InstanceType<typeof AlertRechQuota>>()

class Main {
  /**
   * @param SERVICE_WINDOW_ACTION tiện ích thao tác với cửa sổ
   */
  constructor(
    private readonly SERVICE_WINDOW_ACTION: IWindowAction = container.resolve(
      WindowAction
    ),
    private readonly API_PAGE = container.resolve(N4SerivceAppPage)
  ) {}
  /** Lấy URL OAuth TikTok từ backend
   * @param redirectUri URI chuyển hướng sau khi cấp quyền
   * @return URL OAuth hoặc undefined nếu có lỗi
   */
  async getTikTokOAuthUrl(redirectUri: string): Promise<string | undefined> {
    try {
      /** Gọi API backend */
      const RES = (await this.API_PAGE.getTiktokUri(redirectUri)) as
        | TikTokOAuthResponse
        | null
        | undefined

      /** Nếu backend không trả redirect_url */
      if (!RES?.redirect_url) {
        console.error('Invalid response from getTiktokUri:', RES)
        return undefined
      }

      /** Trả về URL */
      return RES.redirect_url
    } catch (err) {
      console.error('Error fetching TikTok OAuth URL:', err)
      return undefined
    }
  }

  /** cấp quyền bằng redirect của TikTok */
  async oAuthByRedirect() {
    /** Nếu vượt quota thì báo lỗi */
    if (orgStore.isReachPageQuota())
      return alert_reach_quota_page_ref.value?.toggleModal()

    try {
      /** Gọi API backend lấy URL OAuth (đầy đủ state + PKCE + scope...) */
      const RES = await this.getTikTokOAuthUrl($env.tiktok.redirect_uri)
      /** Nếu không lấy được URL */
      if (!RES) {
        console.error('Missing RES!')
        return
      }

      /** Redirect sang trang cấp quyền TikTok */
      this.SERVICE_WINDOW_ACTION.redirect(RES)
    } catch (err) {
      console.error('Failed to load TikTok OAuth URL:', err)
    }
  }
}
const $main = new Main()
</script>
