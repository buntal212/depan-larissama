<template>
  <section class="settings-tab-page profile-settings-tab">
    <div class="page-heading settings-section-heading">
      <h2 class="page-title">Profil Warung</h2>
      <p class="page-subtitle">Kelola informasi dan logo warung.</p>
    </div>

    <q-banner v-if="loadError" rounded class="q-mb-lg bg-red-1 text-negative">{{ loadError }}</q-banner>
    <q-card flat bordered class="panel-card profile-card" :aria-busy="loading">
      <q-inner-loading :showing="loading"><q-spinner color="primary" size="36px" /></q-inner-loading>
      <template v-if="warung">
        <q-card-section class="profile-header">
          <div class="row items-center q-gutter-md">
            <q-avatar size="76px" class="profile-store-avatar">
              <img v-if="logoPreview || warung.logo" :src="logoPreview || warung.logo" :alt="warung.nama" />
              <q-icon v-else name="storefront" size="38px" />
            </q-avatar>
            <div class="profile-heading-copy">
              <div class="panel-title">{{ warung.nama }}</div>
              <div class="panel-caption">{{ warung.kode }} · Profil warung</div>
            </div>
          </div>
          <div v-if="canEdit" class="logo-controls">
            <q-file v-model="logoFile" outlined dense clearable accept="image/png,image/jpeg,image/webp"
              label="Pilih logo (PNG/JPG/WebP, maks. 1 MiB)" @update:model-value="setLogoPreview">
              <template #prepend><q-icon name="image" /></template>
            </q-file>
            <div class="row q-gutter-sm">
              <q-btn unelevated no-caps color="primary" icon="upload" label="Unggah logo" :disable="!logoFile || logoSaving" :loading="logoSaving" @click="uploadLogo" />
              <q-btn v-if="warung.logo" flat no-caps color="negative" icon="delete_outline" label="Hapus logo" :disable="logoSaving" :loading="logoSaving" @click="deleteLogo" />
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-banner v-if="!canEdit" rounded class="q-mb-md bg-blue-1 text-primary">Profil hanya dapat diubah oleh owner warung.</q-banner>
          <q-form class="profile-form" @submit.prevent="saveProfile">
            <q-input v-model.trim="form.nama" outlined maxlength="150" label="Nama warung" :disable="!canEdit || saving" :rules="[(value) => !!value || 'Nama warung wajib diisi']" />
            <q-input v-model.trim="form.alamat" outlined type="textarea" autogrow label="Alamat" :disable="!canEdit || saving" />
            <q-input v-model.trim="form.telepon" outlined maxlength="30" label="Nomor telepon" :disable="!canEdit || saving" />
            <div class="profile-meta-grid">
              <div class="profile-meta"><span>Kode warung</span><strong>{{ warung.kode || '—' }}</strong></div>
              <div class="profile-meta"><span>Status</span><strong>{{ subscriptionLabel(warung.status_langganan) }}</strong></div>
              <div class="profile-meta"><span>Aktif sejak</span><strong>{{ subscriptionStart }}</strong></div>
              <div class="profile-meta"><span>Aktif sampai</span><strong>{{ subscriptionEnd }}</strong></div>
            </div>
            <div v-if="canEdit" class="row justify-end q-mt-md">
              <q-btn unelevated no-caps color="primary" icon="save" label="Simpan perubahan" :loading="saving" type="submit" />
            </div>
          </q-form>
        </q-card-section>
      </template>
    </q-card>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { authSession } from '@/stores/auth-session.js'

const $q = useQuasar()
const canEdit = computed(() => authSession.user?.role === 'owner')
const warung = ref(null)
const loading = ref(false)
const saving = ref(false)
const logoSaving = ref(false)
const loadError = ref('')
const logoFile = ref(null)
const logoPreview = ref('')
const form = reactive({ nama: '', alamat: '', telepon: '', timezone: '' })
const subscriptionStart = computed(() => formatDate(warung.value?.tanggal_mulai))
const subscriptionEnd = computed(() => formatDate(warung.value?.tanggal_berakhir))

async function loadProfile() {
  loading.value = true
  loadError.value = ''
  try {
    setProfile(await larisamaApi.currentWarung())
  } catch (error) {
    loadError.value = displayApiError(error)
  } finally {
    loading.value = false
  }
}

function setProfile(profile) {
  warung.value = profile
  authSession.warung = profile
  Object.assign(form, {
    nama: profile.nama || '',
    alamat: profile.alamat || '',
    telepon: profile.telepon || '',
    timezone: profile.timezone || 'Asia/Jakarta',
  })
}

async function saveProfile() {
  if (!canEdit.value || !form.nama.trim() || !form.timezone) return
  saving.value = true
  try {
    setProfile(await larisamaApi.updateCurrentWarung({
      nama: form.nama.trim(),
      alamat: form.alamat.trim() || null,
      telepon: form.telepon.trim() || null,
      timezone: form.timezone,
    }))
    $q.notify({ type: 'positive', message: 'Profil warung berhasil diperbarui.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error) })
  } finally {
    saving.value = false
  }
}

function setLogoPreview(file) {
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value = file ? URL.createObjectURL(file) : ''
}

async function uploadLogo() {
  if (!canEdit.value || !logoFile.value) return
  const file = logoFile.value
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
    $q.notify({ type: 'warning', message: 'Pilih gambar PNG, JPG, atau WebP maksimal 1 MiB.' })
    return
  }
  logoSaving.value = true
  try {
    setProfile(await larisamaApi.uploadCurrentWarungLogo(file))
    logoFile.value = null
    setLogoPreview(null)
    $q.notify({ type: 'positive', message: 'Logo warung berhasil diperbarui.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error) })
  } finally {
    logoSaving.value = false
  }
}

async function deleteLogo() {
  if (!canEdit.value || !warung.value?.logo || !window.confirm('Hapus logo warung?')) return
  logoSaving.value = true
  try {
    setProfile(await larisamaApi.deleteCurrentWarungLogo())
    logoFile.value = null
    setLogoPreview(null)
    $q.notify({ type: 'positive', message: 'Logo warung berhasil dihapus.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error) })
  } finally {
    logoSaving.value = false
  }
}

function subscriptionLabel(value) {
  return ({ aktif: 'Aktif', kedaluwarsa: 'Kedaluwarsa', menunggu_persetujuan: 'Menunggu persetujuan', nonaktif: 'Nonaktif' })[value] || value || '—'
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value + 'T00:00:00')) : '—'
}

onMounted(loadProfile)
onBeforeUnmount(() => {
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
})
</script>

<style scoped>
.profile-card { position: relative; max-width: 760px; overflow: hidden; }
.profile-header { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.profile-heading-copy { min-width: 0; }
.profile-store-avatar { flex: 0 0 auto; background: #e9f5ed; color: #176342; }
.profile-store-avatar img { width: 100%; height: 100%; object-fit: cover; }
.logo-controls { display: grid; gap: 12px; }
.profile-form { display: grid; gap: 14px; }
.profile-meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.profile-meta { display: grid; gap: 4px; min-width: 0; padding: 12px; border-radius: 10px; background: #f4f7f5; }
.profile-meta span { color: #6a7770; font-size: 12px; }
.profile-meta strong { overflow-wrap: anywhere; }
@media (min-width: 680px) {
  .profile-header { grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr); align-items: center; }
}
@media (max-width: 600px) {
  .profile-meta-grid { grid-template-columns: 1fr; }
}
</style>
