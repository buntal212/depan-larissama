<template>
  <q-page class="page-shell menu-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KATALOG WARUNG</div>
        <h1 class="page-title">Menu & barang</h1>
        <p class="page-subtitle">Atur menu, harga, dan ketersediaan barangmu.</p>
      </div>
      <div class="col-auto">
        <q-btn unelevated no-caps color="primary" icon="add" label="Tambah barang" @click="openCreateForm" />
      </div>
    </div>

    <section class="menu-toolbar panel-card">
      <q-input v-model="search" outlined dense clearable placeholder="Cari nama menu..." class="menu-search">
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-tabs v-model="activeCategory" dense no-caps align="left" indicator-color="primary" active-color="primary" class="category-tabs">
        <q-tab v-for="category in productCategories" :key="category" :name="category" :label="category" />
      </q-tabs>
      <q-space />
      <div class="inventory-count"><span class="inventory-dot"></span>{{ availableCount }} tersedia <span>·</span> {{ products.length }} barang</div>
    </section>

    <div class="menu-results-heading">
      <div>
        <span class="panel-title">Daftar barang</span>
        <span class="results-count">{{ filteredProducts.length }} barang</span>
      </div>
      <q-btn flat round dense icon="tune" aria-label="Filter" class="filter-button">
        <q-tooltip>Filter barang</q-tooltip>
      </q-btn>
    </div>

    <div v-if="filteredProducts.length" class="product-grid">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        @edit="openEditForm"
        @toggle="toggleAvailability"
      />
    </div>
    <div v-else class="empty-state panel-card">
      <div class="empty-state-icon"><q-icon name="search_off" /></div>
      <div class="panel-title">Barang tidak ditemukan</div>
      <p class="panel-caption">Coba kata pencarian atau kategori lain.</p>
      <q-btn flat no-caps color="primary" label="Hapus pencarian" @click="clearFilters" />
    </div>

    <ProductFormDialog v-model="formOpen" :product="selectedProduct" @save="saveProductValue" />
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import ProductCard from '@/components/ProductCard.vue'
import ProductFormDialog from '@/components/ProductFormDialog.vue'
import { productCategories, products, saveProduct, toggleProductAvailability } from '@/stores/demo-data.js'

const $q = useQuasar()
const search = ref('')
const activeCategory = ref('Semua')
const formOpen = ref(false)
const selectedProduct = ref(null)
const availableCount = computed(() => products.value.filter((product) => product.available).length)
const filteredProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')
  return products.value.filter((product) => {
    const matchesCategory = activeCategory.value === 'Semua' || product.category === activeCategory.value
    const matchesSearch = !query || product.name.toLocaleLowerCase('id-ID').includes(query)
    return matchesCategory && matchesSearch
  })
})

function openCreateForm() {
  selectedProduct.value = null
  formOpen.value = true
}

function openEditForm(product) {
  selectedProduct.value = product
  formOpen.value = true
}

function saveProductValue(product) {
  saveProduct(product)
  $q.notify({ type: 'positive', message: 'Menu berhasil disimpan', position: 'top', timeout: 1800 })
}

function toggleAvailability(product) {
  toggleProductAvailability(product.id)
  $q.notify({ type: 'info', message: product.available ? 'Menu ditandai habis' : 'Menu tersedia kembali', position: 'top', timeout: 1800 })
}

function clearFilters() {
  search.value = ''
  activeCategory.value = 'Semua'
}
</script>
