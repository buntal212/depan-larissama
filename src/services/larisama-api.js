import { apiRequest, getAllPages, listQuery } from '@/services/api.js'

export const larisamaApi = {
  currentWarung: async () => (await apiRequest('warung')).data,
  listWarungs: async () => getAllPages('admin/warungs'),
  createWarung: async (body) => (await apiRequest('admin/warungs', { method: 'POST', body })).data,
  updateWarung: async (id, body) => (await apiRequest(`admin/warungs/${encodeURIComponent(id)}`, { method: 'PATCH', body })).data,

  listUsers: async () => getAllPages('users'),
  saveUser: async (id, body) => (await apiRequest(id ? `users/${encodeURIComponent(id)}` : 'users', { method: id ? 'PATCH' : 'POST', body })).data,

  listSales: async (parameters = {}) => getAllPages('penjualans', parameters),
  getSale: async (id) => (await apiRequest(`penjualans/${encodeURIComponent(id)}`)).data,
  createSale: async (body, key) => (await apiRequest('penjualans', { method: 'POST', body, idempotency: key || true })).data,
  correctSale: async (id, body, key) => (await apiRequest(`penjualans/${encodeURIComponent(id)}`, { method: 'PATCH', body, idempotency: key || true })).data,
  cancelSale: async (id, body, key) => (await apiRequest(`penjualans/${encodeURIComponent(id)}/pembatalan`, { method: 'POST', body, idempotency: key || true })).data,
  returnSale: async (id, body, key) => (await apiRequest(`penjualans/${encodeURIComponent(id)}/retur`, { method: 'POST', body, idempotency: key || true })).data,

  listPurchases: async (parameters = {}) => getAllPages('pembelians', parameters),
  getPurchase: async (id) => (await apiRequest(`pembelians/${encodeURIComponent(id)}`)).data,
  createPurchase: async (body, key) => (await apiRequest('pembelians', { method: 'POST', body, idempotency: key || true })).data,
  correctPurchase: async (id, body, key) => (await apiRequest(`pembelians/${encodeURIComponent(id)}`, { method: 'PATCH', body, idempotency: key || true })).data,
  cancelPurchase: async (id, body, key) => (await apiRequest(`pembelians/${encodeURIComponent(id)}/pembatalan`, { method: 'POST', body, idempotency: key || true })).data,

  salesReport: async (dateFrom, dateTo) => (await apiRequest(`laporan/penjualan${listQuery({ date_from: dateFrom, date_to: dateTo })}`)).data,
  purchasesReport: async (dateFrom, dateTo) => (await apiRequest(`laporan/pembelian${listQuery({ date_from: dateFrom, date_to: dateTo })}`)).data,
}

export function displayApiError(error) {
  if (error?.status === 422 && Object.keys(error.errors || {}).length) {
    const fieldError = Object.entries(error.errors)[0]
    const message = Array.isArray(fieldError[1]) ? fieldError[1][0] : fieldError[1]
    return `${fieldError[0]}: ${message}`
  }
  return error?.requestId ? `${error.message} (ID: ${error.requestId})` : error?.message || 'Terjadi kesalahan. Coba lagi.'
}

export function toMoney(value) {
  return Number(value || 0).toFixed(2)
}

export function toQuantity(value) {
  return Number(value || 0).toFixed(2)
}

export function createLocalDayTimestamp(date, timezone = 'Asia/Jakarta') {
  const [year, month, day] = date.split('-').map(Number)
  const desired = Date.UTC(year, month - 1, day)
  let guess = desired

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(guess))
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
    const localAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second))
    guess -= localAsUtc - desired
  }

  return new Date(guess).toISOString()
}
