<template>
  <q-page class="plans-page page-shell">
    <div class="page-heading">
      <div>
        <div class="eyebrow">LANGGANAN WARUNG</div>
        <h1>Paket &amp; pembayaran</h1>
        <p>Paket, harga, invoice, dan status pembayaran dikelola UDEV.</p>
      </div>
      <q-btn
        outline
        no-caps
        color="primary"
        icon="refresh"
        label="Muat ulang"
        :loading="loading"
        @click="loadPage"
      />
    </div>

    <q-banner rounded class="info-banner q-mb-lg">
      Pembayaran diproses melalui checkout UDEV. Status diperbarui otomatis setiap 30 detik selama
      invoice masih menunggu pembayaran.
    </q-banner>
    <q-banner v-if="paymentOnly" rounded class="bg-orange-1 text-orange-10 q-mb-lg">
      Masa aktif warung telah habis. Halaman pembayaran tetap bisa digunakan selama masa tenggang.
    </q-banner>
    <q-banner v-if="errorMessage" rounded class="bg-red-1 text-negative q-mb-lg">
      {{ errorMessage }}
    </q-banner>

    <q-card v-if="loading && plans.length === 0" flat bordered class="state-card">
      <q-card-section class="row items-center justify-center q-gutter-md">
        <q-spinner color="primary" size="28px" />
        <span>Memuat paket dan invoice…</span>
      </q-card-section>
    </q-card>

    <section v-else>
      <div class="section-heading">
        <div>
          <h2>Pilih paket</h2>
          <p>Harga final dikonfirmasi UDEV sebelum invoice dibuat.</p>
        </div>
      </div>
      <q-card v-if="plans.length === 0" flat bordered class="state-card">
        <q-card-section class="text-center text-grey-7"
          >Belum ada paket aktif untuk Larissama.</q-card-section
        >
      </q-card>
      <div v-else class="plans-grid">
        <q-card v-for="plan in plans" :key="plan.id" flat bordered class="plan-card">
          <q-card-section>
            <div class="plan-code">{{ plan.code }}</div>
            <h3>{{ plan.name }}</h3>
            <p v-if="plan.description" class="plan-description">{{ plan.description }}</p>
            <div class="plan-price">
              {{ formatPlanPrice(plan.price, plan.currency) }} / periode 30 hari
            </div>
            <div class="plan-duration">Durasi dasar {{ plan.duration_days }} hari</div>
            <q-btn
              class="full-width q-mt-lg"
              color="primary"
              unelevated
              no-caps
              :label="
                plan.duration_days === 30
                  ? 'Lihat harga final'
                  : 'Paket tidak tersedia untuk invoice periode'
              "
              :loading="previewingPlan === plan.code"
              :disable="plan.duration_days !== 30 || Boolean(previewingPlan)"
              @click="previewPlan(plan)"
            />
          </q-card-section>
        </q-card>
      </div>
    </section>

    <section class="q-mt-xl">
      <div class="section-heading">
        <div>
          <h2>Invoice dan pembayaran</h2>
          <p>Status invoice dibaca langsung dari UDEV.</p>
        </div>
        <q-btn
          flat
          no-caps
          color="primary"
          icon="sync"
          label="Periksa status"
          :loading="refreshingInvoices"
          @click="refreshInvoices"
        />
      </div>

      <q-card v-if="invoices.length === 0" flat bordered class="state-card">
        <q-card-section class="text-center text-grey-7"
          >Belum ada invoice langganan.</q-card-section
        >
      </q-card>
      <div v-else class="invoice-list">
        <q-card
          v-for="invoice in invoices"
          :key="invoice.invoice_number"
          flat
          bordered
          class="invoice-card"
        >
          <q-card-section>
            <div class="row items-start justify-between q-gutter-md">
              <div>
                <div class="invoice-number">{{ invoice.invoice_number }}</div>
                <div class="text-weight-bold q-mt-xs">
                  {{ invoice.plan?.name || invoice.plan?.code || 'Paket langganan' }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ invoice.plan?.period_count || invoice.period_count || 1 }} periode ·
                  {{ invoice.plan?.duration_days || 30 }} hari ·
                  {{
                    formatPlanPrice(
                      invoice.pricing?.final_price || '0.00',
                      invoice.pricing?.currency || 'IDR',
                    )
                  }}
                  <span v-if="invoice.due_at"> · Jatuh tempo {{ formatDate(invoice.due_at) }}</span>
                </div>
              </div>
              <q-badge :color="invoiceStatusColor(invoice)" :label="invoiceStatusLabel(invoice)" />
            </div>

            <div v-if="invoice.status === 'pending'" class="row q-gutter-sm q-mt-md">
              <q-btn-toggle
                :model-value="paymentMethod(invoice)"
                :options="paymentMethodOptions"
                :disable="checkingOut === invoice.invoice_number"
                color="blue-grey-1"
                text-color="blue-grey-9"
                toggle-color="blue-grey-8"
                toggle-text-color="white"
                unelevated
                @update:model-value="(method) => selectPaymentMethod(invoice, method)"
              />
              <q-btn
                color="primary"
                unelevated
                no-caps
                icon="payment"
                :label="checkoutButtonLabel(invoice)"
                :loading="checkingOut === invoice.invoice_number"
                :disable="Boolean(checkingOut) || checkoutMatchesSelection(invoice)"
                @click="prepareCheckout(invoice)"
              />
              <q-btn
                v-if="actualPaymentMethod(invoice) === 'dana_wallet' && hasActiveCheckout(invoice)"
                outline
                color="primary"
                no-caps
                icon="open_in_new"
                label="Buka pembayaran"
                :href="invoice.payment.checkout_url"
                target="_blank"
                rel="noopener noreferrer"
              />
              <q-btn
                flat
                color="primary"
                no-caps
                label="Cek sekarang"
                :loading="checkingStatus === invoice.invoice_number"
                @click="refreshInvoice(invoice.invoice_number)"
              />
            </div>
            <div
              v-if="
                invoice.payment?.status === 'pending' &&
                hasActiveCheckout(invoice) &&
                paymentMethod(invoice) !== actualPaymentMethod(invoice)
              "
              class="text-caption text-orange-9 q-mt-sm"
            >
              Checkout aktif dari UDEV menggunakan
              {{ paymentMethodLabel(actualPaymentMethod(invoice)) }}. Menyiapkan
              {{ paymentMethodLabel(paymentMethod(invoice)) }} akan membatalkan checkout itu.
            </div>
            <div
              v-else-if="
                invoice.payment?.status === 'pending' &&
                paymentMethod(invoice) !== actualPaymentMethod(invoice)
              "
              class="text-caption text-orange-9 q-mt-sm"
            >
              Checkout lama akan dibatalkan UDEV setelah metode baru disiapkan.
            </div>
            <div
              v-if="
                actualPaymentMethod(invoice) === 'qris' &&
                hasActiveCheckout(invoice) &&
                qrContent(invoice)
              "
              class="qris-panel q-mt-md"
            >
              <img
                v-if="qrCodeImages[invoice.invoice_number]"
                :src="qrCodeImages[invoice.invoice_number]"
                :alt="`Kode QRIS untuk invoice ${invoice.invoice_number}`"
                class="qris-image"
              />
              <q-spinner
                v-else-if="!qrCodeErrors[invoice.invoice_number]"
                color="primary"
                size="28px"
              />
              <div class="qris-instructions">
                <strong>Bayar dengan QRIS</strong>
                <span>Scan kode ini menggunakan aplikasi pembayaran yang mendukung QRIS.</span>
                <span v-if="invoice.payment?.checkout_expires_at">
                  Berlaku sampai {{ formatDate(invoice.payment.checkout_expires_at) }}
                </span>
                <span v-if="qrCodeErrors[invoice.invoice_number]" class="text-negative">
                  Kode QR belum dapat ditampilkan. Coba muat ulang halaman.
                </span>
              </div>
            </div>
            <div
              v-if="
                invoice.status === 'pending' &&
                invoice.payment?.checkout_status === 'ready' &&
                !qrContent(invoice) &&
                !invoice.payment?.checkout_url
              "
              class="text-caption text-negative q-mt-sm"
            >
              UDEV menandai checkout siap tetapi belum mengirim QR atau tautan pembayaran. Muat
              ulang status atau hubungi admin.
            </div>
            <div
              v-if="invoice.payment?.checkout_status === 'processing'"
              class="text-caption text-orange-9 q-mt-sm"
            >
              Checkout sedang disiapkan. Status akan diperiksa lagi.
            </div>
            <div
              v-if="invoice.payment?.checkout_status === 'failed'"
              class="text-caption text-negative q-mt-sm"
            >
              UDEV gagal menyiapkan sesi pembayaran. QR atau tautan belum tersedia; klik tombol coba
              lagi. Jika berulang, admin perlu memeriksa log UDEV.
            </div>
            <div
              v-if="
                invoice.status === 'paid' && invoice.tracking?.settlement_status !== 'completed'
              "
              class="text-caption text-orange-9 q-mt-sm"
            >
              Pembayaran diterima UDEV; pemrosesan masa aktif masih berlangsung.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <q-dialog v-model="previewDialog">
      <q-card class="preview-card">
        <q-card-section>
          <div class="text-h6">Konfirmasi paket</div>
          <div class="text-caption text-grey-7">Harga final berasal dari UDEV.</div>
        </q-card-section>
        <q-separator />
        <q-card-section v-if="preview">
          <q-banner v-if="referralLocked" rounded class="bg-green-1 text-positive q-mb-md">
            Kode referral {{ preview.pricing?.referral_code || referralCode }} sudah terpasang dan
            terkunci untuk pelanggan ini.
          </q-banner>
          <template v-else>
            <div class="text-subtitle2 q-mb-sm">Kode referral (opsional)</div>
            <div class="row items-start q-gutter-sm">
              <q-input
                v-model="referralCode"
                class="col"
                outlined
                dense
                no-caps
                maxlength="10"
                label="REF-XXXXXX"
                :disable="Boolean(referralValidation) || validatingReferral || attachingReferral"
              />
              <q-btn
                outline
                no-caps
                color="primary"
                label="Validasi"
                :loading="validatingReferral"
                :disable="!referralCode.trim() || Boolean(referralValidation)"
                @click="validateReferral"
              />
            </div>
            <q-banner v-if="referralValidation" rounded class="bg-blue-1 text-primary q-mt-sm">
              Kode valid menurut UDEV. Diskon
              {{
                formatPlanPrice(
                  referralValidation.discount_amount,
                  selectedPlan?.currency || 'IDR',
                )
              }}; harga hasil validasi referral per periode
              {{
                formatPlanPrice(referralValidation.customer_price, selectedPlan?.currency || 'IDR')
              }}.
            </q-banner>
            <div v-if="referralValidation" class="q-mt-sm">
              <q-checkbox
                v-model="referralLockAcknowledged"
                label="Saya paham kode referral akan dikunci untuk pelanggan ini dan tidak dapat diganti."
              />
              <q-btn
                class="q-mt-xs"
                outline
                no-caps
                color="primary"
                label="Kunci dan pakai kode referral"
                :loading="attachingReferral"
                :disable="!referralLockAcknowledged"
                @click="attachReferral"
              />
            </div>
          </template>
          <q-banner v-if="referralError" rounded class="bg-red-1 text-negative q-mt-sm">
            {{ referralError }}
          </q-banner>
          <q-select
            v-model="periodCount"
            class="q-mt-md q-mb-lg"
            outlined
            emit-value
            map-options
            label="Jumlah bulan langganan"
            hint="Setiap periode dihitung tetap 30 hari, sesuai UDEV."
            :options="periodOptions"
            :disable="
              refreshingPreview || creatingInvoice || validatingReferral || attachingReferral
            "
            @update:model-value="refreshPreviewForPeriod"
          />
          <q-banner v-if="previewError" rounded class="bg-red-1 text-negative q-mb-md">
            Preview periode: {{ previewError }}
          </q-banner>
          <div class="row justify-between q-mb-sm">
            <span>Paket</span><strong>{{ preview.plan?.name }}</strong>
          </div>
          <div class="row justify-between q-mb-sm">
            <span>Masa aktif</span
            ><strong
              >{{ preview.plan?.duration_days || periodCount * 30 }} hari ({{
                preview.plan?.period_count || periodCount
              }}
              periode)</strong
            >
          </div>
          <div class="row justify-between q-mb-sm">
            <span>Harga per periode</span
            ><strong>{{
              formatPlanPrice(
                preview.pricing?.unit_price || selectedPlan?.price,
                preview.pricing?.currency || selectedPlan?.currency,
              )
            }}</strong>
          </div>
          <div class="row justify-between q-mb-sm">
            <span>Total harga paket</span
            ><strong>{{
              formatPlanPrice(preview.pricing?.normal_price, preview.pricing?.currency)
            }}</strong>
          </div>
          <div
            v-if="preview.pricing?.discount_amount !== '0.00'"
            class="row justify-between q-mb-sm"
          >
            <span>Diskon</span
            ><strong>{{
              formatPlanPrice(preview.pricing?.discount_amount, preview.pricing?.currency)
            }}</strong>
          </div>
          <q-separator class="q-my-md" />
          <div class="row justify-between text-weight-bold">
            <span>Total invoice</span
            ><span>{{
              formatPlanPrice(preview.pricing?.final_price, preview.pricing?.currency)
            }}</span>
          </div>
          <div class="text-caption text-grey-7 q-mt-sm">
            Invoice jatuh tempo satu hari setelah dibuat, mengikuti contoh integrasi UDEV.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Batal" v-close-popup />
          <q-btn
            color="primary"
            unelevated
            no-caps
            label="Buat invoice"
            :loading="creatingInvoice"
            :disable="
              refreshingPreview ||
              Boolean(previewError) ||
              (Boolean(referralCode.trim()) && !referralLocked)
            "
            @click="createInvoice"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { newIdempotencyKey } from '@/services/api.js'
import { authSession } from '@/stores/auth-session.js'

const plans = ref([])
const invoices = ref([])
const qrCodeImages = ref({})
const qrCodeErrors = ref({})
const selectedPaymentMethods = ref({})
const loading = ref(false)
const refreshingInvoices = ref(false)
const creatingInvoice = ref(false)
const previewingPlan = ref('')
const refreshingPreview = ref(false)
const checkingOut = ref('')
const checkingStatus = ref('')
const errorMessage = ref('')
const previewDialog = ref(false)
const preview = ref(null)
const previewError = ref('')
const selectedPlan = ref(null)
const periodCount = ref(1)
const periodOptions = Array.from({ length: 12 }, (_, index) => {
  const count = index + 1
  return { label: `${count} bulan (${count * 30} hari)`, value: count }
})
const paymentMethodOptions = [
  { label: 'QRIS', value: 'qris' },
  { label: 'DANA Wallet', value: 'dana_wallet' },
]
const referralCode = ref('')
const referralValidation = ref(null)
const referralLocked = ref(false)
const referralLockAcknowledged = ref(false)
const validatingReferral = ref(false)
const attachingReferral = ref(false)
const referralError = ref('')
const paymentOnly = computed(() => authSession.warung?.status_langganan === 'kedaluwarsa')
const invoicePollKeys = new Map()
const checkoutPollTimer = ref(null)
let statusPollTimer = null
let statusPollRunning = false
const qrCodeSources = new Map()

function qrContent(invoice) {
  return (
    invoice.payment?.qr_content ||
    invoice.payment?.payment_code ||
    invoice.payment?.payment_instruction?.payment_code ||
    ''
  )
}

function paymentMethod(invoice) {
  return (
    selectedPaymentMethods.value[invoice.invoice_number] || actualPaymentMethod(invoice) || 'qris'
  )
}

function actualPaymentMethod(invoice) {
  return (
    invoice.payment?.payment_method ||
    (qrContent(invoice) ? 'qris' : invoice.payment?.checkout_url ? 'dana_wallet' : '')
  )
}

function paymentMethodLabel(method) {
  return method === 'dana_wallet' ? 'DANA Wallet' : 'QRIS'
}

function selectPaymentMethod(invoice, method) {
  if (!paymentMethodOptions.some((option) => option.value === method)) return

  const invoiceNumber = invoice.invoice_number
  if (paymentMethod(invoice) === method) return

  selectedPaymentMethods.value = { ...selectedPaymentMethods.value, [invoiceNumber]: method }
  clearCheckoutKeys(invoiceNumber)
}

function hasActiveCheckout(invoice) {
  if (invoice.status !== 'pending') return false
  if (!['initiated', 'pending'].includes(invoice.payment?.status)) return false

  return actualPaymentMethod(invoice) === 'qris'
    ? Boolean(qrContent(invoice))
    : actualPaymentMethod(invoice) === 'dana_wallet' && Boolean(invoice.payment?.checkout_url)
}

function checkoutMatchesSelection(invoice) {
  return hasActiveCheckout(invoice) && paymentMethod(invoice) === actualPaymentMethod(invoice)
}

function checkoutButtonLabel(invoice) {
  if (invoice.payment?.checkout_status === 'failed') {
    return `Coba ${paymentMethodLabel(paymentMethod(invoice))} lagi`
  }

  if (hasActiveCheckout(invoice)) {
    if (paymentMethod(invoice) !== actualPaymentMethod(invoice)) {
      return `Ganti ke ${paymentMethodLabel(paymentMethod(invoice))}`
    }

    return `${paymentMethodLabel(actualPaymentMethod(invoice))} aktif`
  }

  return paymentMethod(invoice) === 'qris' ? 'Siapkan QRIS' : 'Siapkan DANA Wallet'
}

watch(
  invoices,
  (rows) => {
    const invoiceNumbers = new Set(rows.map((invoice) => invoice.invoice_number))
    for (const invoiceNumber of qrCodeSources.keys()) {
      if (!invoiceNumbers.has(invoiceNumber)) {
        qrCodeSources.delete(invoiceNumber)
        delete qrCodeImages.value[invoiceNumber]
        delete qrCodeErrors.value[invoiceNumber]
      }
    }

    for (const invoice of rows) {
      const invoiceNumber = invoice.invoice_number
      const content = qrContent(invoice)
      if (!content) {
        qrCodeSources.delete(invoiceNumber)
        delete qrCodeImages.value[invoiceNumber]
        delete qrCodeErrors.value[invoiceNumber]
        continue
      }
      if (qrCodeSources.get(invoiceNumber) === content) continue

      qrCodeSources.set(invoiceNumber, content)
      delete qrCodeImages.value[invoiceNumber]
      delete qrCodeErrors.value[invoiceNumber]
      QRCode.toDataURL(content, { errorCorrectionLevel: 'M', margin: 2, width: 240 })
        .then((image) => {
          if (qrCodeSources.get(invoiceNumber) === content) {
            qrCodeImages.value[invoiceNumber] = image
          }
        })
        .catch(() => {
          if (qrCodeSources.get(invoiceNumber) === content) {
            qrCodeErrors.value[invoiceNumber] = true
          }
        })
    }
  },
  { deep: true, immediate: true },
)

function savedKey(operation, subject) {
  const storageKey = `larissama-billing-${operation}-${subject}`
  try {
    const existing = window.localStorage.getItem(storageKey)
    if (existing) return existing
    const value = newIdempotencyKey()
    window.localStorage.setItem(storageKey, value)
    return value
  } catch {
    if (!invoicePollKeys.has(storageKey)) invoicePollKeys.set(storageKey, newIdempotencyKey())
    return invoicePollKeys.get(storageKey)
  }
}

function clearSavedKey(operation, subject) {
  const storageKey = `larissama-billing-${operation}-${subject}`
  invoicePollKeys.delete(storageKey)
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Idempotency still works for the active page if storage is unavailable.
  }
}

function invoiceIdempotencyKey(planCode, count) {
  return savedKey('invoice', `${planCode}-${count}`)
}

function checkoutIdempotencyKey(invoiceNumber, method) {
  return savedKey('checkout', `${invoiceNumber}-${method}`)
}

function clearCheckoutKeys(invoiceNumber) {
  clearSavedKey('checkout', invoiceNumber)
  for (const method of ['qris', 'dana_wallet']) {
    clearSavedKey('checkout', `${invoiceNumber}-${method}`)
  }
}

function referralIdempotencyKey(code) {
  return savedKey('referral', `${authSession.user?.id || 'owner'}-${code}`)
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [planResult, invoiceResult] = await Promise.allSettled([
      larisamaApi.listSubscriptionPlans(),
      larisamaApi.listSubscriptionInvoices(),
    ])
    if (planResult.status === 'fulfilled') {
      plans.value = planResult.value
    } else {
      errorMessage.value = `Katalog paket: ${displayApiError(planResult.reason)}`
    }
    if (invoiceResult.status === 'fulfilled') {
      invoices.value = invoiceResult.value
      updateStatusPolling()
    } else {
      const invoiceError = `Invoice: ${displayApiError(invoiceResult.reason)}`
      errorMessage.value = errorMessage.value
        ? `${errorMessage.value} ${invoiceError}`
        : invoiceError
    }
    if (invoices.value.some(isSettledInvoice)) {
      await applyUdevSubscription()
      await refreshCurrentWarung()
    }
    updateStatusPolling()
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    loading.value = false
  }
}

async function refreshInvoices() {
  refreshingInvoices.value = true
  errorMessage.value = ''
  try {
    invoices.value = await larisamaApi.listSubscriptionInvoices()
    updateStatusPolling()
    if (invoices.value.some(isSettledInvoice)) {
      await applyUdevSubscription()
      await refreshCurrentWarung()
    }
    updateStatusPolling()
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    refreshingInvoices.value = false
  }
}

async function previewPlan(plan) {
  previewingPlan.value = plan.code
  errorMessage.value = ''
  try {
    selectedPlan.value = plan
    periodCount.value = 1
    referralCode.value = ''
    referralValidation.value = null
    referralLockAcknowledged.value = false
    referralError.value = ''
    previewError.value = ''
    preview.value = await larisamaApi.previewSubscriptionInvoice({
      subscription_plan_code: plan.code,
      period_count: periodCount.value,
    })
    referralLocked.value = Boolean(preview.value.pricing?.referral_code)
    if (referralLocked.value) referralCode.value = preview.value.pricing.referral_code
    previewDialog.value = true
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    previewingPlan.value = ''
  }
}

async function refreshPreviewForPeriod(count) {
  periodCount.value = count
  if (!selectedPlan.value) return

  refreshingPreview.value = true
  previewError.value = ''
  try {
    preview.value = await larisamaApi.previewSubscriptionInvoice({
      subscription_plan_code: selectedPlan.value.code,
      period_count: periodCount.value,
    })
  } catch (error) {
    previewError.value = displayApiError(error)
  } finally {
    refreshingPreview.value = false
  }
}

async function validateReferral() {
  validatingReferral.value = true
  referralError.value = ''
  try {
    const result = await larisamaApi.validateSubscriptionReferral({
      referral_code: referralCode.value.trim().toUpperCase(),
    })
    referralCode.value = result.code
    referralValidation.value = result
  } catch (error) {
    referralError.value = displayApiError(error)
  } finally {
    validatingReferral.value = false
  }
}

async function attachReferral() {
  if (!referralValidation.value || !referralLockAcknowledged.value) return
  attachingReferral.value = true
  referralError.value = ''
  try {
    await larisamaApi.attachSubscriptionReferral(
      { referral_code: referralValidation.value.code },
      referralIdempotencyKey(referralValidation.value.code),
    )
    clearSavedKey('referral', `${authSession.user?.id || 'owner'}-${referralValidation.value.code}`)
    preview.value = await larisamaApi.previewSubscriptionInvoice({
      subscription_plan_code: selectedPlan.value.code,
      period_count: periodCount.value,
    })
    previewError.value = ''
    referralLocked.value = true
    referralCode.value = referralValidation.value.code
    referralValidation.value = null
    referralLockAcknowledged.value = false
  } catch (error) {
    referralError.value = displayApiError(error)
  } finally {
    attachingReferral.value = false
  }
}

async function createInvoice() {
  if (!selectedPlan.value) return
  if (refreshingPreview.value || previewError.value) return
  creatingInvoice.value = true
  errorMessage.value = ''
  try {
    const invoiceKeySubject = `${selectedPlan.value.code}-${periodCount.value}`
    const invoice = await larisamaApi.createSubscriptionInvoice(
      {
        subscription_plan_code: selectedPlan.value.code,
        period_count: periodCount.value,
      },
      invoiceIdempotencyKey(selectedPlan.value.code, periodCount.value),
    )
    clearSavedKey('invoice', invoiceKeySubject)
    previewDialog.value = false
    upsertInvoice(invoice)
    await refreshInvoices()
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    creatingInvoice.value = false
  }
}

async function prepareCheckout(invoice) {
  checkingOut.value = invoice.invoice_number
  errorMessage.value = ''
  const method = paymentMethod(invoice)
  try {
    const result = await larisamaApi.startSubscriptionCheckout(
      invoice.invoice_number,
      checkoutIdempotencyKey(invoice.invoice_number, method),
      method,
    )
    upsertInvoice(result)
    if (result.payment?.checkout_status === 'ready') {
      startStatusPolling()
    } else if (result.payment?.checkout_status === 'failed') {
      errorMessage.value = checkoutFailureMessage(invoice.invoice_number)
    } else {
      await waitForCheckout(invoice.invoice_number, method)
    }
  } catch (error) {
    errorMessage.value = displayApiError(error)
    await refreshInvoice(invoice.invoice_number, false)
  } finally {
    checkingOut.value = ''
  }
}

async function waitForCheckout(invoiceNumber, method) {
  if (checkoutPollTimer.value) window.clearTimeout(checkoutPollTimer.value)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => {
      checkoutPollTimer.value = window.setTimeout(resolve, 3000)
    })
    try {
      const result = await larisamaApi.startSubscriptionCheckout(
        invoiceNumber,
        checkoutIdempotencyKey(invoiceNumber, method),
        method,
      )
      upsertInvoice(result)
      if (result.payment?.checkout_status === 'ready') {
        startStatusPolling()
        return
      }
      if (result.payment?.checkout_status === 'failed') {
        errorMessage.value = checkoutFailureMessage(invoiceNumber)
        return
      }
    } catch (error) {
      errorMessage.value = displayApiError(error)
      return
    }
  }
  errorMessage.value = 'Checkout masih diproses. Coba siapkan checkout lagi beberapa saat.'
}

function checkoutFailureMessage(invoiceNumber) {
  return `UDEV gagal menyiapkan checkout untuk invoice ${invoiceNumber}. Belum ada QR atau tautan pembayaran. Coba lagi; jika berulang, minta admin memeriksa log UDEV.`
}

async function refreshInvoice(invoiceNumber, showError = true) {
  checkingStatus.value = invoiceNumber
  try {
    const invoice = await larisamaApi.getSubscriptionInvoice(invoiceNumber)
    upsertInvoice(invoice)
    const paymentStatus = invoice.payment?.status
    if (['failed', 'expired', 'cancelled'].includes(paymentStatus)) {
      clearCheckoutKeys(invoiceNumber)
    }
    if (invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed') {
      await applyUdevSubscription()
      await refreshCurrentWarung()
    }
    if (showError) errorMessage.value = ''
    return invoice
  } catch (error) {
    if (showError) errorMessage.value = displayApiError(error)
    return null
  } finally {
    if (checkingStatus.value === invoiceNumber) checkingStatus.value = ''
  }
}

async function applyUdevSubscription() {
  try {
    await larisamaApi.reconcileSubscription()
  } catch (error) {
    if (error.code !== 'UDEV_SUBSCRIPTION_NOT_ACTIVE') throw error
  }
}

async function refreshCurrentWarung() {
  const warung = await larisamaApi.currentWarung()
  authSession.warung = warung
}

function upsertInvoice(invoice) {
  if (!invoice?.invoice_number) return
  const index = invoices.value.findIndex((row) => row.invoice_number === invoice.invoice_number)
  if (index === -1) invoices.value.unshift(invoice)
  else invoices.value[index] = invoice
  updateStatusPolling()
}

function startStatusPolling() {
  if (statusPollTimer) return
  statusPollTimer = window.setInterval(async () => {
    if (document.visibilityState === 'visible') await pollInvoiceStatuses()
  }, 30000)
}

async function pollInvoiceStatuses() {
  if (statusPollRunning) return
  statusPollRunning = true
  try {
    invoices.value = await larisamaApi.listSubscriptionInvoices()
    if (invoices.value.some(isSettledInvoice)) {
      await applyUdevSubscription()
      await refreshCurrentWarung()
    }
  } catch {
    // A later poll or manual refresh can recover transient status errors.
  } finally {
    statusPollRunning = false
    updateStatusPolling()
  }
}

function isPollableInvoice(invoice) {
  return (
    invoice.status === 'pending' &&
    invoice.payment !== null &&
    !['failed', 'expired', 'cancelled', 'succeeded'].includes(invoice.payment?.status)
  )
}

function updateStatusPolling() {
  for (const invoice of invoices.value) {
    if (['failed', 'expired', 'cancelled'].includes(invoice.payment?.status)) {
      clearCheckoutKeys(invoice.invoice_number)
    }
  }
  if (invoices.value.some(isPollableInvoice)) {
    startStatusPolling()
  } else if (statusPollTimer) {
    window.clearInterval(statusPollTimer)
    statusPollTimer = null
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    if (invoices.value.some(isPollableInvoice)) void pollInvoiceStatuses()
  }
}

function invoiceStatusLabel(invoice) {
  if (invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed')
    return 'Terbayar'
  if (invoice.status === 'paid') return 'Pembayaran diproses'
  if (invoice.status === 'expired') return 'Kedaluwarsa'
  if (invoice.status === 'cancelled') return 'Dibatalkan'
  if (invoice.payment?.checkout_status === 'failed') return 'Checkout gagal disiapkan'
  if (invoice.payment?.status === 'failed') return 'Pembayaran ditolak'
  if (invoice.payment?.status === 'expired') return 'Checkout kedaluwarsa'
  if (invoice.payment?.status === 'cancelled') return 'Checkout dibatalkan'
  return 'Menunggu pembayaran'
}

function isSettledInvoice(invoice) {
  return invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed'
}

function invoiceStatusColor(invoice) {
  if (invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed')
    return 'positive'
  if (invoice.status === 'paid') return 'warning'
  if (
    ['expired', 'cancelled'].includes(invoice.status) ||
    ['failed', 'expired', 'cancelled'].includes(invoice.payment?.status) ||
    invoice.payment?.checkout_status === 'failed'
  )
    return 'negative'
  return 'orange-8'
}

function formatDate(value) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(timestamp)
    : value
}

function formatPlanPrice(price, currency) {
  if (typeof price !== 'string') return `${currency || 'IDR'} ${price || ''}`
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

onMounted(() => {
  void loadPage()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (statusPollTimer) window.clearInterval(statusPollTimer)
  if (checkoutPollTimer.value) window.clearTimeout(checkoutPollTimer.value)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.plans-page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-heading,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.page-heading {
  margin-bottom: 24px;
}
.section-heading {
  margin-bottom: 14px;
}
.section-heading h2 {
  margin: 0;
  color: #104f39;
  font-size: 21px;
}
.section-heading p {
  margin: 4px 0 0;
  color: #718078;
  font-size: 13px;
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
.invoice-list {
  display: grid;
  gap: 12px;
}
.qris-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  width: fit-content;
  max-width: 100%;
  padding: 12px;
  border: 1px solid #dce9e0;
  border-radius: 12px;
  background: #f7fbf8;
}
.qris-image {
  width: 200px;
  max-width: 45vw;
  aspect-ratio: 1;
  image-rendering: pixelated;
  background: white;
}
.qris-instructions {
  display: grid;
  gap: 5px;
  max-width: 280px;
  color: #526158;
  font-size: 13px;
}
.qris-instructions strong {
  color: #104f39;
  font-size: 15px;
}
.plan-card,
.invoice-card,
.state-card {
  border-radius: 16px;
}
.plan-code,
.invoice-number {
  color: #71847b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
}
.plan-card h3 {
  margin: 6px 0 0;
  color: #104f39;
  font-size: 20px;
}
.plan-description {
  min-height: 40px;
  margin: 14px 0 0;
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
.preview-card {
  width: min(100%, 480px);
}
@media (max-width: 599px) {
  .page-heading,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .qris-panel {
    align-items: flex-start;
    flex-direction: column;
  }
  .qris-image {
    width: min(200px, 70vw);
    max-width: 100%;
  }
}
</style>
