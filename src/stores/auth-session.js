import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pinia } from '@/stores/index.js'

const STORAGE_KEY = 'larisama-access-token-v1'
const SELECTED_WARUNG_KEY = 'larisama-superadmin-warung-v1'

function readToken() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function readSelectedWarung() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(SELECTED_WARUNG_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthSessionStore = defineStore('auth-session', () => {
  const savedWarung = readSelectedWarung()
  const token = ref(readToken())
  const user = ref(null)
  const warung = ref(null)
  const selectedWarungId = ref(savedWarung?.id ? String(savedWarung.id) : null)
  const selectedWarung = ref(savedWarung)
  const ready = ref(false)

  function setSelectedWarung(value) {
    selectedWarung.value = value || null
    selectedWarungId.value = value?.id ? String(value.id) : null
    if (user.value?.role === 'superadmin') warung.value = value || null
    if (typeof window !== 'undefined') {
      if (value?.id) window.localStorage.setItem(SELECTED_WARUNG_KEY, JSON.stringify(value))
      else window.localStorage.removeItem(SELECTED_WARUNG_KEY)
    }
  }

  function getSelectedWarungId() {
    if (selectedWarungId.value) return selectedWarungId.value
    if (typeof window === 'undefined') return null
    try {
      const id = JSON.parse(window.localStorage.getItem(SELECTED_WARUNG_KEY) || 'null')?.id
      return id ? String(id) : null
    } catch {
      return null
    }
  }

  function getAccessToken() {
    return token.value
  }

  function setSession({ access_token: accessToken, user: sessionUser, warung: sessionWarung }) {
    token.value = accessToken
    user.value = sessionUser
    warung.value = sessionWarung || (sessionUser?.role === 'superadmin' ? selectedWarung.value : null)
    ready.value = true
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, accessToken)
  }

  function updateSessionProfile({ user: sessionUser, warung: sessionWarung }) {
    user.value = sessionUser
    warung.value = sessionWarung || (sessionUser?.role === 'superadmin' ? selectedWarung.value : null)
    ready.value = true
  }

  function clearSession() {
    token.value = null
    user.value = null
    warung.value = null
    selectedWarungId.value = null
    selectedWarung.value = null
    ready.value = true
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(SELECTED_WARUNG_KEY)
    }
  }

  return {
    token,
    user,
    warung,
    selectedWarungId,
    selectedWarung,
    ready,
    setSelectedWarung,
    getSelectedWarungId,
    getAccessToken,
    setSession,
    updateSessionProfile,
    clearSession,
  }
})

// Keep existing service and page imports working while they use Pinia state.
export const authSession = useAuthSessionStore(pinia)
export const setSelectedWarung = (warung) => authSession.setSelectedWarung(warung)
export const getSelectedWarungId = () => authSession.getSelectedWarungId()
export const getAccessToken = () => authSession.getAccessToken()
export const setSession = (session) => authSession.setSession(session)
export const updateSessionProfile = (profile) => authSession.updateSessionProfile(profile)
export const clearSession = () => authSession.clearSession()
