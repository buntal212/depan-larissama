<template>
  <q-page class="page-shell transaction-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KASIR WARUNG</div>
        <h1 class="page-title">Pesanan baru</h1>
        <p class="page-subtitle">Pilih menu untuk mulai mencatat pesanan.</p>
      </div>
      <div class="col-auto"><q-chip class="demo-chip"><span class="status-dot"></span> Kasir tersambung</q-chip></div>
    </div>
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
        @change-quantity="changeQuantity"
        @clear="clearCart"
        @checkout="checkoutOpen = true"
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
        @change-quantity="changeQuantity"
        @clear="clearCart"
        @close="cartOpen = false"
        @checkout="checkoutOpen = true"
      />
    </q-dialog>

    <CheckoutDialog v-model="checkoutOpen" :subtotal="subtotal" @confirm="completeTransaction" />
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
})

function cartQuantityFor(productId) {
  return cart.value.find((item) => item.id === productId)?.quantity || 0
}

function addToCart(product) {
  const existing = cart.value.find((item) => item.id === product.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ ...product, quantity: 1 })
}

function changeQuantity(productId, amount) {
  const item = cart.value.find((entry) => entry.id === productId)
  if (!item) return
  item.quantity += amount
  if (item.quantity <= 0) cart.value = cart.value.filter((entry) => entry.id !== productId)
}

function clearCart() {
  cart.value = []
}

async function completeTransaction(payment) {
  if (!cart.value.length || submittingSale.value) return
  const saleInput = {
    diskon: toMoney(payment.discount),
    bayar: toMoney(payment.paid),
    metode_pembayaran: payment.method,
    catatan: payment.note?.trim() || null,
    rincian: cart.value.map((item) => ({ menu_id: String(item.id), qty: toQuantity(item.quantity) })),
  }
  const fingerprint = JSON.stringify(saleInput)
  if (pendingSaleAttempt.value?.fingerprint !== fingerprint) {
    pendingSaleAttempt.value = { fingerprint, key: newIdempotencyKey(), tanggal: new Date().toISOString() }
  }
  const body = { tanggal: pendingSaleAttempt.value.tanggal, ...saleInput }
  submittingSale.value = true
  try {
    completedSale.value = await larisamaApi.createSale(body, pendingSaleAttempt.value.key)
    pendingSaleAttempt.value = null
    $q.notify({ type: 'positive', message: 'Transaksi berhasil disimpan.', position: 'top', timeout: 2600 })
    cart.value = []
    cartOpen.value = false
    checkoutOpen.value = false
    receiptOpen.value = true
  } catch (error) {
    if (error.status && error.status < 500 && error.status !== 429) pendingSaleAttempt.value = null
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    submittingSale.value = false
  }
}
</script>
