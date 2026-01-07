<script setup lang="ts">
import { watch, toRef } from 'vue'
import { NCard, NSelect, NInput, NText, NGrid, NGridItem, NSpace } from 'naive-ui'
import { useAirportSelection } from '@/composables/useAirportSelection'
import { formatInteger } from '@/utils/numberFormatting'
import type { Theater } from '@/types'

interface Props {
  theater: Theater
  airportId?: string | null
  runwayName?: string | null
  fieldElevation?: number | null
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:airportId': [value: string | null]
  'update:runwayName': [value: string | null]
  'update:runwayHeading': [value: number | undefined]
  'update:fieldElevation': [value: number | null]
}>()

const theaterRef = toRef(() => props.theater)
const airport = useAirportSelection(theaterRef)

// Initialize from props
watch(
  () => [props.airportId, props.runwayName, props.fieldElevation] as const,
  ([airportId, runwayName, elevation]) => {
    airport.initialize(airportId ?? undefined, runwayName ?? undefined, elevation ?? undefined)
  },
  { immediate: true },
)

// Emit runway heading when selected runway changes (including on initialization)
watch(
  () => airport.selectedRunway.value,
  (runway) => {
    emit('update:runwayHeading', runway?.heading)
  },
  { immediate: true },
)

function handleAirportChange(value: string | null) {
  airport.setAirport(value)
  emit('update:airportId', value)
  emit('update:runwayName', null)
  // Note: update:runwayHeading is emitted by the watch on selectedRunway (setAirport clears runway)
  emit('update:fieldElevation', airport.fieldElevation.value)
}

function handleRunwayChange(value: string | null) {
  airport.setRunway(value)
  emit('update:runwayName', value)
  // Note: update:runwayHeading is emitted by the watch on selectedRunway
}
</script>

<template>
  <NCard title="Airport" size="small">
    <NGrid :cols="1" :y-gap="12">
      <NGridItem>
        <NSpace vertical size="small">
          <NText tag="label" strong>Airport</NText>
          <NSelect
            :value="airport.selectedAirfieldName.value"
            @update:value="handleAirportChange"
            :options="airport.airfieldOptions.value"
            placeholder="Select airport"
            filterable
            clearable
            :disabled="disabled"
          />
        </NSpace>
      </NGridItem>
      <NGridItem>
        <NSpace vertical size="small">
          <NText tag="label" strong>Runway</NText>
          <NSelect
            :value="airport.selectedRunwayName.value"
            @update:value="handleRunwayChange"
            :options="airport.runwayOptions.value"
            placeholder="Select runway"
            :disabled="disabled"
            clearable
          />
        </NSpace>
      </NGridItem>
      <NGridItem>
        <NGrid :cols="2" :x-gap="8">
          <NGridItem v-if="airport.fieldElevation.value !== null">
            <NSpace vertical size="small">
              <NText tag="label" depth="2">Field Elevation</NText>
              <NInput :value="`${airport.fieldElevation.value.toLocaleString()} ft MSL`" disabled />
            </NSpace>
          </NGridItem>
          <NGridItem v-if="airport.selectedRunway.value">
            <NSpace vertical size="small">
              <NText tag="label" depth="2">Runway Heading</NText>
              <NInput :value="`${formatInteger(airport.selectedRunway.value.heading)}°`" disabled />
            </NSpace>
          </NGridItem>
        </NGrid>
      </NGridItem>
    </NGrid>
  </NCard>
</template>
