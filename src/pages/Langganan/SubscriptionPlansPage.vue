<template>
  <section class="settings-tab-page plans-page" data-ui="subscription-settings">
    <div
      class="page-heading row items-end justify-between q-col-gutter-md settings-section-heading"
    >
      <div class="col">
        <div class="eyebrow">LANGGANAN WARUNG</div>
        <h2 class="page-title">Pembayaran Larisama</h2>
        <p class="page-subtitle">
          Paket langganan, invoice, dan status pembayaran terintegrasi UDEV & DANA.
        </p>
      </div>
      <div class="col-auto">
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
    </div>

    <!-- Superadmin warung context banner -->
    <q-banner
      v-if="isSuperadmin && !selectedWarungId"
      rounded
      class="bg-blue-1 text-primary q-mb-lg"
    >
      <template #avatar><q-icon name="info" color="primary" /></template>
      Pilih warung pada pemilih warung di panel menu untuk melihat dan mengelola invoice pembayaran
      langganan warung tersebut.
    </q-banner>

    <!-- Unsynced warung customer banner -->
    <q-banner v-if="isCustomerSyncNotReady" rounded class="bg-amber-1 text-brown-9 q-mb-lg">
      <template #avatar><q-icon name="warning" color="warning" /></template>
      <div>
        <strong>Data Pelanggan Warung Belum Tersinkronkan ke UDEV</strong>
        <div class="q-mt-xs">
          Untuk dapat membuat invoice dan menyelesaikan checkout pembayaran, akun warung harus
          tersinkronisasi ke sistem billing UDEV.
        </div>
        <div v-if="isSuperadmin && selectedWarungId" class="q-mt-sm">
          <q-btn
            outline
            no-caps
            dense
            size="sm"
            color="primary"
            icon="storefront"
            label="Buka Manajemen Warung untuk Sinkronisasi"
            to="/platform/warungs"
          />
        </div>
      </div>
    </q-banner>

    <q-banner v-if="paymentOnly" rounded class="bg-orange-1 text-orange-10 q-mb-lg">
      Masa aktif warung telah habis. Halaman pembayaran tetap bisa digunakan selama masa tenggang.
    </q-banner>

    <!-- Banner Tagihan Pending Aktif -->
    <q-banner v-if="latestPendingInvoice" rounded class="bg-blue-1 text-primary q-mb-lg">
      <template #avatar><q-icon name="receipt_long" color="primary" /></template>
      <div class="row items-center justify-between full-width">
        <div>
          <div class="text-weight-bold">
            Tagihan Menunggu Pembayaran: {{ latestPendingInvoice.invoice_number }}
          </div>
          <div class="text-caption text-grey-8 q-mt-xs">
            Paket
            {{ latestPendingInvoice.plan?.name || latestPendingInvoice.plan?.code || 'Langganan' }}
            · Total
            {{
              formatPlanPrice(
                latestPendingInvoice.pricing?.final_price || latestPendingInvoice.amount,
                latestPendingInvoice.pricing?.currency,
              )
            }}
          </div>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="payment"
          label="Lanjutkan Pembayaran (DANA)"
          @click="goToCheckout(latestPendingInvoice.invoice_number)"
        />
      </div>
    </q-banner>
    <q-banner
      v-if="errorMessage && !isCustomerSyncNotReady"
      rounded
      class="bg-red-1 text-negative q-mb-lg"
    >
      {{ errorMessage }}
    </q-banner>

    <!-- Kartu Masa Aktif Langganan -->
    <q-card
      v-if="!isSuperadmin || selectedWarungId"
      flat
      bordered
      class="subscription-validity-card q-mb-lg"
    >
      <q-card-section>
        <div class="row items-center justify-between q-col-gutter-md">
          <div class="col-12 col-md-8">
            <div class="row items-center q-gutter-sm q-mb-xs">
              <span class="text-subtitle1 text-weight-bold">Masa Aktif Langganan</span>
              <q-badge
                v-if="!loading || currentWarung"
                :color="currentValidity.badgeColor"
                class="q-px-sm q-py-xs text-weight-bold"
              >
                {{ currentValidity.label }}
              </q-badge>
              <q-skeleton v-else type="QBadge" width="80px" />
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              Informasi periode aktif warung saat ini berdasarkan sistem billing resmi.
            </div>

            <div v-if="!loading || currentWarung" class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <div class="validity-metric-label">Tanggal Mulai</div>
                <div class="validity-metric-value">{{ currentValidity.startDate || '—' }}</div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="validity-metric-label">Tanggal Berakhir</div>
                <div class="validity-metric-value">{{ currentValidity.endDate || '—' }}</div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="validity-metric-label">Sisa Masa Aktif</div>
                <div
                  class="validity-metric-value text-weight-bold"
                  :class="currentValidity.textClass"
                >
                  {{ currentValidity.remainingSummary }}
                </div>
              </div>
            </div>
            <div v-else class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="90%" />
              </div>
              <div class="col-12 col-sm-4">
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="90%" />
              </div>
              <div class="col-12 col-sm-4">
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="90%" />
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4 text-right-md">
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="update"
              label="Perpanjang Langganan"
              class="extend-btn"
              @click="scrollToPilihPaket"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- State Loading Awal -->
    <q-card v-if="loading && plans.length === 0" flat bordered class="state-card">
      <q-card-section class="row items-center justify-center q-gutter-md">
        <q-spinner color="primary" size="28px" />
        <span>Memuat paket dan invoice…</span>
      </q-card-section>
    </q-card>

    <!-- Pilihan Paket Langganan -->
    <section v-else id="pilih-paket-section">
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
                  ? isSuperadmin && !selectedWarungId
                    ? 'Pilih warung terlebih dahulu'
                    : 'Lihat harga final'
                  : 'Paket tidak tersedia untuk invoice periode'
              "
              :loading="previewingPlan === plan.code"
              :disable="
                plan.duration_days !== 30 ||
                Boolean(previewingPlan) ||
                (isSuperadmin && !selectedWarungId)
              "
              @click="previewPlan(plan)"
            />
          </q-card-section>
        </q-card>
      </div>
    </section>

    <!-- Riwayat Invoice & Pembayaran -->
    <section class="q-mt-xl">
      <div class="section-heading">
        <div>
          <h2>Invoice dan pembayaran</h2>
          <p>Status invoice dibaca langsung dari UDEV Billing & Gateway DANA.</p>
        </div>
        <div class="row items-center q-gutter-sm">
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
      </div>

      <!-- Auto Polling Indicator Banner -->
      <div v-if="isPolling" class="row items-center q-gutter-sm text-caption text-primary q-mb-md">
        <q-spinner-dots size="16px" color="primary" />
        <span>
          Pembaruan status pembayaran otomatis aktif (siklus {{ pollCount }}/{{ MAX_POLL_COUNT }}
          · diperbarui tiap 30 detik).
        </span>
      </div>
      <q-banner v-else-if="pollPaused" rounded class="bg-amber-1 text-brown-9 q-mb-md">
        <template #avatar><q-icon name="schedule" color="amber-9" /></template>
        <div class="row items-center justify-between full-width">
          <span>Pembaruan otomatis dijeda setelah 20 menit untuk efisiensi jaringan.</span>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            label="Lanjutkan pembaruan otomatis"
            icon="play_arrow"
            @click="resumePolling"
          />
        </div>
      </q-banner>

      <!-- Filter Tabs Riwayat Invoice -->
      <div v-if="invoices.length > 0" class="row items-center justify-between q-mb-md filter-bar">
        <q-tabs
          v-model="invoiceFilterTab"
          dense
          no-caps
          narrow-indicator
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="text-grey-7"
        >
          <q-tab name="all" label="Semua">
            <q-badge color="grey-6" class="q-ml-xs">{{ invoices.length }}</q-badge>
          </q-tab>
          <q-tab name="pending" label="Menunggu Pembayaran">
            <q-badge v-if="pendingCount > 0" color="orange-8" class="q-ml-xs">{{
              pendingCount
            }}</q-badge>
          </q-tab>
          <q-tab name="paid" label="Terbayar">
            <q-badge v-if="paidCount > 0" color="positive" class="q-ml-xs">{{ paidCount }}</q-badge>
          </q-tab>
          <q-tab name="expired_cancelled" label="Kedaluwarsa / Batal">
            <q-badge v-if="expiredCancelledCount > 0" color="negative" class="q-ml-xs">{{
              expiredCancelledCount
            }}</q-badge>
          </q-tab>
        </q-tabs>
      </div>

      <!-- Tampilan Empty State -->
      <q-card v-if="invoices.length === 0" flat bordered class="state-card">
        <q-card-section class="text-center text-grey-7"
          >Belum ada invoice langganan.</q-card-section
        >
      </q-card>
      <q-card v-else-if="paginatedInvoices.length === 0" flat bordered class="state-card">
        <q-card-section class="text-center text-grey-7"
          >Tidak ada invoice pada kategori ini.</q-card-section
        >
      </q-card>

      <!-- Daftar Kartu Invoice -->
      <div v-else class="invoice-list">
        <q-card
          v-for="invoice in paginatedInvoices"
          :key="invoice.invoice_number"
          flat
          bordered
          class="invoice-card"
        >
          <q-card-section>
            <!-- Header Kartu: Nomor Invoice, Tanggal Terbit, Status Badge -->
            <div class="row items-start justify-between q-gutter-sm">
              <div class="column">
                <div class="row items-center q-gutter-xs">
                  <q-icon name="receipt_long" color="primary" size="18px" />
                  <span class="invoice-number">{{ invoice.invoice_number }}</span>
                  <span v-if="invoice.issued_at" class="text-caption text-grey-6 q-ml-xs">
                    · Terbit {{ formatDate(invoice.issued_at) }}
                  </span>
                </div>
                <div class="text-subtitle1 text-weight-bold q-mt-xs text-dark">
                  {{ invoice.plan?.name || invoice.plan?.code || 'Paket Langganan' }}
                </div>
              </div>
              <q-badge
                :color="invoiceStatusColor(invoice)"
                :label="invoiceStatusLabel(invoice)"
                class="q-px-sm q-py-xs text-weight-bold"
              />
            </div>

            <!-- Card Rincian Tagihan & Total Pembayaran (Desain lengkap UDEV) -->
            <div class="billing-detail-box q-pa-md q-my-md">
              <div class="row items-center q-gutter-xs q-mb-sm text-primary text-weight-bold">
                <q-icon name="payments" size="18px" />
                <span style="font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase"
                  >Rincian Tagihan & Pembayaran</span
                >
              </div>

              <div class="column q-gutter-y-xs q-mb-sm">
                <!-- Paket & Masa Aktif -->
                <div class="row justify-between text-body2">
                  <span class="text-grey-7">Paket Langganan</span>
                  <span class="text-weight-medium text-dark">{{
                    invoice.plan?.name || 'Paket Langganan'
                  }}</span>
                </div>
                <div class="row justify-between text-body2">
                  <span class="text-grey-7">Masa Aktif</span>
                  <span class="text-dark"
                    >{{ invoice.plan?.period_count || invoice.period_count || 1 }} periode ({{
                      invoice.plan?.duration_days || 30
                    }}
                    hari)</span
                  >
                </div>

                <!-- Diskon Referral jika ada -->
                <div
                  v-if="Number(invoice.pricing?.discount_amount) > 0"
                  class="row justify-between text-body2"
                >
                  <span class="text-grey-7">Harga Normal</span>
                  <span class="text-dark">{{
                    formatPlanPrice(invoice.pricing?.normal_price, invoice.pricing?.currency)
                  }}</span>
                </div>
                <div
                  v-if="Number(invoice.pricing?.discount_amount) > 0"
                  class="row justify-between text-body2 text-positive"
                >
                  <span>Diskon Referral</span>
                  <span
                    >-{{
                      formatPlanPrice(invoice.pricing?.discount_amount, invoice.pricing?.currency)
                    }}</span
                  >
                </div>

                <!-- Subtotal Tagihan (UDEV) -->
                <div
                  class="row justify-between text-body2 q-pt-xs"
                  style="border-top: 1px dashed #dcdcdc"
                >
                  <span class="text-grey-8 text-weight-medium">Subtotal Tagihan (UDEV)</span>
                  <span class="text-weight-bold text-dark">
                    {{ formatPlanPrice(getInvoiceSubtotal(invoice), invoice.pricing?.currency) }}
                  </span>
                </div>

                <!-- Metode Pembayaran DANA -->
                <div class="row justify-between text-body2">
                  <span class="text-grey-7">Metode Pembayaran</span>
                  <span class="text-primary text-weight-medium">QRIS (DANA)</span>
                </div>

                <!-- Biaya Admin DANA -->
                <div class="row justify-between text-body2">
                  <span class="text-grey-7">Biaya Admin (DANA QRIS)</span>
                  <span class="text-positive text-weight-medium">Rp 0 (Gratis)</span>
                </div>
              </div>

              <!-- Highlight Box Total Akhir Pembayaran -->
              <div class="total-payable-card q-pa-sm q-px-md row items-center justify-between">
                <div>
                  <div
                    class="text-caption text-weight-bold text-primary"
                    style="letter-spacing: 0.05em"
                  >
                    TOTAL PEMBAYARAN
                  </div>
                  <div class="text-caption text-grey-7" style="font-size: 11px">
                    Bebas biaya admin (Ditanggung merchant)
                  </div>
                </div>
                <div class="text-h6 text-weight-bolder text-primary">
                  {{ formatPlanPrice(getInvoiceTotalPayable(invoice), invoice.pricing?.currency) }}
                </div>
              </div>
            </div>

            <!-- Baris Metadata Tanggal: Lunas / Jatuh Tempo / Expiry -->
            <div class="row items-center justify-between text-caption text-grey-7 q-mb-md">
              <div
                v-if="invoice.status === 'paid' && invoice.paid_at"
                class="row items-center q-gutter-xs text-positive"
              >
                <q-icon name="check_circle" size="16px" />
                <span
                  >Pembayaran berhasil diverifikasi pada
                  <strong>{{ formatDate(invoice.paid_at) }}</strong></span
                >
              </div>
              <div v-else class="row items-center q-gutter-md">
                <div v-if="invoice.due_at" class="row items-center q-gutter-xs">
                  <q-icon name="event" size="15px" />
                  <span
                    >Jatuh tempo: <strong>{{ formatDate(invoice.due_at) }}</strong></span
                  >
                </div>
                <div
                  v-if="invoice.payment?.checkout_expires_at"
                  class="row items-center q-gutter-xs"
                  :class="
                    isCheckoutExpired(invoice) ? 'text-negative text-weight-bold' : 'text-grey-8'
                  "
                >
                  <q-icon name="schedule" size="15px" />
                  <span
                    >Batas waktu pembayaran:
                    <strong>{{ formatDate(invoice.payment.checkout_expires_at) }}</strong></span
                  >
                </div>
              </div>
            </div>

            <!-- Tombol Aksi Invoice Card -->
            <div v-if="invoice.status === 'pending'" class="row items-center q-gutter-sm q-mt-md">
              <q-btn
                color="primary"
                unelevated
                no-caps
                icon="payment"
                label="Bayar Sekarang (DANA)"
                @click="goToCheckout(invoice.invoice_number)"
              />
              <q-btn
                flat
                color="primary"
                no-caps
                icon="sync"
                label="Periksa Status"
                :loading="checkingStatus === invoice.invoice_number"
                @click="refreshInvoice(invoice.invoice_number)"
              />
            </div>
            <div v-else-if="invoice.status === 'paid'" class="row items-center q-gutter-sm q-mt-md">
              <q-btn
                outline
                dense
                no-caps
                size="sm"
                color="primary"
                icon="receipt_long"
                label="Lihat Rincian Pembayaran"
                :to="`/pengaturan/pembayaran/checkout/${invoice.invoice_number}`"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="row justify-center q-mt-lg">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="5"
            direction-links
            boundary-numbers
            color="primary"
            active-design="unelevated"
          />
        </div>
      </div>
    </section>

    <!-- Dialog Konfirmasi Paket & Referral -->
    <q-dialog v-model="previewDialog">
      <q-card class="preview-card">
        <q-card-section>
          <div class="text-h6">Konfirmasi paket</div>
          <div class="text-caption text-grey-7">Harga final berasal dari UDEV.</div>
        </q-card-section>
        <q-separator />
        <q-card-section v-if="preview">
          <q-banner v-if="referralLocked" rounded class="bg-green-1 text-positive q-mb-md">
            Kode referral
            {{ preview.pricing?.referral_code || referralCode }} sudah terpasang dan terkunci untuk
            pelanggan ini.
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
            {{ previewError }}
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
            v-if="Number(preview.pricing?.discount_amount || 0) > 0"
            class="row justify-between q-mb-sm text-positive"
          >
            <span>Diskon</span
            ><strong
              >-{{
                formatPlanPrice(preview.pricing?.discount_amount, preview.pricing?.currency)
              }}</strong
            >
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
              !isPricingConsistent ||
              (Boolean(referralCode.trim()) && !referralLocked)
            "
            @click="createInvoice"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import QRCode from 'qrcode'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { newIdempotencyKey } from '@/services/api.js'
import { authSession } from '@/stores/auth-session.js'
import { getSubscriptionValidity } from '@/services/subscription-validity.js'

const router = useRouter()

const defaultDanaPaymentMethods = [
  {
    label: 'QRIS (DANA)',
    value: 'qris',
    fee_type: 'fixed',
    fee_rate: 0,
    fixed_amount: 0,
    fee_label: 'Rp 0',
  },
]

const plans = ref([])
const invoices = ref([])
const qrCodeImages = ref({})
const qrCodeErrors = ref({})
const selectedPaymentMethods = ref({})
const invoiceFeePreviews = ref({})
const loading = ref(false)
const refreshingInvoices = ref(false)
const creatingInvoice = ref(false)
const previewingPlan = ref('')
const refreshingPreview = ref(false)
const checkingStatus = ref('')
const errorMessage = ref('')
const previewDialog = ref(false)
const preview = ref(null)
const previewError = ref('')

const isPricingConsistent = computed(() => {
  if (!preview.value?.pricing) return true
  const pricing = preview.value.pricing
  const normalPrice = Number(pricing.normal_price)
  const discountAmount = Number(pricing.discount_amount || 0)
  const finalPrice = Number(pricing.final_price)
  const unitPrice = pricing.unit_price !== undefined ? Number(pricing.unit_price) : null
  const periods = Number(
    pricing.period_count || preview.value.plan?.period_count || periodCount.value || 1,
  )

  if (Number.isNaN(normalPrice) || Number.isNaN(discountAmount) || Number.isNaN(finalPrice)) {
    return false
  }

  if (normalPrice < 0 || discountAmount < 0 || finalPrice < 0 || periods < 1) {
    return false
  }

  if (discountAmount > normalPrice) {
    return false
  }

  if (unitPrice !== null && !Number.isNaN(unitPrice) && unitPrice >= 0) {
    if (Math.abs(unitPrice * periods - normalPrice) >= 0.01) {
      return false
    }
  }

  const expectedFinal = normalPrice - discountAmount
  if (Math.abs(expectedFinal - finalPrice) >= 0.01) {
    return false
  }

  return true
})

function checkPricingConsistency() {
  if (!preview.value?.pricing) return
  if (!isPricingConsistent.value) {
    previewError.value =
      'Rincian harga dari UDEV tidak konsisten secara matematis (Harga normal dikurangi diskon tidak sama dengan total invoice). Pembuatan invoice diblokir.'
  }
}
const selectedPlan = ref(null)
const periodCount = ref(1)
const periodOptions = Array.from({ length: 12 }, (_, index) => {
  const count = index + 1
  return { label: `${count} bulan (${count * 30} hari)`, value: count }
})
const paymentMethodOptions = ref(defaultDanaPaymentMethods)
const latestPendingInvoice = computed(
  () => invoices.value.find((i) => i.status === 'pending') || null,
)
const referralCode = ref('')
const referralValidation = ref(null)
const referralLocked = ref(false)
const referralLockAcknowledged = ref(false)
const validatingReferral = ref(false)
const attachingReferral = ref(false)
const referralError = ref('')
const isSuperadmin = computed(() => authSession.user?.role === 'superadmin')
const selectedWarungId = computed(() => authSession.selectedWarungId)
const currentWarung = computed(() => {
  if (isSuperadmin.value && selectedWarungId.value) {
    return authSession.selectedWarung || authSession.warung || null
  }
  return authSession.warung || null
})
const currentValidity = computed(() => {
  return getSubscriptionValidity(currentWarung.value)
})
function scrollToPilihPaket() {
  const el = document.getElementById('pilih-paket-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
const paymentOnly = computed(() => authSession.warung?.status_langganan === 'kedaluwarsa')

// Filter tabs & pagination
const invoiceFilterTab = ref('all')
const currentPage = ref(1)
const pageSize = ref(5)

const pendingCount = computed(() => invoices.value.filter((i) => i.status === 'pending').length)
const paidCount = computed(() => invoices.value.filter((i) => i.status === 'paid').length)
const expiredCancelledCount = computed(
  () =>
    invoices.value.filter(
      (i) =>
        ['expired', 'cancelled'].includes(i.status) ||
        ['failed', 'expired', 'cancelled'].includes(i.payment?.status),
    ).length,
)

const filteredInvoices = computed(() => {
  switch (invoiceFilterTab.value) {
    case 'pending':
      return invoices.value.filter((i) => i.status === 'pending')
    case 'paid':
      return invoices.value.filter((i) => i.status === 'paid')
    case 'expired_cancelled':
      return invoices.value.filter(
        (i) =>
          ['expired', 'cancelled'].includes(i.status) ||
          ['failed', 'expired', 'cancelled'].includes(i.payment?.status),
      )
    default:
      return invoices.value
  }
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredInvoices.value.length / pageSize.value)),
)

const paginatedInvoices = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredInvoices.value.slice(start, start + pageSize.value)
})

watch(invoiceFilterTab, () => {
  currentPage.value = 1
})

const isCustomerSyncNotReady = computed(() => {
  const msg = errorMessage.value || ''
  return (
    msg.includes('UDEV_CUSTOMER_NOT_READY') ||
    msg.includes('belum tersinkron') ||
    msg.includes('belum disinkronkan')
  )
})

// Notification & state transition tracking
const notifiedInvoiceNumbers = new Set()
const knownInvoiceStatuses = new Map()
const activelyMonitoredInvoices = new Set()

function getSessionStorageNamespace() {
  const warungId = isSuperadmin.value
    ? selectedWarungId.value || 'superadmin'
    : authSession.warung?.id || authSession.user?.warung_id || 'owner'
  return `larisama_notified_settlement:${warungId}`
}

function isInvoiceNotified(invoiceNumber) {
  if (!invoiceNumber) return false
  if (notifiedInvoiceNumbers.has(invoiceNumber)) return true
  try {
    const key = `${getSessionStorageNamespace()}:${invoiceNumber}`
    const item = window.sessionStorage.getItem(key)
    if (item) {
      notifiedInvoiceNumbers.add(invoiceNumber)
      return true
    }
  } catch {
    // sessionStorage unavailable
  }
  return false
}

function markInvoiceAsNotified(invoiceNumber, attemptId = '') {
  if (!invoiceNumber) return
  notifiedInvoiceNumbers.add(invoiceNumber)
  try {
    const key = `${getSessionStorageNamespace()}:${invoiceNumber}`
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        notifiedAt: Date.now(),
        attempt: attemptId || 'settled',
      }),
    )
  } catch {
    // sessionStorage unavailable
  }
}

// Safe Polling Control
const MAX_POLL_COUNT = 40 // 40 cycles x 30s = 20 minutes
const pollCount = ref(0)
const isPolling = ref(false)
const pollPaused = ref(false)
const invoicePollKeys = new Map()
const checkoutPollTimer = ref(null)
let statusPollTimer = null
let statusPollRunning = false
const qrCodeSources = new Map()
const $q = useQuasar()

function qrContent(invoice) {
  const explicitQrContent = invoice.payment?.qr_content
  if (typeof explicitQrContent === 'string' && explicitQrContent !== '') return explicitQrContent

  const method = invoice.payment?.payment_method || paymentInstruction(invoice).method
  const candidate = paymentCode(invoice)

  return method === 'qris' && isValidQrisPayload(candidate) ? candidate : ''
}

function qrImageUrl(invoice) {
  const instruction = paymentInstruction(invoice)
  const candidate = instruction.qr_url || invoice.payment?.qr_url || invoice.payment?.qr_image
  return typeof candidate === 'string' && candidate !== '' ? candidate : ''
}

function paymentInstruction(invoice) {
  const instruction = invoice.payment?.payment_instruction
  return instruction && typeof instruction === 'object' ? instruction : {}
}

function paymentCode(invoice) {
  const instruction = paymentInstruction(invoice)
  const code =
    instruction.payment_code ||
    instruction.va_number ||
    instruction.bill_key ||
    invoice.payment?.payment_code ||
    invoice.payment?.va_number
  return typeof code === 'string' ? code : ''
}

function isValidQrisPayload(value) {
  if (typeof value !== 'string' || !value.startsWith('000201')) return false

  const crcOffset = value.lastIndexOf('6304')
  if (crcOffset < 0 || crcOffset !== value.length - 8) return false

  const expectedCrc = value.slice(-4).toUpperCase()
  if (!/^[0-9A-F]{4}$/.test(expectedCrc) || calculateCrc16(value.slice(0, -4)) !== expectedCrc) {
    return false
  }

  const fields = new Map()
  let offset = 0
  while (offset < crcOffset) {
    if (offset + 4 > crcOffset) return false

    const tag = value.slice(offset, offset + 2)
    const lengthText = value.slice(offset + 2, offset + 4)
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return false

    const length = Number.parseInt(lengthText, 10)
    const valueOffset = offset + 4
    const nextOffset = valueOffset + length
    if (nextOffset > crcOffset) return false

    fields.set(tag, value.slice(valueOffset, nextOffset))
    offset = nextOffset
  }

  const hasMerchantAccount = [...fields.keys()].some((tag) => {
    const tagNumber = Number.parseInt(tag, 10)
    return tagNumber >= 26 && tagNumber <= 51
  })

  return (
    offset === crcOffset &&
    fields.get('00') === '01' &&
    ['11', '12'].includes(fields.get('01')) &&
    fields.get('53') === '360' &&
    fields.get('58') === 'ID' &&
    hasMerchantAccount
  )
}

function calculateCrc16(value) {
  let crc = 0xffff
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }

  return crc.toString(16).padStart(4, '0').toUpperCase()
}

function isVirtualAccount(method) {
  return (
    typeof method === 'string' &&
    (method.startsWith('va_') || method === 'bank_transfer' || method === 'echannel')
  )
}

function paymentMethod(invoice) {
  return (
    selectedPaymentMethods.value[invoice.invoice_number] || actualPaymentMethod(invoice) || 'qris'
  )
}

function actualPaymentMethod(invoice) {
  const method = invoice.payment?.payment_method || paymentInstruction(invoice).method
  if (method) return method
  if (qrContent(invoice) || qrImageUrl(invoice)) return 'qris'
  if (invoice.payment?.checkout_url) return 'gopay'
  return ''
}

function strRate(val) {
  return String(val ?? '').replace('.', ',')
}

async function loadFeePreview(invoice, method = null) {
  const targetMethod = method || paymentMethod(invoice)
  const invoiceNumber = invoice.invoice_number

  if (invoice.payment?.fee_breakdown && actualPaymentMethod(invoice) === targetMethod) {
    const fb = invoice.payment.fee_breakdown
    invoiceFeePreviews.value[invoiceNumber] = {
      subtotal: Number(fb.subtotal_amount || invoice.pricing?.final_price || invoice.amount),
      fee_amount: Number(fb.fee_amount || 0),
      fee_label: fb.fee_type === 'percent' ? `${strRate(fb.fee_rate)}%` : 'Rp 4.000 (Tetap)',
      total_amount: Number(fb.total_amount || invoice.payment.amount),
      fee_type: fb.fee_type,
      fee_rate: fb.fee_rate,
      payment_method: targetMethod,
      is_locked: true,
    }
    return
  }

  try {
    const previewData = await larisamaApi.previewSubscriptionFee(
      invoiceNumber,
      targetMethod,
      selectedWarungId.value,
    )
    if (previewData) {
      invoiceFeePreviews.value[invoiceNumber] = previewData
    }
  } catch {
    const opt = paymentMethodOptions.value.find((o) => o.value === targetMethod)
    const subtotal = Number(invoice.pricing?.final_price ?? invoice.amount ?? 0)
    const isPercent = opt?.fee_type === 'percent'
    const fee = isPercent
      ? Math.round(subtotal * ((opt?.fee_rate || 0.7) / 100))
      : opt?.fixed_amount || 4000
    const label = isPercent ? `${strRate(opt?.fee_rate || 0.7)}%` : 'Rp 4.000 (Tetap)'
    invoiceFeePreviews.value[invoiceNumber] = {
      subtotal,
      fee_amount: fee,
      fee_label: label,
      total_amount: subtotal + fee,
      fee_type: opt?.fee_type || 'fixed',
      fee_rate: opt?.fee_rate || 0,
      payment_method: targetMethod,
      is_locked: false,
    }
  }
}

function getInvoiceSubtotal(invoice) {
  return Number(invoice.pricing?.final_price ?? invoice.amount ?? 0)
}

function getInvoiceAdminFee(invoice) {
  if (invoice.payment?.fee_breakdown?.fee_amount !== undefined) {
    return Number(invoice.payment.fee_breakdown.fee_amount)
  }
  const prev = invoiceFeePreviews.value[invoice.invoice_number]
  if (prev?.fee_amount !== undefined) {
    return Number(prev.fee_amount)
  }
  return 0
}

function getInvoiceTotalPayable(invoice) {
  if (invoice.status === 'paid' && invoice.payment?.amount) {
    return Number(invoice.payment.amount)
  }
  if (hasActiveCheckout(invoice) && invoice.payment?.amount) {
    return Number(invoice.payment.amount)
  }
  const prev = invoiceFeePreviews.value[invoice.invoice_number]
  if (prev?.total_amount !== undefined) {
    return Number(prev.total_amount)
  }
  return getInvoiceSubtotal(invoice) + getInvoiceAdminFee(invoice)
}

function isCheckoutExpired(invoice) {
  if (invoice.payment?.status === 'expired') return true
  const expiresAt = invoice.payment?.checkout_expires_at
  if (!expiresAt) return false
  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) && Date.now() > timestamp
}

function hasActiveCheckout(invoice) {
  if (invoice.status !== 'pending') return false
  if (!['initiated', 'pending'].includes(invoice.payment?.status)) return false
  if (isCheckoutExpired(invoice)) return false

  const method = actualPaymentMethod(invoice)
  if (method === 'qris') {
    return Boolean(qrContent(invoice) || qrImageUrl(invoice) || paymentCode(invoice))
  }
  if (method === 'gopay') {
    return Boolean(invoice.payment?.checkout_url)
  }
  return isVirtualAccount(method) && Boolean(paymentCode(invoice))
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
      QRCode.toDataURL(content, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 240,
      })
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

function clearCheckoutKeys(invoiceNumber) {
  clearSavedKey('checkout', invoiceNumber)
  for (const { value: method } of paymentMethodOptions.value) {
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
    if (isSuperadmin.value && !selectedWarungId.value) {
      plans.value = await larisamaApi.listSubscriptionPlans()
      invoices.value = []
      loading.value = false
      return
    }

    const [planResult, invoiceResult, methodsResult] = await Promise.allSettled([
      larisamaApi.listSubscriptionPlans(),
      larisamaApi.listSubscriptionInvoices(),
      larisamaApi.listSubscriptionPaymentMethods(),
      refreshCurrentWarung(),
    ])
    if (planResult.status === 'fulfilled') {
      plans.value = planResult.value
    } else {
      errorMessage.value = `Katalog paket: ${displayApiError(planResult.reason)}`
    }

    if (methodsResult.status === 'fulfilled' && Array.isArray(methodsResult.value)) {
      paymentMethodOptions.value = methodsResult.value.map((m) => ({
        label: `${m.name || m.label}${m.fee_label ? ` (Biaya admin ${m.fee_label})` : ''}`,
        value: m.code || m.value,
        fee_type: m.fee_type,
        fee_rate: m.fee_rate,
        fixed_amount: m.fixed_amount,
        fee_label: m.fee_label,
      }))
    }

    if (invoiceResult.status === 'fulfilled') {
      const rows = invoiceResult.value
      invoices.value = rows

      for (const invoice of rows) {
        if (invoice.status === 'pending') {
          void loadFeePreview(invoice)
        }
      }

      // Baseline status recording: mark existing settled invoices as notified
      for (const invoice of rows) {
        knownInvoiceStatuses.set(invoice.invoice_number, invoice.status)
        if (isSettledInvoice(invoice)) {
          markInvoiceAsNotified(invoice.invoice_number, invoice.payment?.payment_method)
        } else if (invoice.status === 'pending' && hasActiveCheckout(invoice)) {
          activelyMonitoredInvoices.add(invoice.invoice_number)
        }
      }

      // Silent reconcile to guarantee data sync, without toast
      if (rows.some(isSettledInvoice)) {
        await applyUdevSubscription({ silent: true })
        await refreshCurrentWarung()
      }

      updateStatusPolling()
    } else {
      const invoiceError = `Invoice: ${displayApiError(invoiceResult.reason)}`
      errorMessage.value = errorMessage.value
        ? `${errorMessage.value} ${invoiceError}`
        : invoiceError
    }
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    loading.value = false
  }
}

async function checkAndHandleSettledInvoices(updatedInvoices) {
  let hasNewlySettled = false

  for (const invoice of updatedInvoices) {
    const invoiceNumber = invoice.invoice_number
    const prevStatus = knownInvoiceStatuses.get(invoiceNumber)
    const isNowSettled = isSettledInvoice(invoice)
    const isMonitored = activelyMonitoredInvoices.has(invoiceNumber)
    const alreadyNotified = isInvoiceNotified(invoiceNumber)

    // True transition from pending to settled for an actively monitored checkout
    if (isNowSettled && prevStatus === 'pending' && isMonitored && !alreadyNotified) {
      hasNewlySettled = true
      markInvoiceAsNotified(invoiceNumber, invoice.payment?.payment_method)
      activelyMonitoredInvoices.delete(invoiceNumber)
      clearCheckoutKeys(invoiceNumber)
    } else if (isNowSettled && !alreadyNotified) {
      // Mark old or external settled invoice as notified so it never prompts
      markInvoiceAsNotified(invoiceNumber, invoice.payment?.payment_method)
    }

    knownInvoiceStatuses.set(invoiceNumber, invoice.status)
  }

  if (hasNewlySettled) {
    // Apply reconcile and display success toast EXACTLY ONCE
    await applyUdevSubscription({ silent: true })
    await refreshCurrentWarung()

    $q.notify({
      type: 'positive',
      message: 'Pembayaran langganan berhasil diverifikasi dan masa aktif warung telah diperbarui.',
      icon: 'check_circle',
      timeout: 5000,
    })

    // Stop polling immediately after successful payment verification
    stopStatusPolling()
  } else if (updatedInvoices.some(isSettledInvoice)) {
    // Silent background sync without notification
    await applyUdevSubscription({ silent: true })
  }
}

async function refreshInvoices() {
  refreshingInvoices.value = true
  errorMessage.value = ''
  pollCount.value = 0
  pollPaused.value = false
  try {
    const rows = await larisamaApi.listSubscriptionInvoices()
    invoices.value = rows
    for (const invoice of rows) {
      if (invoice.status === 'pending') {
        void loadFeePreview(invoice)
      }
    }
    await checkAndHandleSettledInvoices(rows)
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
    checkPricingConsistency()
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
    checkPricingConsistency()
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
    checkPricingConsistency()
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
  if (refreshingPreview.value || previewError.value || !isPricingConsistent.value) return
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
    knownInvoiceStatuses.set(invoice.invoice_number, invoice.status || 'pending')
    activelyMonitoredInvoices.add(invoice.invoice_number)
    $q.notify({
      type: 'positive',
      message: `Invoice ${invoice.invoice_number} berhasil dibuat.`,
    })
    await router.push(`/pengaturan/pembayaran/checkout/${invoice.invoice_number}`)
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    creatingInvoice.value = false
  }
}

async function goToCheckout(invoiceNumber) {
  if (!invoiceNumber) {
    $q.notify({
      type: 'warning',
      message: 'Nomor invoice tidak ditemukan.',
      icon: 'warning',
    })
    return
  }
  try {
    await router.push(`/pengaturan/pembayaran/checkout/${invoiceNumber}`)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Gagal membuka halaman checkout: ${error?.message || 'Navigasi gagal'}`,
      icon: 'error',
    })
  }
}

async function refreshInvoice(invoiceNumber, showError = true) {
  checkingStatus.value = invoiceNumber
  pollCount.value = 0
  pollPaused.value = false
  activelyMonitoredInvoices.add(invoiceNumber)
  try {
    const prevStatus = knownInvoiceStatuses.get(invoiceNumber)
    const invoice = await larisamaApi.getSubscriptionInvoice(invoiceNumber)
    upsertInvoice(invoice)

    const paymentStatus = invoice.payment?.status
    if (['failed', 'expired', 'cancelled'].includes(paymentStatus)) {
      clearCheckoutKeys(invoiceNumber)
      activelyMonitoredInvoices.delete(invoiceNumber)
    }

    const isNowSettled = isSettledInvoice(invoice)
    const alreadyNotified = isInvoiceNotified(invoiceNumber)

    if (isNowSettled && prevStatus === 'pending' && !alreadyNotified) {
      markInvoiceAsNotified(invoiceNumber, invoice.payment?.payment_method)
      activelyMonitoredInvoices.delete(invoiceNumber)
      clearCheckoutKeys(invoiceNumber)

      await applyUdevSubscription({ silent: true })
      await refreshCurrentWarung()

      $q.notify({
        type: 'positive',
        message:
          'Pembayaran langganan berhasil diverifikasi dan masa aktif warung telah diperbarui.',
        icon: 'check_circle',
        timeout: 5000,
      })

      stopStatusPolling()
    } else if (isNowSettled) {
      // Already notified or was already paid: silent reconcile
      await applyUdevSubscription({ silent: true })
      await refreshCurrentWarung()
    }

    knownInvoiceStatuses.set(invoiceNumber, invoice.status)
    if (showError) errorMessage.value = ''
    return invoice
  } catch (error) {
    if (showError) errorMessage.value = displayApiError(error)
    return null
  } finally {
    if (checkingStatus.value === invoiceNumber) checkingStatus.value = ''
  }
}

async function applyUdevSubscription(options = {}) {
  const { silent = true } = options
  try {
    const result = await larisamaApi.reconcileSubscription()
    if (!silent) {
      $q.notify({
        type: 'positive',
        message:
          'Pembayaran langganan berhasil diverifikasi dan masa aktif warung telah diperbarui.',
        icon: 'check_circle',
        timeout: 5000,
      })
    }
    return result
  } catch (error) {
    if (error?.code !== 'UDEV_SUBSCRIPTION_NOT_ACTIVE') throw error
    return null
  }
}

async function refreshCurrentWarung() {
  if (isSuperadmin.value) {
    if (selectedWarungId.value) {
      try {
        const warung = await larisamaApi.getWarung(selectedWarungId.value)
        authSession.setSelectedWarung(warung)
      } catch {
        // Abaikan jika gagal memuat ulang data warung superadmin
      }
    }
    return
  }
  const warung = await larisamaApi.currentWarung()
  authSession.warung = warung
}

watch(selectedWarungId, () => {
  notifiedInvoiceNumbers.clear()
  knownInvoiceStatuses.clear()
  activelyMonitoredInvoices.clear()
  stopStatusPolling()
  void loadPage()
})

function upsertInvoice(invoice) {
  if (!invoice?.invoice_number) return
  const index = invoices.value.findIndex((row) => row.invoice_number === invoice.invoice_number)
  if (index === -1) invoices.value.unshift(invoice)
  else invoices.value[index] = invoice

  if (invoice.payment?.fee_breakdown) {
    const fb = invoice.payment.fee_breakdown
    invoiceFeePreviews.value[invoice.invoice_number] = {
      subtotal: Number(fb.subtotal_amount || invoice.pricing?.final_price || invoice.amount),
      fee_amount: Number(fb.fee_amount || 0),
      fee_label: fb.fee_type === 'percent' ? `${strRate(fb.fee_rate)}%` : 'Rp 4.000 (Tetap)',
      total_amount: Number(fb.total_amount || invoice.payment.amount),
      fee_type: fb.fee_type,
      fee_rate: fb.fee_rate,
      payment_method: invoice.payment.payment_method,
      is_locked: true,
    }
  }

  updateStatusPolling()
}

function startStatusPolling() {
  if (statusPollTimer) return
  isPolling.value = true
  pollPaused.value = false
  statusPollTimer = window.setInterval(async () => {
    if (document.visibilityState === 'visible') {
      if (pollCount.value >= MAX_POLL_COUNT) {
        stopStatusPolling()
        pollPaused.value = true
        return
      }
      pollCount.value += 1
      await pollInvoiceStatuses()
    }
  }, 30000)
}

function stopStatusPolling() {
  if (statusPollTimer) {
    window.clearInterval(statusPollTimer)
    statusPollTimer = null
  }
  isPolling.value = false
}

function resumePolling() {
  pollCount.value = 0
  pollPaused.value = false
  startStatusPolling()
  void pollInvoiceStatuses()
}

async function pollInvoiceStatuses() {
  if (statusPollRunning) return
  statusPollRunning = true
  try {
    const rows = await larisamaApi.listSubscriptionInvoices()
    invoices.value = rows
    await checkAndHandleSettledInvoices(rows)
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
    !['failed', 'expired', 'cancelled', 'succeeded'].includes(invoice.payment?.status) &&
    !isCheckoutExpired(invoice)
  )
}

function updateStatusPolling() {
  for (const invoice of invoices.value) {
    if (['failed', 'expired', 'cancelled'].includes(invoice.payment?.status)) {
      clearCheckoutKeys(invoice.invoice_number)
    }
  }
  if (invoices.value.some(isPollableInvoice)) {
    if (!pollPaused.value) {
      startStatusPolling()
    }
  } else {
    stopStatusPolling()
    pollPaused.value = false
    pollCount.value = 0
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    if (invoices.value.some(isPollableInvoice) && !pollPaused.value) {
      void pollInvoiceStatuses()
    }
  }
}

function invoiceStatusLabel(invoice) {
  if (invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed') {
    return 'Terbayar'
  }
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
  if (invoice.status === 'paid' && invoice.tracking?.settlement_status === 'completed') {
    return 'positive'
  }
  if (invoice.status === 'paid') return 'warning'
  if (
    ['expired', 'cancelled'].includes(invoice.status) ||
    ['failed', 'expired', 'cancelled'].includes(invoice.payment?.status) ||
    invoice.payment?.checkout_status === 'failed'
  ) {
    return 'negative'
  }
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

function formatPlanPrice(price, currency = 'IDR') {
  if (price === null || price === undefined || price === '') return '-'
  const numeric =
    typeof price === 'number' ? Math.abs(price) : Number(String(price).replace(/[^0-9.]+/g, ''))
  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(numeric)
  }
  return `${currency || 'IDR'} ${price}`
}

onMounted(() => {
  void loadPage()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  stopStatusPolling()
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
h1,
h2.page-title {
  margin: 6px 0;
  color: #104f39;
  font-size: clamp(22px, 3.5vw, 28px);
  font-weight: 700;
  line-height: 1.2;
}
.page-heading p,
.page-subtitle {
  margin: 0;
  color: #718078;
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
}
.filter-bar {
  border-bottom: 1px solid #e0ebe3;
  padding-bottom: 4px;
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
.payment-method-select {
  min-width: 260px;
}
.payment-code-panel {
  display: grid;
  justify-items: start;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  padding: 14px;
  border: 1px solid #d4e0e5;
  border-radius: 12px;
  background: #f5f8fa;
}
.payment-code-heading {
  display: grid;
  gap: 4px;
}
.payment-code-heading strong {
  color: #263e4a;
  font-size: 15px;
}
.payment-code-heading span {
  color: #5f717b;
  font-size: 13px;
}
.payment-code-value {
  display: inline-block;
  max-width: 100%;
  padding: 8px 12px;
  overflow-wrap: anywhere;
  border-radius: 8px;
  background: white;
  color: #172b36;
  font-size: 16px;
  font-weight: 700;
  user-select: all;
  border: 1px solid #d4e0e5;
}
.virtual-account-number {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: 100%;
}
.mandiri-code-container {
  display: grid;
  gap: 8px;
  width: 100%;
}
.billing-detail-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.total-payable-card {
  background: #eef7f2;
  border: 1px solid #cce8d9;
  border-radius: 8px;
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
.subscription-validity-card {
  border-radius: 16px;
  background: #f8faf9;
  border: 1px solid #dbe6e0;
}
.validity-metric-label {
  font-size: 12px;
  color: #71847b;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.validity-metric-value {
  font-size: 15px;
  color: #104f39;
  font-weight: 600;
}
.extend-btn {
  font-weight: 700;
  padding: 10px 20px;
}
body.body--dark .subscription-validity-card {
  background: #1c2621;
  border-color: #2e3e35;
}
body.body--dark .validity-metric-label {
  color: #9bb0a5;
}
body.body--dark .validity-metric-value {
  color: #eef7f2;
}
@media (min-width: 1024px) {
  .text-right-md {
    text-align: right;
  }
}
@media (max-width: 1023px) {
  .text-right-md {
    text-align: left;
    margin-top: 8px;
  }
  .extend-btn {
    width: 100%;
  }
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
