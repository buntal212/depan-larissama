<template>
  <q-page class="page-shell">
    <div class="page-heading history-page-heading no-print">
      <div class="history-heading-copy">
        <div class="eyebrow">KASIR WARUNG</div>
        <h1 class="page-title">Riwayat penjualan</h1>
        <p class="page-subtitle">Lihat transaksi kasir dan rincian itemnya.</p>
      </div>
      <div class="history-heading-actions no-print">
        <q-btn-dropdown outline no-caps icon="print" label="Ekspor riwayat" :disable="loading || !filteredSales.length">
          <q-list dense style="min-width: 200px">
            <q-item clickable v-close-popup @click="printHistory"><q-item-section avatar><q-icon name="print" /></q-item-section><q-item-section>Cetak riwayat</q-item-section></q-item>
            <q-item clickable v-close-popup @click="saveHistoryPdf"><q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section><q-item-section>Download PDF</q-item-section></q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn unelevated no-caps color="primary" icon="point_of_sale" label="Buka kasir" to="/transaksi" />
      </div>
    </div>
    <q-card flat bordered class="panel-card no-print">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="search"
            outlined
            dense
            clearable
            placeholder="Cari nomor transaksi..."
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="paymentStatusFilter"
            outlined
            dense
            emit-value
            map-options
            label="Status pembayaran"
            :options="[
              { label: 'Semua', value: '' },
              { label: 'Belum lunas', value: 'belum_lunas' },
              { label: 'Lunas', value: 'lunas' },
            ]"
            @update:model-value="loadSales"
          />
        </div>
        <div class="col-auto"><q-chip class="demo-chip">Data server</q-chip></div>
      </q-card-section>
      <q-card-section class="row items-end q-col-gutter-md q-pt-none">
        <div class="col-12 col-sm-4">
          <q-input v-model="dateFrom" outlined dense type="date" label="Dari tanggal" />
        </div>
        <div class="col-12 col-sm-4">
          <q-input v-model="dateTo" outlined dense type="date" label="Sampai tanggal" />
        </div>
        <div class="col-12 col-sm-4 row q-gutter-sm">
          <q-btn unelevated no-caps color="primary" icon="filter_alt" label="Terapkan" :loading="loading" @click="applyDateFilter" />
        </div>
      </q-card-section>
      <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mx-md q-mb-md">{{
        loadError
      }}</q-banner>
      <q-card-section class="history-total row items-center justify-between">
        <div><strong>Total nilai transaksi tampil</strong><div class="panel-caption">Transaksi batal dikecualikan; pesanan belum lunas tetap masuk. Nilai retur belum dikurangi.</div></div>
        <div class="history-total-value">{{ visibleSalesTotal }}</div>
      </q-card-section>
      <q-table
        flat
        :rows="filteredSales"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        :grid="$q.screen.lt.sm"
        no-data-label="Belum ada transaksi."
      >
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered class="sales-mobile-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <strong>{{ props.row.no_transaksi }}</strong
                  ><q-badge :color="props.row.status === 'selesai' ? 'positive' : 'grey-6'">{{
                    props.row.status
                  }}</q-badge>
                </div>
                <div class="panel-caption q-mt-sm">
                  {{ formatDate(props.row.tanggal || props.row.created_at) }} ·
                  {{ paymentLabel(props.row.metode_pembayaran) }}
                </div>
                <div class="sale-mobile-total">{{ formatPrice(props.row.total) }}</div>
                <div class="row justify-end">
                  <q-btn
                    flat
                    no-caps
                    dense
                    icon="visibility"
                    label="Detail"
                    @click="openDetails(props.row)"
                  />
                  <q-btn
                    v-if="canEditPending(props.row)"
                    flat
                    round
                    dense
                    icon="edit"
                    aria-label="Edit pesanan belum lunas"
                    @click="openMutation(props.row, 'correction')"
                  />
                  <q-btn
                    v-if="canCancel(props.row)"
                    flat
                    round
                    dense
                    color="negative"
                    icon="block"
                    aria-label="Batalkan transaksi"
                    @click="openMutation(props.row, 'cancellation')"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        <template #body="props">
          <q-tr :props="props">
            <q-td key="no_transaksi" :props="props">{{ props.row.no_transaksi }}</q-td>
            <q-td key="tanggal" :props="props">{{
              formatDate(props.row.tanggal || props.row.created_at)
            }}</q-td>
            <q-td key="metode_pembayaran" :props="props">{{
              paymentLabel(props.row.metode_pembayaran)
            }}</q-td>
            <q-td key="total" :props="props" class="text-weight-bold">{{
              formatPrice(props.row.total)
            }}</q-td>
            <q-td key="status" :props="props"
              ><q-badge :color="props.row.status === 'selesai' ? 'positive' : 'grey-6'">{{
                props.row.status
              }}</q-badge></q-td
            >
            <q-td key="actions" :props="props">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                aria-label="Lihat rincian transaksi"
                @click.stop="openDetails(props.row)"
              />
              <q-btn
                v-if="canEditPending(props.row)"
                flat
                round
                dense
                icon="edit"
                aria-label="Edit pesanan belum lunas"
                @click.stop="openMutation(props.row, 'correction')"
              />
              <q-btn
                v-if="canCancel(props.row)"
                flat
                round
                dense
                color="negative"
                icon="block"
                aria-label="Batalkan transaksi"
                @click.stop="openMutation(props.row, 'cancellation')"
              />
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>

    <section class="history-print">
      <header class="history-print-heading document-print-heading">
        <div class="document-header-row">
          <div class="document-store-brand">
            <img v-if="authSession.warung?.logo" :src="authSession.warung.logo" :alt="`Logo ${authSession.warung?.nama || 'warung'}`" />
            <div><strong>{{ authSession.warung?.nama || 'Larisama' }}</strong><span v-if="authSession.warung?.alamat">{{ authSession.warung.alamat }}</span><span v-if="authSession.warung?.telepon">{{ authSession.warung.telepon }}</span></div>
          </div>
          <div class="document-info"><h1>Riwayat Penjualan</h1><p>Periode {{ formatPeriodDate(appliedDateFrom) }} – {{ formatPeriodDate(appliedDateTo) }}</p></div>
        </div>
        <p class="document-print-notes">{{ filteredSales.length }} transaksi. Transaksi batal dikecualikan; pesanan belum lunas tetap masuk. Nilai retur belum dikurangi.</p>
      </header>
      <table class="history-print-table"><thead><tr><th>No. transaksi / tanggal</th><th>Pembayaran</th><th>Status bayar</th><th>Total</th></tr></thead><tbody><tr v-for="sale in filteredSales" :key="sale.id"><td><strong>{{ sale.no_transaksi }}</strong><br />{{ formatDate(sale.tanggal || sale.created_at) }}</td><td>{{ paymentLabel(sale.metode_pembayaran) }}</td><td>{{ sale.status_pembayaran === 'belum_lunas' ? 'Belum lunas' : 'Lunas' }}</td><td class="print-money">{{ formatPrice(sale.total) }}</td></tr></tbody><tfoot><tr><th colspan="3">Total nilai transaksi tampil</th><th class="print-money">{{ visibleSalesTotal }}</th></tr></tfoot></table>
    </section>

    <q-dialog v-model="detailOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header">
          <div class="dialog-header-copy">
            <div class="dialog-eyebrow">DETAIL TRANSAKSI</div>
            <div class="text-h6 dialog-title">{{ selectedSale?.no_transaksi }}</div>
            <div class="dialog-subtitle">
              {{ formatDate(selectedSale?.tanggal || selectedSale?.created_at) }}
            </div>
          </div>
          <q-btn
            class="dialog-header-close"
            flat
            round
            dense
            icon="close"
            aria-label="Tutup"
            @click="detailOpen = false"
          />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="selectedSale">
          <q-list separator>
            <q-item v-for="(line, index) in selectedSale.rincian" :key="`${line.menu_id}-${index}`">
              <q-item-section
                ><q-item-label>{{ line.nama_menu }}</q-item-label
                ><q-item-label caption
                  >{{ line.qty }} × {{ formatPrice(line.harga) }}</q-item-label
                ></q-item-section
              >
              <q-item-section side>{{ formatPrice(line.subtotal) }}</q-item-section>
            </q-item>
          </q-list>
          <q-separator class="q-my-md" />
          <div class="sale-total-row">
            <span>Subtotal</span><strong>{{ formatPrice(selectedSale.subtotal) }}</strong>
          </div>
          <div class="sale-total-row">
            <span>Diskon</span><strong>{{ formatPrice(selectedSale.diskon) }}</strong>
          </div>
          <div class="sale-total-row sale-grand-total">
            <span>Total</span><strong>{{ formatPrice(selectedSale.total) }}</strong>
          </div>
          <q-banner
            v-if="selectedSale.status_pembayaran === 'belum_lunas'"
            rounded
            class="bg-orange-1 text-grey-9 q-mb-md"
            >Pesanan ini belum lunas.</q-banner
          >
          <div class="sale-total-row">
            <span>Metode</span><strong>{{ paymentLabel(selectedSale.metode_pembayaran) }}</strong>
          </div>
          <div class="sale-total-row">
            <span>Dibayar</span><strong>{{ formatPrice(selectedSale.bayar) }}</strong>
          </div>
          <div class="sale-total-row">
            <span>Kembalian</span><strong>{{ formatPrice(selectedSale.kembalian) }}</strong>
          </div>
          <p v-if="selectedSale.catatan" class="panel-caption q-mt-md">
            Catatan: {{ selectedSale.catatan }}
          </p>
          <div class="demo-disclaimer">Rincian dan nominal transaksi berasal dari server.</div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat no-caps label="Tutup" @click="detailOpen = false" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="print"
            label="Cetak"
            :disable="!selectedSale"
            @click="openReceipt"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="mutationOpen">
      <q-card class="product-form-dialog">
        <q-card-section class="dialog-header"
          ><div class="dialog-header-copy">
            <div class="dialog-eyebrow">PENJUALAN</div>
            <div class="text-h6 dialog-title">{{ mutationTitle }}</div>
            <div class="dialog-subtitle">
              {{ selectedSale?.no_transaksi }} · perubahan dicatat di server
            </div>
          </div>
          <q-btn
            class="dialog-header-close"
            flat
            round
            dense
            icon="close"
            aria-label="Tutup"
            @click="mutationOpen = false"
        /></q-card-section>
        <q-separator />
        <q-form class="q-pa-lg pending-sale-edit-form" @submit.prevent="submitMutation()">
          <template v-if="mutationType === 'correction'">
            <q-input v-model="mutationForm.date" outlined type="date" label="Tanggal transaksi" />
            <q-input
              v-model.trim="mutationForm.customer"
              outlined
              maxlength="150"
              label="Nama pelanggan (opsional)"
            />
            <q-input
              v-model.trim="mutationForm.note"
              outlined
              type="textarea"
              autogrow
              label="Catatan transaksi"
            />
            <CurrencyInput v-model="mutationForm.discount" label="Diskon transaksi" min="0" />
            <div class="pending-lines-heading">
              <strong>Rincian pesanan</strong>
              <span class="panel-caption">Harga dan total dihitung ulang oleh server.</span>
            </div>
            <div
              v-for="(line, index) in mutationForm.lines"
              :key="line.key"
              class="pending-sale-line"
            >
              <q-select
                v-model="line.menu_id"
                outlined
                emit-value
                map-options
                label="Menu"
                :options="menuOptionsFor(line)"
              />
              <q-input
                v-model.number="line.qty"
                outlined
                type="number"
                min="0.01"
                step="0.01"
                label="Jumlah"
              />
              <CurrencyInput v-model="line.discount" label="Diskon item" min="0" />
              <q-input
                v-model.trim="line.note"
                outlined
                type="textarea"
                autogrow
                maxlength="1000"
                label="Catatan item (opsional)"
              />
              <q-btn
                v-if="mutationForm.lines.length > 1"
                flat
                round
                dense
                color="negative"
                icon="delete_outline"
                aria-label="Hapus rincian"
                @click="removePendingLine(index)"
              />
            </div>
            <q-btn
              flat
              no-caps
              color="primary"
              icon="add"
              label="Tambah menu"
              @click="addPendingLine"
            />
          </template>
          <q-input
            v-model.trim="mutationForm.reason"
            outlined
            type="textarea"
            autogrow
            maxlength="1000"
            label="Alasan (wajib)"
            :rules="[(value) => !!value.trim() || 'Alasan wajib diisi']"
          />
          <div class="demo-disclaimer">
            Pesanan belum lunas dapat diubah. Pelunasan dilakukan setelah perubahan disimpan.
          </div>
          <div class="row justify-end q-gutter-sm q-mt-lg">
            <q-btn flat no-caps label="Kembali" @click="mutationOpen = false" />
            <q-btn
              v-if="mutationType === 'correction'"
              flat
              no-caps
              color="primary"
              icon="payments"
              label="Lanjut pelunasan"
              :loading="savingMutation"
              type="button"
              @click="settlePendingSale"
            />
            <q-btn
              unelevated
              no-caps
              :color="mutationType === 'cancellation' ? 'negative' : 'primary'"
              :label="mutationType === 'correction' ? 'Simpan perubahan' : 'Batalkan transaksi'"
              :loading="savingMutation"
              type="submit"
            />
          </div>
        </q-form>
      </q-card>
    </q-dialog>

    <CheckoutDialog
      v-model="paymentOpen"
      :subtotal="Number(selectedSale?.total || 0)"
      :allow-discount="false"
      @confirm="paySelectedSale"
    />
    <ReceiptDialog
      v-model="receiptOpen"
      :sale="selectedSale"
      :warung="authSession.warung"
      :cashier-name="authSession.user?.nama"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import CurrencyInput from '@/components/CurrencyInput.vue'
import CheckoutDialog from '@/pages/Kasir/components/CheckoutDialog.vue'
import ReceiptDialog from '@/pages/Kasir/components/ReceiptPrintDialog.vue'
import { authSession } from '@/stores/auth-session.js'
import { newIdempotencyKey } from '@/services/api.js'
import { categories, products } from '@/stores/catalog.js'
import { downloadPdfReport, printPdfReport } from '@/services/pdf-export.js'
import {
  createLocalDayTimestamp,
  displayApiError,
  larisamaApi,
  toMoney,
  toQuantity,
} from '@/services/larisama-api.js'

const $q = useQuasar()
const router = useRouter()
const search = ref('')
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: authSession.warung?.timezone || 'Asia/Jakarta',
}).format(new Date())
const dateFrom = ref(today)
const dateTo = ref(today)
const appliedDateFrom = ref(today)
const appliedDateTo = ref(today)
const detailOpen = ref(false)
const paymentOpen = ref(false)
const receiptOpen = ref(false)
const paymentStatusFilter = ref('')
const selectedSale = ref(null)
const mutationOpen = ref(false)
const mutationType = ref('correction')
const savingMutation = ref(false)
const loading = ref(false)
const loadError = ref('')
const sales = ref([])
const pendingMutation = ref(null)
const mutationOriginal = ref(null)
const nextLineKey = ref(0)
const mutationForm = reactive({
  date: '',
  customer: '',
  note: '',
  discount: 0,
  reason: '',
  lines: [],
})
const canPayPending = computed(() =>
  ['owner', 'manager', 'kasir', 'superadmin'].includes(authSession.user?.role),
)
const activeMenuOptions = computed(() =>
  products.value
    .filter(
      (product) =>
        product.available &&
        categories.value.some((category) => category.id === product.categoryId && category.active),
    )
    .map((product) => ({ label: product.name, value: String(product.id) })),
)
const paymentAttempt = ref(null)
const columns = [
  {
    name: 'no_transaksi',
    label: 'No. transaksi',
    field: 'no_transaksi',
    align: 'left',
    sortable: true,
  },
  {
    name: 'tanggal',
    label: 'Tanggal',
    field: (row) => row.tanggal || row.created_at,
    align: 'left',
    sortable: true,
  },
  { name: 'metode_pembayaran', label: 'Pembayaran', field: 'metode_pembayaran', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'right' },
]
const filteredSales = computed(() =>
  sales.value.filter((sale) =>
    sale.no_transaksi.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
)
const visibleSalesTotal = computed(() => exactMoneySum(filteredSales.value.filter((sale) => sale.status !== 'batal')))
const mutationTitle = computed(
  () =>
    ({
      correction: 'Edit pesanan belum lunas',
      cancellation: 'Batalkan transaksi',
    })[mutationType.value],
)

async function loadSales() {
  loading.value = true
  loadError.value = ''
  try {
    sales.value = await larisamaApi.listSales({
      sort: '-tanggal',
      status_pembayaran: paymentStatusFilter.value,
      date_from: appliedDateFrom.value || undefined,
      date_to: appliedDateTo.value || undefined,
    })
  } catch (error) {
    loadError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: loadError.value, position: 'top' })
  } finally {
    loading.value = false
  }
}

function applyDateFilter() {
  if (Boolean(dateFrom.value) !== Boolean(dateTo.value)) {
    $q.notify({ type: 'warning', message: 'Isi kedua tanggal untuk memfilter riwayat.' })
    return
  }
  if (dateFrom.value && dateFrom.value > dateTo.value) {
    $q.notify({ type: 'warning', message: 'Tanggal awal tidak boleh melewati tanggal akhir.' })
    return
  }
  appliedDateFrom.value = dateFrom.value
  appliedDateTo.value = dateTo.value
  loadSales()
}

onMounted(loadSales)

async function paySelectedSale(payment) {
  if (!selectedSale.value || !canPayPending.value) return
  const body = { bayar: toMoney(payment.paid), metode_pembayaran: payment.method }
  const fingerprint = JSON.stringify(body)
  if (
    paymentAttempt.value?.saleId !== selectedSale.value.id ||
    paymentAttempt.value.fingerprint !== fingerprint
  ) {
    paymentAttempt.value = { saleId: selectedSale.value.id, fingerprint, key: newIdempotencyKey() }
  }
  try {
    selectedSale.value = await larisamaApi.paySale(
      selectedSale.value.id,
      body,
      paymentAttempt.value.key,
    )
    paymentAttempt.value = null
    paymentOpen.value = false
    await loadSales()
    selectedSale.value = await larisamaApi.getSale(selectedSale.value.id)
    receiptOpen.value = true
    $q.notify({ type: 'positive', message: 'Pembayaran berhasil dicatat.', position: 'top' })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
}

async function openDetails(sale) {
  selectedSale.value = sale
  detailOpen.value = true
  try {
    selectedSale.value = await larisamaApi.getSale(sale.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
}
function openReceipt() {
  if (!selectedSale.value) return
  detailOpen.value = false
  receiptOpen.value = true
}
function canEditPending(sale) {
  return (
    ['owner', 'manager', 'kasir', 'superadmin'].includes(authSession.user?.role) &&
    sale.status === 'menunggu_pembayaran' &&
    sale.status_pembayaran === 'belum_lunas'
  )
}
function canCancel(sale) {
  const role = authSession.user?.role
  const allowedRoles = ['owner', 'manager', 'kasir', 'superadmin']
  if (!allowedRoles.includes(role)) return false

  if (sale.status === 'menunggu_pembayaran' && sale.status_pembayaran === 'belum_lunas') {
    return true
  }

  if (sale.status !== 'selesai' || sale.status_pembayaran !== 'lunas') return false
  if (!['owner', 'manager', 'superadmin'].includes(role)) return false
  if (role === 'superadmin') return true

  const paidAt = sale.dibayar_pada || sale.created_at || sale.tanggal
  return Date.now() - new Date(paidAt).getTime() <= 72 * 60 * 60 * 1000
}
function menuOptionsFor(line) {
  const options = [...activeMenuOptions.value]
  if (!options.some((option) => option.value === String(line.menu_id))) {
    options.unshift({
      label: `${line.menu_name || 'Menu'} (nonaktif/tidak tersedia)`,
      value: String(line.menu_id),
      disable: true,
    })
  }
  return options
}
function createPendingLine(line = {}) {
  return {
    key: `sale-line-${nextLineKey.value++}`,
    menu_id: String(line.menu_id || ''),
    menu_name: line.nama_menu || '',
    qty: Number(line.qty || 1),
    discount: Number(line.diskon || 0),
    note: line.catatan || '',
  }
}
function addPendingLine() {
  mutationForm.lines.push(createPendingLine({ menu_id: activeMenuOptions.value[0]?.value }))
}
function removePendingLine(index) {
  mutationForm.lines.splice(index, 1)
}
async function openMutation(sale, type) {
  if (type === 'correction') {
    await router.push({ path: '/transaksi', query: { edit: sale.id } })
    return
  }
  try {
    selectedSale.value = await larisamaApi.getSale(sale.id)
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
    return
  }
  mutationType.value = type
  mutationForm.reason = ''
  pendingMutation.value = null
  mutationOpen.value = true
}

function pendingSaleChanges() {
  const original = mutationOriginal.value
  if (!selectedSale.value || !original) return null
  const body = { alasan: mutationForm.reason.trim() }
  if (mutationForm.date !== original.date)
    body.tanggal = createLocalDayTimestamp(mutationForm.date, authSession.warung?.timezone)
  const customer = mutationForm.customer.trim()
  if (customer !== original.customer) body.nama_pelanggan = customer || null
  const note = mutationForm.note.trim()
  if (note !== original.note) body.catatan = note || null
  const discount = toMoney(mutationForm.discount || 0)
  if (discount !== original.discount) body.diskon = discount

  const lines = mutationForm.lines.map((line) => ({
    menu_id: String(line.menu_id),
    qty: toQuantity(line.qty),
    diskon: toMoney(line.discount || 0),
    catatan: line.note.trim() || null,
  }))
  if (JSON.stringify(lines) !== JSON.stringify(original.lines)) {
    const activeMenuIds = new Set(activeMenuOptions.value.map((option) => option.value))
    if (lines.some((line) => !activeMenuIds.has(line.menu_id))) {
      $q.notify({
        type: 'warning',
        message: 'Pilih menu aktif untuk semua rincian sebelum menyimpan perubahan item.',
        position: 'top',
      })
      return null
    }
    body.rincian = lines
  }
  return body
}

async function settlePendingSale() {
  if (!selectedSale.value || savingMutation.value) return
  const body = pendingSaleChanges()
  if (!body) return
  const hasChanges = Object.keys(body).length > 1
  if (hasChanges && !body.alasan) {
    $q.notify({ type: 'warning', message: 'Isi alasan perubahan sebelum melanjutkan pelunasan.' })
    return
  }
  if (hasChanges) {
    await submitMutation(true, body)
    return
  }
  mutationOpen.value = false
  paymentOpen.value = true
}

async function submitMutation(settleAfterSave = false, preparedBody = null) {
  if (!selectedSale.value || savingMutation.value) return
  let body
  if (mutationType.value === 'correction') {
    body = preparedBody || pendingSaleChanges()
    if (!body) return
    if (Object.keys(body).length === 1) {
      $q.notify({ type: 'warning', message: 'Belum ada perubahan pada pesanan.' })
      return
    }
    if (!body.alasan) {
      $q.notify({ type: 'warning', message: 'Isi alasan perubahan terlebih dahulu.' })
      return
    }
    if (
      mutationForm.lines.length === 0 ||
      mutationForm.lines.some(
        (line) => !line.menu_id || !Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0,
      )
    ) {
      $q.notify({ type: 'warning', message: 'Lengkapi menu dan jumlah pada setiap rincian.' })
      return
    }
  } else {
    if (!mutationForm.reason.trim()) {
      $q.notify({ type: 'warning', message: 'Isi alasan pembatalan terlebih dahulu.' })
      return
    }
    body = { alasan: mutationForm.reason.trim() }
  }
  const fingerprint = `${mutationType.value}:${selectedSale.value.id}:${JSON.stringify(body)}`
  if (pendingMutation.value?.fingerprint !== fingerprint)
    pendingMutation.value = { fingerprint, key: newIdempotencyKey() }
  savingMutation.value = true
  try {
    if (mutationType.value === 'correction') {
      await larisamaApi.correctSale(selectedSale.value.id, body, pendingMutation.value.key)
      pendingMutation.value = null
      selectedSale.value = await larisamaApi.getSale(selectedSale.value.id)
    } else {
      await larisamaApi.cancelSale(selectedSale.value.id, body, pendingMutation.value.key)
    }
    mutationOpen.value = false
    pendingMutation.value = null
    await loadSales()
    if (settleAfterSave) {
      paymentOpen.value = true
      $q.notify({ type: 'positive', message: 'Perubahan tersimpan. Lanjutkan pelunasan.' })
    } else {
      $q.notify({ type: 'positive', message: 'Perubahan pesanan tersimpan.' })
    }
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingMutation.value = null
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    savingMutation.value = false
  }
}
function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}
function exactMoneySum(rows) {
  const cents = rows.reduce((total, row) => total + moneyToCents(row.total), 0n)
  const negative = cents < 0n
  const absolute = negative ? -cents : cents
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const fraction = (absolute % 100n).toString().padStart(2, '0')
  return `Rp ${negative ? '-' : ''}${whole},${fraction}`
}
function moneyToCents(value) {
  const source = String(value ?? '0')
  const negative = source.startsWith('-')
  const [whole = '0', fraction = ''] = source.replace(/^-/, '').split('.')
  const cents = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2) || '0')
  return negative ? -cents : cents
}
function printHistory() { printPdfReport(salesHistoryPdfOptions()) }
function saveHistoryPdf() { downloadPdfReport(salesHistoryPdfOptions()) }
function salesHistoryPdfOptions() {
  return {
    filename: `riwayat-penjualan-${appliedDateFrom.value}-${appliedDateTo.value}`,
    title: 'Riwayat Penjualan',
    subtitle: `Periode ${formatPeriodDate(appliedDateFrom.value)} - ${formatPeriodDate(appliedDateTo.value)}`,
    warung: authSession.warung,
    sections: [{
      title: 'Daftar transaksi',
      headers: ['No. transaksi / tanggal', 'Pembayaran', 'Status bayar', 'Total'],
      columnWidths: [76, 34, 32, 40],
      rows: filteredSales.value.map((sale) => [
        `${sale.no_transaksi}\n${formatDate(sale.tanggal || sale.created_at)}`,
        paymentLabel(sale.metode_pembayaran),
        sale.status_pembayaran === 'belum_lunas' ? 'Belum lunas' : 'Lunas',
        formatPrice(sale.total),
      ]),
      foot: ['Total nilai transaksi tampil', '', '', visibleSalesTotal.value],
    }],
  }
}
function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}
function formatPeriodDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: authSession.warung?.timezone || 'Asia/Jakarta' }).format(new Date(`${value}T00:00:00`))
    : '—'
}
function paymentLabel(value) {
  return { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }[value] || '—'
}
</script>

<style scoped>
.sale-total-row {
  display: flex;
  justify-content: space-between;
  margin: 9px 0;
  color: #66766c;
}
.sale-total-row strong {
  color: #263c31;
}
.sale-grand-total {
  padding-top: 10px;
  border-top: 1px solid #e9eeea;
  font-size: 16px;
}
.sale-mobile-total {
  margin: 8px 0 2px;
  color: #176342;
  font-size: 18px;
  font-weight: 800;
}
.pending-sale-edit-form {
  max-height: min(78dvh, 900px);
  overflow-y: auto;
}
.pending-lines-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 18px 0 10px;
}
.pending-sale-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(100px, 0.45fr);
  gap: 8px;
  align-items: start;
  margin: 12px 0;
  padding: 12px;
  border: 1px solid #e5ebe6;
  border-radius: 12px;
}
.pending-sale-line > :first-child,
.pending-sale-line > :nth-child(4) {
  grid-column: 1 / -1;
}
.pending-sale-line > :last-child {
  justify-self: end;
}
.history-total { border-top: 1px solid #e7ece8; border-bottom: 1px solid #e7ece8; gap: 12px; }
.history-total-value { color: #1d5439; font-size: 19px; font-weight: 800; text-align: right; }
.history-print { display: none; }
@media print {
  :global(body), :global(#q-app), :global(.q-layout), :global(.q-page-container) { width: auto !important; min-width: 0 !important; height: auto !important; overflow: visible !important; background: white !important; }
  :global(.q-header), :global(.q-drawer), :global(.q-footer), :global(.no-print), :global(.q-dialog) { display: none !important; }
  :global(.q-page-container) { padding: 0 !important; }
  .page-shell { display: block !important; min-height: 0 !important; padding: 0 !important; }
  .history-print { display: block !important; color: #17231b; }
  .history-print-heading { margin-bottom: 16px; }
  .history-print-heading h1 { margin: 0 0 8px; font-size: 22px; }
  .history-print-heading p { margin: 3px 0; }
  .history-print-table { box-sizing: border-box; width: calc(100% - 8mm); max-width: calc(100% - 8mm); table-layout: fixed; border-collapse: collapse; font-size: 12pt; }
  .history-print-table th, .history-print-table td { box-sizing: border-box; min-width: 0; padding: 4px 3px; border: 1px solid #bbc7bf; text-align: left; vertical-align: middle; overflow-wrap: anywhere; word-break: break-word; white-space: normal !important; }
  .history-print-table th { text-align: center; }
  .history-print-table th:nth-child(1), .history-print-table td:nth-child(1) { width: 42%; }
  .history-print-table th:nth-child(2), .history-print-table td:nth-child(2) { width: 18%; }
  .history-print-table th:nth-child(3), .history-print-table td:nth-child(3) { width: 18%; }
  .history-print-table th:nth-child(4), .history-print-table td:nth-child(4) { width: 22%; }
  .history-print-table .print-money { text-align: right; }
  .history-print-table tfoot th { font-weight: 800; }
  @page { size: A4 portrait; margin: 10mm; }
}
</style>
