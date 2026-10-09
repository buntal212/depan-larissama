<template>
  <q-page class="page-shell transaction-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KASIR WARUNG</div>
        <h1 class="page-title">{{ editingSale ? 'Edit pesanan' : 'Pesanan baru' }}</h1>
        <p class="page-subtitle">{{ editingSale ? editingSale.no_transaksi : 'Pilih menu untuk mulai mencatat pesanan.' }}</p>
      </div>
      <div class="col-auto"><q-chip class="demo-chip"><span class="status-dot"></span> Kasir tersambung</q-chip></div>
    </div>
    <q-banner v-if="editingSale" rounded class="q-mb-md bg-orange-1 text-grey-9">
      <div class="row items-center q-gutter-sm">
        <span>Mode edit pesanan belum lunas. Perubahan item wajib disertai alasan.</span>
        <q-space />
        <q-btn flat no-caps label="Kembali" @click="cancelEdit" />
      </div>
    </q-banner>
    <q-banner v-if="editError" rounded class="q-mb-md bg-red-1 text-negative">{{ editError }}</q-banner>
    <q-banner v-if="loadError" rounded class="q-mb-md bg-red-1 text-negative">{{ loadError }}</q-banner>
    <q-banner v-else-if="catalogState.loading" rounded class="q-mb-md bg-green-1 text-primary">Memuat menu...</q-banner>

    <div class="pos-grid">
      <section class="pos-menu-column">
        <q-input v-model="search" outlined dense clearable placeholder="Cari menu..." class="pos-search">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-tabs v-model="activeCategory" dense no-caps align="left" indicator-color="primary" active-color="primary" class="category-tabs pos-category-tabs">
          <q-tab v-for="category in productCategories" :key="category" :name="category" :label="category" />
        </q-tabs>
        <div class="pos-product-grid">
          <button v-for="product in filteredProducts" :key="product.id" class="pos-product" :disabled="!product.available" @click="addToCart(product)">
            <div class="pos-product-art" :class="`art-${product.color || 'mint'}`"><q-icon :name="product.icon || 'restaurant'" /></div>
            <span class="pos-product-name">{{ product.name }}</span>
            <span class="pos-product-price">{{ formatPrice(product.price) }}</span>
            <span v-if="!product.available" class="pos-product-sold">Nonaktif</span>
            <span v-else-if="cartQuantityFor(product.id)" class="pos-product-quantity">{{ cartQuantityFor(product.id) }}</span>
          </button>
          <div v-if="filteredProducts.length === 0" class="pos-empty">Menu tidak ditemukan.</div>
        </div>
      </section>

      <OrderCart
        class="desktop-order-cart"
        :cart="cart"
        :cart-quantity="cartQuantity"
        :subtotal="subtotal"
        :editing="Boolean(editingSale)"
        :has-changes="editHasChanges"
        :saving="savingEdit"
        :reason="editReason"
        @change-quantity="changeQuantity"
        @clear="clearCart"
        @checkout="editingSale ? startEditPayment() : (checkoutOpen = true)"
        @save-edit="saveEditOnly"
        @update:reason="editReason = $event"
      />
    </div>

    <div v-if="cart.length && !cartOpen" class="mobile-cart-bar">
      <q-btn unelevated no-caps class="mobile-cart-button" aria-label="Buka keranjang pesanan" @click="cartOpen = true">
        <span class="mobile-cart-icon"><q-icon name="shopping_basket" /><q-badge floating rounded>{{ cartQuantity }}</q-badge></span>
        <span class="mobile-cart-copy"><strong>Lihat pesanan</strong><small>{{ cartQuantity }} item dalam keranjang</small></span>
        <q-space />
        <strong class="mobile-cart-total">{{ formatPrice(subtotal) }}</strong>
        <q-icon name="chevron_right" class="mobile-cart-chevron" />
      </q-btn>
    </div>

    <q-dialog v-model="cartOpen" position="bottom" class="mobile-cart-dialog">
      <OrderCart
        sheet
        :cart="cart"
        :cart-quantity="cartQuantity"
        :subtotal="subtotal"
        :editing="Boolean(editingSale)"
        :has-changes="editHasChanges"
        :saving="savingEdit"
        :reason="editReason"
        @change-quantity="changeQuantity"
        @clear="clearCart"
        @close="cartOpen = false"
        @checkout="editingSale ? startEditPayment() : (checkoutOpen = true)"
        @save-edit="saveEditOnly"
        @update:reason="editReason = $event"
      />
    </q-dialog>

    <CheckoutDialog
      v-model="checkoutOpen"
      :subtotal="editingSale ? Number(editingSale.total || 0) : subtotal"
      :allow-defer="!editingSale"
      :allow-discount="!editingSale"
      @confirm="completeTransaction"
    />
    <ReceiptDialog
      v-model="receiptOpen"
      :sale="completedSale"
      :warung="authSession.warung"
      :cashier-name="authSession.user?.nama"
    />
    <AppAttribution />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ReceiptDialog from '@/pages/Kasir/components/ReceiptDialog.vue'
import AppAttribution from '@/components/AppAttribution.vue'
import OrderCart from '@/pages/Kasir/components/OrderCart.vue'
import CheckoutDialog from '@/pages/Kasir/components/CheckoutDialog.vue'
import { authSession } from '@/stores/auth-session.js'
import { categories, catalogState, loadCatalog, productCategories, products } from '@/stores/catalog.js'
import { newIdempotencyKey } from '@/services/api.js'
import { displayApiError, larisamaApi, toMoney, toQuantity } from '@/services/larisama-api.js'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const search = ref('')
const activeCategory = ref('Semua')
const cart = ref([])
const cartOpen = ref(false)
const checkoutOpen = ref(false)
const receiptOpen = ref(false)
const completedSale = ref(null)
const loadError = ref('')
const submittingSale = ref(false)
const pendingSaleAttempt = ref(null)
const editingSale = ref(null)
const originalEditLines = ref([])
const editReason = ref('')
const editError = ref('')
const savingEdit = ref(false)
const pendingCorrectionAttempt = ref(null)
const pendingPaymentAttempt = ref(null)
const filteredProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')
  return products.value.filter((product) => {
    const category = categories.value.find((item) => item.id === product.categoryId)
    if (!product.available || !category?.active) return false
    const matchesCategory = activeCategory.value === 'Semua' || product.category === activeCategory.value
    return matchesCategory && product.name.toLocaleLowerCase('id-ID').includes(query)
  })
})
const cartQuantity = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const subtotal = computed(() => cart.value.reduce((total, item) => total + item.price * item.quantity, 0))
const editLines = computed(() => cart.value.map((item) => ({
  menu_id: String(item.id),
  qty: toQuantity(item.quantity),
  diskon: toMoney(item.discount || 0),
  catatan: item.note?.trim() || null,
})))
const editHasChanges = computed(() =>
  Boolean(editingSale.value) && JSON.stringify(editLines.value) !== JSON.stringify(originalEditLines.value),
)

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

onMounted(async () => {
  try {
    await loadCatalog({ force: true })
  } catch (error) {
    loadError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: loadError.value, position: 'top' })
  }
  if (route.query.edit) {
    try {
      await loadSaleForEditing(String(route.query.edit))
    } catch (error) {
      editError.value = displayApiError(error)
      $q.notify({ type: 'negative', message: editError.value, position: 'top' })
    }
  }
})

async function loadSaleForEditing(id) {
  const sale = await larisamaApi.getSale(id)
  if (sale.status !== 'menunggu_pembayaran' || sale.status_pembayaran !== 'belum_lunas') {
    throw new Error('Hanya pesanan yang belum lunas yang bisa diedit dari kasir.')
  }
  editingSale.value = sale
  cart.value = (sale.rincian || []).map((line) => {
    const menu = products.value.find((product) => String(product.id) === String(line.menu_id))
    return {
      ...(menu || {}),
      id: String(line.menu_id),
      name: line.nama_menu,
      price: Number(line.harga),
      quantity: Number(line.qty),
      discount: Number(line.diskon || 0),
      note: line.catatan || '',
    }
  })
  originalEditLines.value = editLines.value.map((line) => ({ ...line }))
}

function cartQuantityFor(productId) {
  return cart.value.find((item) => String(item.id) === String(productId))?.quantity || 0
}

function addToCart(product) {
  const existing = cart.value.find((item) => String(item.id) === String(product.id))
  if (existing) existing.quantity += 1
  else cart.value.push({ ...product, id: String(product.id), quantity: 1, discount: 0, note: '' })
}

function changeQuantity(productId, amount) {
  const item = cart.value.find((entry) => String(entry.id) === String(productId))
  if (!item) return
  item.quantity += amount
  if (item.quantity <= 0) cart.value = cart.value.filter((entry) => entry.id !== productId)
}

function clearCart() {
  cart.value = []
}

async function completeTransaction(payment) {
  if (editingSale.value) {
    await payEditedSale(payment)
    return
  }
  if (!cart.value.length || submittingSale.value) return
  const saleInput = {
    diskon: toMoney(payment.discount),
    ...(!payment.deferred
      ? { bayar: toMoney(payment.paid), metode_pembayaran: payment.method }
      : {}),
    catatan: payment.note?.trim() || null,
    rincian: cart.value.map((item) => ({ menu_id: String(item.id), qty: toQuantity(item.quantity) })),
  }
  const fingerprint = JSON.stringify(saleInput)
  if (pendingSaleAttempt.value?.fingerprint !== fingerprint) {
    pendingSaleAttempt.value = {
      fingerprint,
      key: newIdempotencyKey(),
      tanggal: payment.tanggal || new Date().toISOString(),
    }
  }
  const body = { tanggal: pendingSaleAttempt.value.tanggal, ...saleInput }
  submittingSale.value = true
  try {
    completedSale.value = await larisamaApi.createSale(body, pendingSaleAttempt.value.key)
    pendingSaleAttempt.value = null
    $q.notify({
      type: 'positive',
      message: payment.deferred
        ? 'Pesanan ditunda. Catat pembayarannya nanti dari Riwayat Penjualan.'
        : 'Transaksi berhasil disimpan dan lunas.',
      position: 'top',
      timeout: 3200,
    })
    cart.value = []
    cartOpen.value = false
    checkoutOpen.value = false
    receiptOpen.value = !payment.deferred
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429)
      pendingSaleAttempt.value = null
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    submittingSale.value = false
  }
}

function cancelEdit() {
  checkoutOpen.value = false
  router.push('/penjualan')
}

function correctedLinePayload() {
  return editLines.value
}

async function persistEditChanges() {
  if (!editingSale.value) return false
  if (!editHasChanges.value) return true
  if (!cart.value.length) {
    $q.notify({ type: 'warning', message: 'Pesanan harus memiliki minimal satu menu.', position: 'top' })
    return false
  }
  if (!editReason.value.trim()) {
    editError.value = 'Isi alasan perubahan terlebih dahulu.'
    $q.notify({ type: 'warning', message: editError.value, position: 'top' })
    return false
  }
  const activeMenuIds = new Set(products.value
    .filter((product) => product.available && categories.value.some((category) => category.id === product.categoryId && category.active))
    .map((product) => String(product.id)))
  if (editLines.value.some((line) => !activeMenuIds.has(line.menu_id))) {
    editError.value = 'Semua item harus berasal dari menu aktif sebelum perubahan disimpan.'
    $q.notify({ type: 'warning', message: editError.value, position: 'top' })
    return false
  }
  editError.value = ''
  const body = { alasan: editReason.value.trim(), rincian: correctedLinePayload() }
  const fingerprint = JSON.stringify(body)
  if (pendingCorrectionAttempt.value?.fingerprint !== fingerprint) {
    pendingCorrectionAttempt.value = { fingerprint, key: newIdempotencyKey() }
  }
  await larisamaApi.correctSale(editingSale.value.id, body, pendingCorrectionAttempt.value.key)
  const updated = await larisamaApi.getSale(editingSale.value.id)
  editingSale.value = updated
  cart.value = (updated.rincian || []).map((line) => {
    const menu = products.value.find((product) => String(product.id) === String(line.menu_id))
    return { ...(menu || {}), id: String(line.menu_id), name: line.nama_menu, price: Number(line.harga), quantity: Number(line.qty), discount: Number(line.diskon || 0), note: line.catatan || '' }
  })
  originalEditLines.value = editLines.value.map((line) => ({ ...line }))
  editReason.value = ''
  pendingCorrectionAttempt.value = null
  return true
}

async function saveEditOnly() {
  if (!editingSale.value || savingEdit.value) return
  if (!editHasChanges.value) {
    $q.notify({ type: 'info', message: 'Belum ada perubahan pada pesanan.', position: 'top' })
    return
  }
  savingEdit.value = true
  try {
    if (await persistEditChanges()) {
      $q.notify({ type: 'positive', message: 'Perubahan pesanan tersimpan.', position: 'top' })
      await router.push('/penjualan')
    }
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingCorrectionAttempt.value = null
    editError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: editError.value, position: 'top' })
  } finally {
    savingEdit.value = false
  }
}

async function startEditPayment() {
  if (!editingSale.value || savingEdit.value) return
  savingEdit.value = true
  try {
    if (await persistEditChanges()) checkoutOpen.value = true
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingCorrectionAttempt.value = null
    editError.value = displayApiError(error)
    $q.notify({ type: 'negative', message: editError.value, position: 'top' })
  } finally {
    savingEdit.value = false
  }
}

async function payEditedSale(payment) {
  if (!editingSale.value || submittingSale.value) return
  const body = { bayar: toMoney(payment.paid), metode_pembayaran: payment.method }
  const fingerprint = JSON.stringify(body)
  if (pendingPaymentAttempt.value?.fingerprint !== fingerprint) {
    pendingPaymentAttempt.value = { fingerprint, key: newIdempotencyKey() }
  }
  submittingSale.value = true
  try {
    completedSale.value = await larisamaApi.paySale(editingSale.value.id, body, pendingPaymentAttempt.value.key)
    pendingPaymentAttempt.value = null
    checkoutOpen.value = false
    editingSale.value = null
    cart.value = []
    receiptOpen.value = true
    await router.replace('/transaksi')
    $q.notify({ type: 'positive', message: 'Pembayaran pesanan berhasil dicatat.', position: 'top' })
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingPaymentAttempt.value = null
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    submittingSale.value = false
  }
}
</script>
