<template>
  <q-page class="page-shell report-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md no-print">
      <div class="col">
        <div class="eyebrow">RINGKASAN WARUNG</div>
        <h1 class="page-title">Laporan</h1>
        <p class="page-subtitle">Pilih jenis laporan dan periode yang ingin ditampilkan.</p>
      </div>
      <div class="col-auto report-actions">
        <q-btn-dropdown outline no-caps icon="print" label="Aksi laporan" :disable="loading || !activeHasData">
          <q-list dense style="min-width: 190px">
            <q-item clickable v-close-popup @click="printReport"><q-item-section avatar><q-icon name="print" /></q-item-section><q-item-section>Cetak laporan</q-item-section></q-item>
            <q-item clickable v-close-popup @click="downloadPdf"><q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section><q-item-section>Download PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>
    <q-card flat bordered class="panel-card q-mb-lg no-print">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-5"><q-input v-model="dateFrom" outlined dense type="date" label="Dari tanggal" /></div>
          <div class="col-12 col-sm-5"><q-input v-model="dateTo" outlined dense type="date" label="Sampai tanggal" /></div>
          <div class="col-12 col-sm-2"><q-btn unelevated no-caps color="primary" icon="filter_alt" label="Terapkan" class="full-width" :loading="loading" @click="loadActiveReport" /></div>
        </div>
      </q-card-section>
      <q-separator />
      <q-tabs v-model="activeTab" dense no-caps align="left" active-color="primary" indicator-color="primary" class="report-tabs">
        <q-tab name="summary" icon="space_dashboard" label="Ringkasan" />
        <q-tab name="sales" icon="trending_up" label="Penjualan" />
        <q-tab name="purchases" icon="shopping_cart" label="Pembelian" />
        <q-tab name="unpaid" icon="pending_actions" label="Belum lunas" />
      </q-tabs>
    </q-card>

    <q-banner v-if="errors.length" rounded class="q-mb-lg bg-red-1 text-negative report-errors">
      <div v-for="message in errors" :key="message">{{ message }}</div>
    </q-banner>
    <section class="report-print">
      <header class="report-print-heading"><h1>Laporan {{ activeLabel }}</h1><p>{{ authSession.warung?.nama || 'Larisama' }}</p><p>Periode {{ formatDate(dateFrom) }} - {{ formatDate(dateTo) }}</p></header>
      <article v-for="section in reportSections" :key="section.title" class="report-print-section">
        <h2>{{ section.title }}</h2>
        <table class="report-print-table"><thead><tr><th v-for="header in section.headers" :key="header">{{ header }}</th></tr></thead><tbody>
          <tr v-if="!section.rows.length"><td :colspan="section.headers.length">Tidak ada data pada periode ini.</td></tr>
          <tr v-for="(row, index) in section.rows" :key="index"><td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td></tr>
        </tbody></table>
      </article>
    </section>
    <div class="report-screen">
    <div v-if="loading && !activeHasData" class="report-loading"><q-spinner-dots color="primary" size="40px" /><span>Memuat laporan…</span></div>
    <template v-else>
      <template v-if="activeTab === 'summary'">
        <div class="summary-grid">
          <q-card flat bordered class="panel-card summary-card"><q-card-section class="row items-center justify-between"><div class="panel-title">Pendapatan setelah retur</div><q-icon name="payments" color="primary" size="24px" /></q-card-section><q-card-section><div class="report-total">{{ salesReport ? formatPrice(salesReport.total_pendapatan) : '—' }}</div><div class="panel-caption">{{ salesReport ? salesReport.jumlah_transaksi + ' transaksi lunas' : 'Data tidak tersedia' }}</div></q-card-section></q-card>
          <q-card flat bordered class="panel-card summary-card"><q-card-section class="row items-center justify-between"><div class="panel-title">Rata-rata transaksi</div><q-icon name="receipt_long" color="primary" size="24px" /></q-card-section><q-card-section><div class="report-total">{{ salesReport ? formatPrice(salesReport.rata_rata_transaksi) : '—' }}</div><div class="panel-caption">Rata-rata transaksi lunas</div></q-card-section></q-card>
          <q-card flat bordered class="panel-card summary-card"><q-card-section class="row items-center justify-between"><div class="panel-title">Total pembelian</div><q-icon name="shopping_cart" color="accent" size="24px" /></q-card-section><q-card-section><div class="report-total">{{ purchaseReport ? formatPrice(purchaseReport.total_pembelian) : '—' }}</div><div class="panel-caption">{{ purchaseReport ? purchaseReport.jumlah_transaksi + ' pembelian tercatat' : 'Data tidak tersedia' }}</div></q-card-section></q-card>
          <q-card flat bordered class="panel-card summary-card"><q-card-section class="row items-center justify-between"><div class="panel-title">Pesanan belum lunas</div><q-icon name="pending_actions" color="orange" size="24px" /></q-card-section><q-card-section><div class="report-total">{{ unpaidReport ? formatPrice(unpaidReport.total_belum_lunas) : '—' }}</div><div class="panel-caption">{{ unpaidReport ? unpaidReport.jumlah_pesanan + ' pesanan saat ini' : 'Data tidak tersedia' }}</div></q-card-section></q-card>
        </div>
        <q-card flat bordered class="panel-card q-mt-lg"><q-card-section><div class="panel-title">Pembayaran per metode</div><div class="panel-caption">Nilai transaksi sebelum alokasi retur.</div></q-card-section><q-separator /><q-card-section v-if="salesReport?.per_metode_pembayaran?.length" class="method-grid"><div v-for="method in salesReport.per_metode_pembayaran" :key="method.metode_pembayaran" class="method-card"><div class="method-name">{{ paymentLabel(method.metode_pembayaran) }}</div><strong>{{ formatPrice(method.total_penjualan) }}</strong><span>{{ method.jumlah_transaksi }} transaksi</span></div></q-card-section><q-card-section v-else class="panel-caption">{{ salesReport ? 'Belum ada pembayaran pada periode ini.' : 'Data laporan penjualan tidak tersedia.' }}</q-card-section></q-card>
        <q-banner rounded class="q-mt-lg bg-orange-1 text-grey-9">Angka penjualan dan pembelian ditampilkan terpisah. API belum menyediakan data harga pokok dan klasifikasi biaya yang dibutuhkan untuk menghitung laba rugi.</q-banner>
      </template>

      <template v-else-if="activeTab === 'sales'">
        <q-card flat bordered class="panel-card q-mb-lg"><q-card-section class="row items-center justify-between"><div><div class="panel-title">Pendapatan setelah retur</div><div class="panel-caption">Total penjualan setelah diskon dikurangi retur pada periode ini; belum dikurangi pembelian atau biaya operasional.</div></div><div class="report-total q-mb-none">{{ salesReport ? formatPrice(salesReport.total_pendapatan) : '—' }}</div></q-card-section><q-separator /><q-card-section v-if="salesReport?.per_metode_pembayaran?.length" class="method-grid"><div v-for="method in salesReport.per_metode_pembayaran" :key="method.metode_pembayaran" class="method-card"><div class="method-name">{{ paymentLabel(method.metode_pembayaran) }}</div><strong>{{ formatPrice(method.total_penjualan) }}</strong><span>{{ method.jumlah_transaksi }} transaksi</span></div></q-card-section><q-card-section v-else class="panel-caption">{{ salesReport ? 'Belum ada transaksi pada periode ini.' : 'Data laporan penjualan tidak tersedia.' }}</q-card-section></q-card>
        <q-card flat bordered class="panel-card q-mb-lg"><q-card-section><div class="panel-title">Tren penjualan harian</div><div class="panel-caption">Pengelompokan berdasarkan tanggal pembayaran dan tanggal pencatatan retur.</div></q-card-section><q-separator /><q-card-section v-if="dailyReport?.length" class="daily-grid"><article v-for="day in dailyReport" :key="day.tanggal" class="daily-card"><header><strong>{{ formatDate(day.tanggal) }}</strong><span>{{ day.jumlah_transaksi }} transaksi</span></header><div class="daily-values"><div><span>Penjualan</span><strong>{{ formatPrice(day.total_penjualan) }}</strong></div><div><span>Retur</span><strong>{{ formatPrice(day.total_retur) }}</strong></div><div class="daily-net"><span>Pendapatan setelah retur</span><strong>{{ formatPrice(day.total_pendapatan) }}</strong></div><div><span>Jumlah retur</span><strong>{{ day.jumlah_retur }}</strong></div></div></article></q-card-section><q-card-section v-else class="panel-caption">{{ dailyReport ? 'Belum ada transaksi atau retur pada periode ini.' : 'Data tren penjualan tidak tersedia.' }}</q-card-section></q-card>
        <q-card flat bordered class="panel-card"><q-card-section><div class="panel-title">Penjualan per item</div><div class="panel-caption">Nama dan harga mengikuti snapshot transaksi. Retur dan diskon header tidak dialokasikan ke item.</div></q-card-section><q-separator /><q-card-section v-if="itemReport?.length" class="item-grid"><article v-for="(item, index) in itemReport" :key="item.menu_id || item.nama_item + '-' + item.harga_saat_transaksi + '-' + index" class="item-card"><div class="item-heading"><strong>{{ item.nama_item }}</strong><q-badge :color="item.jenis_item === 'menu' ? 'positive' : 'grey-7'">{{ item.jenis_item === 'menu' ? 'Menu' : 'Item bebas' }}</q-badge></div><div class="item-values"><div><span>Terjual</span><strong>{{ item.qty_terjual }}</strong></div><div><span>Harga saat transaksi</span><strong>{{ formatPrice(item.harga_saat_transaksi) }}</strong></div><div class="item-total"><span>Nilai item</span><strong>{{ formatPrice(item.nilai_item) }}</strong></div></div></article></q-card-section><q-card-section v-else class="panel-caption">{{ itemReport ? 'Belum ada item terjual pada periode ini.' : 'Data penjualan per item tidak tersedia.' }}</q-card-section></q-card>
      </template>
      <template v-else-if="activeTab === 'purchases'"><q-card flat bordered class="panel-card report-single-card"><q-card-section><div class="panel-title">Total pembelian</div><div class="panel-caption">Pembelian tercatat pada periode yang dipilih. Transaksi yang dibatalkan tidak dihitung.</div><div class="report-total q-mt-md">{{ purchaseReport ? formatPrice(purchaseReport.total_pembelian) : '—' }}</div><div class="panel-caption">{{ purchaseReport ? purchaseReport.jumlah_transaksi + ' pembelian tercatat' : 'Data laporan pembelian tidak tersedia.' }}</div></q-card-section></q-card></template>
      <template v-else><q-card flat bordered class="panel-card report-single-card"><q-card-section><div class="panel-title">Pesanan belum lunas</div><div class="panel-caption">Snapshot pesanan yang masih menunggu pembayaran dalam rentang tanggal ini.</div><div class="report-total q-mt-md">{{ unpaidReport ? formatPrice(unpaidReport.total_belum_lunas) : '—' }}</div><div class="panel-caption">{{ unpaidReport ? unpaidReport.jumlah_pesanan + ' pesanan belum lunas' : 'Data pesanan belum lunas tidak tersedia.' }}</div></q-card-section></q-card></template>
    </template>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { downloadPdfReport } from '@/services/pdf-export.js'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { authSession } from '@/stores/auth-session.js'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: authSession.warung?.timezone || 'Asia/Jakarta' }).format(new Date())
const dateFrom = ref(today)
const dateTo = ref(today)
const activeTab = ref('summary')
const salesReport = ref(null)
const purchaseReport = ref(null)
const unpaidReport = ref(null)
const dailyReport = ref(null)
const itemReport = ref(null)
const errors = ref([])
const loading = ref(false)
const activeLabel = computed(() => ({ summary: 'Ringkasan', sales: 'Penjualan', purchases: 'Pembelian', unpaid: 'Belum Lunas' })[activeTab.value])
const activeHasData = computed(() => {
  if (activeTab.value === 'summary') return Boolean(salesReport.value || purchaseReport.value || unpaidReport.value)
  if (activeTab.value === 'sales') return Boolean(salesReport.value || dailyReport.value || itemReport.value)
  if (activeTab.value === 'purchases') return Boolean(purchaseReport.value)
  return Boolean(unpaidReport.value)
})
const reportSections = computed(() => {
  if (activeTab.value === 'summary') {
    const rows = []
    if (salesReport.value) {
      rows.push(['Pendapatan setelah retur', formatPrice(salesReport.value.total_pendapatan)])
      rows.push(['Jumlah transaksi lunas', String(salesReport.value.jumlah_transaksi)])
      rows.push(['Rata-rata transaksi', formatPrice(salesReport.value.rata_rata_transaksi)])
      for (const method of salesReport.value.per_metode_pembayaran || []) {
        rows.push([`Pembayaran ${paymentLabel(method.metode_pembayaran)}`, formatPrice(method.total_penjualan)])
      }
    }
    if (purchaseReport.value) {
      rows.push(['Total pembelian tercatat', formatPrice(purchaseReport.value.total_pembelian)])
      rows.push(['Jumlah pembelian', String(purchaseReport.value.jumlah_transaksi)])
    }
    if (unpaidReport.value) {
      rows.push(['Nilai pesanan belum lunas', formatPrice(unpaidReport.value.total_belum_lunas)])
      rows.push(['Jumlah pesanan belum lunas', String(unpaidReport.value.jumlah_pesanan)])
    }
    return [{ title: 'Ringkasan periode', headers: ['Keterangan', 'Nilai'], rows }]
  }
  if (activeTab.value === 'sales') {
    return [
      {
        title: 'Ringkasan penjualan',
        headers: ['Keterangan', 'Nilai'],
        rows: salesReport.value
          ? [
              ['Total penjualan setelah diskon', formatPrice(salesReport.value.total_penjualan)],
              ['Total retur periode', formatPrice(salesReport.value.total_retur)],
              ['Pendapatan setelah retur', formatPrice(salesReport.value.total_pendapatan)],
              ['Jumlah transaksi lunas', String(salesReport.value.jumlah_transaksi)],
              ...(salesReport.value.per_metode_pembayaran || []).map((method) => [
                `Pembayaran ${paymentLabel(method.metode_pembayaran)}`,
                formatPrice(method.total_penjualan),
              ]),
            ]
          : [],
      },
      {
        title: 'Tren penjualan harian',
        headers: ['Tanggal', 'Transaksi', 'Penjualan', 'Retur', 'Pendapatan setelah retur'],
        rows: (dailyReport.value || []).map((day) => [
          formatDate(day.tanggal),
          String(day.jumlah_transaksi),
          formatPrice(day.total_penjualan),
          formatPrice(day.total_retur),
          formatPrice(day.total_pendapatan),
        ]),
      },
      {
        title: 'Penjualan per item',
        headers: ['Item', 'Jenis', 'Terjual', 'Harga saat transaksi', 'Nilai item'],
        rows: (itemReport.value || []).map((item) => [
          item.nama_item,
          item.jenis_item === 'menu' ? 'Menu' : 'Item bebas',
          String(item.qty_terjual),
          formatPrice(item.harga_saat_transaksi),
          formatPrice(item.nilai_item),
        ]),
      },
    ]
  }
  if (activeTab.value === 'purchases') {
    return [{
      title: 'Rekap pembelian',
      headers: ['Keterangan', 'Nilai'],
      rows: purchaseReport.value
        ? [['Total pembelian tercatat', formatPrice(purchaseReport.value.total_pembelian)], ['Jumlah pembelian', String(purchaseReport.value.jumlah_transaksi)]]
        : [],
    }]
  }
  return [{
    title: 'Pesanan belum lunas',
    headers: ['Keterangan', 'Nilai'],
    rows: unpaidReport.value
      ? [['Nilai belum lunas', formatPrice(unpaidReport.value.total_belum_lunas)], ['Jumlah pesanan', String(unpaidReport.value.jumlah_pesanan)]]
      : [],
  }]
})
let requestSequence = 0
watch(activeTab, loadActiveReport)

async function loadActiveReport() {
  const sequence = ++requestSequence
  if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) { errors.value = ['Pilih rentang tanggal yang valid.']; return }
  loading.value = true
  errors.value = []
  if (activeTab.value === 'summary') {
    salesReport.value = null; purchaseReport.value = null; unpaidReport.value = null
    const results = await Promise.allSettled([larisamaApi.salesReport(dateFrom.value, dateTo.value), larisamaApi.purchasesReport(dateFrom.value, dateTo.value), larisamaApi.unpaidSalesReport(dateFrom.value, dateTo.value)])
    if (sequence !== requestSequence) return
    const [sales, purchases, unpaid] = results
    if (sales.status === 'fulfilled') salesReport.value = sales.value; else errors.value.push('Laporan penjualan: ' + displayApiError(sales.reason))
    if (purchases.status === 'fulfilled') purchaseReport.value = purchases.value; else errors.value.push('Laporan pembelian: ' + displayApiError(purchases.reason))
    if (unpaid.status === 'fulfilled') unpaidReport.value = unpaid.value; else errors.value.push('Pesanan belum lunas: ' + displayApiError(unpaid.reason))
  } else if (activeTab.value === 'sales') {
    salesReport.value = null; dailyReport.value = null; itemReport.value = null
    const results = await Promise.allSettled([larisamaApi.salesReport(dateFrom.value, dateTo.value), larisamaApi.dailySalesReport(dateFrom.value, dateTo.value), larisamaApi.itemSalesReport(dateFrom.value, dateTo.value)])
    if (sequence !== requestSequence) return
    const [sales, daily, items] = results
    if (sales.status === 'fulfilled') salesReport.value = sales.value; else errors.value.push('Ringkasan penjualan: ' + displayApiError(sales.reason))
    if (daily.status === 'fulfilled') dailyReport.value = daily.value.data || []; else errors.value.push('Tren harian: ' + displayApiError(daily.reason))
    if (items.status === 'fulfilled') itemReport.value = items.value.data || []; else errors.value.push('Penjualan per item: ' + displayApiError(items.reason))
  } else if (activeTab.value === 'purchases') {
    purchaseReport.value = null
    try { purchaseReport.value = await larisamaApi.purchasesReport(dateFrom.value, dateTo.value) } catch (error) { if (sequence === requestSequence) errors.value.push('Laporan pembelian: ' + displayApiError(error)) }
  } else {
    unpaidReport.value = null
    try { unpaidReport.value = await larisamaApi.unpaidSalesReport(dateFrom.value, dateTo.value) } catch (error) { if (sequence === requestSequence) errors.value.push('Pesanan belum lunas: ' + displayApiError(error)) }
  }
  if (sequence === requestSequence) loading.value = false
}

function printReport() { window.print() }
function downloadPdf() {
  downloadPdfReport({
    filename: `laporan-${activeTab.value}-${dateFrom.value}-${dateTo.value}`,
    title: `Laporan ${activeLabel.value}`,
    subtitle: `${authSession.warung?.nama || 'Larisama'} | ${dateFrom.value} - ${dateTo.value}`,
    sections: reportSections.value,
  })
}
function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  const source = String(value); const negative = source.startsWith('-'); const [wholePart, fractionPart = '00'] = source.replace(/^-/, '').split('.')
  return 'Rp ' + (negative ? '-' : '') + wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + fractionPart.padEnd(2, '0').slice(0, 2)
}
function formatDate(value) { return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: authSession.warung?.timezone || 'Asia/Jakarta' }).format(new Date(value + 'T00:00:00')) : '—' }
function paymentLabel(value) { return ({ cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' })[value] || value || '—' }
onMounted(loadActiveReport)
</script>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 225px), 1fr)); gap: 16px; }
.summary-card, .report-single-card { min-width: 0; }
.report-total { margin: 8px 0; color: #1d5439; font-size: clamp(21px, 3vw, 27px); font-weight: 800; overflow-wrap: anywhere; }
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
.report-actions { display: flex; justify-content: flex-end; }
.report-loading { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 180px; color: #68766e; }
.report-print { display: none; }
@media (max-width: 600px) { .report-actions { width: 100%; } .report-actions :deep(.q-btn-dropdown) { width: 100%; } }
@media print {
  :global(body), :global(#q-app), :global(.q-layout), :global(.q-page-container) { min-width: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; background: white !important; }
  :global(.q-header), :global(.q-drawer), :global(.q-footer), :global(.no-print), :global(.report-errors), .report-screen { display: none !important; }
  :global(.q-page-container) { padding: 0 !important; }
  .report-page { display: block !important; min-height: 0 !important; padding: 0 !important; color: #17231b !important; }
  .report-print { display: block !important; color: #17231b; }
  .report-print-heading { margin-bottom: 18px; }
  .report-print-heading h1 { margin: 0 0 6px; font-size: 22px; }
  .report-print-heading p { margin: 2px 0; color: #52645a; }
  .report-print-section { margin-bottom: 16px; break-inside: avoid; }
  .report-print-section h2 { margin: 0 0 7px; font-size: 14px; }
  .report-print-table { box-sizing: border-box; width: calc(100% - 8mm); max-width: calc(100% - 8mm); table-layout: fixed; border-collapse: collapse; font-size: 8pt; }
  .report-print-table th, .report-print-table td { box-sizing: border-box; min-width: 0; padding: 5px 4px; border: 1px solid #bbc7bf; text-align: left; overflow-wrap: anywhere; word-break: break-word; white-space: normal !important; }
  .report-print-table th { background: #f0f4f1 !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
</style>
