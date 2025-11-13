<script setup lang="ts">
import { watch, toRef } from 'vue'
import { NCard, NSelect, NInput, NText, NGrid, NGridItem } from 'naive-ui'
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

function handleAirportChange(value: string | null) {
  airport.setAirport(value)
  emit('update:airportId', value)
  emit('update:runwayName', null)
  emit('update:runwayHeading', undefined)
  emit('update:fieldElevation', airport.fieldElevation.value)
}

function handleRunwayChange(value: string | null) {
  airport.setRunway(value)
  emit('update:runwayName', value)
  emit('update:runwayHeading', airport.selectedRunway.value?.heading)
}
</script>

<template>
  <NCard title="Airport" size="small">
    <NGrid :cols="1" :y-gap="12">
      <NGridItem>
        <NText tag="label" strong style="display: block; margin-bottom: 8px">Airport</NText>
        <NSelect
          :value="airport.selectedAirfieldName.value"
          @update:value="handleAirportChange"
          :options="airport.airfieldOptions.value"
          placeholder="Select airport"
          filterable
          clearable
          :disabled="disabled"
        />
      </NGridItem>
      <NGridItem>
        <NText tag="label" strong style="display: block; margin-bottom: 8px">Runway</NText>
        <NSelect
          :value="airport.selectedRunwayName.value"
          @update:value="handleRunwayChange"
          :options="airport.runwayOptions.value"
          placeholder="Select runway"
          :disabled="disabled"
          clearable
        />
      </NGridItem>
      <NGridItem>
        <NGrid :cols="2" :x-gap="8">
          <NGridItem v-if="airport.fieldElevation.value !== null">
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Field Elevation</NText
            >
            <NInput :value="`${airport.fieldElevation.value.toLocaleString()} ft MSL`" disabled />
          </NGridItem>
          <NGridItem v-if="airport.selectedRunway.value">
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Runway Heading</NText
            >
            <NInput :value="`${formatInteger(airport.selectedRunway.value.heading)}°`" disabled />
          </NGridItem>
        </NGrid>
      </NGridItem>
    </NGrid>
  </NCard>
</template>
