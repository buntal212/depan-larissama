export const CANDIDATE_PRINTER_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'

export const PRINTER_WRITE_CHUNK_SIZE = 20

const encoder = new TextEncoder()
const CP437_EXTENDED = Array.from(
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ',
)
const CP437_CODE_BY_CHARACTER = new Map(CP437_EXTENDED.map((character, index) => [character, index + 128]))
const CP437_REPLACEMENTS = { '—': '-', '–': '-', '…': '...', '×': 'x', '’': "'", '‘': "'", '“': '"', '”': '"', '•': '*' }

export function buildPrinterTestBytes() {
  return concatBytes(
    Uint8Array.from([0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x4d, 0x00, 0x1b, 0x20, 0x00, 0x1d, 0x21, 0x00]),
    Uint8Array.from([0x1b, 0x61, 0x01]), // ESC a 1: center
    encoder.encode('LARISAMA BLE TEST\nPUTIAN POS 58D-01\n'),
    Uint8Array.from([0x1b, 0x61, 0x00]), // ESC a 0: left
    encoder.encode('--------------------------------\nBLE ESC/POS OK\n\n'),
  )
}

export function buildEscPosReceiptBytes(lines, logoRaster = null) {
  const parts = [Uint8Array.from([
    0x1b, 0x40, // ESC @: initialize
    0x1b, 0x74, 0x00, // ESC t 0: CP437 on the target printer profile
    0x1b, 0x20, 0x00, // ESC SP 0: normal character spacing
    0x1b, 0x4d, 0x00, // ESC M 0: Font A
    0x1d, 0x21, 0x00, // GS ! 0: normal size
    0x1b, 0x61, 0x00, // ESC a 0: left alignment
    0x1b, 0x45, 0x00, // ESC E 0: emphasis off
  ])]

  if (logoRaster?.length) {
    parts.push(Uint8Array.from([0x1b, 0x61, 0x01]))
    parts.push(logoRaster)
    parts.push(Uint8Array.from([0x0a, 0x1b, 0x61, 0x00]))
  }

  let currentAlignment = 0
  let currentEmphasis = false
  for (const line of lines) {
    const alignment = line.align === 'center' ? 1 : 0
    const emphasis = Boolean(line.emphasis)
    if (alignment !== currentAlignment) {
      parts.push(Uint8Array.from([0x1b, 0x61, alignment]))
      currentAlignment = alignment
    }
    if (emphasis !== currentEmphasis) {
      parts.push(Uint8Array.from([0x1b, 0x45, emphasis ? 1 : 0]))
      currentEmphasis = emphasis
    }
    const text = alignment === 1 ? String(line.text ?? '').trim() : String(line.text ?? '')
    parts.push(encodeCp437(`${text}\n`))
  }

  parts.push(Uint8Array.from([
    0x1b, 0x45, 0x00,
    0x1b, 0x4d, 0x00,
    0x1b, 0x61, 0x00,
    0x0a, 0x0a,
  ]))
  return concatBytes(...parts)
}

export function encodeCp437(value) {
  const bytes = []
  for (const character of String(value ?? '')) {
    const directCode = character.codePointAt(0)
    if (directCode <= 0x7f) {
      bytes.push(directCode)
      continue
    }
    const cp437Code = CP437_CODE_BY_CHARACTER.get(character)
    if (cp437Code !== undefined) {
      bytes.push(cp437Code)
      continue
    }

    const replacement = CP437_REPLACEMENTS[character]
      || character.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    for (const fallbackCharacter of replacement) {
      const fallbackCode = fallbackCharacter.codePointAt(0)
      bytes.push(fallbackCode <= 0x7f ? fallbackCode : 0x3f)
    }
  }
  return Uint8Array.from(bytes)
}

export async function buildSmallLogoRaster(src, targetDots = 48) {
  if (!src || typeof Image === 'undefined' || typeof document === 'undefined') return null
  try {
    const image = await loadImage(src)
    const ratio = Math.min(targetDots / image.naturalWidth, targetDots / image.naturalHeight, 1)
    const width = Math.max(8, Math.floor((image.naturalWidth * ratio) / 8) * 8)
    const height = Math.max(1, Math.round(image.naturalHeight * (width / image.naturalWidth)))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    const darkBackground = isDarkBackground(pixels, width, height)
    const bytesPerRow = Math.ceil(width / 8)
    const raster = new Uint8Array(bytesPerRow * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixelIndex = (y * width + x) * 4
        const alpha = pixels[pixelIndex + 3] / 255
        const luminance = ((pixels[pixelIndex] * 299) + (pixels[pixelIndex + 1] * 587) + (pixels[pixelIndex + 2] * 114)) / 1000
        const compositedLuminance = (luminance * alpha) + (255 * (1 - alpha))
        const isBlack = darkBackground ? compositedLuminance > 150 : compositedLuminance < 150
        if (isBlack) raster[(y * bytesPerRow) + Math.floor(x / 8)] |= (0x80 >> (x % 8))
      }
    }
    return concatBytes(
      Uint8Array.from([0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff]),
      raster,
    )
  } catch {
    return null
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Logo gagal dibaca untuk dicetak.'))
    image.src = src
    if (image.complete && image.naturalWidth) resolve(image)
  })
}

function isDarkBackground(pixels, width, height) {
  const samplePoints = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
  const luminance = samplePoints.reduce((total, [x, y]) => {
    const index = ((y * width) + x) * 4
    return total + ((pixels[index] * 299 + pixels[index + 1] * 587 + pixels[index + 2] * 114) / 1000)
  }, 0) / samplePoints.length
  return luminance < 128
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
