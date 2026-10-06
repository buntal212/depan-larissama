<template>
  <q-dialog
    :model-value="modelValue"
    class="receipt-print-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="receipt-dialog-card">
      <div class="receipt-paper">
        <header class="receipt-store-header">
          <strong>{{ warung?.nama || 'Warung' }}</strong>
          <span v-if="warung?.alamat">{{ warung.alamat }}</span>
          <span v-if="warung?.telepon">{{ warung.telepon }}</span>
        </header>

        <div class="receipt-divider"></div>
        <div class="receipt-meta"><span>No. transaksi</span><strong>{{ sale?.no_transaksi }}</strong></div>
        <div class="receipt-meta"><span>Waktu</span><span>{{ formatDate(sale?.tanggal) }}</span></div>
        <div v-if="cashierName" class="receipt-meta"><span>Kasir</span><span>{{ cashierName }}</span></div>
        <div class="receipt-divider"></div>

        <div v-for="(line, index) in sale?.rincian || []" :key="line.id || index" class="receipt-item">
          <strong>{{ line.nama_menu }}</strong>
          <div class="receipt-meta">
            <span>{{ formatQuantity(line.qty) }} × {{ formatPrice(line.harga) }}</span>
            <strong>{{ formatPrice(line.subtotal) }}</strong>
          </div>
          <div v-if="Number(line.diskon) > 0" class="receipt-meta receipt-muted">
            <span>Diskon item</span><span>-{{ formatPrice(line.diskon) }}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>
        <div class="receipt-meta"><span>Subtotal</span><span>{{ formatPrice(sale?.subtotal) }}</span></div>
        <div class="receipt-meta"><span>Diskon</span><span>-{{ formatPrice(sale?.diskon) }}</span></div>
        <div class="receipt-meta receipt-total"><strong>Total</strong><strong>{{ formatPrice(sale?.total) }}</strong></div>
        <div class="receipt-meta"><span>Pembayaran</span><span>{{ paymentLabel(sale?.metode_pembayaran) }}</span></div>
        <template v-if="sale?.metode_pembayaran === 'cash'">
          <div class="receipt-meta"><span>Dibayar</span><span>{{ formatPrice(sale?.bayar) }}</span></div>
          <div class="receipt-meta"><span>Kembalian</span><span>{{ formatPrice(sale?.kembalian) }}</span></div>
        </template>
        <div v-if="sale?.catatan" class="receipt-note">Catatan: {{ sale.catatan }}</div>
        <footer class="receipt-footer">
          Terima kasih atas kunjungan Anda
          <small>Dibuat oleh <strong>Udumbara Informatika</strong></small>
        </footer>
      </div>

      <q-separator />
      <q-card-actions align="right" class="receipt-print-actions">
        <q-btn flat no-caps label="Tutup" @click="$emit('update:modelValue', false)" />
        <q-btn unelevated no-caps color="primary" icon="print" label="Cetak struk" @click="printReceipt" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sale: { type: Object, default: null },
  warung: { type: Object, default: null },
  cashierName: { type: String, default: '' },
})
defineEmits(['update:modelValue'])

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatQuantity(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value || 0))
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
  document.body.classList.add('print-pos-receipt')
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-pos-receipt')
  }, { once: true })
  window.print()
}
</script>
