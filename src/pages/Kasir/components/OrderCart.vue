<template>
  <q-card flat bordered :class="['order-card', { 'cart-sheet': sheet }]">
    <div v-if="sheet" class="sheet-handle" aria-hidden="true"></div>
    <q-card-section class="order-heading row items-center">
      <div>
        <div class="panel-title">Pesanan</div>
        <div class="panel-caption">{{ cartQuantity }} item dipilih</div>
      </div>
      <q-space />
      <q-btn v-if="cart.length && !editing" flat round dense icon="delete_outline" color="grey-7" aria-label="Kosongkan pesanan" @click="$emit('clear')">
        <q-tooltip>Kosongkan pesanan</q-tooltip>
      </q-btn>
      <q-btn v-if="sheet" flat round dense icon="close" color="grey-7" aria-label="Tutup keranjang" @click="$emit('close')" />
    </q-card-section>
    <q-separator />
    <q-card-section v-if="cart.length" :class="['cart-items', { 'sheet-cart-items': sheet }]">
      <div v-for="item in cart" :key="item.id" class="cart-item">
        <div class="cart-item-icon" :class="`art-${item.color || 'mint'}`"><q-icon :name="item.icon || 'restaurant'" /></div>
        <div class="cart-item-copy">
          <div class="cart-item-name">{{ item.name }}</div>
          <div class="cart-item-price">{{ formatPrice(item.price) }}</div>
        </div>
        <div class="quantity-control">
          <q-btn flat round dense icon="remove" aria-label="Kurangi jumlah" @click="$emit('change-quantity', item.id, -1)" />
          <span>{{ item.quantity }}</span>
          <q-btn flat round dense icon="add" aria-label="Tambah jumlah" @click="$emit('change-quantity', item.id, 1)" />
        </div>
      </div>
    </q-card-section>
    <q-card-section v-else class="cart-empty">
      <div class="cart-empty-icon"><q-icon name="shopping_basket" /></div>
      <div class="panel-title">Belum ada menu</div>
      <div class="panel-caption">Pilih menu untuk mulai mencatat pesanan.</div>
    </q-card-section>
    <q-separator />
    <q-card-section class="order-totals">
      <div class="total-row"><span>Subtotal</span><strong>{{ formatPrice(subtotal) }}</strong></div>
      <div class="total-row"><span>Pajak</span><span class="tax-note">Belum diterapkan</span></div>
      <q-separator class="q-my-md" />
      <div class="total-row grand-total"><span>Total</span><strong>{{ formatPrice(subtotal) }}</strong></div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="check"
        :label="editing ? 'Lanjut pelunasan' : 'Lanjut ke pembayaran'"
        class="checkout-button full-width q-mt-lg"
        :disable="cart.length === 0"
        @click="$emit('checkout')"
      />
      <q-input
        v-if="editing"
        :model-value="reason"
        class="q-mt-md"
        outlined
        type="textarea"
        autogrow
        maxlength="1000"
        label="Alasan perubahan"
        hint="Wajib diisi setelah pesanan diubah."
        @update:model-value="$emit('update:reason', $event)"
      />
      <q-btn
        v-if="editing"
        flat
        no-caps
        color="primary"
        label="Simpan perubahan"
        class="full-width q-mt-sm"
        :disable="!hasChanges || cart.length === 0 || !reason.trim()"
        :loading="saving"
        @click="$emit('save-edit')"
      />
      <div class="demo-disclaimer">Nama menu dan harga akan divalidasi kembali oleh server.</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  cart: { type: Array, required: true },
  cartQuantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  sheet: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
  hasChanges: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  reason: { type: String, default: '' },
})
defineEmits(['change-quantity', 'clear', 'close', 'checkout', 'save-edit', 'update:reason'])

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}
</script>
