<template>
  <q-page class="page-shell dashboard-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">{{ formattedDate }}</div>
        <h1 class="page-title">Selamat pagi, Ani <span class="wave">☀️</span></h1>
        <p class="page-subtitle">Ini ringkasan warungmu hari ini. Semangat, ya!</p>
      </div>
      <div class="col-auto heading-actions">
        <q-btn outline no-caps color="grey-8" icon="calendar_today" label="Hari ini" class="date-button" />
        <q-btn unelevated no-caps color="primary" icon="add" label="Tambah menu" to="/menu" />
      </div>
    </div>

    <section class="summary-grid" aria-label="Ringkasan hari ini">
      <SummaryCard label="Omzet hari ini" value="Rp 1.245.000" note="Dari penjualan hari ini" icon="payments" change="12,8%" />
      <SummaryCard label="Pesanan masuk" value="38 pesanan" note="5 pesanan sedang diproses" icon="receipt_long" change="8,2%" tone="orange" />
      <SummaryCard label="Rata-rata transaksi" value="Rp 32.763" note="Per pesanan" icon="shopping_bag" change="4,1%" tone="purple" />
      <SummaryCard label="Menu tersedia" :value="`${availableCount} menu`" :note="`${totalCount} menu terdaftar`" icon="restaurant_menu" change="Aktif" tone="blue" change-tone="neutral" change-icon="check_circle" />
    </section>

    <section class="content-grid">
      <q-card flat bordered class="panel-card sales-panel">
        <q-card-section class="panel-heading row items-start justify-between">
          <div>
            <div class="panel-title">Ringkasan penjualan</div>
            <div class="panel-caption">Performa warung selama 7 hari terakhir</div>
          </div>
          <q-btn-dropdown outline no-caps color="grey-8" label="7 hari terakhir" icon-right="expand_more" class="period-button">
            <q-list>
              <q-item v-for="period in ['7 hari terakhir', '30 hari terakhir']" :key="period" clickable v-close-popup>
                <q-item-section>{{ period }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </q-card-section>
        <q-card-section class="chart-summary row items-end q-col-gutter-md">
          <div class="col-auto">
            <div class="chart-total">Rp 6.840.000</div>
            <div class="chart-growth"><q-icon name="trending_up" /> 12,8% <span>dari minggu lalu</span></div>
          </div>
          <q-space />
          <div class="chart-legend"><span></span> Penjualan</div>
        </q-card-section>
        <q-card-section class="chart-area">
          <div class="chart-y-labels"><span>Rp 1,5 jt</span><span>Rp 1 jt</span><span>Rp 500 rb</span><span>Rp 0</span></div>
          <div class="chart-bars">
            <div v-for="day in salesDays" :key="day.label" class="chart-column">
              <div class="chart-bar-track"><div class="chart-bar" :class="{ 'bar-today': day.today }" :style="{ height: `${day.height}%` }"></div></div>
              <span :class="{ 'day-today': day.today }">{{ day.label }}</span>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="panel-card quick-panel">
        <q-card-section class="panel-heading">
          <div class="panel-title">Akses cepat</div>
          <div class="panel-caption">Yang sering kamu butuhkan</div>
        </q-card-section>
        <q-card-section class="quick-action-list">
          <router-link v-for="action in quickActions" :key="action.title" :to="action.to" class="quick-action">
            <div class="quick-icon" :class="`tone-${action.tone}`"><q-icon :name="action.icon" /></div>
            <div class="quick-action-copy"><div>{{ action.title }}</div><span>{{ action.caption }}</span></div>
            <q-icon name="chevron_right" color="grey-5" />
          </router-link>
        </q-card-section>
      </q-card>
    </section>

    <section class="panel-card favorites-section">
      <div class="section-heading row items-center justify-between">
        <div>
          <div class="panel-title">Menu favorit</div>
          <div class="panel-caption">Menu yang paling sering dipesan hari ini</div>
        </div>
        <q-btn flat no-caps color="primary" label="Lihat semua menu" icon-right="arrow_forward" to="/menu" />
      </div>
      <div class="favorites-grid">
        <ProductCard
          v-for="product in popularProducts"
          :key="product.id"
          :product="product"
          @edit="editProduct"
          @toggle="toggleAvailability"
        />
        <div v-if="popularProducts.length === 0" class="empty-favorites">
          <q-icon name="restaurant_menu" />
          <span>Tambahkan menu favorit untuk melihatnya di sini.</span>
        </div>
      </div>
    </section>

    <ProductFormDialog v-model="formOpen" :product="selectedProduct" @save="saveProduct" />
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import ProductCard from '@/components/ProductCard.vue'
import ProductFormDialog from '@/components/ProductFormDialog.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import { products, saveProduct as saveProductRecord, toggleProductAvailability } from '@/stores/demo-data.js'

const $q = useQuasar()
const formOpen = ref(false)
const selectedProduct = ref(null)
const totalCount = computed(() => products.value.length)
const availableCount = computed(() => products.value.filter((product) => product.available).length)
const popularProducts = computed(() => products.value.filter((product) => product.popular && product.available).slice(0, 4))

const formattedDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

const salesDays = [
  { label: 'Sen', height: 48 },
  { label: 'Sel', height: 66 },
  { label: 'Rab', height: 53 },
  { label: 'Kam', height: 78 },
  { label: 'Jum', height: 62 },
  { label: 'Sab', height: 91 },
  { label: 'Min', height: 72, today: true },
]

const quickActions = [
  { title: 'Tambah menu baru', caption: 'Catat barang atau menu', icon: 'add_circle', tone: 'green', to: '/menu' },
  { title: 'Buka kasir', caption: 'Mulai pesanan baru', icon: 'point_of_sale', tone: 'orange', to: '/transaksi' },
  { title: 'Lihat semua menu', caption: 'Atur stok dan harga', icon: 'inventory_2', tone: 'purple', to: '/menu' },
]

function editProduct(product) {
  selectedProduct.value = product
  formOpen.value = true
}

function saveProduct(product) {
  saveProductRecord(product)
  $q.notify({ type: 'positive', message: 'Menu berhasil disimpan', position: 'top', timeout: 1800 })
}

function toggleAvailability(product) {
  toggleProductAvailability(product.id)
  $q.notify({ type: 'info', message: product.available ? 'Menu ditandai habis' : 'Menu tersedia kembali', position: 'top', timeout: 1800 })
}
</script>
