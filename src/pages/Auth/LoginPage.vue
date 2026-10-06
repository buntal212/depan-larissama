<template>
  <q-layout view="lHh Lpr lFf" class="login-layout">
    <q-page-container>
      <q-page class="login-page flex flex-center q-pa-md">
        <q-card flat bordered class="login-card">
          <q-card-section class="text-center q-pt-xl">
            <img src="/icons/Larisama_logo_512px.png" alt="Larisama" class="login-logo" />
            <div class="eyebrow q-mt-lg">SELAMAT DATANG</div>
            <h1 class="page-title q-mt-sm">Masuk ke Larisama</h1>
            <p class="page-subtitle">Gunakan akun warung yang sudah terdaftar.</p>
          </q-card-section>
          <q-form class="q-px-lg q-pb-lg" @submit.prevent="submitLogin">
            <q-banner v-if="errorMessage" rounded class="bg-red-1 text-negative q-mb-md">{{ errorMessage }}</q-banner>
            <q-input v-model.trim="form.username" outlined autocomplete="username" label="Username" maxlength="100" :rules="[(value) => !!value || 'Username wajib diisi', (value) => !/[A-Z]/.test(value) || 'Gunakan huruf kecil']" />
            <q-input v-model="form.password" outlined autocomplete="current-password" :type="showPassword ? 'text' : 'password'" label="Password" :rules="[(value) => !!value || 'Password wajib diisi']">
              <template #append><q-btn flat round dense :icon="showPassword ? 'visibility_off' : 'visibility'" aria-label="Tampilkan password" @click="showPassword = !showPassword" /></template>
            </q-input>
            <q-btn class="full-width q-mt-md" unelevated no-caps color="primary" label="Masuk" type="submit" :loading="submitting" />
            <div class="login-footnote">Data akun diverifikasi oleh server Larisama.</div>
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

const route = useRoute()
const router = useRouter()
const form = reactive({ username: '', password: '' })
const submitting = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

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
</script>

<style scoped>
.login-page { min-height: 100vh; background: #f7f9f7; }
.login-layout { min-height: 100vh; }
.login-card { width: min(100%, 420px); border-radius: 20px; background: white; }
.login-logo { width: min(280px, 80%); height: auto; }
.page-title { font-size: clamp(24px, 6vw, 30px); }
.login-footnote { margin-top: 20px; color: #718078; font-size: 12px; text-align: center; }
</style>
