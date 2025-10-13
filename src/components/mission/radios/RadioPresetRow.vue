<script setup lang="ts">
import { NInputNumber, NInput } from 'naive-ui'
import type { Radio } from '@/types'

interface Props {
  presetNumber: number
  frequency: string
  description: string
  radioConfig: Radio
}

defineProps<Props>()

const emit = defineEmits<{
  'update:frequency': [value: number | null]
  'update:description': [value: string]
}>()

// Number formatter for radio frequencies - ensures at least 1 decimal place
const frequencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
})

// Validate frequency against step value
function isValidStep(frequency: number, min: number, step: number): boolean {
  // Calculate how many steps from min
  const stepsFromMin = (frequency - min) / step
  // Check if it's close to a whole number of steps (within floating point precision)
  return Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 0.0001
}
</script>

<template>
  <div class="preset-row">
    <div class="preset-number">{{ presetNumber }}</div>
    <NInputNumber
      :value="frequency ? parseFloat(frequency) : null"
      @update:value="(v: number | null) => emit('update:frequency', v)"
      :min="radioConfig.min ?? undefined"
      :max="radioConfig.max ?? undefined"
      :step="radioConfig.step"
      :validator="
        (v: number) => {
          if (radioConfig.min === null || radioConfig.max === null) return true
          if (v < radioConfig.min || v > radioConfig.max) return false
          return isValidStep(v, radioConfig.min, radioConfig.step)
        }
      "
      :format="(v: number | null) => (v !== null ? frequencyFormatter.format(v) : '')"
      :parse="(input: string) => parseFloat(input.replace(/,/g, '')) || 0"
      placeholder="Frequency"
      :aria-label="`Preset ${presetNumber} Frequency`"
      :show-button="false"
      style="width: 150px"
    />
    <NInput
      :value="description"
      @update:value="(v: string) => emit('update:description', v)"
      placeholder="Description"
      :aria-label="`Preset ${presetNumber} Description`"
      style="flex: 1; min-width: 250px"
    />
  </div>
</template>

<style scoped>
.preset-row {
  display: grid;
  grid-template-columns: 30px auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 8px;
  background: rgb(0 0 0 / 2%);
  border-radius: 4px;
}

.preset-number {
  font-weight: 600;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .preset-row {
    background: rgb(255 255 255 / 4%);
  }
}

/* Mobile responsive styles */
@media (width <= 768px) {
  .preset-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .preset-number {
    text-align: left;
    padding-left: 8px;
  }
}
</style>
