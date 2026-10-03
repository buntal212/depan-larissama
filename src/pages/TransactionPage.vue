<template>
  <q-page class="page-shell transaction-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KASIR WARUNG</div>
        <h1 class="page-title">Pesanan baru</h1>
        <p class="page-subtitle">Pilih menu untuk mulai mencatat pesanan.</p>
      </div>
      <div class="col-auto"><q-chip class="demo-chip"><span class="status-dot"></span> Transaksi demo</q-chip></div>
    </div>

    <div class="pos-grid">
      <section class="pos-menu-column">
        <q-input v-model="search" outlined dense clearable placeholder="Cari menu..." class="pos-search">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-tabs v-model="activeCategory" dense no-caps align="left" indicator-color="primary" active-color="primary" class="category-tabs pos-category-tabs">
          <q-tab v-for="category in productCategories" :key="category" :name="category" :label="category" />
        </q-tabs>
        <div class="pos-product-grid">
          <button v-for="product in filteredProducts" :key="product.id" class="pos-product" :disabled="!product.available || product.stock === 0" @click="addToCart(product)">
            <div class="pos-product-art" :class="`art-${product.color || 'mint'}`"><q-icon :name="product.icon || 'restaurant'" /></div>
            <span class="pos-product-name">{{ product.name }}</span>
            <span class="pos-product-price">{{ formatPrice(product.price) }}</span>
            <span v-if="!product.available || product.stock === 0" class="pos-product-sold">Habis</span>
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
        @complete="completeTransaction"
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
        @complete="completeTransaction"
      />
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import OrderCart from '@/components/OrderCart.vue'
import { productCategories, products } from '@/stores/demo-data.js'

const $q = useQuasar()
const search = ref('')
const activeCategory = ref('Semua')
const cart = ref([])
const cartOpen = ref(false)
const filteredProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')
  return products.value.filter((product) => {
    const matchesCategory = activeCategory.value === 'Semua' || product.category === activeCategory.value
    return matchesCategory && product.name.toLocaleLowerCase('id-ID').includes(query)
  })
})
const cartQuantity = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
const subtotal = computed(() => cart.value.reduce((total, item) => total + item.price * item.quantity, 0))

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

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

function completeTransaction() {
  if (!cart.value.length) return
  $q.notify({ type: 'positive', message: 'Transaksi demo selesai. Data tidak dikirim ke backend.', position: 'top', timeout: 2600 })
  cart.value = []
  cartOpen.value = false
}
</script>
