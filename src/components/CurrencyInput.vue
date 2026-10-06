<template>
  <q-input
    :model-value="displayValue"
    :label="label"
    :rules="rules"
    :min="min"
    :dense="dense"
    :disable="disable"
    :outlined="outlined"
    inputmode="decimal"
    prefix="Rp"
    @update:model-value="updateDisplayValue"
    @focus="focusInput"
    @blur="normalizeDisplayValue"
  />
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  label: { type: String, default: '' },
  rules: { type: Array, default: () => [] },
  min: { type: [Number, String], default: undefined },
  dense: { type: Boolean, default: false },
  disable: { type: Boolean, default: false },
  outlined: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const displayValue = ref(formatCurrency(props.modelValue))
const inputFocused = ref(false)

watch(() => props.modelValue, (value) => {
  if (!inputFocused.value) displayValue.value = formatCurrency(value)
})

function groupInteger(value) {
  return String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return ''
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''
  const [integerPart, decimalPart] = numericValue.toFixed(2).split('.')
  return `${groupInteger(integerPart)}.${decimalPart}`
}

function updateDisplayValue(value) {
  const input = document.activeElement
  const previousCaret = input instanceof HTMLInputElement ? input.selectionStart ?? String(value || '').length : String(value || '').length
  const meaningfulBeforeCaret = String(value || '').slice(0, previousCaret).replace(/,/g, '').length
  const rawValue = String(value || '').replace(/[^\d.]/g, '')
  const [integerPart = '', ...decimalParts] = rawValue.split('.')
  const hasDecimal = rawValue.includes('.')
  const decimalPart = decimalParts.join('').slice(0, 2)
  displayValue.value = `${groupInteger(integerPart)}${hasDecimal ? `.${decimalPart}` : ''}`

  const normalizedValue = `${integerPart || '0'}${hasDecimal ? `.${decimalPart}` : ''}`
  emit('update:modelValue', rawValue ? Number(normalizedValue) : null)

  nextTick(() => {
    if (!(input instanceof HTMLInputElement)) return
    let caret = 0
    let meaningfulCount = 0
    while (caret < displayValue.value.length && meaningfulCount < meaningfulBeforeCaret) {
      if (displayValue.value[caret] !== ',') meaningfulCount += 1
      caret += 1
    }
    input.setSelectionRange(caret, caret)
  })
}

function focusInput(event) {
  inputFocused.value = true
  nextTick(() => event.target?.select?.())
}

function normalizeDisplayValue() {
  inputFocused.value = false
  displayValue.value = formatCurrency(props.modelValue)
  if (props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '') {
    emit('update:modelValue', Number(Number(props.modelValue).toFixed(2)))
  }
}
</script>
