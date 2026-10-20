<template>
  <q-page class="settings-page page-shell">
    <div class="page-heading">
      <div>
        <div class="eyebrow">PERANGKAT KASIR</div>
        <h1>Pengaturan</h1>
        <p>Hubungkan dan atur printer struk untuk perangkat ini.</p>
      </div>
    </div>

    <q-card flat bordered class="settings-card">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Printer struk</div>
        <div class="text-body2 text-grey-7 q-mt-xs">
          Koneksi disimpan oleh browser pada perangkat ini. Setelah tersambung, buka kasir dan cetak struk menggunakan printer BLE.
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-select
            v-model="paperWidth"
            outlined
            dense
            emit-value
            map-options
            label="Lebar kertas"
            :options="paperOptions"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="activeColumns"
            outlined
            dense
            type="number"
            label="Karakter per baris"
            min="20"
            :max="paperWidth === '58' ? 32 : 48"
          />
        </div>
      </q-card-section>
      <q-separator />
      <BlePrinterPanel active />
    </q-card>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import BlePrinterPanel from '@/pages/Kasir/components/BlePrinterPanel.vue'
import { clampColumns, useReceiptPrinterSettings } from '@/services/receipt-printer-settings.js'

const paperOptions = [
  { label: '58 mm', value: '58' },
  { label: '80 mm', value: '80' },
]
const { paperWidth, columnsByPaper } = useReceiptPrinterSettings()
const activeColumns = computed({
  get: () => columnsByPaper[paperWidth.value],
  set: (value) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed)) columnsByPaper[paperWidth.value] = clampColumns(parsed, paperWidth.value)
  },
})
</script>

<style scoped>
.settings-page { max-width: 1100px; margin: 0 auto; }
.page-heading { margin-bottom: 24px; }
.eyebrow { color: #71847b; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
h1 { margin: 6px 0; color: #104f39; font-size: clamp(26px, 4vw, 34px); line-height: 1.15; }
p { margin: 0; color: #718078; }
.settings-card { border-radius: 16px; }
</style>
