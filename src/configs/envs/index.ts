/**thiết lập của môi trường này */
const ENV: IEnv = {
  local_storage: {
    prefix: import.meta.env.VITE_LOCAL_STORAGE_PREFIX,
  },
  session_storage: {
    prefix: import.meta.env.VITE_SESSION_STORAGE_PREFIX,
  },
  host: {
    n3_socket: import.meta.env.VITE_HOST_N3_SOCKET,
    n4_service_v1: import.meta.env.VITE_HOST_N4_SERVICE_V1,
    n4_service_v2: import.meta.env.VITE_HOST_N4_SERVICE_V2,
    n5_app_v1: import.meta.env.VITE_HOST_N5_APP_V1,
    n5_app_v2: import.meta.env.VITE_HOST_N5_APP_V2,
    n6_static: import.meta.env.VITE_HOST_N6_STATIC,
    n9_analytic_v2: import.meta.env.VITE_HOST_N9_ANALYTIC_V2,
    billing: import.meta.env.VITE_HOST_BILLING,
    ai: import.meta.env.VITE_HOST_AI,
    chatbot: import.meta.env.VITE_HOST_CHATBOT,
    n8_merge: import.meta.env.VITE_HOST_N8_MERGE,
    widget: import.meta.env.VITE_HOST_WIDGET,
    n8_merge_v2: import.meta.env.VITE_HOST_N8_MERGE_V2,
    media_cdn: import.meta.env.VITE_HOST_MEDIA_CDN,
    n13_zalo_personal: import.meta.env.VITE_HOST_N13_ZALO_PERSONAL,
    n13_zalo_personal_socket: import.meta.env
      .VITE_HOST_N13_ZALO_PERSONAL_SOCKET,
    agent_config: import.meta.env.VITE_HOST_AGENT_CONFIG,
    merchant: {
      contact: import.meta.env.VITE_HOST_MERCHANT_CONTACT,
    },
    backup: import.meta.env.VITE_HOST_BACKUP,
  },
  external_link: {
    setting: import.meta.env.VITE_EXTERNAL_SETTING,
    analytic: import.meta.env.VITE_EXTERNAL_ANALYTIC,
    chatbot: import.meta.env.VITE_EXTERNAL_CHATBOT,
    chatbox: import.meta.env.VITE_EXTERNAL_CHATBOX,
    download: import.meta.env.VITE_EXTERNAL_DOWNLOAD,
    merchant: import.meta.env.VITE_EXTERNAL_MERCHANT,
    admin: import.meta.env.VITE_EXTERNAL_ADMIN,
  },
  facebook: {
    app_id: import.meta.env.VITE_FACEBOOK_APP_ID,
    permissions: import.meta.env.VITE_FACEBOOK_PERMISSIONS?.split(','),
    login_option: {
      return_scopes:
        import.meta.env.VITE_FACEBOOK_LOGIN_RETURN_SCOPES === 'true',
      auth_type: import.meta.env.VITE_FACEBOOK_LOGIN_AUTH_TYPE,
      enable_profile_selector:
        import.meta.env.VITE_FACEBOOK_LOGIN_ENABLE_PROFILE_SELECTOR === 'true',
    },
  },
  zalo_oa: {
    portal: import.meta.env.VITE_ZALO_OA_PORTAL,
  },
  instagram: {
    redirect_uri: import.meta.env.VITE_INSTAGRAM_REDIRECT_URI,
    app_id: import.meta.env.VITE_INSTAGRAM_APP_ID,
    scope: import.meta.env.VITE_INSTAGRAM_SCOPE?.split(','),
  },
  platform: import.meta.env.VITE_SUPPORTED_PLATFORMS?.split(','),
  img_host: import.meta.env.VITE_IMG_HOST,
  is_show_payment: import.meta.env.VITE_IS_SHOW_PAYMENT === 'true',
}

export default ENV
