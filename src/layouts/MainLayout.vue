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
          <q-avatar size="40px" class="store-avatar"
            ><span class="store-avatar-mark" aria-hidden="true"
          /></q-avatar>
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
            exact
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
      <router-view />
    </q-page-container>

    <q-footer
      v-if="['owner', 'manager', 'kasir'].includes(authSession.user?.role)"
      class="mobile-bottom-nav"
    >
      <q-tabs
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
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { logout } from '@/services/auth.js'
import { authSession, getSelectedWarungId, setSelectedWarung } from '@/stores/auth-session.js'
import { products } from '@/stores/catalog.js'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const drawerOpen = ref(false)
const warungOptions = ref([])
const warungsLoading = ref(false)
const selectedWarungId = ref(getSelectedWarungId())
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const currentRoute = computed(() => {
  if (route.path === '/penjualan') return 'sales'
  if (route.path === '/pembelian') return 'purchases'
  if (route.path.startsWith('/laporan')) return 'reports'
  if (route.path === '/pengguna') return 'users'
  if (route.path === '/warung') return 'warung'
  if (route.path.startsWith('/menu')) return 'menu'
  if (route.path.startsWith('/transaksi')) return 'transactions'
  return 'dashboard'
})
const productCount = computed(() => products.value.length)

onMounted(async () => {
  if (authSession.user?.role !== 'superadmin') return
  warungsLoading.value = true
  try {
    warungOptions.value = await larisamaApi.listWarungs()
    const selected = warungOptions.value.find((warung) => String(warung.id) === String(selectedWarungId.value))
    if (selected) setSelectedWarung(selected)
    else if (selectedWarungId.value) {
      selectedWarungId.value = null
      setSelectedWarung(null)
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally { warungsLoading.value = false }
})

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
  if (role === 'superadmin')
    return [
      { label: 'Kelola Warung', icon: 'storefront', to: '/platform/warungs' },
      dashboard,
      catalog,
      { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
      salesHistory,
      { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
      { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
      { label: 'Pengguna', icon: 'group', to: '/pengguna' },
    ]
  if (role === 'kasir')
    return [
      dashboard,
      { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
      catalog,
      salesHistory,
    ]
  if (role === 'manager')
    return [
      dashboard,
      catalog,
      salesHistory,
      { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
      { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
      { label: 'Profil Warung', icon: 'storefront', to: '/warung' },
    ]
  return [
    dashboard,
    { label: 'Kasir', icon: 'point_of_sale', to: '/transaksi' },
    catalog,
    salesHistory,
    { label: 'Pembelian', icon: 'shopping_cart', to: '/pembelian' },
    { label: 'Laporan', icon: 'bar_chart', to: '/laporan' },
    { label: 'Pengguna', icon: 'group', to: '/pengguna' },
    { label: 'Profil Warung', icon: 'storefront', to: '/warung' },
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
