<template>
  <q-layout
    view="hHh Lpr lFf"
    class="app-layout"
    :class="{ 'transaction-layout': currentRoute === 'transactions' }"
  >
    <q-header class="app-header">
      <q-toolbar class="header-toolbar">
        <q-btn
          class="mobile-menu-button"
          flat
          round
          dense
          icon="menu"
          aria-label="Buka navigasi"
          @click="drawerOpen = !drawerOpen"
        />

        <router-link to="/" class="brand-link" aria-label="Larisama, ke dashboard">
          <img
            src="/icons/Larisama_logo_512px.png"
            alt="Larisama — Dagangan Laris, Sukses Bersama"
          />
        </router-link>
        <!-- <span class="app-title">XXX</span> -->
        <q-space />

        <q-btn-dropdown flat no-caps dropdown-icon="expand_more" class="account-menu">
          <template #label>
            <q-avatar size="38px" class="profile-avatar">{{ userInitials }}</q-avatar>
          </template>
          <q-list style="min-width: 220px">
            <q-item
              ><q-item-section
                ><q-item-label>{{ authSession.user?.nama }}</q-item-label
                ><q-item-label caption>{{ authSession.user?.role }}</q-item-label></q-item-section
              ></q-item
            >
            <q-separator />
            <q-item clickable v-close-popup @click="signOut"
              ><q-item-section avatar><q-icon name="logout" /></q-item-section
              ><q-item-section>Keluar</q-item-section></q-item
            >
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :behavior="$q.screen.width < 900 ? 'mobile' : 'desktop'"
      :width="248"
      :breakpoint="900"
      class="app-drawer"
    >
      <div class="drawer-content">
        <div class="store-switcher">
          <q-avatar size="40px" class="store-avatar">
            <img
              v-if="warungLogo"
              :src="warungLogo"
              :alt="`Logo ${authSession.warung?.nama || 'warung'}`"
              @error="handleWarungLogoError"
            />
            <span v-else class="store-avatar-mark" aria-hidden="true" />
          </q-avatar>
          <div class="store-copy" v-if="authSession.user?.role !== 'superadmin'">
            <div class="store-name" :title="authSession.warung?.nama || 'Larisama'">
              {{ authSession.warung?.nama || 'Larisama' }}
            </div>
            <!-- <div class="store-type">{{ authSession.warung?.kode || 'Warung aktif' }}</div> -->
          </div>
          <q-select
            v-else
            v-model="selectedWarungId"
            class="superadmin-warung-select"
            dense
            borderless
            emit-value
            map-options
            option-value="id"
            option-label="nama"
            :options="warungOptions"
            label="Pilih warung"
            :loading="warungsLoading"
            @update:model-value="changeWarung"
          />
          <q-icon name="expand_more" color="grey-6" />
        </div>

        <div class="nav-caption">MENU UTAMA</div>
        <q-list class="nav-list">
          <q-item
            v-for="item in navigation"
            :key="item.label"
            clickable
            :to="item.to"
            :exact="item.to !== '/pengaturan'"
            active-class="nav-item-active"
            class="nav-item"
            @click="closeDrawerOnMobile"
          >
            <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
            <q-item-section v-if="item.label === 'Kategori & Menu'" side>
              <q-badge class="nav-count">{{ productCount }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="drawer-bottom">
          <div class="drawer-version">Dibuat oleh <strong>Udumbara Informatika</strong></div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-banner v-if="subscriptionDaysRemaining !== null" dense class="subscription-expiry-banner no-print">
        <template #avatar><q-icon name="schedule" /></template>
        <div class="subscription-expiry-copy" role="status" aria-live="polite">
          <span class="subscription-expiry-accessible">{{ subscriptionMessage }}</span>
          <div class="subscription-ticker" aria-hidden="true">
            <div class="subscription-ticker-track">
              <span>{{ subscriptionMessage }}</span>
              <span>{{ subscriptionMessage }}</span>
            </div>
          </div>
        </div>
      </q-banner>
      <router-view />
    </q-page-container>

    <q-footer class="mobile-bottom-nav">
      <q-tabs
        v-if="paymentOnly"
        dense
        align="justify"
        indicator-color="transparent"
        active-color="primary"
      >
        <q-route-tab
          to="/paket-langganan"
          name="subscription"
          icon="sell"
          label="Paket langganan"
        />
      </q-tabs>
      <q-tabs
        v-else
        :model-value="currentRoute"
        dense
        align="justify"
        indicator-color="transparent"
        active-color="primary"
      >
        <q-route-tab to="/" exact name="dashboard" icon="space_dashboard" label="Beranda" />
        <q-route-tab to="/menu" name="menu" icon="restaurant_menu" label="Menu" />
        <q-route-tab to="/transaksi" name="transactions" icon="point_of_sale" label="Kasir" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { logout } from '@/services/auth.js'
import { authSession, getSelectedWarungId, setSelectedWarung } from '@/stores/auth-session.js'
import { products } from '@/stores/catalog.js'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { useBleThermalPrinter } from '@/services/useBleThermalPrinter.js'

const drawerOpen = ref(false)
const warungOptions = ref([])
const warungsLoading = ref(false)
const selectedWarungId = ref(getSelectedWarungId())
const failedWarungLogo = ref(null)
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const warungToday = ref(getWarungLocalDate())
let warungDateTimer
const paymentOnly = computed(
  () => authSession.user?.role === 'owner' && authSession.warung?.status_langganan === 'kedaluwarsa',
)
const subscriptionDaysRemaining = computed(() => {
  if (authSession.user?.role !== 'owner' || authSession.warung?.status_langganan !== 'aktif') return null
  const expiryDate = authSession.warung?.tanggal_berakhir
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate || '')) return null

  const today = Date.parse(`${warungToday.value}T00:00:00Z`)
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`)
  if (!Number.isFinite(today) || !Number.isFinite(expiry)) return null

  const days = Math.round((expiry - today) / 86_400_000)
  return days >= 1 && days <= 3 ? days : null
})
const subscriptionMessage = computed(
  () => `Masa aktif langganan Larisama Anda tersisa ${subscriptionDaysRemaining.value} hari. Silakan lakukan pembayaran sebelum masa aktif habis.`,
)
const { reconnectRememberedPrinter } = useBleThermalPrinter()
const currentRoute = computed(() => {
  if (route.path === '/penjualan') return 'transactions'
  if (route.path.startsWith('/menu')) return 'menu'
  if (route.path.startsWith('/transaksi')) return 'transactions'
  return 'dashboard'
})
const productCount = computed(() => products.value.length)
const warungLogo = computed(() => {
  const logo = authSession.warung?.logo
  return logo && logo !== failedWarungLogo.value ? logo : ''
})

watch(
  () => authSession.warung?.logo,
  () => {
    failedWarungLogo.value = null
  },
)

function handleWarungLogoError() {
  failedWarungLogo.value = authSession.warung?.logo || null
}

onMounted(async () => {
  warungDateTimer = window.setInterval(() => {
    warungToday.value = getWarungLocalDate()
  }, 60_000)
  if (authSession.token && authSession.user) void reconnectRememberedPrinter()
  if (authSession.user?.role !== 'superadmin') return
  warungsLoading.value = true
  try {
    warungOptions.value = await larisamaApi.listWarungs()
    const selected = warungOptions.value.find(
      (warung) => String(warung.id) === String(selectedWarungId.value),
    )
    if (selected) setSelectedWarung(selected)
    else if (selectedWarungId.value) {
      selectedWarungId.value = null
      setSelectedWarung(null)
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    warungsLoading.value = false
  }
})

onBeforeUnmount(() => window.clearInterval(warungDateTimer))

watch(() => authSession.warung?.timezone, () => {
  warungToday.value = getWarungLocalDate()
})

function getWarungLocalDate() {
  const timeZone = authSession.warung?.timezone || 'Asia/Jakarta'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

function changeWarung(id) {
  const selected = warungOptions.value.find((warung) => String(warung.id) === String(id))
  setSelectedWarung(selected)
  if (selected) window.location.reload()
}

const navigation = computed(() => {
  const dashboard = { label: 'Dashboard', icon: 'space_dashboard', to: '/' }
  const catalog = { label: 'Kategori & Menu', icon: 'restaurant_menu', to: '/menu' }
  const salesHistory = { label: 'Penjualan', icon: 'receipt_long', to: '/penjualan' }
  const role = authSession.user?.role
  if (paymentOnly.value) {
    return [{ label: 'Paket langganan', icon: 'sell', to: '/paket-langganan' }]
  }
  if (role === 'superadmin')
    return [
      { label: 'Kelola Warung', icon: 'storefront', to: '/platform/warungs' },
      dashboard,
      catalog,
      { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
      salesHistory,
      { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
      { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
      { label: 'Pengaturan', icon: 'settings', to: '/pengaturan' },
    ]
  if (role === 'kasir')
    return [
      dashboard,
      { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
      catalog,
      salesHistory,
      { label: 'Pengaturan', icon: 'settings', to: '/pengaturan' },
    ]
  if (role === 'manager')
    return [
      dashboard,
      catalog,
      salesHistory,
      { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
      { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
      { label: 'Pengaturan', icon: 'settings', to: '/pengaturan' },
    ]
  return [
    dashboard,
    { label: 'Paket langganan', icon: 'sell', to: '/paket-langganan' },
    { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
    catalog,
    salesHistory,
    { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
    { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
    { label: 'Pengaturan', icon: 'settings', to: '/pengaturan' },
  ]
})
const userInitials = computed(() =>
  (authSession.user?.nama || 'LS')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(),
)

async function signOut() {
  await logout()
  await router.replace('/login')
}

function closeDrawerOnMobile() {
  if (window.innerWidth < 900) drawerOpen.value = false
}
</script>
