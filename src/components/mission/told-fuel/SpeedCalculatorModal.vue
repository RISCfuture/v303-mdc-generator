<script setup lang="ts">
import { ref, computed, watch, shallowRef, defineAsyncComponent, type Component } from 'vue'
import { NModal, NSpace, NButton } from 'naive-ui'
import AirportSelector from './AirportSelector.vue'
import WeatherInputs from './WeatherInputs.vue'
import type { Mission, Airframe, F16CalculatorParams, A10CalculatorParams } from '@/types'
import {
  getAircraftCalculator,
  getAircraftComponentLoader,
  isCalculatorSupported,
} from '@/aircraft'

type Props = {
  show: boolean
  mission: Mission
  airframe: Airframe
  grossWeight: number
  dragIndex?: number
  runwayLength?: number | null
  runwayWidth?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'speeds-calculated': [
    rotation: number,
    refusal: number,
    params: F16CalculatorParams | A10CalculatorParams,
    departureRecovery: {
      departureAirportId?: string
      departureRunwayName?: string
      departureRunwayHeading?: number
      departureFieldElevation?: number
    },
  ]
}>()

// Airport/runway selection state
const selectedAirfieldName = ref<string | null>(null)
const selectedRunwayName = ref<string | null>(null)
const selectedRunwayHeading = ref<number | undefined>(undefined)
const fieldElevation = ref<number | null>(null)

// Common weather parameters
const windDirection = ref<number>(0)
const windSpeed = ref<number>(0)
const temperature = ref<number>(15)

// Aircraft-specific form component reference
const formRef = shallowRef<{
  headwindComponent?: number
  crosswindComponent?: number
  exceedsCrosswindLimit?: boolean
} | null>(null)

// Aircraft-specific config (updated by child component)
const currentConfig = ref<Record<string, unknown>>({})

// Calculated speeds (updated by child component)
const calculatedSpeeds = ref<{ rotationSpeed: number; refusalSpeed: number } | null>(null)

// Get the calculator for the current airframe
const calculator = computed(() => getAircraftCalculator(props.airframe))

// Get the display name for the modal title
const airframeDisplayName = computed(() => calculator.value?.displayName ?? props.airframe)

// Check if the airframe has a calculator
const hasCalculator = computed(() => isCalculatorSupported(props.airframe))

// Get the aircraft-specific form component from the registry
const aircraftFormComponent = computed<Component | null>(() => {
  const loader = getAircraftComponentLoader(props.airframe, 'speedCalculatorForm')
  if (loader) {
    return defineAsyncComponent(loader)
  }
  return null
})

// Computed values for child components
const runwayHeading = computed(() => selectedRunwayHeading.value ?? 0)

// Aircraft-specific props (only include dragIndex for F-16)
const aircraftSpecificProps = computed(() => {
  if (props.airframe === 'F-16C_50') {
    return { dragIndex: props.dragIndex }
  }
  return {}
})

// Get headwind and crosswind from form component
const headwindComponent = computed(() => {
  return formRef.value?.headwindComponent ?? 0
})

const crosswindComponent = computed(() => {
  return formRef.value?.crosswindComponent ?? 0
})

const exceedsCrosswindLimit = computed(() => {
  return formRef.value?.exceedsCrosswindLimit ?? false
})

// Show wind components only when relevant
const showWindComponents = computed(() => {
  return windSpeed.value > 0 && selectedRunwayHeading.value !== undefined
})

// Initialize form with existing calculator params and departure airport
watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      // Load departure airport/runway from departureRecovery
      selectedAirfieldName.value = props.mission.departureRecovery.departureAirportId ?? null
      selectedRunwayName.value = props.mission.departureRecovery.departureRunwayName ?? null
      fieldElevation.value = props.mission.departureRecovery.departureFieldElevation ?? null

      // Load weather params if available
      const params = props.mission.told.calculatorParams
      if (params) {
        windDirection.value = params.windDirection ?? 0
        windSpeed.value = params.windSpeed ?? 0
        temperature.value = params.temperature ?? 15
      }
    }
  },
)

function handleConfigUpdate(config: Record<string, unknown>) {
  currentConfig.value = config
}

function handleSpeedsUpdate(speeds: { rotationSpeed: number; refusalSpeed: number } | null) {
  calculatedSpeeds.value = speeds
}

function handleCalculate() {
  if (!calculatedSpeeds.value) return

  // Build calculator params from current config and weather
  // The structure depends on what the aircraft-specific form provides
  const params = {
    windDirection: windDirection.value,
    windSpeed: windSpeed.value,
    temperature: temperature.value,
    ...currentConfig.value,
  } as F16CalculatorParams | A10CalculatorParams

  // Build departure recovery data (airport/runway selections)
  const departureRecovery = {
    departureAirportId: selectedAirfieldName.value ?? undefined,
    departureRunwayName: selectedRunwayName.value ?? undefined,
    departureRunwayHeading: selectedRunwayHeading.value ?? undefined,
    departureFieldElevation: fieldElevation.value ?? undefined,
  }

  emit(
    'speeds-calculated',
    calculatedSpeeds.value.rotationSpeed,
    calculatedSpeeds.value.refusalSpeed,
    params,
    departureRecovery,
  )
  emit('update:show', false)
}

function handleCancel() {
  emit('update:show', false)
}

// Get initial config values from saved params
// This extracts the aircraft-specific config (not weather) to pass to the form
// Note: Form components expect `initial*` prefixed props
function getInitialConfig() {
  const params = props.mission.told.calculatorParams
  if (!params) return {}

  // Extract config by checking for discriminating properties
  // F-16C has powerSetting, A-10C has flapSetting
  if ('powerSetting' in params) {
    return {
      initialPowerSetting: params.powerSetting,
      initialCgPercent: params.cgPercent,
      initialPitchAttitude: params.pitchAttitude,
      initialRunwaySlope: params.runwaySlope,
      initialRunwayCondition: params.runwayCondition,
    }
  } else if ('flapSetting' in params) {
    return {
      initialFlapSetting: params.flapSetting,
      initialSpeedBrake: params.speedBrake,
      initialThrustSetting: params.thrustSetting,
      initialRunwaySlope: params.runwaySlope,
      initialRunwayCondition: params.runwayCondition,
    }
  }
  return {}
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    :title="`Calculate Takeoff Speeds - ${airframeDisplayName}`"
    style="width: 600px; max-height: 85vh; overflow-y: auto"
  >
    <NSpace vertical>
      <!-- Airport Section -->
      <AirportSelector
        :theater="mission.theater"
        :airport-id="selectedAirfieldName"
        :runway-name="selectedRunwayName"
        :field-elevation="fieldElevation"
        :disabled="true"
        @update:airport-id="(v: string | null) => (selectedAirfieldName = v)"
        @update:runway-name="(v: string | null) => (selectedRunwayName = v)"
        @update:runway-heading="(v: number | undefined) => (selectedRunwayHeading = v)"
        @update:field-elevation="(v: number | null) => (fieldElevation = v)"
      />

      <!-- Weather Section -->
      <WeatherInputs
        :temperature="temperature"
        :wind-direction="windDirection"
        :wind-speed="windSpeed"
        :headwind-component="headwindComponent"
        :crosswind-component="crosswindComponent"
        :show-wind-components="showWindComponents"
        :exceeds-crosswind-limit="exceedsCrosswindLimit"
        @update:temperature="(v: number) => (temperature = v)"
        @update:wind-direction="(v: number) => (windDirection = v)"
        @update:wind-speed="(v: number) => (windSpeed = v)"
      />

      <!-- Aircraft-Specific Form (loaded from registry based on airframe clsid) -->
      <component
        v-if="hasCalculator && aircraftFormComponent"
        :is="aircraftFormComponent"
        ref="formRef"
        :gross-weight="grossWeight"
        :runway-length="runwayLength"
        :runway-width="runwayWidth"
        :field-elevation="fieldElevation ?? 0"
        :runway-heading="runwayHeading"
        :temperature="temperature"
        :wind-direction="windDirection"
        :wind-speed="windSpeed"
        :runway-name="selectedRunwayName"
        v-bind="{ ...aircraftSpecificProps, ...getInitialConfig() }"
        @update:config="handleConfigUpdate"
        @update:speeds="handleSpeedsUpdate"
      />
    </NSpace>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">Cancel</NButton>
        <NButton type="primary" @click="handleCalculate" :disabled="!calculatedSpeeds">
          Calculate
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
