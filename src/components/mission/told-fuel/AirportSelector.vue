<script setup lang="ts">
import { watch, toRef } from 'vue'
import { NCard, NSelect, NInput, NText } from 'naive-ui'
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
    <div style="display: grid; gap: 12px">
      <div>
        <n-text tag="label" strong style="display: block; margin-bottom: 8px">Airport</n-text>
        <NSelect
          :value="airport.selectedAirfieldName.value"
          @update:value="handleAirportChange"
          :options="airport.airfieldOptions.value"
          placeholder="Select airport"
          filterable
          clearable
          :disabled="disabled"
        />
      </div>
      <div>
        <n-text tag="label" strong style="display: block; margin-bottom: 8px">Runway</n-text>
        <NSelect
          :value="airport.selectedRunwayName.value"
          @update:value="handleRunwayChange"
          :options="airport.runwayOptions.value"
          placeholder="Select runway"
          :disabled="disabled"
          clearable
        />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
        <div v-if="airport.fieldElevation.value !== null">
          <n-text tag="label" depth="2" style="display: block; margin-bottom: 8px"
            >Field Elevation</n-text
          >
          <NInput
            :value="`${airport.fieldElevation.value.toLocaleString()} ft MSL`"
            disabled
            size="small"
          />
        </div>
        <div v-if="airport.selectedRunway.value">
          <n-text tag="label" depth="2" style="display: block; margin-bottom: 8px"
            >Runway Heading</n-text
          >
          <NInput
            :value="`${formatInteger(airport.selectedRunway.value.heading)}°`"
            disabled
            size="small"
          />
        </div>
      </div>
    </div>
  </NCard>
</template>
