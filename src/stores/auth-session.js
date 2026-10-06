import { reactive } from 'vue'

const STORAGE_KEY = 'larisama-access-token-v1'

function readToken() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export const authSession = reactive({ token: readToken(), user: null, warung: null, ready: false })

export function getAccessToken() {
  return authSession.token
}

export function setSession({ access_token: accessToken, user, warung }) {
  authSession.token = accessToken
  authSession.user = user
  authSession.warung = warung || null
  authSession.ready = true
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, accessToken)
}

export function updateSessionProfile({ user, warung }) {
  authSession.user = user
  authSession.warung = warung || null
  authSession.ready = true
}

export function clearSession() {
  authSession.token = null
  authSession.user = null
  authSession.warung = null
  authSession.ready = true
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
}
