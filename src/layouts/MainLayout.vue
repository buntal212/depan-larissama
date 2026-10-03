<template>
  <q-layout view="hHh Lpr lFf" class="app-layout" :class="{ 'transaction-layout': currentRoute === 'transactions' }">
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
          <img src="/icons/Larisama_logo_512px.png" alt="Larisama — Dagangan Laris, Sukses Bersama" />
        </router-link>

        <q-space />

        <div class="connection-status">
          <span class="status-dot"></span>
          <span>Mode demo</span>
        </div>

        <q-btn flat round icon="notifications_none" class="header-icon" aria-label="Notifikasi">
          <q-badge floating rounded color="accent" />
        </q-btn>

        <q-avatar size="38px" class="profile-avatar">A</q-avatar>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above :width="248" :breakpoint="900" class="app-drawer">
      <div class="drawer-content">
        <div class="store-switcher">
          <q-avatar size="40px" class="store-avatar"><q-icon name="storefront" /></q-avatar>
          <div class="store-copy">
            <div class="store-name">Warung Bu Ani</div>
            <div class="store-type">Warung makan</div>
          </div>
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
            <q-item-section v-if="item.label === 'Menu & barang'" side>
              <q-badge class="nav-count">{{ productCount }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="drawer-bottom">
          <div class="help-card">
            <div class="help-icon"><q-icon name="lightbulb" /></div>
            <div class="help-title">Mulai dari yang sederhana</div>
            <div class="help-text">Kelola menu dan catat transaksi warungmu di satu tempat.</div>
            <q-btn flat no-caps dense label="Pelajari Larisama" icon-right="arrow_forward" />
          </div>
          <div class="drawer-version">Larisama · Pratinjau awal</div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="mobile-bottom-nav">
      <q-tabs :model-value="currentRoute" dense align="justify" indicator-color="transparent" active-color="primary">
        <q-route-tab to="/" exact name="dashboard" icon="space_dashboard" label="Beranda" />
        <q-route-tab to="/menu" name="menu" icon="restaurant_menu" label="Menu" />
        <q-route-tab to="/transaksi" name="transactions" icon="point_of_sale" label="Kasir" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { products } from '@/stores/demo-data.js'

const drawerOpen = ref(false)
const route = useRoute()
const currentRoute = computed(() => {
  if (route.path.startsWith('/menu')) return 'menu'
  if (route.path.startsWith('/transaksi')) return 'transactions'
  return 'dashboard'
})
const productCount = computed(() => products.value.length)

const navigation = [
  { label: 'Dashboard', icon: 'space_dashboard', to: '/' },
  { label: 'Menu & barang', icon: 'restaurant_menu', to: '/menu' },
  { label: 'Transaksi', icon: 'point_of_sale', to: '/transaksi' },
]

function closeDrawerOnMobile() {
  if (window.innerWidth < 900) drawerOpen.value = false
}
</script>
