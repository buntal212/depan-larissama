<template>
  <section class="printer-settings-tab">
    <q-card flat bordered class="settings-card">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Printer struk</div>
        <div class="text-body2 text-grey-7 q-mt-xs">
          Koneksi printer tersimpan di browser perangkat ini. Setelah tersambung, kasir dapat
          mencetak struk secara nirkabel.
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
  </section>
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
.settings-card {
  max-width: 900px;
  overflow: hidden;
  border-radius: 14px;
}
</style>
