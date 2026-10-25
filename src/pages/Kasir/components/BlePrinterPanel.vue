<template>
  <q-expansion-item
    dense
    default-opened
    expand-separator
    icon="bluetooth"
    label="Printer nirkabel"
    caption="Koneksi otomatis ke printer yang pernah dipilih"
    header-class="printer-panel-header"
    class="ble-printer-panel"
  >
    <div class="q-pa-md ble-printer-content">
      <q-banner v-if="!hasBluetoothApi || !isSecureContext" dense rounded class="bg-orange-1 text-dark q-mb-sm">
        <template #avatar><q-icon name="info" color="orange-9" /></template>
        <div v-if="!hasBluetoothApi">Browser ini belum mendukung koneksi printer. Coba gunakan Chrome Android.</div>
        <div v-else>Koneksi printer memerlukan HTTPS atau localhost.</div>
        <div class="text-caption q-mt-xs">Dukungan browser: {{ hasBluetoothApi ? 'tersedia' : 'tidak tersedia' }} · Koneksi aman: {{ isSecureContext ? 'ya' : 'tidak' }}</div>
      </q-banner>

      <q-banner dense rounded :class="statusBannerClass" class="q-mb-sm">
        <template #avatar><q-icon :name="statusIcon" /></template>
        <strong>{{ statusLabel }}</strong>
        <div class="text-caption">{{ statusMessage }}</div>
      </q-banner>

      <div class="printer-control-grid">
        <div>
          <q-btn
            v-if="!isConnected"
            outline
            no-caps
            color="primary"
            :label="hasSelectedDevice ? 'Sambungkan ulang' : 'Hubungkan printer'"
            :loading="status === 'connecting'"
            :disable="!canConnect || status === 'connecting' || status === 'printing'"
            @click="connectPrinter"
          />
          <q-btn v-else outline no-caps color="negative" label="Putuskan koneksi" :disable="status === 'printing'" @click="disconnectPrinter" />
        </div>
        <div>
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="receipt_long"
            label="Tes printer"
            :loading="status === 'printing'"
            :disable="!isConnected || status === 'printing'"
            @click="testPrint"
          />
        </div>
        <div class="printer-delay-field">
          <q-input v-model.number="delayMs" dense outlined type="number" label="Jeda pengiriman" suffix="ms" min="0" max="1000" :disable="status === 'printing'" />
        </div>
      </div>

      <q-expansion-item
        v-if="debugCharacteristics.length"
        dense
        dense-toggle
        label="Detail koneksi"
        class="q-mt-sm"
      >
        <div class="text-caption text-grey-8 q-pa-sm">
          UUID perangkat: <code>{{ CANDIDATE_PRINTER_SERVICE_UUID }}</code> · {{ PRINTER_WRITE_CHUNK_SIZE }} byte per kiriman
        </div>
        <q-list dense separator>
          <q-item v-for="entry in debugCharacteristics" :key="`${entry.serviceUuid}-${entry.characteristicUuid}`">
            <q-item-section>
              <q-item-label class="ble-uuid">Service: {{ entry.serviceUuid }}</q-item-label>
              <q-item-label caption class="ble-uuid">Characteristic: {{ entry.characteristicUuid }}</q-item-label>
              <q-item-label caption>Properti: {{ entry.properties.join(', ') || 'tidak ada' }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-expansion-item>
    </div>
  </q-expansion-item>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useBleThermalPrinter } from '@/services/useBleThermalPrinter.js'
import { CANDIDATE_PRINTER_SERVICE_UUID, PRINTER_WRITE_CHUNK_SIZE } from '@/services/ble-thermal-printer.js'

const {
  canConnect,
  connectPrinter,
  debugCharacteristics,
  delayMs,
  disconnectPrinter,
  hasBluetoothApi,
  hasSelectedDevice,
  isConnected,
  isSecureContext,
  reconnectRememberedPrinter,
  status,
  statusMessage,
  testPrint,
} = useBleThermalPrinter()

const props = defineProps({ active: { type: Boolean, default: false } })

watch(() => props.active, (active) => {
  if (active) reconnectRememberedPrinter()
}, { immediate: true })

const statusLabel = computed(() => ({
  connecting: 'Menghubungkan',
  connected: 'Terhubung',
  disconnected: 'Terputus',
  printing: 'Mencetak tes',
  error: 'Error',
}[status.value] || 'Terputus'))
const statusIcon = computed(() => ({
  connecting: 'bluetooth_searching',
  connected: 'bluetooth_connected',
  disconnected: 'bluetooth_disabled',
  printing: 'sync',
  error: 'error_outline',
}[status.value] || 'bluetooth_disabled'))
const statusBannerClass = computed(() => ({
  connecting: 'bg-blue-1 text-blue-10',
  connected: 'bg-green-1 text-green-10',
  disconnected: 'bg-grey-2 text-grey-9',
  printing: 'bg-blue-1 text-blue-10',
  error: 'bg-red-1 text-red-10',
}[status.value] || 'bg-grey-2 text-grey-9'))
</script>

<style scoped>
.ble-printer-content { min-width: 0; }
.ble-printer-panel :deep(.printer-panel-header) { min-height: 64px; padding-block: 12px; }
.printer-control-grid { display: grid; grid-template-columns: max-content max-content minmax(180px, 1fr); align-items: end; gap: 12px; }
.printer-control-grid > div { min-width: 0; }
.printer-control-grid :deep(.q-btn) { min-height: 42px; }
.printer-delay-field { max-width: 320px; }
.ble-uuid { overflow-wrap: anywhere; word-break: break-word; }
@media (max-width: 700px) {
  .printer-control-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .printer-control-grid > div, .printer-control-grid :deep(.q-btn), .printer-delay-field { width: 100%; max-width: none; }
}
</style>
