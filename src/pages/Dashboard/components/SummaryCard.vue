<template>
  <q-card flat bordered class="summary-card">
    <q-card-section>
      <div class="summary-card-top">
        <div class="summary-icon" :class="`tone-${tone}`"><q-icon :name="icon" /></div>
        <div class="summary-change" :class="changeTone">
          <q-icon :name="changeIcon" size="14px" />
          {{ change }}
        </div>
      </div>
      <div class="summary-label">{{ label }}</div>
      <div class="summary-value">{{ value }}</div>
      <div class="summary-note">{{ note }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  note: { type: String, required: true },
  icon: { type: String, required: true },
  change: { type: String, required: true },
  tone: { type: String, default: 'green' },
  changeTone: { type: String, default: 'positive' },
  changeIcon: { type: String, default: 'north_east' },
})
</script>
