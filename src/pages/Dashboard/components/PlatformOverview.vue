<template>
  <section>
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">DASHBOARD PLATFORM</div>
        <h1 class="page-title">Ringkasan Larisama</h1>
        <p class="page-subtitle">Pantau pendaftaran dan status seluruh warung.</p>
      </div>
      <div class="col-auto heading-actions">
        <q-btn outline no-caps color="grey-8" icon="refresh" label="Perbarui" :loading="loading" @click="loadWarungs" />
        <q-btn unelevated no-caps color="primary" icon="storefront" label="Kelola warung" to="/platform/warungs" />
      </div>
    </div>

    <q-banner v-if="error" rounded class="q-mb-lg bg-red-1 text-negative">
      {{ error }}
    </q-banner>
    <q-banner v-else-if="loading" rounded class="q-mb-lg bg-green-1 text-primary">
      Memuat ringkasan seluruh warung...
    </q-banner>

    <section class="summary-grid" aria-label="Ringkasan seluruh warung">
      <SummaryCard
        label="Jumlah warung"
        :value="countValue(totalCount)"
        note="Terdaftar di Larisama"
        icon="storefront"
        change="Platform"
        change-tone="neutral"
        change-icon="domain"
      />
      <SummaryCard
        label="Menunggu persetujuan"
        :value="countValue(pendingCount)"
        note="Perlu ditinjau superadmin"
        icon="hourglass_top"
        change="Perlu ditinjau"
        tone="orange"
        change-tone="neutral"
        change-icon="rate_review"
      />
      <SummaryCard
        label="Warung aktif"
        :value="countValue(activeCount)"
        note="Masa penggunaan aktif"
        icon="check_circle"
        change="Aktif"
        tone="blue"
        change-tone="neutral"
        change-icon="verified"
      />
      <SummaryCard
        label="Status lainnya"
        :value="countValue(otherCount)"
        note="Di luar menunggu dan aktif"
        icon="store"
        change="Periksa status"
        tone="purple"
        change-tone="neutral"
        change-icon="info"
      />
    </section>

    <q-card flat bordered class="panel-card platform-dashboard-note">
      <q-card-section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="panel-title">Kelola pendaftaran dan masa aktif</div>
          <div class="panel-caption">Persetujuan owner dan perpanjangan langganan dilakukan dari daftar warung.</div>
        </div>
        <q-btn flat no-caps color="primary" label="Buka Kelola Warung" icon-right="arrow_forward" to="/platform/warungs" />
      </q-card-section>
    </q-card>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SummaryCard from '@/pages/Dashboard/components/SummaryCard.vue'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'

const warungs = ref([])
const hasLoaded = ref(false)
const loading = ref(false)
const error = ref('')

const totalCount = computed(() => warungs.value.length)
const pendingCount = computed(() => warungs.value.filter((warung) => warung.status_langganan === 'menunggu_persetujuan').length)
const activeCount = computed(() => warungs.value.filter((warung) => warung.status_langganan === 'aktif').length)
const otherCount = computed(() => totalCount.value - pendingCount.value - activeCount.value)

function countValue(value) {
  return hasLoaded.value ? new Intl.NumberFormat('id-ID').format(value) : '—'
}

async function loadWarungs() {
  loading.value = true
  error.value = ''
  try {
    warungs.value = await larisamaApi.listWarungs()
    hasLoaded.value = true
  } catch (requestError) {
    error.value = displayApiError(requestError)
  } finally {
    loading.value = false
  }
}

onMounted(loadWarungs)
</script>

<style scoped>
.platform-dashboard-note { margin-top: 18px; }

@media (max-width: 680px) {
  .page-heading { align-items: flex-start; }
  .heading-actions { width: 100%; flex-wrap: wrap; }
  .heading-actions .q-btn { flex: 1 1 auto; }
  .platform-dashboard-note :deep(.q-card__section) { align-items: flex-start; flex-direction: column; }
  .platform-dashboard-note .q-btn { align-self: flex-start; }
}
</style>
