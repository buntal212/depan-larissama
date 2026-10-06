import { clearSession, getAccessToken } from '@/stores/auth-session.js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '')

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

export async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true, idempotency = false } = {}) {
  const requestHeaders = new Headers({ Accept: 'application/json', ...headers })
  const token = auth ? getAccessToken() : null

  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  if (body !== undefined && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json')
  if (idempotency) requestHeaders.set('Idempotency-Key', typeof idempotency === 'string' ? idempotency : newIdempotencyKey())

  let response
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, '')}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa alamat API dan koneksi.', { payload: cause })
  }

  const rawBody = await response.text()
  let payload = null
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = { message: rawBody }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('larisama:session-expired'))
    }
    throw new ApiError(payload?.message || `Permintaan gagal (${response.status}).`, {
      status: response.status,
      code: payload?.code,
      errors: payload?.errors,
      requestId: payload?.request_id,
      payload,
    })
  }

  return payload
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
