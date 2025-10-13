<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NSelect, NInput } from 'naive-ui'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { Theater } from '@/types'

interface Props {
  theater: Theater
  airportId?: string
  runwayName?: string
  procedure?: string
  fieldElevation?: number
  airportLabel?: string
  runwayLabel?: string
  procedureLabel?: string
  airportPlaceholder?: string
  runwayPlaceholder?: string
  procedurePlaceholder?: string
  isAirportIncomplete?: boolean
  isRunwayIncomplete?: boolean
  isProcedureIncomplete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  airportLabel: 'Airport',
  runwayLabel: 'Runway',
  procedureLabel: 'Procedure',
  airportPlaceholder: 'Select airport',
  runwayPlaceholder: 'Select runway',
  procedurePlaceholder: '',
  isAirportIncomplete: false,
  isRunwayIncomplete: false,
  isProcedureIncomplete: false,
})

const emit = defineEmits<{
  'update:airportId': [value: string | undefined]
  'update:runwayName': [value: string | undefined]
  'update:runwayHeading': [value: number | undefined]
  'update:fieldElevation': [value: number | undefined]
  'update:procedure': [value: string]
}>()

// Load airfields for the theater
const airfields = computed(() => getAirfieldsForTheater(props.theater))

// Airport dropdown options
const airfieldOptions = computed(() =>
  airfields.value.map((af) => ({
    label: af.name,
    value: af.name,
  })),
)

// Currently selected airfield
const selectedAirfield = computed(() => {
  if (!props.airportId) return null
  return airfields.value.find((af) => af.name === props.airportId) || null
})

// Runway dropdown options (based on selected airfield)
const runwayOptions = computed(() => {
  if (!selectedAirfield.value) return []
  return selectedAirfield.value.runways.map((rw) => ({
    label: rw.name,
    value: rw.name,
  }))
})

// Currently selected runway
const selectedRunway = computed(() => {
  if (!props.runwayName || !selectedAirfield.value) return null
  return selectedAirfield.value.runways.find((rw) => rw.name === props.runwayName) || null
})

// Expose for testing
defineExpose({
  airfieldOptions,
  runwayOptions,
  selectedAirfield,
  selectedRunway,
  handleAirportChange,
  handleRunwayChange,
})

// Handle airport selection
function handleAirportChange(value: string | null) {
  emit('update:airportId', value || undefined)
  emit('update:runwayName', undefined)
  emit('update:runwayHeading', undefined)
  // Get the selected airfield and emit its elevation
  const airfield = value ? airfields.value.find((af) => af.name === value) : null
  emit('update:fieldElevation', airfield?.position?.elevation || undefined)
}

// Handle runway selection
function handleRunwayChange(value: string | null) {
  emit('update:runwayName', value || undefined)
  // Get the selected runway and emit its heading
  const runway =
    value && selectedAirfield.value
      ? selectedAirfield.value.runways.find((rw) => rw.name === value)
      : null
  emit('update:runwayHeading', runway?.heading || undefined)
}
</script>

<template>
  <div>
    <NFormItem :label="airportLabel" :validation-status="isAirportIncomplete ? 'error' : undefined">
      <NSelect
        :value="airportId"
        @update:value="handleAirportChange"
        :options="airfieldOptions"
        :status="isAirportIncomplete ? 'error' : undefined"
        :placeholder="airportPlaceholder"
        filterable
        clearable
      />
    </NFormItem>

    <NFormItem :label="runwayLabel" :validation-status="isRunwayIncomplete ? 'error' : undefined">
      <NSelect
        :value="runwayName"
        @update:value="handleRunwayChange"
        :options="runwayOptions"
        :status="isRunwayIncomplete ? 'error' : undefined"
        :disabled="!selectedAirfield"
        :placeholder="runwayPlaceholder"
        clearable
      />
    </NFormItem>

    <NFormItem
      :label="procedureLabel"
      :validation-status="isProcedureIncomplete ? 'error' : undefined"
    >
      <NInput
        :value="procedure"
        @update:value="(v: string) => emit('update:procedure', v)"
        :status="isProcedureIncomplete ? 'error' : undefined"
        :placeholder="procedurePlaceholder"
      />
    </NFormItem>
  </div>
</template>
