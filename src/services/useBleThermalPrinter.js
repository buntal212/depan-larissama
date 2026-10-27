import { computed, ref, shallowRef } from 'vue'
import {
  buildPrinterTestBytes,
  CANDIDATE_PRINTER_SERVICE_UUID,
  formatBleError,
  getCharacteristicProperties,
  PRINTER_WRITE_CHUNK_SIZE,
} from '@/services/ble-thermal-printer.js'

const CONNECT_TIMEOUT_MS = 30000
const DISCOVERY_TIMEOUT_MS = 10000
const WRITE_TIMEOUT_MS = 8000
let intentionallyDisconnectedDevice = null

// Keep the GATT connection alive while users navigate between settings and cashier.
const status = ref('disconnected')
const statusMessage = ref('Printer belum terhubung.')
const errorMessage = ref('')
const device = shallowRef(null)
const selectedCharacteristic = shallowRef(null)
const debugCharacteristics = ref([])
const delayMs = ref(40)
const hasBluetoothApi = computed(() => typeof navigator !== 'undefined' && Boolean(navigator.bluetooth))
const isSecureContext = computed(() => typeof window !== 'undefined' && window.isSecureContext)
const canConnect = computed(() => hasBluetoothApi.value && isSecureContext.value)
const isConnected = computed(
  () => status.value === 'connected' && Boolean(selectedCharacteristic.value) && Boolean(device.value?.gatt?.connected),
)
const hasSelectedDevice = computed(() => Boolean(device.value))

export function useBleThermalPrinter() {
  async function connectPrinter() {
    if (!hasBluetoothApi.value) {
      setError('Browser ini belum mendukung koneksi printer. Coba gunakan Chrome Android.')
      return
    }
    if (!isSecureContext.value) {
      setError('Koneksi printer memerlukan HTTPS atau localhost. Alamat aplikasi saat ini belum aman.')
      return
    }
    if (status.value === 'connecting' || status.value === 'printing') return

    status.value = 'connecting'
    errorMessage.value = ''
    statusMessage.value = 'Memilih dan menghubungkan printer…'
    debugCharacteristics.value = []

    try {
      let targetDevice = device.value
      if (!targetDevice) {
        // Call requestDevice before any await so it retains the click gesture.
        const selection = navigator.bluetooth.requestDevice({
          filters: [{ name: 'RPP02N' }],
          optionalServices: [CANDIDATE_PRINTER_SERVICE_UUID],
        })
        targetDevice = await selection
      }

      await connectDevice(targetDevice)
    } catch (error) {
      selectedCharacteristic.value = null
      setError(formatBleError(error))
    }
  }

  async function reconnectRememberedPrinter() {
    if (!hasBluetoothApi.value || !isSecureContext.value) return
    if (status.value === 'connecting' || status.value === 'printing') return
    if (status.value === 'connected' && selectedCharacteristic.value && device.value?.gatt?.connected) return

    if (status.value === 'connected') {
      selectedCharacteristic.value = null
      status.value = 'disconnected'
    }

    const getDevices = navigator.bluetooth.getDevices
    let remembered = normalizeDeviceName(device.value?.name) === 'RPP02N' ? device.value : null
    if (typeof getDevices !== 'function' && !remembered) {
      status.value = 'disconnected'
      statusMessage.value = 'Browser belum mendukung penyambungan ulang otomatis. Tekan Hubungkan printer.'
      return
    }

    status.value = 'connecting'
    errorMessage.value = ''
    statusMessage.value = 'Mencari printer RPP02N yang pernah diizinkan…'
    try {
      if (!remembered && typeof getDevices === 'function') {
        const devices = await withTimeout(
          getDevices.call(navigator.bluetooth),
          DISCOVERY_TIMEOUT_MS,
          'Waktu pencarian perangkat tersimpan habis.',
        )
        remembered = devices.find((candidate) => normalizeDeviceName(candidate.name) === 'RPP02N') || null
      }
      if (!remembered) {
        device.value = null
        selectedCharacteristic.value = null
        status.value = 'disconnected'
        statusMessage.value = 'Printer belum pernah dipilih di situs ini. Tekan Hubungkan printer untuk memilihnya.'
        return
      }

      await connectRememberedDevice(remembered)
    } catch (error) {
      selectedCharacteristic.value = null
      setError(`Sambung ulang otomatis gagal: ${formatBleError(error)}`)
    }
  }

  async function connectDevice(targetDevice) {
    device.value = targetDevice
    targetDevice.addEventListener('gattserverdisconnected', handleDisconnect)
    status.value = 'connecting'
    errorMessage.value = ''
    statusMessage.value = `Menghubungkan ke ${targetDevice.name || 'printer'}…`

    const server = await withTimeout(
      targetDevice.gatt.connect(),
      CONNECT_TIMEOUT_MS,
      'Waktu koneksi GATT habis setelah 30 detik. Pastikan printer menyala dan tidak sedang tersambung ke perangkat atau aplikasi lain, lalu coba sambungkan ulang.',
    )
    const services = await withTimeout(
      server.getPrimaryServices(),
      DISCOVERY_TIMEOUT_MS,
      'Waktu pencarian service GATT habis.',
    )

    const discovered = []
    for (const service of services) {
      const characteristics = await withTimeout(
        service.getCharacteristics(),
        DISCOVERY_TIMEOUT_MS,
        `Waktu pencarian characteristic pada service ${service.uuid} habis.`,
      )
      for (const characteristic of characteristics) {
        discovered.push({
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          properties: getCharacteristicProperties(characteristic.properties),
          characteristic,
        })
      }
    }
    debugCharacteristics.value = discovered

    const writable = discovered.find((entry) => entry.properties.includes('writeWithoutResponse'))
      || discovered.find((entry) => entry.properties.includes('write'))
    if (!writable) {
      throw new Error(
        services.length
          ? 'Service berhasil ditemukan, tetapi tidak ada characteristic dengan properti write atau writeWithoutResponse.'
          : `Tidak ada service GATT yang dapat dibaca. UUID ${CANDIDATE_PRINTER_SERVICE_UUID} masih kandidat dan belum terverifikasi untuk printer ini.`,
      )
    }

    selectedCharacteristic.value = writable.characteristic
    status.value = 'connected'
    statusMessage.value = `Terhubung ke ${targetDevice.name || 'printer'}; characteristic tulis ditemukan.`
  }

  async function connectRememberedDevice(targetDevice) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await connectDevice(targetDevice)
        return
      } catch (error) {
        selectedCharacteristic.value = null
        if (attempt === 2 || !isTransientBleError(error)) throw error

        status.value = 'connecting'
        statusMessage.value = `Sambungan printer belum siap. Mencoba lagi (${attempt + 2}/3)…`
        await wait(1000 * (attempt + 1))
      }
    }
  }

  function handleDisconnect(event) {
    const isIntentionalDisconnect = event?.target === intentionallyDisconnectedDevice
    if (isIntentionalDisconnect) intentionallyDisconnectedDevice = null

    selectedCharacteristic.value = null
    status.value = 'disconnected'
    statusMessage.value = 'Printer terputus. Tekan Sambungkan ulang untuk mencoba kembali.'

    if (!isIntentionalDisconnect && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('larisama:printer-disconnected'))
    }
  }

  function disconnectPrinter() {
    const targetDevice = device.value
    intentionallyDisconnectedDevice = null
    if (targetDevice?.gatt?.connected) {
      intentionallyDisconnectedDevice = targetDevice
      targetDevice.gatt.disconnect()
    }
    selectedCharacteristic.value = null
    status.value = 'disconnected'
    statusMessage.value = 'Printer terputus.'
  }

  async function testPrint() {
    await sendBytes(buildPrinterTestBytes(), 'Data test print sudah dikirim. Periksa hasil fisik printer.', 'Pengiriman test print gagal.')
  }

  async function sendBytes(bytes, successMessage = 'Struk sudah dikirim ke printer.', failureMessage = 'Pengiriman struk gagal.') {
    const characteristic = selectedCharacteristic.value
    if (!characteristic || status.value !== 'connected') {
      errorMessage.value = 'Hubungkan printer dari menu Pengaturan sebelum mencetak secara nirkabel.'
      return false
    }
    status.value = 'printing'
    errorMessage.value = ''
    statusMessage.value = 'Mengirim data ke printer…'
    try {
      const pause = clampDelay(delayMs.value)
      for (let offset = 0; offset < bytes.length; offset += PRINTER_WRITE_CHUNK_SIZE) {
        const chunk = bytes.slice(offset, offset + PRINTER_WRITE_CHUNK_SIZE)
        await withTimeout(writeChunk(characteristic, chunk), WRITE_TIMEOUT_MS, `Waktu write chunk ${offset} habis.`)
        if (pause > 0 && offset + PRINTER_WRITE_CHUNK_SIZE < bytes.length) await wait(pause)
      }
      status.value = 'connected'
      statusMessage.value = successMessage
      return true
    } catch (error) {
      selectedCharacteristic.value = null
      setError(`${failureMessage} ${formatBleError(error)}`)
      if (!device.value?.gatt?.connected) handleDisconnect()
      return false
    }
  }

  function setError(message) {
    status.value = 'error'
    statusMessage.value = message
    errorMessage.value = message
  }

  return {
    canConnect,
    connectPrinter,
    debugCharacteristics,
    delayMs,
    disconnectPrinter,
    errorMessage,
    hasBluetoothApi,
    hasSelectedDevice,
    isConnected,
    isSecureContext,
    reconnectRememberedPrinter,
    sendBytes,
    status,
    statusMessage,
    testPrint,
  }
}

async function writeChunk(characteristic, chunk) {
  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    return characteristic.writeValueWithoutResponse(chunk)
  }
  if (characteristic.properties.write && characteristic.writeValueWithResponse) {
    return characteristic.writeValueWithResponse(chunk)
  }
  if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
    return characteristic.writeValue(chunk)
  }
  throw new Error('Characteristic tidak menyediakan metode tulis yang didukung browser.')
}

function clampDelay(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? Math.min(1000, Math.max(0, parsed)) : 40
}

function normalizeDeviceName(value) {
  return String(value || '').trim().toUpperCase()
}

function isTransientBleError(error) {
  return ['NetworkError', 'NotFoundError', 'InvalidStateError', 'AbortError'].includes(error?.name)
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds)
    }),
  ]).finally(() => window.clearTimeout(timeoutId))
}
