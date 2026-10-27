import { useBleThermalPrinter } from '@/services/useBleThermalPrinter.js'

export default function registerPrinterReconnect() {
  const { reconnectRememberedPrinter } = useBleThermalPrinter()

  function reconnectWhenVisible() {
    if (document.visibilityState === 'visible') {
      void reconnectRememberedPrinter()
    }
  }

  void reconnectRememberedPrinter()
  document.addEventListener('visibilitychange', reconnectWhenVisible)
  window.addEventListener('focus', reconnectWhenVisible)
}
