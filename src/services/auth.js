import { apiRequest } from '@/services/api.js'
import { authSession, clearSession, setSession, updateSessionProfile } from '@/stores/auth-session.js'

export async function login(credentials) {
  const result = await apiRequest('auth/login', { method: 'POST', body: credentials, auth: false })
  setSession(result.data)
  return result.data
}

export async function restoreSession() {
  if (authSession.ready) return Boolean(authSession.token)
  if (!authSession.token) {
    authSession.ready = true
    return false
  }
  try {
    const result = await apiRequest('auth/me')
    updateSessionProfile(result.data)
    return true
  } catch (error) {
    if (error.status === 401) clearSession()
    else authSession.ready = true
    return Boolean(authSession.token)
  }
}

export async function logout() {
  try {
    if (authSession.token) await apiRequest('auth/logout', { method: 'POST' })
  } finally {
    clearSession()
  }
}
