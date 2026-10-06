<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="product-form-dialog">
      <q-card-section class="dialog-header">
        <div class="dialog-header-copy">
          <div class="dialog-eyebrow">KATALOG MENU</div>
          <div class="text-h6 dialog-title">{{ isEditing ? 'Edit menu' : 'Tambah menu' }}</div>
          <div class="dialog-subtitle">{{ isEditing ? 'Perbarui kode, kategori, nama, dan harga jual menu.' : 'Kode menu dibuat otomatis setelah menu disimpan.' }}</div>
        </div>
        <q-btn class="dialog-header-close" flat round dense icon="close" aria-label="Tutup" @click="close" />
      </q-card-section>

      <q-separator />

      <q-form class="q-pa-lg" @submit.prevent="submitForm">
        <q-input
          v-if="isEditing"
          v-model.trim="form.code"
          outlined
          autofocus
          label="Kode menu"
          placeholder="Kode menu"
          :rules="[(value) => !!value || 'Kode menu perlu diisi', (value) => value.length <= 30 || 'Maksimal 30 karakter']"
        />
        <q-input
          v-model.trim="form.name"
          outlined
          :autofocus="!isEditing"
          label="Nama menu"
          placeholder="Contoh: Nasi Goreng Spesial"
          :rules="[(value) => !!value || 'Nama menu perlu diisi', (value) => value.length <= 150 || 'Maksimal 150 karakter']"
        />
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.categoryId"
              outlined
              emit-value
              map-options
              label="Kategori"
              :options="categoryOptions"
              :rules="[(value) => !!value || 'Pilih kategori']"
            />
          </div>
          <div class="col-12 col-sm-6">
            <CurrencyInput
              v-model="form.price"
              label="Harga jual"
              min="0.01"
              :rules="[(value) => Number(form.price) > 0 || 'Harga harus lebih dari nol']"
            />
          </div>
        </div>
        <q-input v-model.trim="form.description" outlined type="textarea" autogrow label="Deskripsi (opsional)" />
        <q-toggle v-model="form.available" color="secondary" label="Menu aktif" />

        <div class="row justify-end q-gutter-sm q-mt-lg">
          <q-btn outline no-caps color="grey-8" label="Batal" @click="close" />
          <q-btn unelevated no-caps color="primary" :label="isEditing ? 'Simpan perubahan' : 'Tambah menu'" type="submit" :loading="saving" />
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
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'save'])

const blankForm = () => ({ code: '', name: '', categoryId: '', category: '', price: null, description: '', available: true, icon: 'restaurant', color: 'mint', popular: false })
const form = reactive(blankForm())
const isEditing = computed(() => Boolean(props.product))
const categoryOptions = computed(() => props.categories.filter((category) => category.active).map((category) => ({ label: category.name, value: category.id })))

watch(
  () => [props.modelValue, props.product],
  ([isOpen, product]) => {
    if (isOpen) {
      Object.assign(form, product ? { ...blankForm(), ...product, price: Number(product.price) } : { ...blankForm(), categoryId: categoryOptions.value[0]?.value || '' })
    }
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

function submitForm() {
  const category = props.categories.find((item) => item.id === form.categoryId)
  emit('save', {
    ...form,
    code: form.code.trim(),
    name: form.name.trim(),
    category: category?.name || form.category,
    price: Number(form.price),
    description: form.description.trim(),
  })
}
</script>
