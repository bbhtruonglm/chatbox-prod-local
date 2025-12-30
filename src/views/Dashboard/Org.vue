<template>
  <div
    v-if="orgStore.is_loading"
    class="absolute top-9 left-1/2 -translate-x-1/2 z-50"
  >
    <Loading />
  </div>
  <DashboardLayout class_content="flex flex-col gap-3 relative overflow-y-auto">
    <template #menu><Menu /></template>
    <template #content>
      <div class="flex gap-3">
        <SelectOrg />
        <ReChargeBtn v-if="$route.path.includes('/dashboard/org/pay')" />
      </div>
      <RouterView v-if="orgStore.isAdminOrg()" />
      <div
        v-else
        class="text-sm text-slate-500"
      >
        {{ $t('v1.view.main.dashboard.org.permision_denied') }}
      </div>
    </template>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { useOrgStore } from '@/stores'
import { useEmbedChat } from '@/views/composables/useEmbedChat'

import Loading from '@/components/Loading.vue'
import DashboardLayout from '@/components/Main/Dashboard/DashboardLayout.vue'
import SelectOrg from '@/components/Main/Dashboard/SelectOrg.vue'
import Menu from '@/views/Dashboard/Org/Menu.vue'
import ReChargeBtn from '@/views/Dashboard/Org/ReChargeBtn.vue'

const orgStore = useOrgStore()

// cắm bong bóng chat vào trang
useEmbedChat()
</script>
