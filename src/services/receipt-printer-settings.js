import { reactive, ref, watch } from 'vue'

const storageKey = 'larisama:receipt-printer'
const defaults = { paperWidth: '58', columnsByPaper: { 58: 31, 80: 42 } }
const saved = readSettings()
const paperWidth = ref(saved.paperWidth)
const columnsByPaper = reactive(saved.columnsByPaper)

watch([paperWidth, columnsByPaper], saveSettings, { deep: true })

export function useReceiptPrinterSettings() {
  return { paperWidth, columnsByPaper }
}

export function clampColumns(value, width = '80') {
  const parsed = Number.parseInt(value, 10)
  const maximum = width === '58' ? 32 : 48
  return Number.isInteger(parsed) ? Math.max(20, Math.min(maximum, parsed)) : (width === '58' ? 31 : 42)
}

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return {
      paperWidth: ['58', '80'].includes(stored.paperWidth) ? stored.paperWidth : defaults.paperWidth,
      columnsByPaper: {
        58: clampColumns(stored.columnsByPaper?.[58] ?? defaults.columnsByPaper[58], '58'),
        80: clampColumns(stored.columnsByPaper?.[80] ?? defaults.columnsByPaper[80], '80'),
      },
    }
  } catch {
    return defaults
  }
}

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ paperWidth: paperWidth.value, columnsByPaper }))
  } catch {
    // Storage is optional; printer settings remain available for this session.
  }
}
