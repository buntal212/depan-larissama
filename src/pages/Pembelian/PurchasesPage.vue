<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col"><div class="eyebrow">OPERASIONAL WARUNG</div><h1 class="page-title">Pembelian</h1><p class="page-subtitle">Catat pengeluaran berdasarkan rincian barang yang dibeli.</p></div>
      <div v-if="canManage" class="col-auto"><q-btn unelevated no-caps color="primary" icon="add" label="Catat pembelian" @click="formOpen = true" /></div>
    </div>
    <q-card flat bordered class="panel-card">
      <q-card-section class="row items-center justify-between"><div><div class="panel-title">Riwayat pembelian</div><div class="panel-caption">Data dan total dari server.</div></div><q-chip class="demo-chip">Data server</q-chip></q-card-section>
      <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mx-md q-mb-md">{{ loadError }}</q-banner>
      <q-table flat :rows="purchases" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 10 }" no-data-label="Belum ada pembelian.">
        <template #body-cell-tanggal="props"><q-td :props="props">{{ formatDate(props.row.tanggal) }}</q-td></template>
        <template #body-cell-total="props"><q-td :props="props" class="text-weight-bold">{{ formatPrice(props.row.total) }}</q-td></template>
        <template #body-cell-status="props"><q-td :props="props"><q-badge :color="props.row.status === 'tercatat' ? 'positive' : 'grey-6'">{{ props.row.status }}</q-badge></q-td></template>
        <template #body-cell-actions="props"><q-td :props="props"><q-btn v-if="canManage" flat round dense icon="edit" aria-label="Koreksi pembelian" :disable="props.row.status !== 'tercatat' || loadingCorrection" :loading="loadingCorrection && selectedPurchase?.id === props.row.id" @click="openCorrection(props.row)" /><q-btn v-if="canManage" flat round dense color="negative" icon="block" aria-label="Batalkan pembelian" :disable="props.row.status !== 'tercatat'" @click="openCancellation(props.row)" /></q-td></template>
      </q-table>
    </q-card>

    <q-dialog v-model="formOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header"><div class="dialog-header-copy"><div class="dialog-eyebrow">PEMBELIAN</div><div class="text-h6 dialog-title">Catat pembelian</div><div class="dialog-subtitle">Masukkan barang dan jumlahnya. Rincian tidak terhubung ke master stok.</div></div><q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="formOpen = false" /></q-card-section>
        <q-separator />
        <q-form class="q-pa-lg" @submit.prevent="submitPurchase">
          <q-input v-model="form.date" outlined type="date" label="Tanggal" :rules="[(value) => !!value || 'Tanggal perlu diisi']" />
          <div v-for="(line, index) in form.lines" :key="index" class="purchase-line">
            <q-input v-model.trim="line.name" outlined dense label="Nama barang" />
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-4"><q-input v-model.number="line.quantity" outlined dense type="number" min="0.01" step="0.01" label="Qty" /></div>
              <div class="col-12 col-sm-4"><q-input v-model.trim="line.unit" outlined dense label="Satuan (opsional)" /></div>
              <div class="col-12 col-sm-4"><CurrencyInput v-model="line.unitPrice" dense label="Harga/satuan" min="0.01" :rules="[() => Number(line.unitPrice) > 0 || 'Harga harus lebih dari nol']" /></div>
            </div>
            <q-btn v-if="form.lines.length > 1" flat round dense color="negative" icon="delete_outline" aria-label="Hapus item" @click="removeLine(index)" />
          </div>
          <q-btn flat no-caps color="primary" icon="add" label="Tambah rincian" @click="addLine" />
          <q-input v-model.trim="form.note" outlined type="textarea" autogrow maxlength="2000" label="Catatan pembelian (opsional)" class="q-mt-md" />
          <div class="purchase-preview"><span>Total pratinjau</span><strong>{{ formatPrice(previewTotal) }}</strong></div>
          <div class="row justify-end q-gutter-sm q-mt-lg"><q-btn flat no-caps label="Batal" @click="formOpen = false" /><q-btn unelevated no-caps color="primary" label="Simpan pembelian" :loading="saving" type="submit" /></div>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="mutationOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header">
          <div class="dialog-header-copy"><div class="dialog-eyebrow">PEMBELIAN</div><div class="text-h6 dialog-title">{{ mutationType === 'correction' ? 'Koreksi pembelian' : 'Batalkan pembelian' }}</div><div class="dialog-subtitle">{{ selectedPurchase?.no_transaksi }} · perubahan dicatat di server</div></div>
          <q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="mutationOpen = false" />
        </q-card-section>
        <q-separator />
        <q-form class="q-pa-lg" @submit.prevent="submitMutation">
          <template v-if="mutationType === 'correction'">
            <q-input v-model="mutationForm.date" outlined type="date" label="Tanggal pembelian" />
            <q-input v-model.trim="mutationForm.note" outlined type="textarea" autogrow label="Catatan" />
            <div class="purchase-correction-heading">
              <strong>Rincian barang</strong>
              <span class="panel-caption">Mengubah rincian akan mengganti seluruh daftar barang.</span>
            </div>
            <div v-for="(line, index) in mutationForm.lines" :key="index" class="purchase-line">
              <q-input v-model.trim="line.name" outlined dense maxlength="150" label="Nama barang" />
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-4"><q-input v-model.number="line.quantity" outlined dense type="number" min="0.01" step="0.01" label="Qty" /></div>
                <div class="col-12 col-sm-4"><q-input v-model.trim="line.unit" outlined dense maxlength="30" label="Satuan (opsional)" /></div>
                <div class="col-12 col-sm-4"><CurrencyInput v-model="line.unitPrice" dense label="Harga/satuan" min="0.01" /></div>
              </div>
              <q-btn v-if="mutationForm.lines.length > 1" flat round dense color="negative" icon="delete_outline" aria-label="Hapus rincian" @click="removeCorrectionLine(index)" />
            </div>
            <q-btn flat no-caps color="primary" icon="add" label="Tambah rincian" @click="addCorrectionLine" />
            <div class="purchase-preview"><span>Total rincian (pratinjau)</span><strong>{{ formatPrice(correctionPreviewTotal) }}</strong></div>
          </template>
          <q-input v-model.trim="mutationForm.reason" outlined type="textarea" autogrow label="Alasan (wajib)" :rules="[(value) => !!value.trim() || 'Alasan wajib diisi']" />
          <div class="row justify-end q-gutter-sm q-mt-lg"><q-btn flat no-caps label="Kembali" @click="mutationOpen = false" /><q-btn unelevated no-caps :color="mutationType === 'correction' ? 'primary' : 'negative'" :label="mutationType === 'correction' ? 'Simpan koreksi' : 'Batalkan pembelian'" :loading="saving" type="submit" /></div>
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
import { createLocalDayTimestamp, displayApiError, larisamaApi, toMoney, toQuantity } from '@/services/larisama-api.js'

const $q = useQuasar()
const formOpen = ref(false)
const mutationOpen = ref(false)
const mutationType = ref('correction')
const selectedPurchase = ref(null)
const purchases = ref([])
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const canManage = computed(() => ['owner', 'manager', 'superadmin'].includes(authSession.user?.role))
const mutationForm = reactive({ date: '', note: '', reason: '', lines: [] })
const originalCorrection = ref(null)
const loadingCorrection = ref(false)
const blankLine = () => ({ name: '', quantity: null, unit: '', unitPrice: null })
const form = reactive({ date: new Date().toISOString().slice(0, 10), note: '', lines: [blankLine()] })
const columns = [
  { name: 'no_transaksi', label: 'No. pembelian', field: 'no_transaksi', align: 'left' },
  { name: 'tanggal', label: 'Tanggal', field: 'tanggal', align: 'left', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]
const previewTotal = computed(() => form.lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0))
const correctionPreviewTotal = computed(() => mutationForm.lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0))
const pendingKey = ref(null)

async function loadPurchases() {
  loading.value = true; loadError.value = ''
  try { purchases.value = await larisamaApi.listPurchases({ sort: '-tanggal' }) }
  catch (error) { loadError.value = displayApiError(error); $q.notify({ type: 'negative', message: loadError.value }) }
  finally { loading.value = false }
}
onMounted(loadPurchases)

function addLine() { form.lines.push(blankLine()) }
function removeLine(index) { form.lines.splice(index, 1) }
function formatPrice(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0)) }
function formatDate(value) { return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—' }

async function openCorrection(purchase) {
  if (loadingCorrection.value) return
  loadingCorrection.value = true
  selectedPurchase.value = purchase
  try {
    selectedPurchase.value = await larisamaApi.getPurchase(purchase.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error) })
    loadingCorrection.value = false
    return
  }
  mutationType.value = 'correction'
  const detail = selectedPurchase.value
  const lines = (detail.rincian || []).map((line) => ({
    name: line.nama_item || '',
    quantity: line.qty === null ? null : Number(line.qty),
    unit: line.satuan || '',
    unitPrice: line.harga_satuan === null ? null : Number(line.harga_satuan),
  }))
  Object.assign(mutationForm, { date: detail.tanggal?.slice(0, 10) || '', note: detail.catatan || '', reason: '', lines })
  originalCorrection.value = {
    date: detail.tanggal?.slice(0, 10) || '',
    note: detail.catatan || '',
    lines: canonicalPurchaseLines(lines),
  }
  mutationOpen.value = true
  pendingKey.value = null
  loadingCorrection.value = false
}

function openCancellation(purchase) {
  selectedPurchase.value = purchase
  mutationType.value = 'cancellation'
  Object.assign(mutationForm, { date: '', note: '', reason: '', lines: [] })
  originalCorrection.value = null
  mutationOpen.value = true
  pendingKey.value = null
}

function addCorrectionLine() { mutationForm.lines.push(blankLine()) }
function removeCorrectionLine(index) { mutationForm.lines.splice(index, 1) }
function canonicalPurchaseLines(lines) {
  return lines.map((line) => ({
    nama_item: line.name.trim(),
    qty: line.quantity === null || line.quantity === '' ? null : toQuantity(line.quantity),
    satuan: line.unit.trim() || null,
    harga_satuan: line.unitPrice === null || line.unitPrice === '' ? null : toMoney(line.unitPrice),
  }))
}

async function submitMutation() {
  if (!selectedPurchase.value || !mutationForm.reason.trim()) return
  const payload = { alasan: mutationForm.reason.trim() }
  if (mutationType.value === 'correction') {
    if (mutationForm.date !== String(selectedPurchase.value.tanggal).slice(0, 10)) payload.tanggal = createLocalDayTimestamp(mutationForm.date, authSession.warung?.timezone)
    if (mutationForm.note.trim() !== (selectedPurchase.value.catatan || '')) payload.catatan = mutationForm.note.trim() || null
    const lines = canonicalPurchaseLines(mutationForm.lines)
    if (JSON.stringify(lines) !== JSON.stringify(originalCorrection.value?.lines || [])) {
      const validLines = mutationForm.lines.length > 0 && mutationForm.lines.every((line) =>
        line.name.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) > 0,
      )
      if (!validLines) return $q.notify({ type: 'warning', message: 'Lengkapi nama barang, jumlah, dan harga satuan setiap rincian.' })
      payload.rincian = mutationForm.lines.map((line) => ({
        nama_item: line.name.trim(),
        qty: toQuantity(line.quantity),
        ...(line.unit.trim() ? { satuan: line.unit.trim() } : {}),
        harga_satuan: toMoney(line.unitPrice),
      }))
    }
    if (Object.keys(payload).length === 1) return $q.notify({ type: 'warning', message: 'Ubah tanggal, catatan, atau rincian barang untuk mengoreksi pembelian.' })
  }
  saving.value = true
  try {
    const fingerprint = `${mutationType.value}:${selectedPurchase.value.id}:${JSON.stringify(payload)}`
    if (pendingKey.value?.fingerprint !== fingerprint) pendingKey.value = { fingerprint, key: newIdempotencyKey() }
    if (mutationType.value === 'correction') await larisamaApi.correctPurchase(selectedPurchase.value.id, payload, pendingKey.value.key)
    else await larisamaApi.cancelPurchase(selectedPurchase.value.id, payload, pendingKey.value.key)
    mutationOpen.value = false; pendingKey.value = null
    await loadPurchases(); $q.notify({ type: 'positive', message: 'Perubahan pembelian tersimpan.' })
  } catch (error) { if (error.status && error.status < 500 && error.status !== 429) pendingKey.value = null; $q.notify({ type: 'negative', message: displayApiError(error) }) }
  finally { saving.value = false }
}

async function submitPurchase() {
  const validLines = form.lines.every((line) => line.name.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) > 0)
  if (!validLines) {
    $q.notify({ type: 'negative', message: 'Lengkapi nama barang, jumlah, dan harga satuan setiap rincian.' })
    return
  }
  const details = form.lines.map((line) => ({
    nama_item: line.name.trim(),
    qty: toQuantity(line.quantity),
    ...(line.unit.trim() ? { satuan: line.unit.trim() } : {}),
    harga_satuan: toMoney(line.unitPrice),
  }))
  const payload = { tanggal: createLocalDayTimestamp(form.date, authSession.warung?.timezone), ...(form.note.trim() ? { catatan: form.note.trim() } : {}), rincian: details }
  const fingerprint = JSON.stringify(payload)
  if (pendingKey.value?.fingerprint !== fingerprint) pendingKey.value = { fingerprint, key: newIdempotencyKey() }
  saving.value = true
  try {
    await larisamaApi.createPurchase(payload, pendingKey.value.key)
    await loadPurchases(); $q.notify({ type: 'positive', message: 'Pembelian tersimpan.' })
    pendingKey.value = null; Object.assign(form, { date: new Date().toISOString().slice(0, 10), note: '', lines: [blankLine()] }); formOpen.value = false
  } catch (error) { if (error.status && error.status < 500 && error.status !== 429) pendingKey.value = null; $q.notify({ type: 'negative', message: displayApiError(error) }) }
  finally { saving.value = false }
}
</script>

<style scoped>
.purchase-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: start; margin: 14px 0; }
.purchase-line > .row { grid-column: 1 / -1; }
.purchase-preview { display: flex; justify-content: space-between; margin-top: 18px; padding: 14px; border-radius: 10px; background: #f3f7f4; }
</style>
