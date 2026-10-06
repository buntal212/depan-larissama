<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col"><div class="eyebrow">RINGKASAN WARUNG</div><h1 class="page-title">Laporan</h1><p class="page-subtitle">Laporan penjualan dan pembelian ditampilkan terpisah.</p></div>
      <div class="col-auto"><q-chip class="demo-chip">Data server</q-chip></div>
    </div>
    <q-card flat bordered class="panel-card q-mb-lg">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-5"><q-input v-model="dateFrom" outlined dense type="date" label="Dari tanggal" /></div>
          <div class="col-12 col-sm-5"><q-input v-model="dateTo" outlined dense type="date" label="Sampai tanggal" /></div>
          <div class="col-12 col-sm-2"><q-btn unelevated no-caps color="primary" icon="filter_alt" label="Terapkan" class="full-width" @click="applyFilter" /></div>
        </div>
      </q-card-section>
    </q-card>
    <q-banner v-if="error" rounded class="q-mb-lg bg-red-1 text-negative">{{ error }}</q-banner>
    <div class="report-grid">
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading"><div class="row items-center justify-between"><div><div class="panel-title">Pendapatan penjualan</div><div class="panel-caption">Menggunakan total transaksi selesai pada periode terpilih.</div></div><q-icon name="point_of_sale" color="primary" size="24px" /></div></q-card-section>
        <q-card-section><div class="report-total">{{ salesReport ? formatPrice(salesReport.total_pendapatan) : '—' }}</div><div class="panel-caption">{{ salesReport ? `${salesReport.jumlah_transaksi} transaksi` : 'Data belum tersedia' }}</div></q-card-section>
      </q-card>
      <q-card flat bordered class="panel-card">
        <q-card-section class="panel-heading"><div class="row items-center justify-between"><div><div class="panel-title">Total pembelian</div><div class="panel-caption">Menggunakan pembelian berstatus tercatat.</div></div><q-icon name="shopping_cart" color="accent" size="24px" /></div></q-card-section>
        <q-card-section><div class="report-total">{{ purchaseReport ? formatPrice(purchaseReport.total_pembelian) : '—' }}</div><div class="panel-caption">{{ purchaseReport ? `${purchaseReport.jumlah_transaksi} pembelian` : 'Data belum tersedia' }}</div></q-card-section>
      </q-card>
    </div>
    <q-banner rounded class="q-mt-lg bg-orange-1 text-grey-9">Pendapatan dan total pembelian ditampilkan terpisah; angka ini bukan perhitungan laba.</q-banner>
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
const error = ref('')
const loading = ref(false)

async function applyFilter() {
  if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) return
  loading.value = true; error.value = ''; salesReport.value = null; purchaseReport.value = null
  const results = await Promise.allSettled([
    larisamaApi.salesReport(dateFrom.value, dateTo.value),
    larisamaApi.purchasesReport(dateFrom.value, dateTo.value),
  ])
  if (results[0].status === 'fulfilled') salesReport.value = results[0].value
  if (results[1].status === 'fulfilled') purchaseReport.value = results[1].value
  const failures = results.filter((result) => result.status === 'rejected').map((result) => displayApiError(result.reason))
  if (failures.length) error.value = failures.join(' | ')
  loading.value = false
}
onMounted(applyFilter)
function formatPrice(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0)) }
</script>

<style scoped>
.report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.report-total { margin-bottom: 8px; color: #1d5439; font-size: 27px; font-weight: 800; }
@media (max-width: 680px) { .report-grid { grid-template-columns: 1fr; } }
</style>
