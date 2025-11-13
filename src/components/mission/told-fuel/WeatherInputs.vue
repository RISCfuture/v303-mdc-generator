<script setup lang="ts">
import { NCard, NInputNumber, NInput, NText, NGrid, NGridItem } from 'naive-ui'

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
    <NGrid :cols="1" :y-gap="12">
      <NGridItem>
        <NText tag="label" strong style="display: block; margin-bottom: 8px"
          >Temperature (°C)</NText
        >
        <NInputNumber
          :value="temperature"
          @update:value="(v: number | null) => emit('update:temperature', v ?? 15)"
          :min="-50"
          :max="60"
          style="width: 100%"
        />
      </NGridItem>
      <NGridItem>
        <NGrid :cols="2" :x-gap="8">
          <NGridItem>
            <NText tag="label" strong style="display: block; margin-bottom: 8px"
              >Wind Direction (magnetic, °)</NText
            >
            <NInputNumber
              :value="windDirection"
              @update:value="(v: number | null) => emit('update:windDirection', v ?? 0)"
              :min="0"
              :max="359"
              style="width: 100%"
              placeholder="Direction wind is FROM"
            />
          </NGridItem>
          <NGridItem>
            <NText tag="label" strong style="display: block; margin-bottom: 8px"
              >Wind Speed (knots)</NText
            >
            <NInputNumber
              :value="windSpeed"
              @update:value="(v: number | null) => emit('update:windSpeed', v ?? 0)"
              :min="0"
              :max="100"
              style="width: 100%"
            />
          </NGridItem>
        </NGrid>
      </NGridItem>
      <NGridItem v-if="showWindComponents">
        <NGrid :cols="2" :x-gap="8">
          <NGridItem>
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Headwind Component</NText
            >
            <NInput :value="`${formatDecimal(headwindComponent)} kt`" disabled />
          </NGridItem>
          <NGridItem>
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Crosswind Component</NText
            >
            <NInput
              :value="`${formatDecimal(Math.abs(crosswindComponent))} kt ${crosswindComponent >= 0 ? '(right)' : '(left)'}`"
              disabled
            />
          </NGridItem>
        </NGrid>
      </NGridItem>
    </NGrid>
  </NCard>
</template>
