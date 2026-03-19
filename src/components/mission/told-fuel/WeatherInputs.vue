<script setup lang="ts">
import { NCard, NInputNumber, NInput, NText, NGrid, NGridItem, NSpace } from 'naive-ui'

type Props = {
  temperature: number
  windDirection: number
  windSpeed: number
  headwindComponent: number
  crosswindComponent: number
  showWindComponents: boolean
  exceedsCrosswindLimit?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:temperature': [value: number]
  'update:windDirection': [value: number]
  'update:windSpeed': [value: number]
}>()

// Format decimal with Intl.NumberFormat
const formatDecimal = (value: number, decimals = 1) => {
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
        <NSpace vertical size="small">
          <NText tag="label" strong>Temperature (°C)</NText>
          <NInputNumber
            :value="temperature"
            @update:value="(v: number | null) => emit('update:temperature', v ?? 15)"
            :min="-50"
            :max="60"
            style="width: 100%"
          />
        </NSpace>
      </NGridItem>
      <NGridItem>
        <NGrid :cols="2" :x-gap="8">
          <NGridItem>
            <NSpace vertical size="small">
              <NText tag="label" strong>Wind Direction (magnetic, °)</NText>
              <NInputNumber
                :value="windDirection"
                @update:value="(v: number | null) => emit('update:windDirection', v ?? 0)"
                :min="0"
                :max="359"
                style="width: 100%"
                placeholder="Direction wind is FROM"
              />
            </NSpace>
          </NGridItem>
          <NGridItem>
            <NSpace vertical size="small">
              <NText tag="label" strong>Wind Speed (knots)</NText>
              <NInputNumber
                :value="windSpeed"
                @update:value="(v: number | null) => emit('update:windSpeed', v ?? 0)"
                :min="0"
                :max="100"
                style="width: 100%"
              />
            </NSpace>
          </NGridItem>
        </NGrid>
      </NGridItem>
      <NGridItem v-if="showWindComponents">
        <NGrid :cols="2" :x-gap="8">
          <NGridItem>
            <NSpace vertical size="small">
              <NText tag="label" depth="2">Headwind Component</NText>
              <NInput :value="`${formatDecimal(headwindComponent)} kt`" disabled />
            </NSpace>
          </NGridItem>
          <NGridItem>
            <NSpace vertical size="small">
              <NText tag="label" depth="2">Crosswind Component</NText>
              <NInput
                :value="`${formatDecimal(Math.abs(crosswindComponent))} kt ${crosswindComponent >= 0 ? '(right)' : '(left)'}`"
                disabled
                :style="exceedsCrosswindLimit ? { '--n-text-color-disabled': '#e88080' } : {}"
              />
            </NSpace>
          </NGridItem>
        </NGrid>
      </NGridItem>
    </NGrid>
  </NCard>
</template>
