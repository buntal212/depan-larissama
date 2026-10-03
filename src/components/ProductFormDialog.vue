<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="product-form-dialog">
      <q-card-section class="row items-start no-wrap">
        <div>
          <div class="dialog-eyebrow">MENU & BARANG</div>
          <div class="text-h6 dialog-title">{{ isEditing ? 'Edit barang' : 'Tambah barang baru' }}</div>
          <div class="dialog-subtitle">Lengkapi informasi yang tampil di daftar menu.</div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" aria-label="Tutup" @click="close" />
      </q-card-section>

      <q-separator />

      <q-form class="q-pa-lg" @submit.prevent="submitForm">
        <q-input
          v-model.trim="form.name"
          outlined
          autofocus
          label="Nama barang atau menu"
          placeholder="Contoh: Nasi Goreng Spesial"
          :rules="[(value) => !!value || 'Nama barang perlu diisi']"
        />
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.category"
              outlined
              emit-value
              map-options
              label="Kategori"
              :options="categoryOptions"
              :rules="[(value) => !!value || 'Pilih kategori']"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.price"
              outlined
              type="number"
              min="0"
              prefix="Rp"
              label="Harga jual"
              :rules="[(value) => Number(value) > 0 || 'Harga harus lebih dari nol']"
            />
          </div>
        </div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-input v-model.number="form.stock" outlined type="number" min="0" label="Stok tersedia" />
          </div>
          <div class="col-12 col-sm-6">
            <q-select v-model="form.icon" outlined label="Ikon menu" :options="iconOptions" emit-value map-options>
              <template #selected-item="scope">
                <div class="row items-center q-gutter-sm">
                  <q-icon :name="scope.opt.value" />
                  <span>{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </div>
        </div>

        <q-toggle v-model="form.available" color="secondary" label="Tersedia untuk dipesan" />

        <div class="row justify-end q-gutter-sm q-mt-lg">
          <q-btn outline no-caps color="grey-8" label="Batal" @click="close" />
          <q-btn unelevated no-caps color="primary" :label="isEditing ? 'Simpan perubahan' : 'Tambah barang'" type="submit" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  product: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'save'])

const blankForm = () => ({ name: '', category: 'Makanan', price: null, stock: 0, icon: 'restaurant', color: 'mint', available: true, popular: false })
const form = reactive(blankForm())
const isEditing = computed(() => Boolean(props.product))
const categoryOptions = ['Makanan', 'Minuman', 'Camilan', 'Lainnya']
const iconOptions = [
  { label: 'Hidangan', value: 'dinner_dining' },
  { label: 'Mie', value: 'ramen_dining' },
  { label: 'Minuman', value: 'local_cafe' },
  { label: 'Kopi', value: 'coffee' },
  { label: 'Camilan', value: 'bakery_dining' },
  { label: 'Lainnya', value: 'restaurant' },
]

watch(
  () => [props.modelValue, props.product],
  ([isOpen, product]) => {
    if (isOpen) Object.assign(form, product ? { ...blankForm(), ...product } : blankForm())
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

function submitForm() {
  emit('save', { ...form, price: Number(form.price), stock: Math.max(0, Number(form.stock) || 0) })
  close()
}
</script>
