<template>
  <q-page class="page-shell menu-page">
    <div class="page-heading row items-end justify-between q-col-gutter-md">
      <div class="col">
        <div class="eyebrow">KATALOG WARUNG</div>
        <h1 class="page-title">Kategori & Menu</h1>
        <p class="page-subtitle">Kelola kategori dan daftar menu yang dipakai kasir.</p>
      </div>
      <div v-if="canManageCatalog" class="col-auto row q-gutter-sm menu-create-actions">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Tambah menu"
          @click="openCreateForm"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="category"
          label="Kelola kategori"
          @click="openCategoryManager"
        />
      </div>
    </div>

    <section class="menu-toolbar panel-card">
      <q-input
        v-model="search"
        outlined
        dense
        clearable
        placeholder="Cari kode atau nama menu..."
        class="menu-search"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-tabs
        v-model="activeCategory"
        dense
        no-caps
        align="left"
        indicator-color="primary"
        active-color="primary"
        class="category-tabs"
      >
        <q-tab
          v-for="category in productCategories"
          :key="category"
          :name="category"
          :label="category"
        />
      </q-tabs>

      <q-space />
      <div class="inventory-count">
        <span class="inventory-dot"></span>{{ availableCount }} tersedia <span>·</span>
        {{ products.length }} barang
      </div>
    </section>
    <q-banner v-if="loadError" rounded class="q-mb-md bg-red-1 text-negative">{{ loadError }}</q-banner>
    <q-banner v-else-if="catalogState.loading" rounded class="q-mb-md bg-green-1 text-primary">Memuat katalog dari server...</q-banner>

    <div class="menu-results-heading">
      <div>
        <span class="panel-title">Daftar menu</span>
        <span class="results-count">{{ filteredProducts.length }} menu</span>
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
        :can-manage="canManageCatalog"
        @edit="openEditForm"
        @toggle="toggleAvailability"
      />
    </div>
    <div v-else class="empty-state panel-card">
      <div class="empty-state-icon"><q-icon name="search_off" /></div>
      <div class="panel-title">Menu tidak ditemukan</div>
      <p class="panel-caption">Coba kata pencarian atau kategori lain.</p>
      <q-btn flat no-caps color="primary" label="Hapus pencarian" @click="clearFilters" />
    </div>

    <ProductFormDialog v-if="canManageCatalog"
      v-model="formOpen"
      :product="selectedProduct"
      :categories="categories"
      :saving="savingProduct"
      @save="saveProductValue"
    />
    <CategoryManagerDialog v-if="canManageCatalog"
      ref="categoryManagerRef"
      v-model="categoryManagerOpen"
      :categories="categories"
      :saving="savingCategory"
      @save="saveCategoryValue"
      @toggle="toggleCategoryValue"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import ProductCard from '@/components/ProductCard.vue'
import ProductFormDialog from '@/components/ProductFormDialog.vue'
import CategoryManagerDialog from '@/pages/MenuKategori/components/CategoryManagerDialog.vue'
import { authSession } from '@/stores/auth-session.js'
import { categories, catalogState, loadCatalog, productCategories, products, saveCategory, saveProduct, toggleCategory, toggleProductAvailability } from '@/stores/catalog.js'
import { displayApiError } from '@/services/larisama-api.js'

const $q = useQuasar()
const canManageCatalog = computed(() => ['owner', 'manager'].includes(authSession.user?.role))
const loadError = computed(() => catalogState.value.error ? displayApiError(catalogState.value.error) : '')
const search = ref('')
const activeCategory = ref('Semua')
const formOpen = ref(false)
const savingProduct = ref(false)
const savingCategory = ref(false)
const selectedProduct = ref(null)
const availableCount = computed(() => products.value.filter((product) => product.available).length)
const categoryManagerOpen = ref(false)
const categoryManagerRef = ref(null)
const filteredProducts = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')
  return products.value.filter((product) => {
    const matchesCategory =
      activeCategory.value === 'Semua' || product.category === activeCategory.value
    const matchesSearch =
      !query || `${product.code} ${product.name}`.toLocaleLowerCase('id-ID').includes(query)
    return matchesCategory && matchesSearch
  })
})

onMounted(async () => {
  try {
    await loadCatalog({ force: true })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
})

function openCreateForm() {
  selectedProduct.value = null
  formOpen.value = true
}

function openCategoryManager() {
  categoryManagerOpen.value = true
}

function openEditForm(product) {
  selectedProduct.value = product
  formOpen.value = true
}

async function saveProductValue(product) {
  if (!product.categoryId) {
    $q.notify({ type: 'negative', message: 'Buat atau aktifkan kategori terlebih dahulu.' })
    return
  }
  try {
    savingProduct.value = true
    await saveProduct(product)
    formOpen.value = false
    $q.notify({ type: 'positive', message: 'Menu tersimpan.', position: 'top', timeout: 1800 })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    savingProduct.value = false
  }
}

async function saveCategoryValue(category) {
  try {
    savingCategory.value = true
    await saveCategory(category)
    categoryManagerRef.value?.closeForm()
    $q.notify({ type: 'positive', message: 'Kategori tersimpan.', position: 'top', timeout: 1800 })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  } finally {
    savingCategory.value = false
  }
}

async function toggleCategoryValue(categoryId) {
  try { await toggleCategory(categoryId) } catch (error) { $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' }) }
}

async function toggleAvailability(product) {
  const wasAvailable = product.available
  try {
    await toggleProductAvailability(product.id)
    $q.notify({ type: 'info', message: wasAvailable ? 'Menu dinonaktifkan' : 'Menu diaktifkan kembali', position: 'top', timeout: 1800 })
  } catch (error) {
    $q.notify({ type: 'negative', message: displayApiError(error), position: 'top' })
  }
}

function clearFilters() {
  search.value = ''
  activeCategory.value = 'Semua'
}
</script>

<style scoped>
@media (max-width: 599px) {
  .menu-create-actions {
    width: 100%;
  }
  .menu-create-actions :deep(.q-btn) {
    flex: 1 1 0;
  }
}
</style>
