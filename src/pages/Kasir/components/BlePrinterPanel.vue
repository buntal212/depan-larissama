<template>
  <q-expansion-item
    dense
    expand-separator
    icon="bluetooth"
    label="Printer BLE (eksperimen)"
    caption="Tes koneksi langsung dari browser Android"
    class="ble-printer-panel"
  >
    <div class="q-pa-md ble-printer-content">
      <q-banner v-if="!hasBluetoothApi || !isSecureContext" dense rounded class="bg-orange-1 text-dark q-mb-sm">
        <template #avatar><q-icon name="info" color="orange-9" /></template>
        <div v-if="!hasBluetoothApi">Web Bluetooth tidak terdeteksi. Coba Chrome Android yang mendukung BLE.</div>
        <div v-else>Web Bluetooth memerlukan HTTPS atau localhost. Origin ini belum secure.</div>
        <div class="text-caption q-mt-xs">Dukungan: {{ hasBluetoothApi ? 'tersedia' : 'tidak tersedia' }} · Secure context: {{ isSecureContext ? 'ya' : 'tidak' }}</div>
      </q-banner>

      <q-banner dense rounded :class="statusBannerClass" class="q-mb-sm">
        <template #avatar><q-icon :name="statusIcon" /></template>
        <strong>{{ statusLabel }}</strong>
        <div class="text-caption">{{ statusMessage }}</div>
      </q-banner>

      <div class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-auto">
          <q-btn
            v-if="!isConnected"
            outline
            no-caps
            color="primary"
            :label="hasSelectedDevice ? 'Sambungkan ulang' : 'Connect Printer'"
            :loading="status === 'connecting'"
            :disable="!canConnect || status === 'connecting' || status === 'printing'"
            @click="connectPrinter"
          />
          <q-btn v-else outline no-caps color="negative" label="Putuskan" :disable="status === 'printing'" @click="disconnectPrinter" />
        </div>
        <div class="col-12 col-sm-auto">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="receipt_long"
            label="Test print BLE"
            :loading="status === 'printing'"
            :disable="!isConnected || status === 'printing'"
            @click="testPrint"
          />
        </div>
        <div class="col-12 col-sm-5">
          <q-input v-model.number="delayMs" dense outlined type="number" label="Jeda antar chunk" suffix="ms" min="0" max="1000" :disable="status === 'printing'" />
        </div>
      </div>

      <div class="text-caption text-grey-8 q-mt-sm">
        Service kandidat: <code>{{ CANDIDATE_PRINTER_SERVICE_UUID }}</code> · chunk {{ PRINTER_WRITE_CHUNK_SIZE }} byte
      </div>

      <q-expansion-item
        v-if="debugCharacteristics.length"
        dense
        dense-toggle
        label="Detail GATT untuk debugging"
        class="q-mt-sm"
      >
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
import { computed } from 'vue'
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
  status,
  statusMessage,
  testPrint,
} = useBleThermalPrinter()

const statusLabel = computed(() => ({
  connecting: 'Menghubungkan',
  connected: 'Terhubung',
  disconnected: 'Terputus',
  printing: 'Mengirim test print',
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
.ble-uuid { overflow-wrap: anywhere; word-break: break-word; }
</style>
