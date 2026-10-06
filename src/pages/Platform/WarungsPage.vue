<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col"><div class="eyebrow">PLATFORM</div><h1 class="page-title">Kelola Warung</h1><p class="page-subtitle">Daftarkan warung dan akun owner awal dalam satu form.</p></div>
      <div class="col-auto"><q-btn unelevated no-caps color="primary" icon="add_business" label="Tambah warung" @click="openForm" /></div>
    </div>
    <q-banner v-if="error" rounded class="q-mb-lg bg-red-1 text-negative">{{ error }}</q-banner>
    <q-card flat bordered class="panel-card">
      <q-card-section><div class="panel-title">Daftar warung</div></q-card-section>
      <q-table flat :rows="warungs" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 10 }" :grid="$q.screen.lt.sm" no-data-label="Belum ada warung.">
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered class="warung-mobile-card">
              <q-card-section>
                <div class="row items-start justify-between q-gutter-sm">
                  <div class="col"><div class="text-weight-bold">{{ props.row.nama }}</div><div class="panel-caption">{{ props.row.kode }}</div></div>
                  <q-badge :color="props.row.aktif ? 'positive' : 'grey-6'">{{ props.row.aktif ? 'Aktif' : 'Nonaktif' }}</q-badge>
                </div>
                <div class="warung-mobile-meta"><span>Zona waktu</span><strong>{{ props.row.timezone }}</strong></div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>

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
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const $q = useQuasar()
const formOpen = ref(false)
const warungs = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const blankForm = () => ({ name: '', timezone: 'Asia/Jakarta', address: '', phone: '', startDate: '', endDate: '', active: true, owner: { name: '', username: '', email: '', password: '' } })
const form = reactive(blankForm())
const columns = [
  { name: 'code', label: 'Kode', field: 'kode', align: 'left' },
  { name: 'name', label: 'Warung', field: 'nama', align: 'left' },
  { name: 'timezone', label: 'Zona waktu', field: 'timezone', align: 'left' },
  { name: 'owner', label: 'Owner awal', field: (row) => row.owner?.name || '—', align: 'left' },
  { name: 'active', label: 'Status', field: (row) => row.aktif ? 'Aktif' : 'Nonaktif', align: 'left' },
]
async function loadWarungs() { loading.value = true; error.value = ''; try { warungs.value = await larisamaApi.listWarungs() } catch (e) { error.value = displayApiError(e) } finally { loading.value = false } }
onMounted(loadWarungs)

function openForm() {
  Object.assign(form, blankForm())
  formOpen.value = true
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
.form-section-label { margin: 4px 0 14px; color: #176342; font-size: 12px; font-weight: 800; }
.warung-date-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.warung-mobile-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; color: #718078; font-size: 12px; }
.warung-mobile-meta strong { color: #254435; text-align: right; overflow-wrap: anywhere; }
@media (max-width: 599px) { .warung-date-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
