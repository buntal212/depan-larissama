import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'larisama-demo-products-v2'
const CATEGORY_STORAGE_KEY = 'larisama-demo-categories-v1'
const SALES_STORAGE_KEY = 'larisama-demo-sales-v1'
const PURCHASES_STORAGE_KEY = 'larisama-demo-purchases-v1'
const USERS_STORAGE_KEY = 'larisama-demo-users-v1'
const WARUNGS_STORAGE_KEY = 'larisama-demo-warungs-v1'

const starterCategories = [
  { id: 'cat-food', name: 'Makanan', order: 0, active: true },
  { id: 'cat-drink', name: 'Minuman', order: 1, active: true },
  { id: 'cat-snack', name: 'Snack', order: 2, active: true },
]

const starterProducts = [
  { id: 'menu-1', code: 'NASI-GORENG', name: 'Nasi Goreng Spesial', categoryId: 'cat-food', category: 'Makanan', price: 18000, description: 'Nasi goreng dengan telur dan kerupuk.', icon: 'dinner_dining', color: 'peach', available: true, popular: true },
  { id: 'menu-2', code: 'MIE-GORENG', name: 'Mie Goreng Jawa', categoryId: 'cat-food', category: 'Makanan', price: 15000, description: 'Mie goreng bumbu Jawa.', icon: 'ramen_dining', color: 'yellow', available: true, popular: true },
  { id: 'menu-3', code: 'ES-TEH', name: 'Es Teh Manis', categoryId: 'cat-drink', category: 'Minuman', price: 5000, description: 'Teh manis dingin.', icon: 'local_cafe', color: 'mint', available: true, popular: true },
  { id: 'menu-4', code: 'KOPI-SUSU', name: 'Kopi Susu', categoryId: 'cat-drink', category: 'Minuman', price: 10000, description: 'Kopi susu hangat.', icon: 'coffee', color: 'lavender', available: true, popular: false },
  { id: 'menu-5', code: 'PISANG-GORENG', name: 'Pisang Goreng', categoryId: 'cat-snack', category: 'Snack', price: 8000, description: 'Pisang goreng hangat.', icon: 'bakery_dining', color: 'yellow', available: true, popular: false },
  { id: 'menu-6', code: 'SATE-USUS', name: 'Sate Usus', categoryId: 'cat-snack', category: 'Snack', price: 3000, description: 'Sate usus bakar.', icon: 'kebab_dining', color: 'peach', available: false, popular: false },
]

function readProducts() {
  if (typeof window === 'undefined') return starterProducts

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : starterProducts
  } catch {
    return starterProducts
  }
}

export const products = ref(readProducts())
function readCategories() {
  if (typeof window === 'undefined') return starterCategories
  try {
    const saved = window.localStorage.getItem(CATEGORY_STORAGE_KEY)
    return saved ? JSON.parse(saved) : starterCategories
  } catch {
    return starterCategories
  }
}

export const categories = ref(readCategories())
export const productCategories = computed(() => [
  'Semua',
  ...categories.value.filter((category) => category.active).sort((a, b) => a.order - b.order).map((category) => category.name),
])
export const availableProducts = computed(() => products.value.filter((product) => product.available))

function readCollection(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export const sales = ref(readCollection(SALES_STORAGE_KEY, []))
export const purchases = ref(readCollection(PURCHASES_STORAGE_KEY, []))
export const users = ref(readCollection(USERS_STORAGE_KEY, [
  { id: 'user-owner', name: 'Ani Pratama', username: 'ani', email: 'ani@example.test', role: 'owner', active: true },
  { id: 'user-cashier', name: 'Budi Santoso', username: 'budi', email: null, role: 'kasir', active: true },
]))
export const warungs = ref(readCollection(WARUNGS_STORAGE_KEY, []))

watch(
  products,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    }
  },
  { deep: true },
)

watch(categories, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch(sales, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch(purchases, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch(users, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch(warungs, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(WARUNGS_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

export function saveProduct(product) {
  const existingIndex = products.value.findIndex((item) => item.id === product.id)
  if (existingIndex === -1) {
    products.value.unshift({ ...product, id: `menu-${Date.now()}` })
    return
  }

  products.value[existingIndex] = { ...product }
}

export function saveCategory(category) {
  const existingIndex = categories.value.findIndex((item) => item.id === category.id)
  if (existingIndex === -1) {
    categories.value.push({ ...category, id: `category-${Date.now()}` })
    return
  }
  const previousName = categories.value[existingIndex].name
  categories.value[existingIndex] = { ...category }
  if (previousName !== category.name) {
    products.value.forEach((product) => {
      if (product.categoryId === category.id) product.category = category.name
    })
  }
}

export function toggleCategory(categoryId) {
  const category = categories.value.find((item) => item.id === categoryId)
  if (category) category.active = !category.active
}

export function toggleProductAvailability(productId) {
  const product = products.value.find((item) => item.id === productId)
  if (product) product.available = !product.available
}

export function saveSale(sale) {
  sales.value.unshift({ ...sale, id: `sale-${Date.now()}`, no_transaksi: `DEMO-PJ-${Date.now()}`, status: 'selesai', created_at: new Date().toISOString() })
}

export function updateSale(saleId, changes, reason) {
  const sale = sales.value.find((item) => item.id === saleId)
  if (!sale) return
  sale.riwayat_koreksi ||= []
  sale.riwayat_koreksi.unshift({ jenis: 'koreksi', alasan: reason, sebelum: { tanggal: sale.tanggal, catatan: sale.catatan }, sesudah: { ...changes }, created_at: new Date().toISOString() })
  Object.assign(sale, changes)
}

export function cancelSale(saleId, reason) {
  const sale = sales.value.find((item) => item.id === saleId)
  if (!sale) return
  sale.status = 'batal'
  sale.riwayat_koreksi ||= []
  sale.riwayat_koreksi.unshift({ jenis: 'pembatalan', alasan: reason, created_at: new Date().toISOString() })
}

export function returnSale(saleId, amount, reason) {
  const sale = sales.value.find((item) => item.id === saleId)
  if (!sale) return false
  sale.riwayat_retur ||= []
  const returnedTotal = Number(sale.returned_total || 0) + Number(amount)
  if (returnedTotal > Number(sale.total || 0)) return false
  sale.riwayat_retur.unshift({ nominal: amount, alasan: reason, created_at: new Date().toISOString() })
  sale.returned_total = returnedTotal
  return true
}

export function savePurchase(purchase) {
  purchases.value.unshift({ ...purchase, id: `purchase-${Date.now()}`, no_transaksi: `DEMO-PB-${Date.now()}`, status: 'tercatat', created_at: new Date().toISOString() })
}

export function updatePurchase(purchaseId, changes, reason) {
  const purchase = purchases.value.find((item) => item.id === purchaseId)
  if (!purchase) return
  purchase.riwayat_koreksi ||= []
  purchase.riwayat_koreksi.unshift({ jenis: 'koreksi', alasan: reason, sebelum: { tanggal: purchase.tanggal, catatan: purchase.catatan }, sesudah: { ...changes }, created_at: new Date().toISOString() })
  Object.assign(purchase, changes)
}

export function cancelPurchase(purchaseId, reason) {
  const purchase = purchases.value.find((item) => item.id === purchaseId)
  if (!purchase) return
  purchase.status = 'dibatalkan'
  purchase.riwayat_koreksi ||= []
  purchase.riwayat_koreksi.unshift({ jenis: 'pembatalan', alasan: reason, created_at: new Date().toISOString() })
}

export function saveUser(user) {
  const { password, ...safeUser } = user
  void password
  const existingIndex = users.value.findIndex((item) => item.id === safeUser.id)
  if (existingIndex === -1) users.value.unshift({ ...safeUser, id: `user-${Date.now()}` })
  else users.value[existingIndex] = { ...users.value[existingIndex], ...safeUser }
}

export function saveWarung(warung) {
  const { owner, ...warungFields } = warung
  const safeOwner = owner ? (({ password, ...safe }) => { void password; return safe })(owner) : null
  warungs.value.unshift({ ...warungFields, owner: safeOwner, id: `warung-${Date.now()}`, created_at: new Date().toISOString() })
}
