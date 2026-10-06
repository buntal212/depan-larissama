<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KASIR WARUNG</div>
        <h1 class="page-title">Riwayat penjualan</h1>
        <p class="page-subtitle">Lihat transaksi kasir dan rincian itemnya.</p>
      </div>
      <div class="col-auto"><q-btn unelevated no-caps color="primary" icon="point_of_sale" label="Buka kasir" to="/transaksi" /></div>
    </div>
    <q-card flat bordered class="panel-card">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-sm-7"><q-input v-model="search" outlined dense clearable placeholder="Cari nomor transaksi..." /></div>
        <div class="col-auto"><q-chip class="demo-chip">Data server</q-chip></div>
      </q-card-section>
      <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mx-md q-mb-md">{{ loadError }}</q-banner>
      <q-table flat :rows="filteredSales" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 10 }" :grid="$q.screen.lt.sm" no-data-label="Belum ada transaksi.">
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered class="sales-mobile-card">
              <q-card-section>
                <div class="row items-center justify-between"><strong>{{ props.row.no_transaksi }}</strong><q-badge :color="props.row.status === 'selesai' ? 'positive' : 'grey-6'">{{ props.row.status }}</q-badge></div>
                <div class="panel-caption q-mt-sm">{{ formatDate(props.row.tanggal || props.row.created_at) }} Â· {{ paymentLabel(props.row.metode_pembayaran) }}</div>
                <div class="sale-mobile-total">{{ formatPrice(props.row.total) }}</div>
                <div class="row justify-end">
                  <q-btn flat no-caps dense label="Detail" @click="openDetails(props.row)" />
                  <q-btn v-if="canManageHistory" flat round dense icon="edit" aria-label="Koreksi transaksi" :disable="!canCorrect(props.row)" @click="openMutation(props.row, 'correction')" />
                  <q-btn v-if="canManageHistory" flat round dense color="negative" icon="block" aria-label="Batalkan transaksi" :disable="props.row.status !== 'selesai' || !canCorrect(props.row)" @click="openMutation(props.row, 'cancellation')" />
                  <q-btn v-if="canManageHistory" flat round dense color="warning" icon="keyboard_return" aria-label="Catat retur" :disable="!canReturn(props.row)" @click="openMutation(props.row, 'return')" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        <template #body="props">
          <q-tr :props="props" class="cursor-pointer" @click="openDetails(props.row)">
            <q-td key="no_transaksi" :props="props">{{ props.row.no_transaksi }}</q-td>
            <q-td key="tanggal" :props="props">{{ formatDate(props.row.tanggal || props.row.created_at) }}</q-td>
            <q-td key="metode_pembayaran" :props="props">{{ paymentLabel(props.row.metode_pembayaran) }}</q-td>
            <q-td key="total" :props="props" class="text-weight-bold">{{ formatPrice(props.row.total) }}</q-td>
            <q-td key="status" :props="props"><q-badge :color="props.row.status === 'selesai' ? 'positive' : 'grey-6'">{{ props.row.status }}</q-badge></q-td>
            <q-td key="actions" :props="props">
              <q-btn v-if="canManageHistory" flat round dense icon="edit" aria-label="Koreksi transaksi" :disable="!canCorrect(props.row)" @click.stop="openMutation(props.row, 'correction')" />
              <q-btn v-if="canManageHistory" flat round dense color="negative" icon="block" aria-label="Batalkan transaksi" :disable="props.row.status !== 'selesai' || !canCorrect(props.row)" @click.stop="openMutation(props.row, 'cancellation')" />
              <q-btn v-if="canManageHistory" flat round dense color="warning" icon="keyboard_return" aria-label="Catat retur" :disable="!canReturn(props.row)" @click.stop="openMutation(props.row, 'return')" />
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="detailOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header">
          <div class="dialog-header-copy"><div class="dialog-eyebrow">DETAIL TRANSAKSI</div><div class="text-h6 dialog-title">{{ selectedSale?.no_transaksi }}</div><div class="dialog-subtitle">{{ formatDate(selectedSale?.tanggal || selectedSale?.created_at) }}</div></div>
          <q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="detailOpen = false" />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="selectedSale">
          <q-list separator>
            <q-item v-for="(line, index) in selectedSale.rincian" :key="`${line.menu_id}-${index}`">
              <q-item-section><q-item-label>{{ line.nama_menu }}</q-item-label><q-item-label caption>{{ line.qty }} × {{ formatPrice(line.harga) }}</q-item-label></q-item-section>
              <q-item-section side>{{ formatPrice(line.subtotal) }}</q-item-section>
            </q-item>
          </q-list>
          <q-separator class="q-my-md" />
          <div class="sale-total-row"><span>Subtotal</span><strong>{{ formatPrice(selectedSale.subtotal) }}</strong></div>
          <div class="sale-total-row"><span>Diskon</span><strong>{{ formatPrice(selectedSale.diskon) }}</strong></div>
          <div class="sale-total-row sale-grand-total"><span>Total</span><strong>{{ formatPrice(selectedSale.total) }}</strong></div>
          <div class="sale-total-row"><span>Metode</span><strong>{{ paymentLabel(selectedSale.metode_pembayaran) }}</strong></div>
          <div class="sale-total-row"><span>Dibayar</span><strong>{{ formatPrice(selectedSale.bayar) }}</strong></div>
          <div class="sale-total-row"><span>Kembalian</span><strong>{{ formatPrice(selectedSale.kembalian) }}</strong></div>
          <p v-if="selectedSale.catatan" class="panel-caption q-mt-md">Catatan: {{ selectedSale.catatan }}</p>
          <div class="demo-disclaimer">Rincian dan nominal transaksi berasal dari server.</div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="mutationOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header"><div class="dialog-header-copy"><div class="dialog-eyebrow">PENJUALAN</div><div class="text-h6 dialog-title">{{ mutationTitle }}</div><div class="dialog-subtitle">{{ selectedSale?.no_transaksi }} · perubahan dicatat di server</div></div><q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="mutationOpen = false" /></q-card-section>
        <q-separator />
        <q-form class="q-pa-lg" @submit.prevent="submitMutation">
          <template v-if="mutationType === 'correction'">
            <q-input v-model="mutationForm.date" outlined type="date" label="Tanggal transaksi" />
            <q-input v-model.trim="mutationForm.note" outlined type="textarea" autogrow label="Catatan transaksi" />
          </template>
          <CurrencyInput v-if="mutationType === 'return'" v-model="mutationForm.amount" label="Nominal retur" min="0.01" :rules="[() => Number(mutationForm.amount) > 0 && Number(mutationForm.amount) <= remainingReturn || 'Nominal melebihi sisa transaksi']" />
          <q-input v-model.trim="mutationForm.reason" outlined type="textarea" autogrow maxlength="1000" label="Alasan (wajib)" :rules="[(value) => !!value.trim() || 'Alasan wajib diisi']" />
          <div class="demo-disclaimer">Perubahan dicatat pada server dan memerlukan alasan.</div>
          <div class="row justify-end q-gutter-sm q-mt-lg"><q-btn flat no-caps label="Kembali" @click="mutationOpen = false" /><q-btn unelevated no-caps :color="mutationType === 'cancellation' ? 'negative' : 'primary'" :label="mutationType === 'correction' ? 'Simpan koreksi' : mutationType === 'return' ? 'Simpan retur' : 'Batalkan transaksi'" :loading="savingMutation" type="submit" /></div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import CurrencyInput from '@/components/CurrencyInput.vue'
import { authSession } from '@/stores/auth-session.js'
import { newIdempotencyKey } from '@/services/api.js'
import { createLocalDayTimestamp, displayApiError, larisamaApi, toMoney } from '@/services/larisama-api.js'

const $q = useQuasar()
const search = ref('')
const detailOpen = ref(false)
const selectedSale = ref(null)
const mutationOpen = ref(false)
const mutationType = ref('correction')
const savingMutation = ref(false)
const loading = ref(false)
const loadError = ref('')
const sales = ref([])
const pendingMutation = ref(null)
const mutationForm = reactive({ date: '', note: '', reason: '', amount: null })
const canManageHistory = computed(() => ['owner', 'manager'].includes(authSession.user?.role))
const columns = [
  { name: 'no_transaksi', label: 'No. transaksi', field: 'no_transaksi', align: 'left', sortable: true },
  { name: 'tanggal', label: 'Tanggal', field: (row) => row.tanggal || row.created_at, align: 'left', sortable: true },
  { name: 'metode_pembayaran', label: 'Pembayaran', field: 'metode_pembayaran', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'right' },
]
const filteredSales = computed(() => sales.value.filter((sale) => sale.no_transaksi.toLowerCase().includes(search.value.trim().toLowerCase())))
const mutationTitle = computed(() => ({ correction: 'Koreksi transaksi', cancellation: 'Batalkan transaksi', return: 'Catat retur' })[mutationType.value])
const returnedTotal = computed(() => (selectedSale.value?.riwayat_retur || []).reduce((total, item) => total + Number(item.nominal || 0), 0))
const remainingReturn = computed(() => Math.max(0, Number(selectedSale.value?.total || 0) - returnedTotal.value))

async function loadSales() {
  loading.value = true
  loadError.value = ''
  try {
    sales.value = await larisamaApi.listSales({ sort: '-tanggal' })
  } catch (error) {
    loadError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: loadError.value, position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(loadSales)

async function openDetails(sale) {
  selectedSale.value = sale
  detailOpen.value = true
  try {
    selectedSale.value = await larisamaApi.getSale(sale.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
}
function canCorrect(sale) { return Date.now() - new Date(sale.created_at || sale.tanggal).getTime() <= 72 * 60 * 60 * 1000 }
function canReturn(sale) { return ['selesai', 'diretur_sebagian'].includes(sale.status) && Number(sale.total || 0) > 0 }
function openMutation(sale, type) {
  selectedSale.value = sale
  mutationType.value = type
  Object.assign(mutationForm, { date: dateInWarung(sale.tanggal || sale.created_at), note: sale.catatan || '', reason: '', amount: null })
  pendingMutation.value = null
  mutationOpen.value = true
}
function dateInWarung(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: authSession.warung?.timezone || 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const date = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${date.year}-${date.month}-${date.day}`
}

async function submitMutation() {
  if (!selectedSale.value || !mutationForm.reason.trim() || savingMutation.value) return
  let body
  if (mutationType.value === 'correction') {
    body = { alasan: mutationForm.reason.trim() }
    const oldDate = dateInWarung(selectedSale.value.tanggal)
    if (mutationForm.date !== oldDate) body.tanggal = createLocalDayTimestamp(mutationForm.date, authSession.warung?.timezone)
    if (mutationForm.note.trim() !== (selectedSale.value.catatan || '')) body.catatan = mutationForm.note.trim() || null
    if (Object.keys(body).length === 1) {
      $q.notify({ type: 'warning', message: 'Ubah tanggal atau catatan untuk mengoreksi transaksi.' })
      return
    }
  } else if (mutationType.value === 'cancellation') {
    body = { alasan: mutationForm.reason.trim() }
  } else {
    if (Number(mutationForm.amount) <= 0 || Number(mutationForm.amount) > remainingReturn.value) return
    body = { alasan: mutationForm.reason.trim(), nominal: toMoney(mutationForm.amount) }
  }
  const fingerprint = `${mutationType.value}:${selectedSale.value.id}:${JSON.stringify(body)}`
  if (pendingMutation.value?.fingerprint !== fingerprint) pendingMutation.value = { fingerprint, key: newIdempotencyKey() }
  savingMutation.value = true
  try {
    if (mutationType.value === 'correction') await larisamaApi.correctSale(selectedSale.value.id, body, pendingMutation.value.key)
    else if (mutationType.value === 'cancellation') await larisamaApi.cancelSale(selectedSale.value.id, body, pendingMutation.value.key)
    else await larisamaApi.returnSale(selectedSale.value.id, body, pendingMutation.value.key)
    mutationOpen.value = false
    pendingMutation.value = null
    await loadSales()
    const updated = sales.value.find((sale) => sale.id === selectedSale.value?.id)
    if (updated) selectedSale.value = await larisamaApi.getSale(updated.id)
    $q.notify({ type: 'positive', message: 'Perubahan transaksi tersimpan.' })
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingMutation.value = null
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    savingMutation.value = false
  }
}
function formatPrice(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0)) }
function formatDate(value) { return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
function paymentLabel(value) { return ({ cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' })[value] || '—' }
</script>

<style scoped>
.sale-total-row { display: flex; justify-content: space-between; margin: 9px 0; color: #66766c; }
.sale-total-row strong { color: #263c31; }
.sale-grand-total { padding-top: 10px; border-top: 1px solid #e9eeea; font-size: 16px; }
.sale-mobile-total { margin: 8px 0 2px; color: #176342; font-size: 18px; font-weight: 800; }
</style>
