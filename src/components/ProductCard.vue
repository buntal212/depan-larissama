<template>
  <q-card flat bordered class="product-card">
    <div class="product-art" :class="[`art-${product.color || 'mint'}`, { 'product-art-unavailable': !product.available }]">
      <q-icon :name="product.icon || 'restaurant'" />
      <q-badge v-if="product.popular" class="popular-badge" rounded>
        <q-icon name="local_fire_department" size="13px" /> Favorit
      </q-badge>
      <q-badge v-if="!product.available" class="stock-badge stock-empty">Nonaktif</q-badge>
    </div>
    <q-card-section class="product-card-body">
      <div class="product-category">{{ product.category }}</div>
      <div class="product-name">{{ product.name }}</div>
      <div class="product-card-bottom">
        <div class="product-price">{{ formatPrice(product.price) }}</div>
        <q-btn v-if="canManage" flat round dense icon="more_horiz" color="grey-7" aria-label="Aksi barang">
          <q-menu anchor="bottom right" self="top right">
            <q-list dense style="min-width: 160px">
              <q-item clickable v-close-popup @click="$emit('edit', product)">
                <q-item-section avatar><q-icon name="edit" /></q-item-section>
                <q-item-section>Edit barang</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="$emit('toggle', product)">
                <q-item-section avatar>
                <q-icon :name="product.available ? 'visibility_off' : 'visibility'" />
              </q-item-section>
              <q-item-section>{{ product.available ? 'Nonaktifkan menu' : 'Aktifkan menu' }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-card-section>
    <div v-if="!product.available" class="product-unavailable">Tidak tersedia</div>
  </q-card>
</template>

<script setup>
defineProps({ product: { type: Object, required: true }, canManage: { type: Boolean, default: true } })
defineEmits(['edit', 'toggle'])

function formatPrice(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}
</script>
