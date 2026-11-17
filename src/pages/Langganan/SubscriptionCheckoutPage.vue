<template>
  <section class="settings-tab-page checkout-page" data-ui="subscription-checkout">
    <!-- Header Halaman Checkout -->
    <div class="page-heading row items-center justify-between q-col-gutter-md q-mb-lg">
      <div class="col">
        <div class="row items-center q-gutter-xs q-mb-xs">
          <q-btn
            flat
            dense
            round
            icon="arrow_back"
            color="primary"
            to="/pengaturan/pembayaran"
          >
            <q-tooltip>Kembali ke daftar paket</q-tooltip>
          </q-btn>
          <div class="eyebrow">PEMBAYARAN LANGGANAN</div>
        </div>
        <h2 class="page-title">Checkout Pembayaran DANA</h2>
        <p class="page-subtitle">
          Selesaikan pembayaran langganan melalui gateway resmi UDEV Billing & DANA.
        </p>
      </div>
      <div class="col-auto">
        <q-btn
          outline
          no-caps
          color="primary"
          icon="sync"
          :label="manualCheckCooldown > 0 ? `Periksa Status (${manualCheckCooldown}s)` : 'Periksa Status'"
          :loading="checkingStatus"
          :disable="manualCheckCooldown > 0"
          @click="checkPaymentStatus(true)"
        />
      </div>
    </div>

    <!-- Banner Notifikasi Error -->
    <q-banner
      v-if="errorMessage"
      rounded
      class="bg-red-1 text-negative q-mb-lg"
    >
      <template #avatar><q-icon name="error_outline" color="negative" /></template>
      <div class="row items-center justify-between full-width">
        <span>{{ errorMessage }}</span>
        <q-btn flat dense no-caps label="Tutup" @click="errorMessage = ''" />
      </div>
    </q-banner>

    <!-- Banner Inkonsistensi Harga / Data Nominal Tidak Valid -->
    <q-banner
      v-if="invoice && !isPricingConsistent"
      rounded
      class="bg-red-1 text-negative q-mb-lg"
    >
      <template #avatar><q-icon name="report_problem" color="negative" /></template>
      <div class="text-weight-bold">Rincian Nominal Tagihan Tidak Konsisten</div>
      <div class="text-caption q-mt-xs">
        Rincian harga pada invoice ini tidak konsisten secara matematis (Harga normal dikurangi diskon tidak sesuai dengan total tagihan). Demi keamanan data billing warung, pembuatan sesi pembayaran baru diblokir. Silakan hubungi admin.
      </div>
    </q-banner>

    <!-- Banner Status Belum Terverifikasi / Stale -->
    <q-banner
      v-if="invoice?.is_stale && invoice?.status !== 'paid'"
      rounded
      class="bg-amber-1 text-brown-9 q-mb-lg"
    >
      <template #avatar><q-icon name="warning_amber" color="amber-9" /></template>
      <span>Status pembayaran saat ini belum dapat diverifikasi langsung dari UDEV. Sistem menampilkan data tersimpan sementara. Silakan klik Periksa Status untuk memverifikasi ulang.</span>
    </q-banner>

    <!-- Banner Sesi Polling Otomatis Selesai -->
    <q-banner
      v-if="autoPollExhausted && invoice && invoice.status !== 'paid' && !isExpired"
      rounded
      class="bg-blue-1 text-primary q-mb-lg"
    >
      <template #avatar><q-icon name="info" color="primary" /></template>
      <div class="row items-center justify-between full-width">
        <span>Pemeriksaan otomatis telah selesai (5 menit). Silakan gunakan tombol <strong>Periksa Status</strong> untuk mengecek status pembayaran terbaru.</span>
        <q-btn
          dense
          flat
          no-caps
          color="primary"
          icon="refresh"
          label="Periksa Sekarang"
          :disable="manualCheckCooldown > 0"
          :loading="checkingStatus"
          @click="checkPaymentStatus(true)"
        />
      </div>
    </q-banner>

    <!-- State Loading Awal -->
    <q-card v-if="loading && !invoice" flat bordered class="state-card q-pa-xl text-center">
      <q-spinner-dots color="primary" size="40px" />
      <div class="text-subtitle1 text-grey-8 q-mt-md">Memuat data invoice dan pembayaran…</div>
    </q-card>

    <!-- State Berhasil Terbayar -->
    <q-card
      v-else-if="invoice && invoice.status === 'paid'"
      flat
      bordered
      class="paid-success-card q-pa-lg text-center"
    >
      <div class="q-py-md">
        <q-avatar size="72px" color="green-1" text-color="positive" icon="check_circle" class="q-mb-md" />
        <h3 class="text-h5 text-weight-bold text-positive q-my-none">
          Pembayaran Berhasil Dikonfirmasi!
        </h3>
        <p class="text-body1 text-grey-8 q-mt-sm q-mb-lg">
          Langganan Larissama Anda telah aktif. Sinkronisasi masa aktif ke warung telah selesai.
        </p>

        <div class="invoice-summary-box q-pa-md rounded-borders bg-grey-1 q-mb-lg text-left" style="max-width: 500px; margin-left: auto; margin-right: auto;">
          <div class="row justify-between q-py-xs">
            <span class="text-grey-7">Nomor Invoice</span>
            <span class="text-weight-bold text-dark">{{ invoice.invoice_number }}</span>
          </div>
          <div class="row justify-between q-py-xs">
            <span class="text-grey-7">Paket</span>
            <span class="text-weight-bold text-dark">{{ invoice.plan?.name || invoice.plan?.code }}</span>
          </div>
          <div class="row justify-between q-py-xs">
            <span class="text-grey-7">Metode Pembayaran</span>
            <span class="text-weight-bold text-dark">{{ activePaymentMethodLabel }}</span>
          </div>
          <div class="row justify-between q-py-xs">
            <span class="text-grey-7">Total Terbayar</span>
            <span class="text-weight-bold text-positive">{{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}</span>
          </div>
          <div v-if="invoice.paid_at" class="row justify-between q-py-xs">
            <span class="text-grey-7">Waktu Pembayaran</span>
            <span class="text-weight-bold text-dark">{{ formatDate(invoice.paid_at) }}</span>
          </div>
        </div>

        <div class="row justify-center q-gutter-sm">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="storefront"
            label="Buka Dashboard Warung"
            to="/"
          />
          <q-btn
            outline
            no-caps
            color="primary"
            icon="history"
            label="Lihat Riwayat Tagihan"
            to="/pengaturan/pembayaran"
          />
        </div>
      </div>
    </q-card>

    <!-- State Checkout Aktif / Pending -->
    <div v-else-if="invoice" class="row q-col-gutter-lg">
      <!-- Kolom Kiri: Pilihan Metode & Instruksi Pembayaran -->
      <div class="col-12 col-md-7">
        <!-- 1. Pemilihan Metode Pembayaran (Jika belum checkout atau checkout telah kedaluwarsa) -->
        <q-card flat bordered class="q-mb-md method-selection-card">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle1 text-weight-bold text-dark">
                Metode Pembayaran DANA
              </div>
              <q-badge
                v-if="isMethodLocked"
                color="blue-grey-7"
                label="Terkunci (Sesi Aktif)"
                class="q-px-sm q-py-xs"
              />
            </div>

            <div v-if="isMethodLocked" class="text-caption text-grey-7 q-mb-md">
              Instruksi pembayaran metode <strong>{{ activePaymentMethodLabel }}</strong> sedang aktif. Anda dapat mengganti metode setelah batas waktu sesi berakhir.
            </div>
            <div v-else class="text-caption text-grey-7 q-mb-md">
              Pilih salah satu metode pembayaran DANA yang tersedia di bawah ini:
            </div>

            <!-- Group 1: QRIS -->
            <div v-if="qrisMethods.length > 0" class="method-group q-mb-md">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                QRIS (Semua Pembayaran)
              </div>
              <div class="column q-gutter-xs">
                <q-item
                  v-for="m in qrisMethods"
                  :key="m.code"
                  tag="label"
                  clickable
                  :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                  :active="selectedPaymentMethod === m.code"
                  active-class="bg-blue-1 text-primary text-weight-medium"
                  class="rounded-borders method-item"
                  @click="selectMethod(m.code)"
                >
                  <q-item-section avatar>
                    <q-radio
                      v-model="selectedPaymentMethod"
                      :val="m.code"
                      :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ m.name }}</q-item-label>
                    <q-item-label caption class="text-grey-7">{{ m.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge color="positive" label="Gratis Admin" />
                  </q-item-section>
                </q-item>
              </div>
            </div>

            <!-- Group 2: DANA Wallet (E-Wallet) -->
            <div v-if="ewalletMethods.length > 0" class="method-group q-mb-md">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                DANA Wallet / Saldo
              </div>
              <div class="column q-gutter-xs">
                <q-item
                  v-for="m in ewalletMethods"
                  :key="m.code"
                  tag="label"
                  clickable
                  :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                  :active="selectedPaymentMethod === m.code"
                  active-class="bg-blue-1 text-primary text-weight-medium"
                  class="rounded-borders method-item"
                  @click="selectMethod(m.code)"
                >
                  <q-item-section avatar>
                    <q-radio
                      v-model="selectedPaymentMethod"
                      :val="m.code"
                      :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ m.name }}</q-item-label>
                    <q-item-label caption class="text-grey-7">{{ m.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge color="positive" label="Gratis Admin" />
                  </q-item-section>
                </q-item>
              </div>
            </div>

            <!-- Group 3: Virtual Account -->
            <div v-if="vaMethods.length > 0" class="method-group q-mb-sm">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                Transfer Virtual Account (DANA Gateway)
              </div>
              <div class="column q-gutter-xs">
                <q-item
                  v-for="m in vaMethods"
                  :key="m.code"
                  tag="label"
                  clickable
                  :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                  :active="selectedPaymentMethod === m.code"
                  active-class="bg-blue-1 text-primary text-weight-medium"
                  class="rounded-borders method-item"
                  @click="selectMethod(m.code)"
                >
                  <q-item-section avatar>
                    <q-radio
                      v-model="selectedPaymentMethod"
                      :val="m.code"
                      :disable="isMethodLocked && selectedPaymentMethod !== m.code"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ m.name }}</q-item-label>
                    <q-item-label caption class="text-grey-7">{{ m.description }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge color="positive" label="Gratis Admin" />
                  </q-item-section>
                </q-item>
              </div>
            </div>

            <!-- Tombol Konfirmasi Ganti / Buat Sesi Pembayaran (Jika belum aktif) -->
            <div v-if="!hasReadyCheckout && !isExpired" class="q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="bolt"
                :label="`Lanjutkan dengan ${selectedMethodName}`"
                class="full-width"
                :loading="initiatingCheckout"
                :disable="initiatingCheckout || !isPricingConsistent"
                @click="startCheckoutSession(selectedPaymentMethod)"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- 2. Instruksi Pembayaran Berdasarkan Metode Terpilih -->
        <q-card v-if="hasReadyCheckout || isExpired" flat bordered class="instruction-card">
          <q-card-section>
            <!-- Badge & Judul Status -->
            <div class="row items-center justify-between q-mb-sm">
              <div class="row items-center q-gutter-sm">
                <q-chip dense color="blue-1" text-color="primary" class="text-weight-bold">
                  {{ activePaymentMethodLabel }}
                </q-chip>
                <span class="text-caption text-grey-7">DANA Payment Gateway</span>
              </div>
              <q-badge
                :color="isExpired ? 'negative' : 'warning'"
                :label="isExpired ? 'Kedaluwarsa' : 'Menunggu Pembayaran'"
                class="q-px-sm q-py-xs"
              />
            </div>

            <!-- Countdown Timer Header -->
            <div
              class="timer-banner q-pa-sm rounded-borders row items-center justify-between q-mb-md"
              :class="isExpired ? 'bg-red-1 text-negative' : 'bg-amber-1 text-brown-9'"
            >
              <div class="row items-center q-gutter-xs">
                <q-icon :name="isExpired ? 'timer_off' : 'schedule'" size="18px" />
                <span class="text-caption text-weight-medium">
                  {{ isExpired ? 'Batas waktu pembayaran telah habis' : 'Selesaikan pembayaran dalam:' }}
                </span>
              </div>
              <div class="text-subtitle2 text-weight-bold font-mono">
                {{ countdownText }}
              </div>
            </div>

            <!-- State Loading Pembuatan Checkout -->
            <div v-if="initiatingCheckout" class="q-py-xl text-center">
              <q-spinner-dots color="primary" size="36px" />
              <div class="text-caption text-grey-7 q-mt-sm">Menyiapkan instruksi pembayaran DANA resmi…</div>
            </div>

            <!-- State Kedaluwarsa -->
            <div v-else-if="isExpired" class="q-py-lg text-center">
              <q-icon name="error_outline" size="48px" color="negative" />
              <div class="text-subtitle1 text-weight-medium text-grey-9 q-mt-sm">
                Sesi pembayaran telah kedaluwarsa
              </div>
              <div class="text-caption text-grey-6 q-mb-md">
                Batas waktu pembayaran untuk sesi ini telah berakhir. Anda dapat memilih metode baru dan membuat instruksi pembayaran ulang.
              </div>
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="refresh"
                label="Coba Lagi (Buat Sesi Baru)"
                :loading="initiatingCheckout"
                :disable="!isPricingConsistent"
                @click="retryCheckout"
              />
            </div>

            <!-- TAMPILAN KHUSUS METODE 1: QRIS -->
            <div v-else-if="activeCategory === 'qris'" class="qris-payment-box text-center q-my-md">
              <div v-if="qrDataUrl" class="qr-container inline-block">
                <div class="qr-box q-pa-sm bg-white rounded-borders">
                  <img :src="qrDataUrl" alt="Kode QRIS DANA" class="qr-image" />
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  Pindai menggunakan aplikasi DANA atau aplikasi mobile banking / e-wallet apa pun
                </div>
              </div>

              <!-- Tombol Aksi QRIS -->
              <div v-if="qrDataUrl" class="row justify-center q-gutter-sm q-mt-md q-mb-md">
                <q-btn
                  outline
                  no-caps
                  size="sm"
                  color="primary"
                  icon="download"
                  label="Unduh Gambar QR"
                  @click="downloadQrCode"
                />
                <q-btn
                  outline
                  no-caps
                  size="sm"
                  color="grey-8"
                  icon="content_copy"
                  label="Salin Payload QRIS"
                  @click="copyText(qrContent, 'Payload QRIS disalin')"
                />
              </div>

              <q-separator class="q-my-md" />

              <!-- Petunjuk QRIS -->
              <div class="instructions-section text-left">
                <div class="text-subtitle2 text-weight-bold text-dark q-mb-sm">
                  Cara Pembayaran dengan QRIS:
                </div>
                <ol class="q-pl-md q-my-none text-caption text-grey-8 instruction-list">
                  <li>Buka aplikasi <strong>DANA</strong> atau aplikasi mobile banking / e-wallet lain (BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay).</li>
                  <li>Pilih menu <strong>Pindai / Scan QRIS</strong>.</li>
                  <li>Arahkan kamera ponsel ke kode QRIS di atas, atau unggah gambar kode QR yang telah diunduh.</li>
                  <li>Periksa detail tagihan warung dan pastikan nominal pembayaran sesuai yaitu <strong>{{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}</strong>.</li>
                  <li>Konfirmasi pembayaran dan masukkan PIN Anda.</li>
                  <li>Setelah berhasil, klik tombol <strong>Periksa Status</strong> di bawah.</li>
                </ol>
              </div>
            </div>

            <!-- TAMPILAN KHUSUS METODE 2: VIRTUAL ACCOUNT -->
            <div v-else-if="activeCategory === 'virtual_account'" class="va-payment-box q-my-md">
              <div class="va-display-card q-pa-md bg-grey-1 rounded-borders text-center q-mb-md">
                <div class="text-caption text-grey-7 q-mb-xs">Nomor Virtual Account ({{ activePaymentMethodLabel }})</div>
                <div class="text-h5 text-weight-bolder text-primary font-mono q-my-xs">
                  {{ activeVaNumber || 'Menunggu nomor VA...' }}
                </div>
                <q-btn
                  v-if="activeVaNumber"
                  outline
                  dense
                  no-caps
                  color="primary"
                  icon="content_copy"
                  label="Salin Nomor VA"
                  class="q-mt-xs q-px-sm"
                  @click="copyText(activeVaNumber, 'Nomor Virtual Account disalin')"
                />
                <div class="text-caption text-grey-6 q-mt-sm">
                  Nominal Transfer Tepat: <strong>{{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}</strong>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Petunjuk Virtual Account -->
              <div class="instructions-section text-left">
                <div class="text-subtitle2 text-weight-bold text-dark q-mb-sm">
                  Cara Pembayaran Virtual Account:
                </div>
                <ol class="q-pl-md q-my-none text-caption text-grey-8 instruction-list">
                  <li>Buka aplikasi Mobile Banking bank terkait (contoh: <strong>BRImo</strong>, <strong>OCTO Mobile</strong>, atau <strong>Jenius</strong>) atau kunjungi ATM terdekat.</li>
                  <li>Pilih menu <strong>Transfer</strong> &gt; <strong>Virtual Account / Tagihan</strong>.</li>
                  <li>Masukkan nomor Virtual Account: <strong class="font-mono">{{ activeVaNumber }}</strong>.</li>
                  <li>Pastikan nama merchant tertera <strong>DANA / Larissama</strong> dan nominal sesuai: <strong>{{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}</strong>.</li>
                  <li>Selesaikan transaksi dan simpan bukti pembayaran.</li>
                  <li>Klik tombol <strong>Periksa Status</strong> setelah transfer selesai.</li>
                </ol>
              </div>
            </div>

            <!-- TAMPILAN KHUSUS METODE 3: DANA WALLET -->
            <div v-else-if="activeCategory === 'ewallet'" class="ewallet-payment-box text-center q-my-md">
              <div class="q-py-md">
                <q-icon name="account_balance_wallet" size="64px" color="primary" class="q-mb-sm" />
                <div class="text-subtitle1 text-weight-bold text-dark">
                  Bayar Langsung dengan DANA Wallet
                </div>
                <div class="text-caption text-grey-7 q-mb-lg" style="max-width: 450px; margin-left: auto; margin-right: auto;">
                  Klik tombol di bawah untuk membuka halaman otorisasi pembayaran DANA di aplikasi atau browser Anda.
                </div>

                <div v-if="activeRedirectUrl" class="row justify-center q-gutter-sm q-mb-md">
                  <q-btn
                    unelevated
                    no-caps
                    size="lg"
                    color="primary"
                    icon="open_in_new"
                    label="Buka DANA &amp; Bayar Sekarang"
                    :href="activeRedirectUrl"
                    target="_blank"
                  />
                  <q-btn
                    outline
                    no-caps
                    color="grey-8"
                    icon="content_copy"
                    label="Salin Tautan Pembayaran"
                    @click="copyText(activeRedirectUrl, 'Tautan pembayaran disalin')"
                  />
                </div>
                <div v-else class="text-caption text-warning q-mb-md">
                  Tautan pembayaran sedang disiapkan oleh gateway DANA…
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Petunjuk DANA Wallet -->
              <div class="instructions-section text-left">
                <div class="text-subtitle2 text-weight-bold text-dark q-mb-sm">
                  Cara Pembayaran dengan DANA Wallet:
                </div>
                <ol class="q-pl-md q-my-none text-caption text-grey-8 instruction-list">
                  <li>Klik tombol <strong>Buka DANA &amp; Bayar Sekarang</strong> di atas.</li>
                  <li>Anda akan diarahkan ke halaman checkout resmi DANA.</li>
                  <li>Login dengan nomor ponsel akun DANA Anda dan masukkan PIN.</li>
                  <li>Periksa nominal tagihan sebesar <strong>{{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}</strong> dan konfirmasi pembayaran.</li>
                  <li>Setelah selesai, kembali ke tab ini dan klik <strong>Periksa Status</strong>.</li>
                </ol>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Kolom Kanan: Rincian Tagihan & Aksi -->
      <div class="col-12 col-md-5">
        <q-card flat bordered class="summary-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold text-dark q-mb-md">
              Rincian Tagihan
            </div>

            <!-- Detail Invoice -->
            <div class="row justify-between items-center q-py-xs">
              <span class="text-caption text-grey-7">Nomor Invoice</span>
              <div class="row items-center q-gutter-xs">
                <span class="text-caption font-mono text-weight-bold">{{ invoice.invoice_number }}</span>
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  icon="content_copy"
                  color="grey-7"
                  @click="copyText(invoice.invoice_number, 'Nomor invoice disalin')"
                />
              </div>
            </div>

            <div class="row justify-between items-center q-py-xs">
              <span class="text-caption text-grey-7">Paket Langganan</span>
              <span class="text-caption text-weight-bold text-dark">
                {{ invoice.plan?.name || invoice.plan?.code || 'Paket Langganan' }}
              </span>
            </div>

            <div class="row justify-between items-center q-py-xs">
              <span class="text-caption text-grey-7">Durasi Langganan</span>
              <span class="text-caption text-grey-9">
                {{ invoice.plan?.duration_days || (invoice.period_count * 30) }} Hari ({{ invoice.period_count || 1 }} Periode)
              </span>
            </div>

            <div class="row justify-between items-center q-py-xs">
              <span class="text-caption text-grey-7">Metode Pembayaran</span>
              <span class="text-caption text-weight-bold text-primary">{{ activePaymentMethodLabel }}</span>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Detail Harga -->
            <div class="row justify-between items-center q-py-xs">
              <span class="text-caption text-grey-7">Harga Paket</span>
              <span class="text-caption text-grey-9">
                {{ formatCurrency(invoice.pricing?.normal_price || invoice.amount) }}
              </span>
            </div>

            <div
              v-if="invoice.pricing?.referral_code && Number(invoice.pricing?.discount_amount || 0) > 0"
              class="row justify-between items-center q-py-xs text-positive"
            >
              <span class="text-caption">Diskon Referral ({{ invoice.pricing.referral_code }})</span>
              <span class="text-caption text-weight-medium">
                -{{ formatCurrency(invoice.pricing.discount_amount) }}
              </span>
            </div>

            <div class="row justify-between items-center q-py-xs">
              <div class="row items-center q-gutter-xs">
                <span class="text-caption text-grey-7">Biaya Layanan Admin</span>
                <q-icon name="help_outline" size="14px" color="grey-6">
                  <q-tooltip>Biaya admin DANA gratis (ditanggung oleh merchant)</q-tooltip>
                </q-icon>
              </div>
              <span class="text-caption text-weight-medium text-positive">Gratis (Rp 0)</span>
            </div>

            <q-separator class="q-my-sm" />

            <!-- Total Akhir -->
            <div class="row justify-between items-center q-py-sm">
              <span class="text-subtitle2 text-weight-bold text-dark">Total Pembayaran</span>
              <span class="text-h6 text-weight-bolder text-primary">
                {{ formatCurrency(invoice.pricing?.final_price || invoice.amount) }}
              </span>
            </div>

            <div class="text-caption text-grey-6 q-mt-xs">
              Nominal harus dibayar tepat sesuai jumlah di atas agar pembayaran dapat terverifikasi secara otomatis.
            </div>

            <!-- Tombol Aksi -->
            <div class="q-mt-lg column q-gutter-sm">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="check_circle_outline"
                :label="manualCheckCooldown > 0 ? `Periksa Status (${manualCheckCooldown}s)` : 'Saya Sudah Bayar (Periksa Status)'"
                :loading="checkingStatus"
                :disable="manualCheckCooldown > 0"
                @click="checkPaymentStatus(true)"
              />

              <q-btn
                v-if="isExpired || isPaymentFailed"
                outline
                no-caps
                color="negative"
                icon="replay"
                label="Coba Lagi Pembayaran"
                :loading="initiatingCheckout"
                :disable="!isPricingConsistent"
                @click="retryCheckout"
              />

              <q-btn
                flat
                no-caps
                color="grey-8"
                label="Kembali ke Daftar Paket"
                to="/pengaturan/pembayaran"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import QRCode from 'qrcode'
import { displayApiError, larisamaApi } from '@/services/larisama-api.js'
import { newIdempotencyKey } from '@/services/api.js'

const route = useRoute()
const $q = useQuasar()

const invoiceNumber = computed(() => route.params.invoiceNumber)

const loading = ref(true)
const invoice = ref(null)
const availableMethods = ref([])
const selectedPaymentMethod = ref('qris')
const qrDataUrl = ref('')
const qrContent = ref('')
const initiatingCheckout = ref(false)
const checkingStatus = ref(false)
const errorMessage = ref('')
const pollingSession = ref(null)
const autoPollExhausted = ref(false)
const manualCheckCooldown = ref(0)
let cooldownTimer = null

const now = ref(Date.now())
let clockTimer = null
let pollTimer = null

// Default fallback metode DANA
const defaultDanaMethods = [
  { code: 'qris', name: 'QRIS (DANA)', category: 'qris', provider: 'dana', fee_label: 'Rp 0', is_primary: true, description: 'DANA, GoPay, OVO, ShopeePay, BCA, Mandiri & Mobile Banking' },
  { code: 'dana_wallet', name: 'DANA Wallet', category: 'ewallet', provider: 'dana', fee_label: 'Rp 0', is_primary: false, description: 'Bayar langsung melalui aplikasi DANA atau web checkout' },
  { code: 'va_bri', name: 'Virtual Account BRI (DANA)', category: 'virtual_account', provider: 'dana', bank: 'bri', fee_label: 'Rp 0', is_primary: false, description: 'Virtual Account Bank BRI via DANA' },
  { code: 'va_cimb', name: 'Virtual Account CIMB Niaga (DANA)', category: 'virtual_account', provider: 'dana', bank: 'cimb', fee_label: 'Rp 0', is_primary: false, description: 'Virtual Account Bank CIMB Niaga via DANA' },
  { code: 'va_btpn', name: 'Virtual Account BTPN / Jenius (DANA)', category: 'virtual_account', provider: 'dana', bank: 'btpn', fee_label: 'Rp 0', is_primary: false, description: 'Virtual Account Bank BTPN / Jenius via DANA' },
  { code: 'va_pani', name: 'Virtual Account Panin Bank (DANA)', category: 'virtual_account', provider: 'dana', bank: 'pani', fee_label: 'Rp 0', is_primary: false, description: 'Virtual Account Bank Panin via DANA' }
]

// Pengelompokan metode DANA
const qrisMethods = computed(() => availableMethods.value.filter(m => m.category === 'qris'))
const ewalletMethods = computed(() => availableMethods.value.filter(m => m.category === 'ewallet'))
const vaMethods = computed(() => availableMethods.value.filter(m => m.category === 'virtual_account'))

// Validasi konsistensi nominal harga UDEV
const isPricingConsistent = computed(() => {
  if (!invoice.value?.pricing) return true
  const pricing = invoice.value.pricing
  const normalPrice = Number(pricing.normal_price)
  const discountAmount = Number(pricing.discount_amount || 0)
  const finalPrice = Number(pricing.final_price)
  if (Number.isNaN(normalPrice) || Number.isNaN(discountAmount) || Number.isNaN(finalPrice)) return false
  if (normalPrice < 0 || discountAmount < 0 || finalPrice < 0) return false
  if (discountAmount > normalPrice) return false
  return Math.abs((normalPrice - discountAmount) - finalPrice) < 0.01
})

// Deteksi status penguncian metode pembayaran (jika checkout sebelumnya masih aktif)
const isMethodLocked = computed(() => {
  if (!invoice.value?.payment) return false
  const status = invoice.value.payment.status
  return ['initiated', 'pending'].includes(status) && !isExpired.value
})

const activeMethodCode = computed(() => {
  return invoice.value?.payment?.payment_method || selectedPaymentMethod.value
})

const activePaymentMethodDef = computed(() => {
  return availableMethods.value.find(m => m.code === activeMethodCode.value) || null
})

const activePaymentMethodLabel = computed(() => {
  return activePaymentMethodDef.value?.name || (activeMethodCode.value === 'qris' ? 'QRIS (DANA)' : activeMethodCode.value)
})

const selectedMethodName = computed(() => {
  const m = availableMethods.value.find(item => item.code === selectedPaymentMethod.value)
  return m?.name || 'Metode Pembayaran'
})

const activeCategory = computed(() => {
  if (activePaymentMethodDef.value?.category) {
    return activePaymentMethodDef.value.category
  }
  const code = activeMethodCode.value
  if (code === 'qris') return 'qris'
  if (code.startsWith('va_')) return 'virtual_account'
  if (code === 'dana_wallet') return 'ewallet'
  return 'qris'
})

const activeVaNumber = computed(() => {
  const p = invoice.value?.payment
  return p?.payment_code || p?.payment_instruction?.payment_code || ''
})

const activeRedirectUrl = computed(() => {
  return invoice.value?.payment?.checkout_url || ''
})

const hasReadyCheckout = computed(() => {
  const p = invoice.value?.payment
  if (!p) return false
  if (['failed', 'expired', 'cancelled'].includes(p.status)) return false
  if (isExpired.value) return false

  if (activeCategory.value === 'qris') {
    return Boolean(p.qr_content || qrContent.value)
  }
  if (activeCategory.value === 'virtual_account') {
    return Boolean(p.payment_code || p.payment_instruction?.payment_code)
  }
  if (activeCategory.value === 'ewallet') {
    return Boolean(p.checkout_url)
  }
  return false
})

// Hitung waktu kedaluwarsa resmi (berdasarkan checkout_expires_at atau due_at)
const expiresAtTimestamp = computed(() => {
  if (!invoice.value) return 0
  const paymentExpiry = invoice.value.payment?.checkout_expires_at
  if (paymentExpiry) {
    const parsed = new Date(paymentExpiry).getTime()
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  const dueAt = invoice.value.due_at
  if (dueAt) {
    const parsed = new Date(dueAt).getTime()
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return 0
})

const isExpired = computed(() => {
  if (!invoice.value || invoice.value.status === 'paid') return false
  if (invoice.value.status === 'expired' || invoice.value.status === 'cancelled') return true
  if (expiresAtTimestamp.value > 0 && now.value >= expiresAtTimestamp.value) return true
  return false
})

const isPaymentFailed = computed(() => {
  if (!invoice.value) return false
  const status = invoice.value.payment?.status
  return status === 'failed' || status === 'expired' || status === 'cancelled'
})

const countdownText = computed(() => {
  if (!invoice.value || invoice.value.status === 'paid') return '-'
  if (isExpired.value) return 'Kedaluwarsa'
  if (expiresAtTimestamp.value <= 0) return '-'

  const diffMs = Math.max(0, expiresAtTimestamp.value - now.value)
  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function selectMethod(code) {
  if (isMethodLocked.value) return
  selectedPaymentMethod.value = code
}

async function generateQrImage(content) {
  if (!content) {
    qrDataUrl.value = ''
    return
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(content, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
  } catch (err) {
    console.error('Gagal merender QR code:', err)
  }
}

function startCooldown(seconds = 30) {
  manualCheckCooldown.value = seconds
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  cooldownTimer = setInterval(() => {
    if (manualCheckCooldown.value > 1) {
      manualCheckCooldown.value -= 1
    } else {
      manualCheckCooldown.value = 0
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function loadPaymentMethods() {
  try {
    const methods = await larisamaApi.listSubscriptionPaymentMethods()
    if (Array.isArray(methods) && methods.length > 0) {
      availableMethods.value = methods
    } else {
      availableMethods.value = defaultDanaMethods
    }
  } catch {
    availableMethods.value = defaultDanaMethods
  }
}

async function loadInvoiceData(silent = false) {
  if (!invoiceNumber.value) return
  if (!silent) loading.value = true
  errorMessage.value = ''

  try {
    const data = await larisamaApi.getSubscriptionInvoice(invoiceNumber.value)
    invoice.value = data

    if (data.polling_session) {
      pollingSession.value = data.polling_session
      if (!data.polling_session.is_active) {
        autoPollExhausted.value = true
      }
    }

    // Jika invoice sudah memiliki pembayaran aktif, sinkronkan selectedPaymentMethod
    if (data.payment?.payment_method) {
      selectedPaymentMethod.value = data.payment.payment_method
    }

    // Jika sudah lunas, langsung reconcile dan hentikan polling
    if (data.status === 'paid') {
      stopPolling()
      try {
        await larisamaApi.reconcileSubscription()
      } catch {
        // reconcile failure handled gracefully
      }
      return
    }

    // Render instruksi yang sudah ada (QRIS / VA / E-wallet)
    const payment = data.payment
    if (payment?.qr_content || (payment?.payment_method === 'qris' && payment?.payment_code)) {
      qrContent.value = payment.qr_content || payment.payment_code
      await generateQrImage(qrContent.value)
    } else if (!isExpired.value && !payment) {
      // Belum ada checkout attempt sama sekali, siapkan checkout default
      await startCheckoutSession(selectedPaymentMethod.value)
    }
  } catch (error) {
    if (!silent) {
      errorMessage.value = displayApiError(error)
    }
  } finally {
    if (!silent) loading.value = false
  }
}

async function startCheckoutSession(method = null) {
  if (!invoice.value || initiatingCheckout.value) return
  if (!isPricingConsistent.value) {
    errorMessage.value = 'Rincian nominal invoice tidak konsisten. Checkout diblokir.'
    return
  }

  const targetMethod = method || selectedPaymentMethod.value || 'qris'
  initiatingCheckout.value = true
  errorMessage.value = ''

  try {
    const key = newIdempotencyKey()
    const result = await larisamaApi.startSubscriptionCheckout(
      invoice.value.invoice_number,
      key,
      targetMethod,
      'dana'
    )
    invoice.value = result

    if (result.payment?.payment_method) {
      selectedPaymentMethod.value = result.payment.payment_method
    }

    if (result.polling_session) {
      pollingSession.value = result.polling_session
      autoPollExhausted.value = !result.polling_session.is_active
    }

    const payment = result.payment
    if (payment?.qr_content || (payment?.payment_method === 'qris' && payment?.payment_code)) {
      qrContent.value = payment.qr_content || payment.payment_code
      await generateQrImage(qrContent.value)
    }
  } catch (error) {
    errorMessage.value = displayApiError(error)
  } finally {
    initiatingCheckout.value = false
  }
}

async function retryCheckout() {
  await startCheckoutSession(selectedPaymentMethod.value)
}

async function checkPaymentStatus(userTriggered = false) {
  if (!invoiceNumber.value || checkingStatus.value) return
  if (userTriggered && manualCheckCooldown.value > 0) return

  checkingStatus.value = true
  if (userTriggered) {
    errorMessage.value = ''
    startCooldown(30)
  }

  try {
    // Panggil dengan flag reconcile=true agar UDEV Billing memeriksa gateway langsung
    const data = await larisamaApi.getSubscriptionInvoice(invoiceNumber.value, true, false)
    invoice.value = data

    if (data.polling_session) {
      pollingSession.value = data.polling_session
      if (!data.polling_session.is_active) {
        autoPollExhausted.value = true
      }
    }

    if (data.status === 'paid') {
      stopPolling()
      try {
        await larisamaApi.reconcileSubscription()
      } catch {
        // reconcile failure handled gracefully
      }
      $q.notify({
        type: 'positive',
        message: 'Pembayaran langganan berhasil diverifikasi dan masa aktif warung telah diperbarui.',
        icon: 'check_circle',
        timeout: 5000
      })
    } else if (userTriggered) {
      $q.notify({
        type: 'info',
        message: 'Status pembayaran belum berubah. Silakan selesaikan pembayaran dan periksa kembali.',
        icon: 'hourglass_empty',
        timeout: 3000
      })
    }
  } catch (error) {
    if (userTriggered) {
      errorMessage.value = displayApiError(error)
    }
  } finally {
    checkingStatus.value = false
  }
}

function startPolling() {
  stopPolling()
  // Polling berkala setiap 10 detik sesuai standar Tahap 1.1
  pollTimer = setInterval(async () => {
    if (autoPollExhausted.value || isExpired.value || invoice.value?.status === 'paid') {
      stopPolling()
      return
    }

    // Periksa status polling dari backend (dengan polling=true)
    try {
      const data = await larisamaApi.getSubscriptionInvoice(invoiceNumber.value, false, true)
      invoice.value = data

      if (data.polling_session) {
        pollingSession.value = data.polling_session
        if (!data.polling_session.is_active) {
          autoPollExhausted.value = true
          stopPolling()
        }
      }

      if (data.status === 'paid') {
        stopPolling()
        try {
          await larisamaApi.reconcileSubscription()
        } catch {
          // graceful reconcile
        }
        $q.notify({
          type: 'positive',
          message: 'Pembayaran langganan berhasil diverifikasi dan masa aktif warung telah diperbarui.',
          icon: 'check_circle',
          timeout: 5000
        })
      }
    } catch {
      // Background polling silent error
    }
  }, 10000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling()
  } else if (invoice.value && invoice.value.status !== 'paid' && !autoPollExhausted.value && !isExpired.value) {
    void loadInvoiceData(true)
    startPolling()
  }
}

function downloadQrCode() {
  if (!qrDataUrl.value) return
  const link = document.createElement('a')
  link.download = `qris-${invoiceNumber.value}.png`
  link.href = qrDataUrl.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  $q.notify({
    type: 'positive',
    message: 'Kode QRIS berhasil diunduh.',
    icon: 'download_done',
    timeout: 2000
  })
}

function copyText(text, successMsg = 'Teks disalin ke clipboard') {
  if (!text) return
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      $q.notify({
        type: 'positive',
        message: successMsg,
        icon: 'content_copy',
        timeout: 2000
      })
    }).catch(() => {
      legacyCopy(text, successMsg)
    })
  } else {
    legacyCopy(text, successMsg)
  }
}

function legacyCopy(text, successMsg) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    $q.notify({
      type: 'positive',
      message: successMsg,
      icon: 'content_copy',
      timeout: 2000
    })
  } catch {
    $q.notify({
      type: 'warning',
      message: 'Gagal menyalin teks secara otomatis. Silakan salin manual.',
      icon: 'warning'
    })
  } finally {
    document.body.removeChild(textarea)
  }
}

function formatCurrency(amount, currency = 'IDR') {
  const numeric = Number(amount || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 0
  }).format(numeric)
}

function formatDate(isoString) {
  if (!isoString) return '-'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

onMounted(async () => {
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  await loadPaymentMethods()
  await loadInvoiceData()

  if (invoice.value && invoice.value.status !== 'paid' && !isExpired.value) {
    startPolling()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onBeforeUnmount(() => {
  stopPolling()
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})
</script>

<style scoped>
.checkout-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-heading {
  margin-bottom: 24px;
}

.eyebrow {
  color: #71847b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.page-title {
  margin: 0;
  color: #104f39;
  font-size: 26px;
  font-weight: 700;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #718078;
  font-size: 13px;
}

.method-selection-card,
.instruction-card,
.summary-card,
.paid-success-card {
  border-radius: 12px;
  border-color: #dbe5e0;
}

.method-item {
  border: 1px solid #eef2f0;
  transition: all 0.2s ease;
}

.method-item:hover {
  border-color: #cbdad2;
}

.qr-box {
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.qr-image {
  width: 260px;
  height: 260px;
  display: block;
}

.va-display-card {
  border: 1px solid #e2e8e5;
}

.font-mono {
  font-family: monospace;
}

.instruction-list li {
  margin-bottom: 6px;
  line-height: 1.4;
}
</style>
