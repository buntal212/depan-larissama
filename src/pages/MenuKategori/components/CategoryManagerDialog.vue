<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="product-form-dialog">
      <q-card-section class="dialog-header">
        <div class="dialog-header-copy">
          <div class="dialog-eyebrow">KATALOG WARUNG</div>
          <div class="text-h6 dialog-title">Kategori menu</div>
          <div class="dialog-subtitle">Kategori nonaktif tidak muncul saat kasir memilih menu.</div>
        </div>
        <q-btn
          class="dialog-header-close"
          flat
          round
          dense
          icon="close"
          aria-label="Tutup"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row justify-end q-mb-md">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="add"
            label="Tambah kategori"
            @click="openForm()"
          />
        </div>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="category in sortedCategories" :key="category.id">
            <q-item-section>
              <q-item-label>{{ category.name }}</q-item-label>
              <q-item-label caption
                >Urutan {{ category.order }} ·
                {{ category.active ? 'Aktif' : 'Nonaktif' }}</q-item-label
              >
            </q-item-section>
            <q-item-section side>
              <div class="row items-center no-wrap">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  aria-label="Edit kategori"
                  @click="openForm(category)"
                />
                <q-btn
                  flat
                  round
                  dense
                  :icon="category.active ? 'visibility_off' : 'visibility'"
                  :aria-label="category.active ? 'Nonaktifkan kategori' : 'Aktifkan kategori'"
                  @click="$emit('toggle', category.id)"
                />
              </div>
            </q-item-section>
          </q-item>
          <q-item v-if="!sortedCategories.length"
            ><q-item-section class="text-grey-7">Belum ada kategori.</q-item-section></q-item
          >
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="formOpen">
    <q-card class="product-form-dialog">
      <q-card-section class="dialog-header items-center">
        <div class="dialog-header-copy text-h6 dialog-title">
          {{ selected ? 'Edit kategori' : 'Tambah kategori' }}
        </div>
        <q-btn
          class="dialog-header-close"
          flat
          round
          dense
          icon="close"
          aria-label="Tutup"
          @click="formOpen = false"
        />
      </q-card-section>
      <q-separator />
      <q-form class="q-pa-lg" @submit.prevent="submitForm">
        <q-input
          v-model.trim="form.name"
          outlined
          autofocus
          label="Nama kategori"
          maxlength="100"
          :rules="[(value) => !!value || 'Nama kategori perlu diisi']"
        />
        <q-input v-model.number="form.order" outlined type="number" min="0" label="Urutan" />
        <q-toggle v-model="form.active" color="secondary" label="Kategori aktif" />
        <div class="row justify-end q-gutter-sm q-mt-lg">
          <q-btn flat no-caps label="Batal" @click="formOpen = false" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Simpan kategori"
            type="submit"
            :loading="saving"
          />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'save', 'toggle'])
const sortedCategories = computed(() => [...props.categories].sort((a, b) => a.order - b.order))
const formOpen = ref(false)
const selected = ref(null)
const form = reactive({ name: '', order: 0, active: true })

watch(formOpen, (open) => {
  if (!open) return
  Object.assign(
    form,
    selected.value
      ? { ...selected.value }
      : { name: '', order: props.categories.length, active: true },
  )
})

function openForm(category = null) {
  selected.value = category
  formOpen.value = true
}

function openCreateForm() {
  openForm()
}

function submitForm() {
  emit('save', {
    ...form,
    name: form.name.trim(),
    order: Math.max(0, Number(form.order) || 0),
    id: selected.value?.id,
  })
}

function closeForm() {
  formOpen.value = false
}

defineExpose({ openCreateForm, closeForm })
</script>
