<script setup lang="ts">
import { NCard, NInputNumber, NInput } from 'naive-ui'

interface Props {
  temperature: number
  windDirection: number
  windSpeed: number
  headwindComponent: number
  crosswindComponent: number
  showWindComponents: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:temperature': [value: number]
  'update:windDirection': [value: number]
  'update:windSpeed': [value: number]
}>()

// Format decimal with Intl.NumberFormat
const formatDecimal = (value: number, decimals: number = 1) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
</script>

<template>
  <NCard title="Weather" size="small">
    <div style="display: grid; gap: 12px">
      <div>
        <label>Temperature (°C)</label>
        <NInputNumber
          :value="temperature"
          @update:value="(v: number | null) => emit('update:temperature', v ?? 15)"
          :min="-50"
          :max="60"
          style="width: 100%"
        />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
        <div>
          <label>Wind Direction (magnetic, °)</label>
          <NInputNumber
            :value="windDirection"
            @update:value="(v: number | null) => emit('update:windDirection', v ?? 0)"
            :min="0"
            :max="359"
            style="width: 100%"
            placeholder="Direction wind is FROM"
          />
        </div>
        <div>
          <label>Wind Speed (knots)</label>
          <NInputNumber
            :value="windSpeed"
            @update:value="(v: number | null) => emit('update:windSpeed', v ?? 0)"
            :min="0"
            :max="100"
            style="width: 100%"
          />
        </div>
      </div>
      <div
        v-if="showWindComponents"
        style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px"
      >
        <div>
          <label class="small-label">Headwind Component</label>
          <NInput :value="`${formatDecimal(headwindComponent)} kt`" disabled size="small" />
        </div>
        <div>
          <label class="small-label">Crosswind Component</label>
          <NInput
            :value="`${formatDecimal(Math.abs(crosswindComponent))} kt ${crosswindComponent >= 0 ? '(right)' : '(left)'}`"
            disabled
            size="small"
          />
        </div>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.small-label {
  font-size: 12px;
  opacity: 0.7;
}
</style>
