<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="product-form-dialog checkout-dialog-card">
      <q-card-section class="dialog-header">
        <div class="dialog-header-copy">
          <div class="dialog-eyebrow">KASIR</div>
          <div class="text-h6 dialog-title">Pembayaran</div>
          <div class="dialog-subtitle">Total akhir dihitung dan divalidasi oleh server.</div>
        </div>
        <q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="$emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-form class="q-pa-lg" @submit.prevent="submit">
        <div class="checkout-total-row"><span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong></div>
        <CurrencyInput v-model="form.discount" label="Diskon transaksi" min="0" :rules="[() => Number(form.discount) <= subtotal || 'Diskon tidak boleh melebihi subtotal']" />
        <div class="checkout-total-row checkout-grand-total"><span>Total pratinjau</span><strong>{{ formatPrice(total) }}</strong></div>
        <q-select
          v-model="form.method"
          outlined
          emit-value
          map-options
          label="Metode pembayaran"
          :options="paymentOptions"
          behavior="menu"
          popup-content-class="checkout-method-popup"
        />
        <CurrencyInput v-model="form.paid" label="Jumlah dibayar" min="0" :disable="form.method !== 'cash'" :rules="[() => Number(form.paid) >= total || (form.method === 'cash' ? 'Pembayaran kurang dari total' : 'Jumlah harus sama dengan total')]" />
        <div v-if="form.method === 'cash'" class="checkout-total-row"><span>Kembalian pratinjau</span><strong>{{ formatPrice(Math.max(0, Number(form.paid || 0) - total)) }}</strong></div>
        <q-input v-model.trim="form.note" outlined type="textarea" autogrow maxlength="2000" label="Catatan (opsional)" />
        <div class="row justify-end q-gutter-sm q-mt-lg">
          <q-btn flat no-caps label="Kembali" @click="$emit('update:modelValue', false)" />
          <q-btn unelevated no-caps color="primary" icon="check" label="Simpan transaksi" type="submit" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import CurrencyInput from '@/components/CurrencyInput.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  subtotal: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const paymentOptions = [
  { label: 'Tunai', value: 'cash' },
  { label: 'QRIS', value: 'qris' },
  { label: 'Transfer', value: 'transfer' },
]
const form = reactive({ discount: 0, method: 'cash', paid: 0, note: '' })
const total = computed(() => Math.max(0, Number(props.subtotal || 0) - Number(form.discount || 0)))

watch(() => [form.method, total.value], () => {
  if (form.method !== 'cash') form.paid = total.value
})
watch(() => props.modelValue, (open) => {
  if (open) Object.assign(form, { discount: 0, method: 'cash', paid: props.subtotal, note: '' })
})

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value || 0))
}

function submit() {
  if (Number(form.discount) > props.subtotal || Number(form.paid) < total.value) return
  if (form.method !== 'cash' && Number(form.paid) !== total.value) return
  emit('confirm', { subtotal: props.subtotal, discount: Number(form.discount || 0), total: total.value, method: form.method, paid: Number(form.paid || 0), change: Math.max(0, Number(form.paid || 0) - total.value), note: form.note.trim(), tanggal: new Date().toISOString() })
}
</script>

<style scoped>
.checkout-dialog-card { width: min(calc(100vw - 32px), 500px); }
.checkout-total-row { display: flex; align-items: center; justify-content: space-between; margin: 0 0 14px; color: #66766c; font-size: 13px; }
.checkout-total-row strong { color: #213d2e; }
.checkout-grand-total { margin: 4px 0 18px; padding: 14px 0; border-block: 1px solid #e9eeea; font-size: 15px; }
</style>
