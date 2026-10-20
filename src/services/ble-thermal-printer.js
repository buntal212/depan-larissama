export const CANDIDATE_PRINTER_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'

export const PRINTER_WRITE_CHUNK_SIZE = 20

const encoder = new TextEncoder()

export function buildPrinterTestBytes() {
  return concatBytes(
    Uint8Array.from([0x1b, 0x40]), // ESC @: initialize printer
    Uint8Array.from([0x1b, 0x61, 0x01]), // ESC a 1: center
    encoder.encode('LARISAMA BLE TEST\nPUTIAN POS 58D-01\n'),
    Uint8Array.from([0x1b, 0x61, 0x00]), // ESC a 0: left
    encoder.encode('--------------------------------\nBLE ESC/POS OK\n\n'),
  )
}

export function getCharacteristicProperties(properties) {
  return [
    'read',
    'write',
    'writeWithoutResponse',
    'notify',
    'indicate',
    'authenticatedSignedWrites',
    'reliableWrite',
    'writableAuxiliaries',
  ].filter((property) => properties?.[property])
}

export function concatBytes(...parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

export function formatBleError(error) {
  if (error?.name === 'NotFoundError' || error?.name === 'AbortError') {
    return 'Pemilihan printer dibatalkan atau tidak ada perangkat yang dipilih.'
  }
  if (error?.name === 'SecurityError') {
    return 'Browser menolak akses Bluetooth. Pastikan aplikasi dibuka melalui HTTPS dan izin Bluetooth diizinkan.'
  }
  if (error?.name === 'NetworkError') {
    return 'Koneksi BLE terputus atau perangkat menolak koneksi. Pastikan printer menyala dan berada dekat perangkat.'
  }
  return error?.message || 'Terjadi kesalahan saat mengakses printer BLE.'
}
