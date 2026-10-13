<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">RINGKASAN WARUNG</div>
        <h1 class="page-title">Laporan</h1>
        <p class="page-subtitle">Pilih jenis laporan dan periode yang ingin ditampilkan.</p>
      </div>
      <div class="col-auto"><q-chip class="demo-chip">Data server</q-chip></div>
    </div>

    <q-card flat bordered class="panel-card q-mb-lg">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-5"><q-input v-model="dateFrom" outlined dense type="date" label="Dari tanggal" /></div>
          <div class="col-12 col-sm-5"><q-input v-model="dateTo" outlined dense type="date" label="Sampai tanggal" /></div>
          <div class="col-12 col-sm-2"><q-btn unelevated no-caps color="primary" icon="filter_alt" label="Terapkan" class="full-width" :loading="loading" @click="applyFilter" /></div>
        </div>
      </q-card-section>
    </q-card>

    <q-banner v-if="errors.length" rounded class="q-mb-lg bg-red-1 text-negative">
      <div v-for="message in errors" :key="message">{{ message }}</div>
    </q-banner>

    <div class="summary-grid">
      <q-card flat bordered class="panel-card summary-card">
        <q-card-section class="row items-center justify-between"><div class="panel-title">Pendapatan bersih</div><q-icon name="payments" color="primary" size="24px" /></q-card-section>
        <q-card-section><div class="report-total">{{ salesReport ? formatPrice(salesReport.total_pendapatan) : '—' }}</div><div class="panel-caption">{{ salesReport ? salesReport.jumlah_transaksi + ' transaksi lunas' : reportHint }}</div></q-card-section>
      </q-card>
      <q-card flat bordered class="panel-card summary-card">
        <q-card-section class="row items-center justify-between"><div class="panel-title">Rata-rata transaksi</div><q-icon name="receipt_long" color="primary" size="24px" /></q-card-section>
        <q-card-section><div class="report-total">{{ salesReport ? formatPrice(salesReport.rata_rata_transaksi) : '—' }}</div><div class="panel-caption">Rata-rata transaksi lunas</div></q-card-section>
      </q-card>
      <q-card flat bordered class="panel-card summary-card">
        <q-card-section class="row items-center justify-between"><div class="panel-title">Total pembelian</div><q-icon name="shopping_cart" color="accent" size="24px" /></q-card-section>
        <q-card-section><div class="report-total">{{ purchaseReport ? formatPrice(purchaseReport.total_pembelian) : '—' }}</div><div class="panel-caption">{{ purchaseReport ? purchaseReport.jumlah_transaksi + ' pembelian tercatat' : reportHint }}</div></q-card-section>
      </q-card>
      <q-card flat bordered class="panel-card summary-card">
        <q-card-section class="row items-center justify-between"><div class="panel-title">Pesanan belum lunas</div><q-icon name="pending_actions" color="orange" size="24px" /></q-card-section>
        <q-card-section><div class="report-total">{{ unpaidReport ? formatPrice(unpaidReport.total_belum_lunas) : '—' }}</div><div class="panel-caption">{{ unpaidReport ? unpaidReport.jumlah_pesanan + ' pesanan saat ini' : reportHint }}</div></q-card-section>
      </q-card>
    </div>

    <q-card flat bordered class="panel-card q-mt-lg">
      <q-card-section>
        <div class="panel-title">Pembayaran per metode</div>
        <div class="panel-caption">Nilai transaksi sebelum alokasi retur.</div>
      </q-card-section>
      <q-separator />
      <q-card-section v-if="salesReport?.per_metode_pembayaran?.length" class="method-grid">
        <div v-for="method in salesReport.per_metode_pembayaran" :key="method.metode_pembayaran" class="method-card">
          <div class="method-name">{{ paymentLabel(method.metode_pembayaran) }}</div>
          <strong>{{ formatPrice(method.total_penjualan) }}</strong>
          <span>{{ method.jumlah_transaksi }} transaksi</span>
        </div>
      </q-card-section>
      <q-card-section v-else class="panel-caption">{{ salesReport ? 'Belum ada pembayaran pada periode ini.' : reportHint }}</q-card-section>
    </q-card>

    <q-card flat bordered class="panel-card q-mt-lg">
      <q-card-section>
        <div class="panel-title">Tren penjualan harian</div>
        <div class="panel-caption">Penjualan dikelompokkan menurut tanggal pembayaran; retur menurut tanggal pencatatan.</div>
      </q-card-section>
      <q-separator />
      <q-card-section v-if="dailyReport?.length" class="daily-grid">
        <article v-for="day in dailyReport" :key="day.tanggal" class="daily-card">
          <header><strong>{{ formatDate(day.tanggal) }}</strong><span>{{ day.jumlah_transaksi }} transaksi</span></header>
          <div class="daily-values">
            <div><span>Penjualan</span><strong>{{ formatPrice(day.total_penjualan) }}</strong></div>
            <div><span>Retur</span><strong>{{ formatPrice(day.total_retur) }}</strong></div>
            <div class="daily-net"><span>Pendapatan bersih</span><strong>{{ formatPrice(day.total_pendapatan) }}</strong></div>
            <div><span>Jumlah retur</span><strong>{{ day.jumlah_retur }}</strong></div>
          </div>
        </article>
      </q-card-section>
      <q-card-section v-else class="panel-caption">{{ dailyReport ? 'Belum ada transaksi atau retur pada periode ini.' : reportHint }}</q-card-section>
    </q-card>

    <q-card flat bordered class="panel-card q-mt-lg">
      <q-card-section>
        <div class="panel-title">Penjualan per item</div>
        <div class="panel-caption">Menggunakan nama dan harga snapshot saat transaksi. Nilai item belum mengalokasikan diskon transaksi atau retur.</div>
      </q-card-section>
      <q-separator />
      <q-card-section v-if="itemReport?.length" class="item-grid">
        <article v-for="(item, index) in itemReport" :key="item.menu_id || item.nama_item + '-' + item.harga_saat_transaksi + '-' + index" class="item-card">
          <div class="item-heading"><strong>{{ item.nama_item }}</strong><q-badge :color="item.jenis_item === 'menu' ? 'positive' : 'grey-7'">{{ item.jenis_item === 'menu' ? 'Menu' : 'Item bebas' }}</q-badge></div>
          <div class="item-values">
            <div><span>Terjual</span><strong>{{ item.qty_terjual }}</strong></div>
            <div><span>Harga saat transaksi</span><strong>{{ formatPrice(item.harga_saat_transaksi) }}</strong></div>
            <div class="item-total"><span>Nilai item</span><strong>{{ formatPrice(item.nilai_item) }}</strong></div>
          </div>
        </article>
      </q-card-section>
      <q-card-section v-else class="panel-caption">{{ itemReport ? 'Belum ada item terjual pada periode ini.' : reportHint }}</q-card-section>
    </q-card>

    <q-banner rounded class="q-mt-lg bg-orange-1 text-grey-9">
      Laporan ini menampilkan pendapatan penjualan dan pembelian secara terpisah. API belum menyediakan harga pokok barang terjual atau klasifikasi pengeluaran, jadi angka ini bukan laba rugi.
    </q-banner>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { authSession } from '@/stores/auth-session.js'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: authSession.warung?.timezone || 'Asia/Jakarta' }).format(new Date())
const dateFrom = ref(today)
const dateTo = ref(today)
const salesReport = ref(null)
const purchaseReport = ref(null)
const unpaidReport = ref(null)
const dailyReport = ref(null)
const itemReport = ref(null)
const errors = ref([])
const loading = ref(false)
const reportHint = 'Data belum dimuat'

async function applyFilter() {
  if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) {
    errors.value = ['Pilih rentang tanggal yang valid.']
    return
  }
  loading.value = true
  errors.value = []
  salesReport.value = null
  purchaseReport.value = null
  unpaidReport.value = null
  dailyReport.value = null
  itemReport.value = null
  const requests = await Promise.allSettled([
    larisamaApi.salesReport(dateFrom.value, dateTo.value),
    larisamaApi.purchasesReport(dateFrom.value, dateTo.value),
    larisamaApi.unpaidSalesReport(dateFrom.value, dateTo.value),
    larisamaApi.dailySalesReport(dateFrom.value, dateTo.value),
    larisamaApi.itemSalesReport(dateFrom.value, dateTo.value),
  ])
  const [sales, purchases, unpaid, daily, items] = requests
  if (sales.status === 'fulfilled') salesReport.value = sales.value
  else errors.value.push('Laporan penjualan: ' + displayApiError(sales.reason))
  if (purchases.status === 'fulfilled') purchaseReport.value = purchases.value
  else errors.value.push('Laporan pembelian: ' + displayApiError(purchases.reason))
  if (unpaid.status === 'fulfilled') unpaidReport.value = unpaid.value
  else errors.value.push('Pesanan belum lunas: ' + displayApiError(unpaid.reason))
  if (daily.status === 'fulfilled') dailyReport.value = daily.value.data || []
  else errors.value.push('Tren penjualan harian: ' + displayApiError(daily.reason))
  if (items.status === 'fulfilled') itemReport.value = items.value.data || []
  else errors.value.push('Penjualan per item: ' + displayApiError(items.reason))
  loading.value = false
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  const source = String(value)
  const negative = source.startsWith('-')
  const [wholePart, fractionPart = '00'] = source.replace(/^-/, '').split('.')
  const whole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return 'Rp ' + (negative ? '-' : '') + whole + ',' + fractionPart.padEnd(2, '0').slice(0, 2)
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value + 'T00:00:00')) : '—'
}

function paymentLabel(value) {
  return ({ cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' })[value] || value || '—'
}

onMounted(applyFilter)
</script>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 225px), 1fr)); gap: 16px; }
.summary-card { min-width: 0; }
.report-total { margin-bottom: 8px; color: #1d5439; font-size: clamp(21px, 3vw, 27px); font-weight: 800; overflow-wrap: anywhere; }
.method-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.method-card, .daily-card, .item-card { min-width: 0; padding: 14px; border: 1px solid #e0e7e2; border-radius: 12px; background: #fff; }
.method-card { display: grid; gap: 6px; }
.method-name { color: #52645a; }
.method-card strong { color: #1d5439; font-size: 19px; overflow-wrap: anywhere; }
.method-card span, .daily-card span, .item-card span { color: #68766e; font-size: 12px; }
.daily-grid, .item-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 310px), 1fr)); gap: 12px; }
.daily-card header, .item-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.daily-card header span { text-align: right; }
.daily-values, .item-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.daily-values > div, .item-values > div { display: grid; gap: 4px; min-width: 0; }
.daily-values strong, .item-values strong { overflow-wrap: anywhere; }
.daily-net, .item-total { grid-column: 1 / -1; padding-top: 10px; border-top: 1px solid #e7ece8; }
.item-heading strong { min-width: 0; overflow-wrap: anywhere; }
</style>
