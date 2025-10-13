<script setup lang="ts">
import { NInputNumber, NText } from 'naive-ui'
import { formatInteger, parseInteger, formatDecimal, parseDecimal } from '@/utils/numberFormatting'
import { useCCIPCalculations } from '@/composables/useCCIPCalculations'
import type { CCIPReferencePoint } from '@/types'

interface Props {
  point: CCIPReferencePoint | null | undefined
  targetSteerpointAltitude: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:bearing': [value: number | null]
  'update:distance': [value: number | null]
  'update:elevation': [value: number | null]
}>()

const { formatDistanceWithNM, formatElevationWithMSL } = useCCIPCalculations()

// Format decimal with 1 decimal place
const formatDecimal1 = (value: number | null) => formatDecimal(value, 1)

// Format elevation with + sign for positive numbers
const formatElevation = (value: number | null): string => {
  if (value === null || value === undefined) return ''
  const formatted = formatInteger(value)
  if (value > 0) return `+${formatted}`
  return formatted
}

// Parse elevation, handling + sign
const parseElevation = (input: string): number | null => {
  if (!input || input.trim() === '') return null
  // Remove + sign if present, then parse
  const cleaned = input.replace(/^\+/, '')
  return parseInteger(cleaned)
}
</script>

<template>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px">
    <div>
      <NInputNumber
        :value="point?.bearing"
        @update:value="(v: number | null) => emit('update:bearing', v)"
        :show-button="false"
        :format="formatDecimal1"
        :parse="parseDecimal"
        placeholder="Bearing"
      >
        <template #suffix>°</template>
      </NInputNumber>
    </div>
    <div>
      <NInputNumber
        :value="point?.distance"
        @update:value="(v: number | null) => emit('update:distance', v)"
        :show-button="false"
        :format="formatInteger"
        :parse="parseInteger"
        placeholder="Distance"
      >
        <template #suffix>ft</template>
      </NInputNumber>
      <NText depth="3" style="font-size: 11px">{{ formatDistanceWithNM(point?.distance) }}</NText>
    </div>
    <div>
      <NInputNumber
        :value="point?.elevation"
        @update:value="(v: number | null) => emit('update:elevation', v)"
        :show-button="false"
        :format="formatElevation"
        :parse="parseElevation"
        placeholder="Elevation"
      >
        <template #suffix>ft</template>
      </NInputNumber>
      <NText depth="3" style="font-size: 11px">{{
        formatElevationWithMSL(point?.elevation, props.targetSteerpointAltitude)
      }}</NText>
    </div>
  </div>
</template>

<style scoped>
/* Mobile responsive styles */
@media (width <= 768px) {
  div[style*='grid-template-columns: 1fr 1fr 1fr'] {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
</style>
