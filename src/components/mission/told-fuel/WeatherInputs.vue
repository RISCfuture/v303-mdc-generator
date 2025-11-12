<script setup lang="ts">
import { NCard, NInputNumber, NInput, NText } from 'naive-ui'

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
        <n-text tag="label" strong style="display: block; margin-bottom: 8px"
          >Temperature (°C)</n-text
        >
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
          <n-text tag="label" strong style="display: block; margin-bottom: 8px"
            >Wind Direction (magnetic, °)</n-text
          >
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
          <n-text tag="label" strong style="display: block; margin-bottom: 8px"
            >Wind Speed (knots)</n-text
          >
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
          <n-text tag="label" depth="2" style="display: block; margin-bottom: 8px"
            >Headwind Component</n-text
          >
          <NInput :value="`${formatDecimal(headwindComponent)} kt`" disabled size="small" />
        </div>
        <div>
          <n-text tag="label" depth="2" style="display: block; margin-bottom: 8px"
            >Crosswind Component</n-text
          >
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
