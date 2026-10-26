<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col"><div class="eyebrow">PLATFORM</div><h1 class="page-title">Kelola Warung</h1><p class="page-subtitle">Tinjau pendaftaran owner dan kelola masa aktif warung.</p></div>
    </div>
    <q-banner v-if="error" rounded class="q-mb-lg bg-red-1 text-negative">{{ error }}</q-banner>
    <q-card flat bordered class="panel-card">
      <q-card-section class="warung-filter-header"><div class="panel-title">Daftar warung</div><q-tabs v-model="filter" dense no-caps align="justify" active-color="primary" class="warung-filter-tabs"><q-tab name="pending" label="Menunggu persetujuan" /><q-tab name="active" label="Aktif saja" /><q-tab name="all" label="Semua" /></q-tabs></q-card-section>
      <q-table flat :rows="visibleWarungs" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 10 }" :grid="$q.screen.lt.sm" no-data-label="Belum ada warung.">
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered class="warung-mobile-card">
              <q-card-section>
                <div class="row items-start justify-between q-gutter-sm">
                  <div class="col"><div class="text-weight-bold">{{ props.row.nama }}</div></div>
                  <q-badge :color="statusColor(props.row)">{{ statusText(props.row) }}</q-badge>
                </div>
                <div class="warung-mobile-meta"><span>Pemilik</span><strong>{{ ownerNames(props.row) }}</strong></div>
                <div class="warung-mobile-meta"><span>Aktif sejak</span><strong>{{ props.row.tanggal_mulai || '—' }}</strong></div>
                <div class="warung-mobile-meta"><span>Aktif sampai</span><strong>{{ props.row.tanggal_berakhir || '—' }}</strong></div>
                <div class="warung-mobile-sync q-mt-md">
                  <div class="row items-center justify-between q-gutter-sm">
                    <span class="text-caption text-grey-7">Sync UDEV</span>
                    <q-badge :color="udevSyncColor(props.row.udev_customer_sync)">{{ udevSyncText(props.row.udev_customer_sync) }}</q-badge>
                  </div>
                  <div v-if="udevSyncDetail(props.row.udev_customer_sync)" class="text-caption text-grey-7 q-mt-xs">{{ udevSyncDetail(props.row.udev_customer_sync) }}</div>
                  <div class="row justify-end q-gutter-xs q-mt-xs">
                    <q-btn v-if="!props.row.udev_customer_sync && props.row.owners?.length" outline dense no-caps color="primary" icon="sync" label="Sync ke UDEV" :loading="syncBusyId === props.row.id" @click="openLegacySync(props.row)" />
                    <q-btn v-if="canRefreshUdevSync(props.row.udev_customer_sync)" flat dense no-caps icon="refresh" label="Perbarui" :loading="syncBusyId === props.row.id" @click="refreshUdevSync(props.row)" />
                    <q-btn v-if="canRetryUdevSync(props.row.udev_customer_sync)" outline dense no-caps color="negative" icon="sync" label="Retry sync" :loading="syncBusyId === props.row.id" @click="retryUdevSync(props.row)" />
                  </div>
                </div>
                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn v-if="isPending(props.row)" unelevated no-caps color="primary" label="Setujui 30 hari" :loading="isActionBusy(props.row, 'approve')" @click="approve(props.row)" />
                  <q-btn v-else outline no-caps color="primary" label="Tambah 30 hari" :loading="isActionBusy(props.row, 'extend')" @click="extend(props.row)" />
                  <q-btn outline no-caps color="secondary" :label="threeDayActionLabel(props.row)" :loading="isActionBusy(props.row, 'activate-three-days')" @click="activateThreeDays(props.row)" />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        <template #body-cell-status="props"><q-td :props="props"><q-badge :color="statusColor(props.row)">{{ statusText(props.row) }}</q-badge></q-td></template>
        <template #body-cell-udev_sync="props">
          <q-td :props="props">
            <div class="column items-start q-gutter-xs">
              <q-badge :color="udevSyncColor(props.row.udev_customer_sync)">{{ udevSyncText(props.row.udev_customer_sync) }}</q-badge>
              <div v-if="udevSyncDetail(props.row.udev_customer_sync)" class="text-caption text-grey-7">{{ udevSyncDetail(props.row.udev_customer_sync) }}</div>
              <div class="row q-gutter-xs">
                <q-btn v-if="!props.row.udev_customer_sync && props.row.owners?.length" outline dense no-caps color="primary" icon="sync" label="Sync ke UDEV" :loading="syncBusyId === props.row.id" @click.stop="openLegacySync(props.row)" />
                <q-btn v-if="canRefreshUdevSync(props.row.udev_customer_sync)" flat dense round icon="refresh" aria-label="Perbarui status UDEV" :loading="syncBusyId === props.row.id" @click.stop="refreshUdevSync(props.row)">
                  <q-tooltip>Perbarui status UDEV</q-tooltip>
                </q-btn>
                <q-btn v-if="canRetryUdevSync(props.row.udev_customer_sync)" flat dense no-caps color="negative" label="Retry sync" :loading="syncBusyId === props.row.id" @click.stop="retryUdevSync(props.row)" />
              </div>
            </div>
          </q-td>
        </template>
        <template #body-cell-actions="props"><q-td :props="props" class="text-right">
          <q-btn v-if="isPending(props.row)" flat dense no-caps color="primary" label="Setujui 30 hari" :loading="isActionBusy(props.row, 'approve')" @click="approve(props.row)" />
          <q-btn v-else flat dense no-caps color="primary" label="Tambah 30 hari" :loading="isActionBusy(props.row, 'extend')" @click="extend(props.row)" />
          <q-btn flat dense no-caps color="secondary" :label="threeDayActionLabel(props.row)" :loading="isActionBusy(props.row, 'activate-three-days')" @click="activateThreeDays(props.row)" />
        </q-td></template>
      </q-table>
    </q-card>

    <q-dialog v-model="legacySyncDialogOpen" persistent>
      <q-card class="product-form-dialog">
        <q-card-section>
          <div class="text-h6">Sinkronkan warung lama ke UDEV?</div>
          <div class="q-mt-sm">Data warung dan owner terpilih akan dikirim ke UDEV Billing untuk pendaftaran customer dan pembuatan invoice paket langganan. Dengan melanjutkan, Anda mencatat bahwa pemberitahuan dan persetujuan owner sudah disampaikan; pemberitahuan verbal diperbolehkan. Aksi dan akun superadmin akan masuk audit.</div>
          <q-select v-model="legacyOwnerId" class="q-mt-md" outlined emit-value map-options :options="legacyOwnerOptions" option-label="label" option-value="id" label="Owner yang didaftarkan ke UDEV" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Batal" :disable="Boolean(syncBusyId)" @click="legacySyncDialogOpen = false" />
          <q-btn unelevated no-caps color="primary" label="Catat persetujuan dan sync" :loading="syncBusyId === legacySyncRow?.id" :disable="!legacyOwnerId" @click="initiateLegacySync" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmationOpen" persistent>
      <q-card class="product-form-dialog">
        <q-card-section>
          <div class="text-h6">{{ confirmation?.title }}</div>
          <div class="q-mt-sm">{{ confirmation?.message }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Batal" :disable="Boolean(busyId)" @click="confirmationOpen = false" />
          <q-btn unelevated no-caps color="primary" label="Ya, lanjutkan" :loading="busyId === confirmation?.row.id" @click="confirmAction" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="formOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header"><div class="dialog-header-copy"><div class="dialog-eyebrow">ADMIN PLATFORM</div><div class="text-h6 dialog-title">Daftarkan warung</div><div class="dialog-subtitle">Warung dan owner awal dibuat bersama pada alur backend.</div></div><q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="formOpen = false" /></q-card-section>
        <q-separator />
        <q-form class="q-pa-lg" autocomplete="off" @submit.prevent="submitForm">
          <div class="form-section-label">Informasi warung</div>
          <q-input v-model.trim="form.name" outlined label="Nama warung" maxlength="150" :rules="[(value) => !!value || 'Nama wajib diisi']" />
          <q-input v-model.trim="form.timezone" outlined label="Zona waktu (IANA)" placeholder="Asia/Jakarta" :rules="[(value) => !!value || 'Zona waktu wajib diisi']" />
          <q-input v-model.trim="form.address" outlined type="textarea" autogrow label="Alamat (opsional)" />
          <q-input v-model.trim="form.phone" outlined label="Telepon (opsional)" maxlength="30" />
          <div class="warung-date-grid">
            <q-input v-model="form.startDate" outlined readonly clearable label="Tanggal mulai (opsional)" placeholder="Pilih tanggal">
              <template #append><q-icon name="event" class="cursor-pointer"><q-popup-proxy cover transition-show="scale" transition-hide="scale"><q-date v-model="form.startDate" mask="YYYY-MM-DD"><div class="row items-center justify-end q-gutter-sm"><q-btn v-close-popup flat no-caps label="Tutup" /></div></q-date></q-popup-proxy></q-icon></template>
            </q-input>
            <q-input v-model="form.endDate" outlined readonly clearable label="Tanggal berakhir (opsional)" placeholder="Pilih tanggal">
              <template #append><q-icon name="event" class="cursor-pointer"><q-popup-proxy cover transition-show="scale" transition-hide="scale"><q-date v-model="form.endDate" mask="YYYY-MM-DD"><div class="row items-center justify-end q-gutter-sm"><q-btn v-close-popup flat no-caps label="Tutup" /></div></q-date></q-popup-proxy></q-icon></template>
            </q-input>
          </div>
          <q-toggle v-model="form.active" color="secondary" label="Warung aktif" />
          <q-separator class="q-my-md" />
          <div class="form-section-label">Owner awal</div>
          <q-input v-model.trim="form.owner.name" outlined label="Nama owner" maxlength="150" :rules="[(value) => !!value || 'Nama owner wajib diisi']" />
          <q-input v-model.trim="form.owner.username" outlined name="owner_username" autocomplete="off" label="Username (huruf kecil)" maxlength="100" :rules="[(value) => !!value || 'Username wajib diisi', (value) => !/[A-Z]/.test(value) || 'Username harus huruf kecil']" />
          <q-input v-model.trim="form.owner.email" outlined type="email" label="Email owner (opsional, huruf kecil)" :rules="[(value) => !value || !/[A-Z]/.test(value) || 'Email harus huruf kecil']" />
          <q-input v-model="form.owner.password" outlined name="owner_initial_password" autocomplete="new-password" type="password" label="Password awal" hint="Minimal 8 karakter." :rules="[(value) => value.length >= 8 || 'Minimal 8 karakter']" />
          <div class="row justify-end q-gutter-sm q-mt-lg"><q-btn flat no-caps label="Batal" @click="formOpen = false" /><q-btn unelevated no-caps color="primary" label="Daftarkan warung" :loading="saving" type="submit" /></div>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const $q = useQuasar()
const formOpen = ref(false)
const warungs = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const busyId = ref(null)
const syncBusyId = ref(null)
const legacySyncDialogOpen = ref(false)
const legacySyncRow = ref(null)
const legacyOwnerId = ref(null)
const legacyOwnerOptions = computed(() => (legacySyncRow.value?.owners || []).map((owner) => ({ ...owner, label: `${owner.nama} · ID ${owner.id}` })))
const confirmationOpen = ref(false)
const confirmation = ref(null)
const filter = ref('pending')
const visibleWarungs = computed(() => {
  if (filter.value === 'pending') return warungs.value.filter(isPending)
  if (filter.value === 'active') return warungs.value.filter((row) => row.status_langganan === 'aktif')
  return warungs.value
})
const blankForm = () => ({ name: '', timezone: 'Asia/Jakarta', address: '', phone: '', startDate: '', endDate: '', active: true, owner: { name: '', username: '', email: '', password: '' } })
const form = reactive(blankForm())
const columns = [
  { name: 'name', label: 'Warung', field: 'nama', align: 'left' },
  { name: 'owner', label: 'Pemilik', field: ownerNames, align: 'left' },
  { name: 'subscription_start', label: 'Aktif sejak', field: (row) => row.tanggal_mulai || '—', align: 'left' },
  { name: 'subscription_end', label: 'Aktif sampai', field: (row) => row.tanggal_berakhir || '—', align: 'left' },
  { name: 'status', label: 'Status', field: statusText, align: 'left' },
  { name: 'udev_sync', label: 'Sync UDEV', field: (row) => row.udev_customer_sync?.status || 'none', align: 'left' },
  { name: 'actions', label: '', field: 'id', align: 'right' },
]
function isPending(row) { return row.status_langganan === 'menunggu_persetujuan' }
function isActionBusy(row, actionKey) { return busyId.value === row.id && confirmation.value?.actionKey === actionKey }
function threeDayActionLabel(row) { return row.status_langganan === 'aktif' ? 'Tambah 3 hari' : 'Aktifkan 3 hari' }
function statusText(row) { return isPending(row) ? 'Menunggu persetujuan' : row.status_langganan === 'aktif' ? 'Aktif' : row.status_langganan === 'kedaluwarsa' ? 'Kedaluwarsa' : 'Nonaktif' }
function statusColor(row) { return isPending(row) ? 'orange-8' : row.status_langganan === 'aktif' ? 'positive' : 'grey-7' }
function ownerNames(row) { return row.owners?.map((owner) => owner.nama).filter(Boolean).join(', ') || '—' }
function udevSyncText(sync) {
  if (!sync) return 'Belum ada data'
  return ({ pending: 'Menunggu proses', retry_wait: 'Menunggu retry', synced: 'Tersinkron', failed: 'Gagal', blocked: 'Terblokir' })[sync.status] || 'Status tidak dikenal'
}
function udevSyncColor(sync) {
  return ({ pending: 'blue-8', retry_wait: 'orange-8', synced: 'positive', failed: 'negative', blocked: 'grey-7' })[sync?.status] || 'grey-6'
}
function canRefreshUdevSync(sync) { return Boolean(sync) && sync.status !== 'synced' }
function canRetryUdevSync(sync) { return ['failed', 'blocked', 'retry_wait'].includes(sync?.status) }
function udevSyncDetail(sync) {
  if (!sync) return ''
  const details = []
  if (sync.last_http_status) details.push(`HTTP ${sync.last_http_status}`)
  if (sync.last_error_code) details.push(sync.last_error_code)
  if (sync.status === 'synced' && sync.last_success_at) details.push(`Berhasil ${formatSyncTime(sync.last_success_at)}`)
  else if (sync.status === 'retry_wait' && sync.next_attempt_at) details.push(`Retry berikutnya ${formatSyncTime(sync.next_attempt_at)}`)
  else if (sync.last_attempt_at) details.push(`Percobaan ${formatSyncTime(sync.last_attempt_at)}`)
  if (sync.attempt_count > 0) details.push(`${sync.attempt_count} percobaan`)
  return details.join(' · ')
}
function formatSyncTime(value) {
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(timestamp)
}
function syncSummary(sync) {
  return {
    status: sync.status,
    attempt_count: sync.attempt_count,
    last_http_status: sync.last_http_status,
    last_error_code: sync.last_error_code,
    last_attempt_at: sync.last_attempt_at,
    last_success_at: sync.last_success_at,
    next_attempt_at: sync.next_attempt_at,
  }
}
async function loadWarungs() { loading.value = true; error.value = ''; try { warungs.value = await larisamaApi.listWarungs() } catch (e) { error.value = displayApiError(e) } finally { loading.value = false } }
onMounted(loadWarungs)

async function refreshUdevSync(row) {
  syncBusyId.value = row.id
  try {
    row.udev_customer_sync = syncSummary(await larisamaApi.getWarungUdevCustomerSync(row.id))
  } catch (e) {
    $q.notify({ type: 'negative', message: displayApiError(e), position: 'top' })
  } finally { syncBusyId.value = null }
}

async function retryUdevSync(row) {
  syncBusyId.value = row.id
  try {
    row.udev_customer_sync = syncSummary(await larisamaApi.retryWarungUdevCustomerSync(row.id))
    $q.notify({ type: 'positive', message: `Retry sync ${row.nama} sudah masuk antrean.`, position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: displayApiError(e), position: 'top' })
  } finally { syncBusyId.value = null }
}

function openLegacySync(row) {
  if (!row.owners?.length) {
    $q.notify({ type: 'negative', message: 'Warung ini belum memiliki akun owner untuk didaftarkan ke UDEV.', position: 'top' })
    return
  }
  legacySyncRow.value = row
  legacyOwnerId.value = row.owners.length === 1 ? row.owners[0].id : null
  legacySyncDialogOpen.value = true
}

async function initiateLegacySync() {
  const row = legacySyncRow.value
  if (!row || !legacyOwnerId.value) return
  syncBusyId.value = row.id
  try {
    row.udev_customer_sync = syncSummary(await larisamaApi.initiateWarungUdevCustomerSync(row.id, { owner_user_id: legacyOwnerId.value }))
    legacySyncDialogOpen.value = false
    $q.notify({ type: 'positive', message: `Sync ${row.nama} sudah masuk antrean.`, position: 'top' })
  } catch (e) {
    $q.notify({ type: 'negative', message: displayApiError(e), position: 'top' })
  } finally { syncBusyId.value = null }
}

async function runAction(row, action, successMessage) {
  busyId.value = row.id
  try {
    await action(row.id)
    await loadWarungs()
    $q.notify({ type: 'positive', message: successMessage, position: 'top' })
    return true
  } catch (e) {
    $q.notify({ type: 'negative', message: displayApiError(e), position: 'top' })
    return false
  } finally { busyId.value = null }
}

function approve(row) {
  confirmation.value = {
    row,
    action: larisamaApi.approveWarung,
    actionKey: 'approve',
    title: 'Setujui pendaftaran?',
    message: `${row.nama} akan aktif selama 30 hari.`,
    successMessage: 'Pendaftaran disetujui selama 30 hari.',
  }
  confirmationOpen.value = true
}

function extend(row) {
  confirmation.value = {
    row,
    action: larisamaApi.extendWarungSubscription,
    actionKey: 'extend',
    title: 'Tambah masa aktif?',
    message: `Masa aktif ${row.nama} akan ditambah 30 hari.`,
    successMessage: 'Masa aktif ditambah 30 hari.',
  }
  confirmationOpen.value = true
}

function activateThreeDays(row) {
  const currentlyActive = row.status_langganan === 'aktif'
  confirmation.value = {
    row,
    action: larisamaApi.activateWarungForThreeDays,
    actionKey: 'activate-three-days',
    title: currentlyActive ? 'Tambah masa aktif 3 hari?' : 'Aktifkan warung 3 hari?',
    message: currentlyActive
      ? `Masa aktif ${row.nama} akan ditambah 3 hari setelah tanggal akhir saat ini.`
      : `${row.nama} akan diaktifkan selama 3 hari mulai tanggal lokal saat ini.`,
    successMessage: currentlyActive ? 'Masa aktif ditambah 3 hari.' : 'Warung diaktifkan selama 3 hari.',
  }
  confirmationOpen.value = true
}

async function confirmAction() {
  if (!confirmation.value) return
  const { row, action, successMessage } = confirmation.value
  const succeeded = await runAction(row, action, successMessage)
  if (succeeded) confirmationOpen.value = false
}

async function submitForm() {
  if (/[A-Z]/.test(form.owner.username) || (form.owner.email && /[A-Z]/.test(form.owner.email))) {
    $q.notify({ type: 'negative', message: 'Username dan email owner harus huruf kecil.' })
    return
  }
  const { owner, name, timezone, address, phone, startDate, endDate, active } = form
  const payload = { nama: name.trim(), timezone: timezone.trim(), alamat: address.trim() || null, telepon: phone.trim() || null, tanggal_mulai: startDate || null, tanggal_berakhir: endDate || null, aktif: active, owner: { nama: owner.name.trim(), username: owner.username.trim(), email: owner.email || null, password: owner.password } }
  saving.value = true
  try { await larisamaApi.createWarung(payload); await loadWarungs(); Object.assign(form, blankForm()); formOpen.value = false; $q.notify({ type: 'positive', message: 'Warung berhasil didaftarkan.' }) }
  catch (e) { $q.notify({ type: 'negative', message: displayApiError(e) }) }
  finally { saving.value = false }
}
</script>

<style scoped>
.warung-filter-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.warung-filter-tabs { min-width: 0; max-width: 100%; }
.form-section-label { margin: 4px 0 14px; color: #176342; font-size: 12px; font-weight: 800; }
.warung-date-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.warung-mobile-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; color: #718078; font-size: 12px; }
.warung-mobile-meta strong { color: #254435; text-align: right; overflow-wrap: anywhere; }
.warung-mobile-sync { padding-top: 10px; border-top: 1px solid #e7eee9; }
@media (max-width: 599px) {
  .warung-filter-header { align-items: stretch; flex-direction: column; }
  .warung-filter-tabs { width: 100%; }
  .warung-filter-tabs :deep(.q-tab) { flex: 1 1 0; min-width: 0; padding-inline: 4px; }
  .warung-filter-tabs :deep(.q-tab__label) { line-height: 1.2; text-align: center; white-space: normal; }
  .warung-date-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
