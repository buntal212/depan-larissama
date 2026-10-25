<template>
  <q-page class="page-shell settings-page" data-ui="settings">
    <header class="page-heading settings-heading">
      <div>
        <h1 class="page-title">Pengaturan</h1>
        <p class="page-subtitle">Profil warung, akun pengguna, dan perangkat kasir.</p>
      </div>
    </header>

    <q-tabs
      :model-value="activeTab"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="secondary"
      narrow-indicator
      class="settings-tabs"
      aria-label="Bagian pengaturan"
    >
      <q-route-tab
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        :name="tab.name"
        :icon="tab.icon"
        :label="tab.label"
        exact
      />
    </q-tabs>

    <div class="settings-tab-body">
      <router-view #default="{ Component }">
        <component :is="Component" />
      </router-view>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authSession } from '@/stores/auth-session.js'

const route = useRoute()
const router = useRouter()
const tabs = computed(() => {
  const role = authSession.user?.role
  const visibleTabs = []
  if (['owner', 'manager', 'kasir'].includes(role)) {
    visibleTabs.push({ name: 'profile', label: 'Profil warung', icon: 'storefront', to: '/pengaturan/profil' })
  }
  if (role === 'owner' || role === 'superadmin') {
    visibleTabs.push({ name: 'users', label: 'Pengguna', icon: 'group', to: '/pengaturan/pengguna' })
  }
  visibleTabs.push({ name: 'printer', label: 'Printer', icon: 'print', to: '/pengaturan/printer' })
  return visibleTabs
})
const activeTab = computed(() => {
  const tab = tabs.value.find((entry) => entry.to === route.path)
  return tab?.name || tabs.value[0]?.name || 'printer'
})

onMounted(() => {
  if (route.path === '/pengaturan') {
    void router.replace(tabs.value[0]?.to || '/pengaturan/printer')
  }
})
</script>

<style scoped>
.settings-page {
  width: min(100%, 1120px);
  margin-inline: auto;
}

.settings-heading {
  margin-bottom: 20px;
}

.settings-heading .page-title {
  letter-spacing: -0.025em;
}

.settings-tabs {
  min-height: 48px;
  border-bottom: 1px solid #dfe8e2;
}

.settings-tabs :deep(.q-tab) {
  min-height: 48px;
  padding-inline: 18px;
  color: #617169;
}

.settings-tabs :deep(.q-tab--active) {
  color: #145c40;
  font-weight: 700;
}

.settings-tabs :deep(.q-tab__indicator) {
  background-color: #f36b35;
  height: 3px;
  border-radius: 3px 3px 0 0;
}

.settings-tab-body {
  padding-top: 24px;
}

@media (max-width: 600px) {
  .settings-heading {
    margin-bottom: 12px;
  }

  .settings-tabs :deep(.q-tab) {
    min-width: 0;
    padding-inline: 12px;
  }

  .settings-tab-body {
    padding-top: 18px;
  }
}
</style>
