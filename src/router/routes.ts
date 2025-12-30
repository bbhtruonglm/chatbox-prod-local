import AllWidget from '@/views/Dashboard/Widget/AllWidget.vue'
import ChatShort from '@/views/ChatWarper.vue'
import Dashboard from '@/views/Dashboard.vue'
import DeauthorizeInstagram from '@/views/DeauthorizeInstagram.vue'
import DeleteAccount from '@/views/DeleteAccount.vue'
import Download from '@/views/Dashboard/Download.vue'
import DownloadApp from '@/views/DownloadApp.vue'
import ForgotPassword from '@/views/OAuth/ForgotPassword.vue'
import InstagramRedirectUri from '@/views/InstagramRedirectUri.vue'
import InstalledWidget from '@/views/Dashboard/Widget/InstalledWidget.vue'
import Login from '@/views/OAuth/Login.vue'
import LoginEmail from '@/views/OAuth/LoginEmail.vue'
import MyWidget from '@/views/Dashboard/Widget/MyWidget.vue'
import Noti from '@/views/Dashboard/Noti.vue'
import OAuthV2 from '@/views/OAuthV2.vue'
import Onboarding from '@/views/OAuth/Onboarding/Onboarding.vue'
import Org from '@/views/Dashboard/Org.vue'
import OrgAgent from '@/views/Dashboard/Org/Agent.vue'
import OrgApi from '@/views/Dashboard/Org/Api.vue'
import OrgApp from '@/views/Dashboard/Org/App.vue'
import OrgPay from '@/views/Dashboard/Org/Pay.vue'
import OrgPayInfo from '@/views/Dashboard/Org/Pay/Info.vue'
import OrgPayReCharge from '@/views/Dashboard/Org/Pay/ReCharge.vue'
import OrgSetting from '@/views/Dashboard/Org/Setting.vue'
import OrgWebhook from '@/views/Dashboard/Org/Webhook.vue'
import PageNotFound from '@/views/404.vue'
import PostAnalyticIframe from '@/views/PostAnalyticIframe.vue'
import Pricing from '@/views/Dashboard/Pricing.vue'
import Register from '@/views/OAuth/Register.vue'
import RegisterDetail from '@/views/OAuth/RegisterDetail.vue'
import ResetPassword from '@/views/OAuth/ResetPassword.vue'
import SelectPage from '@/views/Dashboard/SelectPage.vue'
import SelectPlatform from '@/views/Dashboard/SelectPlatform.vue'
import TakeControl from '@/views/TakeControl.vue'
import Template from '@/views/Template.vue'
import TiktokRedirectUri from '@/views/TiktokRedirectUri.vue'
import User from '@/views/Dashboard/User.vue'
import Widget from '@/views/Dashboard/Widget.vue'
import ZaloPeronalCore from '@/views/ZaloPeronalCore.vue'

export const routes = [
  { path: '/', component: ChatShort },
  // { path: '/', redirect: '/oauth' },

  {
    path: '/oauth',
    redirect: '/oauth/login',
    component: OAuthV2,
    children: [
      { path: 'login', component: Login },
      { path: 'login-email', component: LoginEmail },
      { path: 'register', component: Register },
      { path: 'register-detail', component: RegisterDetail },
      { path: 'forgot-password', component: ForgotPassword },
      { path: 'reset-password', component: ResetPassword },
    ],
  },
  { path: '/onboarding', component: Onboarding },

  {
    path: '/logout',
    redirect: '/oauth',
  },

  // { path: '/chat', component: ChatShort },
  { path: '/chat', redirect: '/' },

  {
    path: '/dashboard',
    redirect: '/dashboard/select-page',
    component: Dashboard,
    children: [
      { path: 'select-page', component: SelectPage },
      { path: 'select-platform', component: SelectPlatform },
      { path: 'pricing', component: Pricing },
      {
        path: 'widget',
        redirect: '/dashboard/widget/market',
        component: Widget,
        children: [
          { path: 'market', component: AllWidget },
          { path: 'installed', component: InstalledWidget },
          { path: 'my-widget', component: MyWidget },
        ],
      },
      {
        path: 'org',
        redirect: '/dashboard/org/setting',
        component: Org,
        children: [
          { path: 'setting', component: OrgSetting },
          {
            path: 'pay',
            redirect: '/dashboard/org/pay/info',
            component: OrgPay,
            children: [
              { path: 'info', component: OrgPayInfo },
              { path: 'recharge', component: OrgPayReCharge },
            ],
          },
          { path: 'app', component: OrgApp },
          { path: 'api', component: OrgApi },
          { path: 'virtual-assistant', component: OrgAgent },
          { path: 'webhook', component: OrgWebhook },
        ],
      },
      { path: 'noti', component: Noti },
      { path: 'download', component: Download },
      { path: 'user', component: User },
    ],
  },
  { path: '/template', component: Template },
  { path: '/download-app', component: DownloadApp },
  { path: '/take-control', component: TakeControl },
  { path: '/delete-account', component: DeleteAccount },
  { path: '/deauthorize-instagram', component: DeauthorizeInstagram },
  { path: '/post-analytic', component: PostAnalyticIframe },
  { path: '/instagram-redirect-uri', component: InstagramRedirectUri },
  { path: '/tiktok-redirect-uri', component: TiktokRedirectUri },
  { path: '/zalo-personal-conversation', component: ZaloPeronalCore },
  { path: '/404', component: PageNotFound },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: PageNotFound },
]
