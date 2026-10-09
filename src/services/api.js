import axios from 'axios'
import {
  authSession,
  clearSession,
  getAccessToken,
  getSelectedWarungId,
} from '@/stores/auth-session.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(
  /\/+$/,
  '',
)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
  transformResponse: [(data) => {
    if (typeof data !== 'string' || !data) return data
    try {
      return JSON.parse(data)
    } catch {
      return { message: data }
    }
  }],
})

export function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class ApiError extends Error {
  constructor(message, { status, code, errors, requestId, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors || {}
    this.requestId = requestId
    this.payload = payload
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body, headers = {}, auth = true, idempotency = false } = {},
) {
  let requestPath = path
  let requestBody = body
  const [resourcePath, query = ''] = path.split('?')
  const tenantWrite =
    auth &&
    ['POST', 'PATCH'].includes(method) &&
    /^(users|kategori-menus|menus|penjualans|pembelians)(?:\/|$)/.test(resourcePath)
  if (tenantWrite && authSession.user?.role === 'superadmin') {
    const selectedWarungId = getSelectedWarungId()
    if (!selectedWarungId)
      throw new ApiError('Pilih warung terlebih dahulu untuk menyimpan data.')
    requestBody = { ...body, warung_id: String(selectedWarungId) }
  }
  const tenantRead =
    method === 'GET' &&
    auth &&
    authSession.user?.role === 'superadmin' &&
    /^(users(?:\/|$)|kategori-menus(?:\/|$)|menus(?:\/|$)|penjualans(?:\/|$)|pembelians(?:\/|$)|laporan\/)/.test(
      resourcePath,
    )
  if (tenantRead) {
    const warungId = getSelectedWarungId()
    if (!warungId) throw new ApiError('Pilih warung terlebih dahulu untuk membaca datanya.')
    const queryParameters = new URLSearchParams(query)
    queryParameters.set('warung_id', warungId)
    requestPath = `${resourcePath}?${queryParameters}`
  }
  const requestHeaders = {
    Accept: 'application/json',
    ...(headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers),
  }
  const token = auth ? getAccessToken() : null

  if (token) requestHeaders.Authorization = `Bearer ${token}`
  if (requestBody !== undefined && !Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type'))
    requestHeaders['Content-Type'] = 'application/json'
  if (idempotency) requestHeaders['Idempotency-Key'] = typeof idempotency === 'string' ? idempotency : newIdempotencyKey()

  let response
  try {
    response = await apiClient.request({
      url: requestPath.replace(/^\/+/, ''),
      method,
      headers: requestHeaders,
      data: requestBody,
    })
  } catch (error) {
    if (!error.response) {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa alamat API dan koneksi.', {
        payload: error,
      })
    }
    const payload = error.response.data
    if (error.response.status === 401 && auth) {
      clearSession()
      if (typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent('larisama:session-expired'))
    }
    throw new ApiError(payload?.message || `Permintaan gagal (${error.response.status}).`, {
      status: error.response.status,
      code: payload?.code,
      errors: payload?.errors,
      requestId: payload?.request_id,
      payload,
    })
  }

  return response.data
}

export function listQuery(parameters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  return query.size ? `?${query}` : ''
}

export async function getAllPages(path, parameters = {}) {
  const rows = []
  let page = 1
  let lastPage

  do {
    const result = await apiRequest(`${path}${listQuery({ ...parameters, page, per_page: 100 })}`)
    rows.push(...(Array.isArray(result?.data) ? result.data : []))
    lastPage = Number(result?.meta?.last_page || page)
    page += 1
  } while (page <= lastPage)

  return rows
}
