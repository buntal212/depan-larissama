import { ref, shallowRef } from 'vue'

export const deferredInstallPrompt = shallowRef(null)
export const manualInstallGuide = ref(null)
export const installPromptDismissed = ref(false)

async function isInstalledApp() {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return true

  try {
    const installedApps = await window.navigator.getInstalledRelatedApps?.()
    return installedApps?.some((app) => app.platform === 'webapp') ?? false
  } catch {
    return false
  }
}

function isIosSafari() {
  const { navigator } = window
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isIpadDesktopUserAgent = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return (isIphoneOrIpad || isIpadDesktopUserAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR/.test(navigator.userAgent)
}

function isAndroidBrowser() {
  return /Android/i.test(window.navigator.userAgent)
}

function resetInstallDialog() {
  installPromptDismissed.value = false
}

export function dismissInstallPrompt() {
  installPromptDismissed.value = true
}

export async function requestAppInstall() {
  const prompt = deferredInstallPrompt.value
  if (!prompt) return false

  await prompt.prompt()
  const choice = await prompt.userChoice
  deferredInstallPrompt.value = null
  dismissInstallPrompt()
  return choice.outcome === 'accepted'
}

export default async function registerPwaInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt.value = event
    manualInstallGuide.value = null
    resetInstallDialog()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt.value = null
    manualInstallGuide.value = null
    dismissInstallPrompt()
  })

  if (await isInstalledApp() || deferredInstallPrompt.value !== null) return

  if (isIosSafari()) {
    manualInstallGuide.value = 'ios'
    resetInstallDialog()
  } else if (isAndroidBrowser()) {
    // Chrome bisa menahan beforeinstallprompt (misalnya setelah pengguna pernah menolaknya).
    // Tetap tampilkan panduan agar pengguna dapat memasang aplikasi dari menu browser.
    manualInstallGuide.value = 'android'
    resetInstallDialog()
  }
}
