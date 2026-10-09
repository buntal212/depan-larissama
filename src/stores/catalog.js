import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { pinia } from '@/stores/index.js'
import { apiRequest, getAllPages } from '@/services/api.js'

export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref([])
  const products = ref([])
  const productCategories = computed(() => [
    'Semua',
    ...categories.value.filter((category) => category.active).sort((a, b) => a.order - b.order).map((category) => category.name),
  ])
  const availableProducts = computed(() => products.value.filter((product) => product.available))
  const catalogState = ref({ loaded: false, loading: false, error: null })

const iconByCategory = (categoryName = '') => /minum|kopi/i.test(categoryName) ? 'local_cafe' : /snack|cemilan/i.test(categoryName) ? 'bakery_dining' : 'restaurant'
const colorByCategory = (categoryName = '') => /minum|kopi/i.test(categoryName) ? 'mint' : /snack|cemilan/i.test(categoryName) ? 'yellow' : 'peach'

function mapCategory(record) {
  return { id: record.id, name: record.nama, order: record.urutan, active: record.aktif }
}

function mapProduct(record, categoryRecords = categories.value) {
  const category = categoryRecords.find((item) => item.id === record.kategori_menu_id)
  return {
    id: record.id,
    code: record.kode,
    name: record.nama,
    categoryId: record.kategori_menu_id,
    category: category?.name || 'Tanpa kategori',
    price: record.harga,
    description: record.deskripsi || '',
    available: record.aktif,
    icon: iconByCategory(category?.name),
    color: colorByCategory(category?.name),
  }
}

async function loadCatalog({ force = false } = {}) {
  if (catalogState.value.loading) return
  if (catalogState.value.loaded && !force) return
  catalogState.value = { ...catalogState.value, loading: true, error: null }
  try {
    const [categoryRecords, menuRecords] = await Promise.all([
      getAllPages('kategori-menus'),
      getAllPages('menus'),
    ])
    categories.value = categoryRecords.map(mapCategory)
    products.value = menuRecords.map((record) => mapProduct(record, categories.value))
    catalogState.value = { loaded: true, loading: false, error: null }
  } catch (error) {
    catalogState.value = { ...catalogState.value, loading: false, error }
    throw error
  }
}

async function saveCategory(category) {
  const body = { nama: category.name.trim(), urutan: Number(category.order) || 0, aktif: Boolean(category.active) }
  const result = category.id
    ? await apiRequest(`kategori-menus/${encodeURIComponent(category.id)}`, { method: 'PATCH', body })
    : await apiRequest('kategori-menus', { method: 'POST', body })
  const saved = mapCategory(result.data)
  const index = categories.value.findIndex((item) => item.id === saved.id)
  if (index < 0) categories.value.push(saved)
  else categories.value.splice(index, 1, saved)
  products.value = products.value.map((product) => product.categoryId === saved.id ? { ...product, category: saved.name } : product)
  return saved
}

async function toggleCategory(categoryId) {
  const category = categories.value.find((item) => item.id === categoryId)
  if (!category) return
  const result = await apiRequest(`kategori-menus/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    body: { aktif: !category.active },
  })
  const saved = mapCategory(result.data)
  categories.value.splice(categories.value.findIndex((item) => item.id === saved.id), 1, saved)
  return saved
}

async function saveProduct(product) {
  const body = {
    kategori_menu_id: String(product.categoryId),
    ...(product.id ? { kode: product.code.trim() } : {}),
    nama: product.name.trim(),
    harga: Number(product.price).toFixed(2),
    deskripsi: product.description?.trim() || null,
    aktif: Boolean(product.available),
  }
  const result = product.id
    ? await apiRequest(`menus/${encodeURIComponent(product.id)}`, { method: 'PATCH', body })
    : await apiRequest('menus', { method: 'POST', body })
  const saved = mapProduct(result.data)
  const index = products.value.findIndex((item) => item.id === saved.id)
  if (index < 0) products.value.unshift(saved)
  else products.value.splice(index, 1, saved)
  return saved
}

async function toggleProductAvailability(productId) {
  const product = products.value.find((item) => item.id === productId)
  if (!product) return
  const result = await apiRequest(`menus/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: { aktif: !product.available },
  })
  const saved = mapProduct(result.data)
  products.value.splice(products.value.findIndex((item) => item.id === saved.id), 1, saved)
  return saved
}

  return {
    categories,
    products,
    productCategories,
    availableProducts,
    catalogState,
    loadCatalog,
    saveCategory,
    toggleCategory,
    saveProduct,
    toggleProductAvailability,
  }
})

const catalogStore = useCatalogStore(pinia)
const {
  categories,
  products,
  productCategories,
  availableProducts,
  catalogState,
} = storeToRefs(catalogStore)

export {
  categories,
  products,
  productCategories,
  availableProducts,
  catalogState,
}
export const loadCatalog = (options) => catalogStore.loadCatalog(options)
export const saveCategory = (...args) => catalogStore.saveCategory(...args)
export const toggleCategory = (...args) => catalogStore.toggleCategory(...args)
export const saveProduct = (...args) => catalogStore.saveProduct(...args)
export const toggleProductAvailability = (...args) => catalogStore.toggleProductAvailability(...args)
