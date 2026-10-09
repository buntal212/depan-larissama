<template>
  <q-page class="page-shell dashboard-page">
    <PlatformOverview v-if="isSuperadmin" />
    <template v-else>
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">{{ formattedDate }}</div>
        <h1 class="page-title">Selamat pagi, Ani <span class="wave">☀️</span></h1>
        <p class="page-subtitle">Ini ringkasan warungmu hari ini. Semangat, ya!</p>
      </div>
      <div class="col-auto heading-actions">
        <q-btn outline no-caps color="grey-8" icon="calendar_today" label="Hari ini" class="date-button" />
        <q-btn v-if="canManageCatalog" unelevated no-caps color="primary" icon="add" label="Tambah menu" to="/menu" />
      </div>
    </div>

    <section class="summary-grid" aria-label="Ringkasan hari ini">
      <SummaryCard label="Penjualan hari ini" :value="salesReady ? formatPrice(salesTodayTotal) : '—'" note="Dari data server" icon="payments" change="Hari ini" />
      <SummaryCard label="Transaksi hari ini" :value="salesReady ? `${salesTodayCount} transaksi` : '—'" note="Sesuai akses akun" icon="receipt_long" change="Server" tone="orange" />
      <SummaryCard v-if="canViewReports" label="Pembelian hari ini" :value="purchasesReady ? formatPrice(purchasesTodayTotal) : '—'" note="Dari laporan server" icon="shopping_bag" change="Hari ini" tone="purple" />
      <SummaryCard label="Menu aktif" :value="`${availableCount} menu`" :note="`${totalCount} menu terdaftar`" icon="restaurant_menu" change="Aktif" tone="blue" change-tone="neutral" change-icon="check_circle" />
    </section>
    <q-banner v-if="loadError" rounded class="q-mb-lg bg-red-1 text-negative">{{ loadError }}</q-banner>
    <q-banner v-else-if="loading" rounded class="q-mb-lg bg-green-1 text-primary">Memuat ringkasan dari server...</q-banner>

    <section class="content-grid">
      <q-card flat bordered class="panel-card sales-panel">
        <q-card-section class="panel-heading row items-start justify-between">
          <div>
            <div class="panel-title">Ringkasan penjualan</div>
            <div class="panel-caption">Riwayat transaksi server selama 7 hari terakhir</div>
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
          <div class="chart-total">{{ formatPrice(chartTotal) }}</div>
          <div class="chart-growth"><q-icon name="info" /> Data API <span>7 hari terakhir</span></div>
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
          <div class="panel-title">Menu aktif</div>
          <div class="panel-caption">Pilihan dari katalog warung</div>
        </div>
        <q-btn flat no-caps color="primary" label="Lihat semua menu" icon-right="arrow_forward" to="/menu" />
      </div>
      <div class="favorites-grid">
        <ProductCard
          v-for="product in popularProducts"
          :key="product.id"
          :product="product"
          :can-manage="canManageCatalog"
          @edit="editProduct"
          @toggle="toggleAvailability"
        />
        <div v-if="popularProducts.length === 0" class="empty-favorites">
          <q-icon name="restaurant_menu" />
          <span>Belum ada menu aktif di katalog.</span>
        </div>
      </div>
    </section>

    <ProductFormDialog v-if="canManageCatalog" v-model="formOpen" :product="selectedProduct" :categories="categories" :saving="savingProduct" @save="saveProduct" />
    </template>
    <AppAttribution />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import ProductCard from '@/components/ProductCard.vue'
import ProductFormDialog from '@/components/ProductFormDialog.vue'
import SummaryCard from '@/pages/Dashboard/components/SummaryCard.vue'
import PlatformOverview from '@/pages/Dashboard/components/PlatformOverview.vue'
import AppAttribution from '@/components/AppAttribution.vue'
import { authSession } from '@/stores/auth-session.js'
import { categories, loadCatalog, products, saveProduct as saveProductRecord, toggleProductAvailability } from '@/stores/catalog.js'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const $q = useQuasar()
const isSuperadmin = computed(() => authSession.user?.role === 'superadmin')
const canManageCatalog = computed(() => ['owner', 'manager'].includes(authSession.user?.role))
const canViewReports = computed(() => ['owner', 'manager', 'superadmin'].includes(authSession.user?.role))
const formOpen = ref(false)
const savingProduct = ref(false)
const selectedProduct = ref(null)
const salesRecords = ref([])
const salesTodayReport = ref(null)
const purchasesTodayReport = ref(null)
const loading = ref(false)
const loadError = ref('')
const salesReady = ref(false)
const purchasesReady = ref(false)
const totalCount = computed(() => products.value.length)
const availableCount = computed(() => products.value.filter((product) => product.available).length)
const popularProducts = computed(() => products.value.filter((product) => product.available).slice(0, 4))
const salesToday = computed(() => salesRecords.value.filter((sale) => dateKey(sale.tanggal) === todayKey() && sale.status !== 'batal'))
const salesTodayTotal = computed(() => salesTodayReport.value?.total_pendapatan ?? salesToday.value.reduce((total, sale) => total + Number(sale.total || 0), 0))
const purchasesTodayTotal = computed(() => purchasesTodayReport.value?.total_pembelian)
const salesTodayCount = computed(() => salesTodayReport.value?.jumlah_transaksi ?? salesToday.value.length)
const chartTotal = computed(() => salesDays.value.reduce((total, day) => total + day.amount, 0))

const formattedDate = computed(() => new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  timeZone: authSession.warung?.timezone || 'Asia/Jakarta',
}).format(new Date()))

const salesDays = computed(() => {
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDate(today, index - 6)
    const amount = salesRecords.value
      .filter((sale) => sale.status !== 'batal' && dateKey(sale.tanggal) === key)
      .reduce((total, sale) => total + Number(sale.total || 0), 0)
    const date = new Date(`${key}T12:00:00Z`)
    const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: authSession.warung?.timezone || 'Asia/Jakarta' }).format(date)
    return { label, amount, today: index === 6 }
  })
  const max = Math.max(...days.map((day) => day.amount), 1)
  return days.map((day) => ({ ...day, height: day.amount === 0 ? 0 : Math.max(8, (day.amount / max) * 100) }))
})

const quickActions = computed(() => authSession.user?.role === 'superadmin' ? [
  { title: 'Pilih warung', caption: 'Tentukan data yang ditinjau', icon: 'storefront', tone: 'green', to: '/platform/warungs' },
  { title: 'Lihat katalog', caption: 'Baca kategori dan menu', icon: 'restaurant_menu', tone: 'orange', to: '/menu' },
  { title: 'Lihat penjualan', caption: 'Baca transaksi warung', icon: 'receipt_long', tone: 'blue', to: '/penjualan' },
  { title: 'Lihat laporan', caption: 'Baca ringkasan periode', icon: 'bar_chart', tone: 'purple', to: '/laporan' },
] : [
  { title: 'Tambah menu baru', caption: 'Atur katalog warung', icon: 'add_circle', tone: 'green', to: '/menu' },
  { title: 'Buka kasir', caption: 'Catat penjualan', icon: 'point_of_sale', tone: 'orange', to: '/transaksi' },
  ...(canViewReports.value ? [{ title: 'Catat pembelian', caption: 'Tambahkan pengeluaran', icon: 'shopping_cart', tone: 'purple', to: '/pembelian' }, { title: 'Lihat laporan', caption: 'Pilih periode laporan', icon: 'bar_chart', tone: 'blue', to: '/laporan' }] : []),
])

function dateKey(value) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: authSession.warung?.timezone || 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${values.year}-${values.month}-${values.day}`
}
function todayKey() { return dateKey(new Date()) }
function shiftDate(value, amount) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
function formatPrice(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0)) }

onMounted(async () => {
  if (isSuperadmin.value) return
  loading.value = true
  const today = todayKey()
  try {
    await loadCatalog({ force: true })
    const requests = [larisamaApi.listSales({ date_from: shiftDate(today, -6), date_to: today })]
    if (canViewReports.value) requests.push(larisamaApi.salesReport(today, today), larisamaApi.purchasesReport(today, today))
    const results = await Promise.allSettled(requests)
    if (results[0].status === 'fulfilled') { salesRecords.value = results[0].value; salesReady.value = true }
    else throw results[0].reason
    if (canViewReports.value) {
      if (results[1].status === 'fulfilled') salesTodayReport.value = results[1].value
      if (results[2].status === 'fulfilled') { purchasesTodayReport.value = results[2].value; purchasesReady.value = true }
    }
  } catch (error) {
    loadError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: loadError.value, position: 'top' })
  } finally {
    loading.value = false
  }
})

function editProduct(product) {
  selectedProduct.value = product
  formOpen.value = true
}

async function saveProduct(product) {
  savingProduct.value = true
  try {
    await saveProductRecord(product)
    formOpen.value = false
    $q.notify({ type: 'positive', message: 'Menu tersimpan.', position: 'top', timeout: 1800 })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    savingProduct.value = false
  }
}

async function toggleAvailability(product) {
  const wasAvailable = product.available
  try {
    await toggleProductAvailability(product.id)
    $q.notify({ type: 'info', message: wasAvailable ? 'Menu dinonaktifkan' : 'Menu diaktifkan kembali', position: 'top', timeout: 1800 })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
}
</script>
