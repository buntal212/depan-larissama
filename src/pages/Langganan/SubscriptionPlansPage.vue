<template>
  <q-page class="plans-page page-shell">
    <div class="page-heading">
      <div>
        <div class="eyebrow">LANGGANAN WARUNG</div>
        <h1>Paket langganan</h1>
        <p>Lihat pilihan paket dan harga yang dikelola UDEV.</p>
      </div>
      <q-btn
        outline
        no-caps
        color="primary"
        icon="refresh"
        label="Muat ulang"
        :loading="loading"
        @click="loadPlans"
      />
    </div>

    <q-banner rounded class="info-banner q-mb-lg">
      Harga dan masa aktif ditampilkan dari katalog UDEV. Pembayaran dan pembuatan invoice belum
      tersedia di halaman ini.
    </q-banner>

    <q-card v-if="errorMessage" flat bordered class="state-card">
      <q-card-section class="row items-center q-gutter-md">
        <q-icon name="cloud_off" color="negative" size="32px" />
        <div class="col">
          <div class="text-weight-bold">Katalog paket belum bisa dimuat</div>
          <div class="text-caption text-grey-7">{{ errorMessage }}</div>
        </div>
        <q-btn
          flat
          no-caps
          color="primary"
          label="Coba lagi"
          :loading="loading"
          @click="loadPlans"
        />
      </q-card-section>
    </q-card>

    <q-card v-else-if="loading" flat bordered class="state-card">
      <q-card-section class="row items-center justify-center q-gutter-md">
        <q-spinner color="primary" size="28px" />
        <span>Memuat katalog paket dari UDEV…</span>
      </q-card-section>
    </q-card>

    <q-card v-else-if="plans.length === 0" flat bordered class="state-card">
      <q-card-section class="text-center text-grey-7">
        Belum ada paket aktif untuk aplikasi Larissama.
      </q-card-section>
    </q-card>

    <div v-else class="plans-grid">
      <q-card v-for="plan in plans" :key="plan.id" flat bordered class="plan-card">
        <q-card-section>
          <div class="row items-start justify-between q-gutter-sm">
            <div>
              <div class="plan-code">{{ plan.code }}</div>
              <h2>{{ plan.name }}</h2>
            </div>
            <q-badge color="positive" label="Aktif" />
          </div>
          <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>
          <div class="plan-price">{{ formatPlanPrice(plan.price, plan.currency) }}</div>
          <div class="plan-duration">Masa aktif {{ plan.duration_days }} hari</div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const plans = ref([])
const loading = ref(false)
const errorMessage = ref('')

async function loadPlans() {
  loading.value = true
  errorMessage.value = ''

  try {
    plans.value = await larisamaApi.listSubscriptionPlans()
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    loading.value = false
  }
}

function formatPlanPrice(price, currency) {
  const match = /^([0-9]+)(?:\.([0-9]+))?$/.exec(price)
  if (!match) return `${currency} ${price}`

  const whole = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    BigInt(match[1]),
  )
  const fraction = match[2] || ''
  const decimalSeparator =
    new Intl.NumberFormat('id-ID').formatToParts(1.1).find((part) => part.type === 'decimal')
      ?.value || ','

  return `${currency} ${whole}${fraction ? `${decimalSeparator}${fraction}` : ''}`
}

onMounted(loadPlans)
</script>

<style scoped>
.plans-page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.eyebrow {
  color: #71847b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}
h1 {
  margin: 6px 0;
  color: #104f39;
  font-size: clamp(26px, 4vw, 34px);
  line-height: 1.15;
}
.page-heading p {
  margin: 0;
  color: #718078;
}
.info-banner {
  background: #edf7f1;
  color: #285b43;
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
}
.plan-card,
.state-card {
  border-radius: 16px;
}
.plan-code {
  color: #71847b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.plan-card h2 {
  margin: 6px 0 0;
  color: #104f39;
  font-size: 20px;
}
.plan-description {
  min-height: 40px;
  margin: 16px 0 0;
  color: #718078;
}
.plan-price {
  margin-top: 20px;
  color: #104f39;
  font-size: 28px;
  font-weight: 800;
}
.plan-duration {
  margin-top: 4px;
  color: #718078;
  font-size: 13px;
}
@media (max-width: 599px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
