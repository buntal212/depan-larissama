<template>
  <q-layout view="lHh Lpr lFf" class="login-layout">
    <q-page-container>
      <q-page class="login-page flex flex-center q-pa-md">
        <q-card flat bordered class="login-card">
          <q-card-section class="text-center q-pt-xl">
            <img src="/icons/Larisama_logo_512px.png" alt="Larisama" class="login-logo" />
            <div v-if="!registrationSuccess" class="eyebrow q-mt-lg">{{ isRegistering ? 'GABUNG BERSAMA LARISAMA' : 'SELAMAT DATANG' }}</div>
            <h1 class="page-title q-mt-sm">
              {{ registrationSuccess ? 'Terimakasih telah bergabung bersama Larisama.' : isRegistering ? 'Daftarkan warung' : 'Masuk ke Larisama' }}
            </h1>
            <p v-if="!registrationSuccess" class="page-subtitle">
              {{ isRegistering ? 'Isi data warung dan pemilik untuk mengajukan pendaftaran.' : 'Gunakan akun warung yang sudah terdaftar.' }}
            </p>
          </q-card-section>
          <q-form v-if="!isRegistering" class="q-px-lg q-pb-lg" @submit.prevent="submitLogin">
            <q-banner v-if="errorMessage" rounded class="bg-red-1 text-negative q-mb-md">{{ errorMessage }}</q-banner>
            <q-input v-model.trim="form.username" outlined autocomplete="username" label="Username" maxlength="100" :rules="[(value) => !!value || 'Username wajib diisi', (value) => !/[A-Z]/.test(value) || 'Gunakan huruf kecil']" />
            <q-input v-model="form.password" outlined autocomplete="current-password" :type="showPassword ? 'text' : 'password'" label="Password" :rules="[(value) => !!value || 'Password wajib diisi']">
              <template #append><q-btn flat round dense :icon="showPassword ? 'visibility_off' : 'visibility'" aria-label="Tampilkan password" @click="showPassword = !showPassword" /></template>
            </q-input>
            <q-btn class="full-width q-mt-md" unelevated no-caps color="primary" label="Masuk" type="submit" :loading="submitting" />
            <div class="login-footnote">Data akun diverifikasi oleh server Larisama.</div>
            <q-btn class="full-width q-mt-sm" flat no-caps color="primary" label="Belum punya akun? Daftarkan warung" @click="openRegistration" />
          </q-form>
          <div v-else-if="registrationSuccess" class="q-px-lg q-pb-lg">
            <q-banner rounded class="bg-green-1 text-positive q-mb-md">
              Pendaftaran berhasil dikirim. Warung menunggu persetujuan admin. Setelah disetujui, pemilik dapat masuk menggunakan akun yang didaftarkan.
            </q-banner>
            <q-btn class="full-width" unelevated no-caps color="primary" label="Kembali ke halaman masuk" @click="closeRegistration" />
          </div>
          <q-form v-else class="q-px-lg q-pb-lg registration-form" @submit.prevent="submitRegistration">
            <q-banner v-if="registrationError" rounded class="bg-red-1 text-negative q-mb-md">
              {{ registrationError }}
            </q-banner>

            <div class="registration-section-title">Data warung</div>
            <q-input
              v-model.trim="registrationForm.warungNama"
              outlined
              autofocus
              autocomplete="organization"
              label="Nama warung"
              maxlength="150"
              :rules="[(value) => !!value || 'Nama warung wajib diisi']"
            />
            <q-input
              v-model.trim="registrationForm.alamat"
              outlined
              type="textarea"
              autogrow
              maxlength="2000"
              label="Alamat warung (opsional)"
            />
            <q-input
              v-model.trim="registrationForm.telepon"
              outlined
              type="tel"
              autocomplete="tel"
              maxlength="30"
              label="Nomor telepon"
              :rules="[(value) => !!value || 'Nomor telepon wajib diisi']"
            />

            <div class="registration-section-title q-mt-md">Data pemilik</div>
            <q-input
              v-model.trim="registrationForm.ownerNama"
              outlined
              autocomplete="name"
              label="Nama pemilik"
              maxlength="150"
              :rules="[(value) => !!value || 'Nama pemilik wajib diisi']"
            />
            <q-input
              v-model.trim="registrationForm.username"
              outlined
              autocomplete="username"
              label="Username"
              maxlength="100"
              :rules="[(value) => !!value || 'Username wajib diisi', (value) => !/[A-Z]/.test(value) || 'Gunakan huruf kecil']"
            />
            <q-input
              v-model.trim="registrationForm.email"
              outlined
              type="email"
              autocomplete="email"
              label="Email (opsional)"
              maxlength="150"
              :rules="[(value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Format email belum benar']"
            />
            <q-input
              v-model="registrationForm.password"
              outlined
              autocomplete="new-password"
              :type="showRegistrationPassword ? 'text' : 'password'"
              label="Password"
              :rules="[(value) => !!value || 'Password wajib diisi', (value) => value.length >= 8 || 'Password minimal 8 karakter']"
            >
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  :icon="showRegistrationPassword ? 'visibility_off' : 'visibility'"
                  :aria-label="showRegistrationPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showRegistrationPassword = !showRegistrationPassword"
                />
              </template>
            </q-input>
            <q-input
              v-model="registrationForm.passwordConfirmation"
              outlined
              autocomplete="new-password"
              :type="showPasswordConfirmation ? 'text' : 'password'"
              label="Ulangi password"
              :rules="[
                (value) => !!value || 'Ulangi password untuk konfirmasi',
                (value) => value === registrationForm.password || 'Konfirmasi password belum sama',
              ]"
            >
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  :icon="showPasswordConfirmation ? 'visibility_off' : 'visibility'"
                  :aria-label="showPasswordConfirmation ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showPasswordConfirmation = !showPasswordConfirmation"
                />
              </template>
            </q-input>

            <q-banner v-if="registrationMessage" rounded class="bg-blue-1 text-primary q-mt-sm">
              {{ registrationMessage }}
            </q-banner>
            <q-btn class="full-width q-mt-md" unelevated no-caps color="primary" label="Kirim pendaftaran" type="submit" :loading="registrationSubmitting" />
            <q-btn class="full-width q-mt-sm" flat no-caps color="primary" label="Sudah punya akun? Masuk" @click="closeRegistration" />
          </q-form>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/services/api.js'
import { login } from '@/services/auth.js'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const route = useRoute()
const router = useRouter()
const form = reactive({ username: '', password: '' })
const registrationForm = reactive({
  warungNama: '',
  alamat: '',
  telepon: '',
  ownerNama: '',
  username: '',
  email: '',
  password: '',
  passwordConfirmation: '',
})
const submitting = ref(false)
const showPassword = ref(false)
const isRegistering = ref(false)
const showRegistrationPassword = ref(false)
const showPasswordConfirmation = ref(false)
const errorMessage = ref('')
const registrationMessage = ref('')
const registrationError = ref('')
const registrationSuccess = ref(false)
const registrationSubmitting = ref(false)

async function submitLogin() {
  errorMessage.value = ''
  if (/[A-Z]/.test(form.username)) {
    errorMessage.value = 'Username harus menggunakan huruf kecil.'
    return
  }
  submitting.value = true
  try {
    await login({ username: form.username, password: form.password })
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(target.startsWith('/') && !target.startsWith('//') ? target : '/')
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Login belum berhasil. Coba lagi.'
  } finally {
    submitting.value = false
  }
}

function openRegistration() {
  errorMessage.value = ''
  registrationMessage.value = ''
  registrationError.value = ''
  registrationSuccess.value = false
  isRegistering.value = true
}

function closeRegistration() {
  registrationMessage.value = ''
  registrationError.value = ''
  registrationSuccess.value = false
  showRegistrationPassword.value = false
  showPasswordConfirmation.value = false
  Object.assign(registrationForm, {
    warungNama: '',
    alamat: '',
    telepon: '',
    ownerNama: '',
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })
  isRegistering.value = false
}

async function submitRegistration() {
  registrationError.value = ''
  if (/[A-Z]/.test(registrationForm.username) || (registrationForm.email && /[A-Z]/.test(registrationForm.email))) {
    registrationError.value = 'Username dan email harus menggunakan huruf kecil.'
    return
  }

  registrationSubmitting.value = true
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
    await larisamaApi.registerWarungOwner({
      nama: registrationForm.warungNama.trim(),
      timezone,
      alamat: registrationForm.alamat.trim() || null,
      telepon: registrationForm.telepon.trim(),
      owner: {
        nama: registrationForm.ownerNama.trim(),
        username: registrationForm.username.trim(),
        email: registrationForm.email.trim() || null,
        password: registrationForm.password,
      },
    })
    registrationSuccess.value = true
    Object.assign(registrationForm, {
      warungNama: '', alamat: '', telepon: '', ownerNama: '', username: '', email: '', password: '', passwordConfirmation: '',
    })
    showRegistrationPassword.value = false
    showPasswordConfirmation.value = false
  } catch (error) {
    registrationError.value = displayApiError(error)
  } finally {
    registrationSubmitting.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: #f7f9f7; }
.login-layout { min-height: 100vh; }
.login-card { width: min(100%, 460px); border-radius: 20px; background: white; }
.login-logo { width: min(280px, 80%); height: auto; }
.page-title { font-size: clamp(24px, 6vw, 30px); }
.login-footnote { margin-top: 20px; color: #718078; font-size: 12px; text-align: center; }
.registration-form .q-field { margin-bottom: 12px; }
.registration-section-title { margin: 2px 0 12px; color: #315342; font-size: 13px; font-weight: 700; }
.registration-notice { font-size: 12px; line-height: 1.5; }
</style>
