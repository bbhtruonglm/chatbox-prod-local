import { markRaw, type Component } from 'vue'

import FacebookIcon from '@/components/Icons/Facebook.vue'
import ZaloIcon from '@/components/Icons/Zalo.vue'
import WebIcon from '@/components/Icons/Web.vue'
import WhatsappIcon from '@/components/Icons/Whatsapp.vue'
import InstagramIcon from '@/components/Icons/Instagram.vue'
import TiktokIcon from '@/components/Icons/Tiktok.vue'

export function composableService() {
  /** Icon mặc định */
  const ICON_MAP: Record<string, Component> = {
    FB_MESS: markRaw(FacebookIcon),
    FB_WHATSAPP: markRaw(WhatsappIcon),
    FB_INSTAGRAM: markRaw(InstagramIcon),
    ZALO: markRaw(ZaloIcon),
    ZALO_OA: markRaw(ZaloIcon),
    ZALO_PERSONAL: markRaw(ZaloIcon),
    WEBSITE: markRaw(WebIcon),
    TIKTOK: markRaw(TiktokIcon),
  }

  // trả về các biến, hàm cần thiết
  return {
    ICON_MAP,
  }
}
