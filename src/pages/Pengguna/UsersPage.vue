<template>
  <q-page class="page-shell">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col"><div class="eyebrow">PENGATURAN WARUNG</div><h1 class="page-title">Pengguna</h1><p class="page-subtitle">Kelola akun dan peran pengguna dalam warung ini.</p></div>
      <div class="col-auto"><q-btn unelevated no-caps color="primary" icon="person_add" label="Tambah pengguna" @click="openForm()" /></div>
    </div>
    <q-card flat bordered class="panel-card">
      <q-card-section class="row items-center justify-between"><div><div class="panel-title">Akun warung</div><div class="panel-caption">Pengelolaan akun melalui API.</div></div><q-chip class="demo-chip">Data server</q-chip></q-card-section>
      <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mx-md q-mb-md">{{ loadError }}</q-banner>
      <q-table flat :rows="users" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 10 }">
        <template #body-cell-role="props"><q-td :props="props"><q-badge outline color="primary">{{ roleLabel(props.row.role) }}</q-badge></q-td></template>
        <template #body-cell-active="props"><q-td :props="props"><q-badge :color="props.row.aktif ? 'positive' : 'grey-6'">{{ props.row.aktif ? 'Aktif' : 'Nonaktif' }}</q-badge></q-td></template>
        <template #body-cell-actions="props"><q-td :props="props"><q-btn flat round dense icon="edit" aria-label="Edit pengguna" @click="openForm(props.row)" /></q-td></template>
      </q-table>
    </q-card>

    <q-dialog v-model="formOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header"><div class="dialog-header-copy"><div class="dialog-eyebrow">AKUN WARUNG</div><div class="text-h6 dialog-title">{{ selectedUser ? 'Edit pengguna' : 'Tambah pengguna' }}</div><div class="dialog-subtitle">Data pengguna dikelola melalui server.</div></div><q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="formOpen = false" /></q-card-section>
        <q-separator />
        <q-form class="q-pa-lg" @submit.prevent="submitForm">
          <q-input v-model.trim="form.name" outlined label="Nama lengkap" maxlength="150" :rules="[(value) => !!value || 'Nama perlu diisi']" />
          <q-input v-model.trim="form.username" outlined label="Username" maxlength="100" :rules="[(value) => !!value || 'Username perlu diisi', (value) => !/[A-Z]/.test(value) || 'Gunakan huruf kecil']" />
          <q-input v-model.trim="form.email" outlined type="email" label="Email (opsional)" maxlength="150" :rules="[(value) => !value || !/[A-Z]/.test(value) || 'Gunakan huruf kecil']" />
          <q-input v-model="form.password" outlined type="password" :label="selectedUser ? 'Password baru (opsional)' : 'Password awal'" :hint="selectedUser ? 'Kosongkan jika tidak mengganti password.' : 'Minimal 8 karakter.'" :rules="[(value) => selectedUser && !value || value.length >= 8 || 'Minimal 8 karakter']" />
          <q-select v-model="form.role" outlined emit-value map-options label="Peran" :options="roleOptions" />
          <q-toggle v-model="form.active" color="secondary" label="Akun aktif" />
          <div class="row justify-end q-gutter-sm q-mt-lg"><q-btn flat no-caps label="Batal" @click="formOpen = false" /><q-btn unelevated no-caps color="primary" label="Simpan pengguna" :loading="saving" type="submit" /></div>
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
const selectedUser = ref(null)
const users = ref([])
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const roleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Manager', value: 'manager' },
  { label: 'Kasir', value: 'kasir' },
]
const form = reactive({ name: '', username: '', email: '', password: '', role: 'kasir', active: true })
const columns = [
  { name: 'name', label: 'Nama', field: 'nama', align: 'left', sortable: true },
  { name: 'username', label: 'Username', field: 'username', align: 'left' },
  { name: 'role', label: 'Peran', field: 'role', align: 'left' },
  { name: 'active', label: 'Status', field: 'aktif', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]
async function loadUsers() {
  loading.value = true; loadError.value = ''
  try { users.value = await larisamaApi.listUsers() }
  catch (error) { loadError.value = displayApiError(error); $q.notify({ type: 'negative', message: loadError.value }) }
  finally { loading.value = false }
}
onMounted(loadUsers)

function openForm(user = null) {
  selectedUser.value = user
  Object.assign(form, user ? { name: user.nama, username: user.username, email: user.email || '', password: '', role: user.role, active: user.aktif } : { name: '', username: '', email: '', password: '', role: 'kasir', active: true })
  formOpen.value = true
}
async function submitForm() {
  if (/[A-Z]/.test(form.username) || (form.email && /[A-Z]/.test(form.email))) {
    $q.notify({ type: 'negative', message: 'Username dan email harus menggunakan huruf kecil.' })
    return
  }
  const body = { nama: form.name.trim(), username: form.username.trim(), email: form.email || null, role: form.role, aktif: form.active }
  if (form.password) body.password = form.password
  saving.value = true
  try { await larisamaApi.saveUser(selectedUser.value?.id, body); await loadUsers(); formOpen.value = false; $q.notify({ type: 'positive', message: 'Pengguna tersimpan.' }) }
  catch (error) { $q.notify({ type: 'negative', message: displayApiError(error) }) }
  finally { saving.value = false }
}
function roleLabel(role) { return ({ owner: 'Owner', manager: 'Manager', kasir: 'Kasir' })[role] || role }
</script>
