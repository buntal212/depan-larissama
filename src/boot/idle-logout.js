import { watch } from 'vue'
import { logout } from '@/services/auth.js'
import { authSession, clearSession } from '@/stores/auth-session.js'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_SYNC_INTERVAL_MS = 3000
const ACTIVITY_EVENT_THROTTLE_MS = 1000
const LAST_ACTIVITY_KEY = 'larisama-last-activity-v1'

function readLastActivityAt() {
  try {
    const storedValue = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY))
    return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null
  } catch {
    return null
  }
}

function writeLastActivityAt(timestamp) {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
  } catch {
    // Keep the timeout functional in this tab if browser storage is unavailable.
  }
}

function clearLastActivityAt() {
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY)
  } catch {
    // Session cleanup should still complete if browser storage is unavailable.
  }
}

export default function registerIdleLogout() {
  let timeoutId = null
  let lastActivityAt = null
  let lastActivitySyncAt = 0
  let lastActivityEventAt = 0

  function latestActivityAt() {
    return Math.max(lastActivityAt || 0, readLastActivityAt() || 0)
  }

  function scheduleLogout() {
    window.clearTimeout(timeoutId)
    timeoutId = null

    if (!authSession.token) return

    const elapsed = Date.now() - latestActivityAt()
    if (elapsed >= IDLE_TIMEOUT_MS) {
      expireSession()
      return
    }

    timeoutId = window.setTimeout(expireSession, IDLE_TIMEOUT_MS - elapsed)
  }

  function dispatchSessionExpired() {
    window.dispatchEvent(new CustomEvent('larisama:session-expired'))
  }

  function expireSession() {
    if (!authSession.token) return

    if (Date.now() - latestActivityAt() < IDLE_TIMEOUT_MS) {
      scheduleLogout()
      return
    }

    const revokeRequest = logout()
    clearSession()
    dispatchSessionExpired()
    void revokeRequest.catch(() => {})
  }

  function recordActivity() {
    if (!authSession.token) return

    const now = Date.now()
    if (now - lastActivityEventAt < ACTIVITY_EVENT_THROTTLE_MS) return
    lastActivityEventAt = now

    if (now - latestActivityAt() >= IDLE_TIMEOUT_MS) {
      expireSession()
      return
    }

    lastActivityAt = now
    if (now - lastActivitySyncAt >= ACTIVITY_SYNC_INTERVAL_MS) {
      writeLastActivityAt(now)
      lastActivitySyncAt = now
    }
    scheduleLogout()
  }

  watch(
    () => authSession.token,
    (token, previousToken) => {
      window.clearTimeout(timeoutId)
      timeoutId = null

      if (!token) {
        lastActivityAt = null
        lastActivitySyncAt = 0
        clearLastActivityAt()
        return
      }

      const storedActivityAt = readLastActivityAt()
      if (previousToken === null || storedActivityAt === null) {
        lastActivityAt = Date.now()
        writeLastActivityAt(lastActivityAt)
        lastActivitySyncAt = lastActivityAt
      } else {
        lastActivityAt = storedActivityAt
        lastActivitySyncAt = storedActivityAt
      }

      scheduleLogout()
    },
    { immediate: true },
  )

  for (const eventName of ['click', 'keydown', 'pointerdown', 'pointermove', 'scroll', 'touchstart', 'wheel']) {
    document.addEventListener(eventName, recordActivity, { passive: true })
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== LAST_ACTIVITY_KEY) return

    if (event.newValue === null) {
      if (authSession.token) {
        clearSession()
        dispatchSessionExpired()
      }
      return
    }

    const timestamp = Number(event.newValue)
    if (!Number.isFinite(timestamp) || timestamp <= latestActivityAt()) return

    lastActivityAt = timestamp
    scheduleLogout()
  })
}
