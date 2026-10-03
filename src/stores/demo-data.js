import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'larisama-demo-products-v1'

const starterProducts = [
  { id: 1, name: 'Nasi Goreng Spesial', category: 'Makanan', price: 18000, stock: 12, icon: 'dinner_dining', color: 'peach', available: true, popular: true },
  { id: 2, name: 'Mie Goreng Jawa', category: 'Makanan', price: 15000, stock: 8, icon: 'ramen_dining', color: 'yellow', available: true, popular: true },
  { id: 3, name: 'Es Teh Manis', category: 'Minuman', price: 5000, stock: 24, icon: 'local_cafe', color: 'mint', available: true, popular: true },
  { id: 4, name: 'Kopi Susu', category: 'Minuman', price: 10000, stock: 16, icon: 'coffee', color: 'lavender', available: true, popular: false },
  { id: 5, name: 'Pisang Goreng', category: 'Camilan', price: 8000, stock: 3, icon: 'bakery_dining', color: 'yellow', available: true, popular: false },
  { id: 6, name: 'Sate Usus', category: 'Camilan', price: 3000, stock: 0, icon: 'kebab_dining', color: 'peach', available: false, popular: false },
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
export const productCategories = ['Semua', 'Makanan', 'Minuman', 'Camilan']
export const availableProducts = computed(() => products.value.filter((product) => product.available))

watch(
  products,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    }
  },
  { deep: true },
)

export function saveProduct(product) {
  const existingIndex = products.value.findIndex((item) => item.id === product.id)
  if (existingIndex === -1) {
    products.value.unshift({ ...product, id: Date.now() })
    return
  }

  products.value[existingIndex] = { ...product }
}

export function toggleProductAvailability(productId) {
  const product = products.value.find((item) => item.id === productId)
  if (product) product.available = !product.available
}
