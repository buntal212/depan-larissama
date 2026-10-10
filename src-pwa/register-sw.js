import { register } from 'register-service-worker'

const UPDATE_CHECK_INTERVAL = 15 * 60 * 1000
let updateCheckTimer = null
let reloadingForServiceWorkerUpdate = false

function checkForServiceWorkerUpdate() {
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.update())
    .catch(() => {})
}

function reloadForServiceWorkerUpdate() {
  if (reloadingForServiceWorkerUpdate) return

  reloadingForServiceWorkerUpdate = true
  window.location.reload()
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', reloadForServiceWorkerUpdate)
  window.addEventListener('online', checkForServiceWorkerUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForServiceWorkerUpdate()
  })
}

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready (/* registration */) {
    // console.log('Service worker is active.')
  },

  registered (registration) {
    checkForServiceWorkerUpdate()
    updateCheckTimer ??= window.setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_INTERVAL)
  },

  cached (/* registration */) {
    // console.log('Content has been cached for offline use.')
  },

  updatefound (/* registration */) {
    // console.log('New content is downloading.')
  },

  updated (/* registration */) {
    // Service worker baru memicu controllerchange dan aplikasi dimuat ulang otomatis.
  },

  offline () {
    // console.log('No internet connection found. App is running in offline mode.')
  },

  error (/* err */) {
    // console.error('Error during service worker registration:', err)
  }
})
