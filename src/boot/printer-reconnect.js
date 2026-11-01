import { watch } from 'vue'
import { authSession } from '@/stores/auth-session.js'
import { useBleThermalPrinter } from '@/services/useBleThermalPrinter.js'

export default function registerPrinterReconnect() {
  const { reconnectRememberedPrinter } = useBleThermalPrinter()
  let reconnectInProgress = null

  function reconnectAutomatically() {
    if (reconnectInProgress) return

    reconnectInProgress = reconnectRememberedPrinter().finally(() => {
      reconnectInProgress = null
    })
  }

  function reconnectAfterLogin(token) {
    if (token) reconnectAutomatically()
  }

  function reconnectAfterDisconnect() {
    if (document.visibilityState === 'visible') reconnectAutomatically()
  }

  // Try a previously authorized printer on every page load, including when the
  // user must sign in again after a reload. Login triggers another check.
  reconnectAutomatically()
  watch(() => authSession.token, reconnectAfterLogin)
  window.addEventListener('larisama:printer-disconnected', reconnectAfterDisconnect)
}
