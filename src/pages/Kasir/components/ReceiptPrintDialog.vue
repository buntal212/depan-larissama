<template>
  <q-dialog
    :model-value="modelValue"
    class="receipt-print-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="receipt-dialog-card" :style="{ '--receipt-paper-width': `${paperWidth}mm` }">
      <div class="receipt-paper">
        <header class="receipt-store-header">
          <img v-if="warung?.logo" :src="warung.logo" :alt="`Logo ${warung?.nama || 'warung'}`" class="receipt-store-logo" />
          <div class="receipt-store-header-lines">
            <div v-for="(line, index) in storeHeaderLines" :key="index" class="receipt-line receipt-header-line">{{ line }}</div>
          </div>
        </header>
        <div class="receipt-text" aria-label="Pratinjau isi struk">
          <div
            v-for="(line, index) in receiptLines"
            :key="index"
            class="receipt-line"
            :class="{ 'receipt-line--emphasis': line.emphasis, 'receipt-line--muted': line.muted }"
          >{{ line.text || '\u00a0' }}</div>
        </div>
      </div>
      <q-separator />
      <q-card-actions class="receipt-print-actions">
        <div class="receipt-print-settings">
          <q-select
            v-model="paperWidth"
            dense
            outlined
            options-dense
            emit-value
            map-options
            label="Lebar kertas"
            :options="paperOptions"
          />
          <q-input
            v-model.number="activeColumns"
            dense
            outlined
            type="number"
            label="Karakter/baris"
            min="20"
            :max="paperWidth === '58' ? 32 : 48"
          />
        </div>
        <div class="receipt-print-buttons">
          <q-btn flat no-caps label="Tutup" @click="$emit('update:modelValue', false)" />
          <q-btn unelevated no-caps color="primary" icon="print" label="Cetak struk" @click="printReceipt" />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sale: { type: Object, default: null },
  warung: { type: Object, default: null },
  cashierName: { type: String, default: '' },
})
defineEmits(['update:modelValue'])

const paperOptions = [
  { label: '58 mm', value: '58' },
  { label: '80 mm', value: '80' },
]
const settings = readSettings()
const paperWidth = ref(settings.paperWidth)
const columnsByPaper = reactive(settings.columnsByPaper)
const activeColumns = computed({
  get: () => columnsByPaper[paperWidth.value],
  set: (value) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed)) columnsByPaper[paperWidth.value] = clampColumns(parsed, paperWidth.value)
  },
})
const storeHeaderLines = computed(() => {
  const rows = [props.warung?.nama || 'Warung', props.warung?.alamat, props.warung?.telepon]
  return rows.filter(Boolean).flatMap((row) => alignCenter(row, activeColumns.value))
})
const receiptLines = computed(() => formatReceipt(props.sale, props.cashierName, activeColumns.value))
watch([paperWidth, columnsByPaper], saveSettings, { deep: true })

function formatPrice(value) {
  const source = String(value ?? '0').trim()
  const negative = source.startsWith('-')
  const [wholePart = '0'] = source.replace(/^-/, '').split('.')
  const whole = (wholePart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${negative ? '-' : ''}${whole}`
}

function formatQuantity(value) {
  const source = String(value ?? '0').trim()
  const negative = source.startsWith('-')
  const [wholePart = '0', fractionPart = ''] = source.replace(/^-/, '').split('.')
  const whole = (wholePart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const fraction = fractionPart.slice(0, 2).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `,${fraction}` : ''}`
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: props.warung?.timezone || 'Asia/Jakarta',
  }).format(new Date(value))
}

function paymentLabel(value) {
  return { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }[value] || value || '—'
}

function printReceipt() {
  printDocument()
}

async function printDocument() {
  document.body.classList.remove('print-pos-receipt-58', 'print-pos-receipt-80')
  document.body.classList.add('print-pos-receipt', `print-pos-receipt-${paperWidth.value}`)
  await nextTick()
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-pos-receipt', 'print-pos-receipt-58', 'print-pos-receipt-80')
  }, { once: true })
  window.print()
}

function readSettings() {
  const defaults = { paperWidth: '80', columnsByPaper: { 58: 30, 80: 42 } }
  try {
    const stored = JSON.parse(localStorage.getItem('larisama:receipt-printer') || '{}')
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
    localStorage.setItem('larisama:receipt-printer', JSON.stringify({ paperWidth: paperWidth.value, columnsByPaper }))
  } catch {
    // Browser storage is optional; printing remains available for this session.
  }
}

function clampColumns(value, width = '80') {
  const parsed = Number.parseInt(value, 10)
  const maximum = width === '58' ? 32 : 48
  return Number.isInteger(parsed) ? Math.max(20, Math.min(maximum, parsed)) : (width === '58' ? 30 : 42)
}

function formatReceipt(sale, cashierName, columns) {
  const data = sale
  if (!data) return []

  const lines = []
  const add = (text, emphasis = false, muted = false) => lines.push({ text, emphasis, muted })
  const addWrapped = (rows, emphasis = false, muted = false) => rows.forEach((text) => add(text, emphasis, muted))
  const divider = () => add('-'.repeat(columns), false, true)
  const addPair = (label, value, emphasis = false) => addWrapped(twoColumns(label, value, columns), emphasis)

  divider()
  addPair('No. transaksi', '')
  addWrapped(alignLeft(data.no_transaksi || '—', columns))
  addPair('Waktu', formatDate(data.tanggal))
  if (cashierName) addPair('Kasir', cashierName)
  divider()
  for (const item of data.rincian || []) {
    addWrapped(alignLeft(item.nama_menu || 'Item', columns))
    addPair(`${formatQuantity(item.qty)} x ${formatPrice(item.harga)}`, formatPrice(item.subtotal))
    if (hasPositiveAmount(item.diskon)) addPair('Diskon item', `-${formatPrice(item.diskon)}`)
  }
  divider()
  addPair('Subtotal', formatPrice(data.subtotal))
  addPair('Diskon', `-${formatPrice(data.diskon)}`)
  addPair('TOTAL', formatPrice(data.total), true)
  addPair('Pembayaran', data.status_pembayaran === 'belum_lunas' ? 'Belum lunas' : paymentLabel(data.metode_pembayaran))
  if (data.metode_pembayaran === 'cash') {
    addPair('Dibayar', formatPrice(data.bayar))
    addPair('Kembalian', formatPrice(data.kembalian))
  }
  if (data.catatan) addWrapped(alignLeft(`Catatan: ${data.catatan}`, columns), false, true)
  divider()
  addWrapped(alignCenter(data.status_pembayaran === 'belum_lunas' ? 'Pesanan belum dibayar' : 'Terima kasih atas kunjungan Anda', columns))
  addWrapped(alignCenter('Dibuat oleh Udumbara Informatika', columns), false, true)
  return lines
}

function alignLeft(text, width) {
  return wrapText(text, width)
}

function alignCenter(text, width) {
  return wrapText(text, width).map((line) => {
    const padding = Math.max(0, width - characterCount(line))
    const leftPadding = Math.floor(padding / 2)
    return `${' '.repeat(leftPadding)}${line}${' '.repeat(padding - leftPadding)}`
  })
}

function alignRight(text, width) {
  return wrapText(text, width).map((line) => `${' '.repeat(Math.max(0, width - characterCount(line)))}${line}`)
}

function twoColumns(label, value, width) {
  const left = String(label ?? '')
  const right = String(value ?? '')
  if (!right) return alignLeft(left, width)
  const valueWidth = characterCount(right)
  if (valueWidth >= width) return [...wrapText(left, width), ...alignRight(right, width)]
  const labelWidth = Math.max(1, width - valueWidth - 1)
  const labelLines = wrapText(left, labelWidth)
  return labelLines.map((line, index) => {
    if (index < labelLines.length - 1) return line
    const padding = Math.max(1, width - characterCount(line) - valueWidth)
    return `${line}${' '.repeat(padding)}${right}`
  })
}

function wrapText(value, width) {
  const words = String(value ?? '').split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines = []
  let line = ''
  for (const word of words) {
    const wordCharacters = Array.from(word)
    if (wordCharacters.length > width) {
      if (line) { lines.push(line); line = '' }
      for (let offset = 0; offset < wordCharacters.length; offset += width) lines.push(wordCharacters.slice(offset, offset + width).join(''))
    } else if (!line) {
      line = word
    } else if (characterCount(line) + 1 + wordCharacters.length <= width) {
      line += ` ${word}`
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function characterCount(value) {
  return Array.from(value).length
}

function hasPositiveAmount(value) {
  return /[1-9]/.test(String(value ?? '0')) && !String(value).trim().startsWith('-')
}
</script>
