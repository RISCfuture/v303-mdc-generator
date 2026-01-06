<script setup lang="ts">
import { computed } from 'vue'
import { NText } from 'naive-ui'
import type { Mission } from '@/types'
import type { RCR } from '../takeoffDistanceCalculator'
import {
  calculateTakeoffDistance,
  calculateCriticalFieldLength,
  calculateHeadwindComponent,
} from '../takeoffDistanceCalculator'

interface Props {
  mission: Mission
  grossWeight: number
  runwayLength?: number | null
  runwayWidth?: number | null
}

const props = defineProps<Props>()

// Extract takeoff params from mission
const takeoffParams = computed(() => {
  const params = props.mission.told.calculatorParams
  const depRec = props.mission.departureRecovery

  // Extract A-10 specific params
  const temperature = params && 'temperature' in params ? (params.temperature ?? 15) : 15
  const thrustSetting =
    params && 'thrustSetting' in params ? (params.thrustSetting ?? 'MAX') : 'MAX'
  const runwaySlope = params && 'runwaySlope' in params ? (params.runwaySlope ?? 0) : 0
  const windDirection = params && 'windDirection' in params ? (params.windDirection ?? 0) : 0
  const windSpeed = params && 'windSpeed' in params ? (params.windSpeed ?? 0) : 0

  const fieldElevation = depRec.departureFieldElevation ?? 0
  const runwayHeading = depRec.departureRunwayHeading ?? 0

  // Calculate headwind component (A-10 uses different calculation)
  const headwindComponent =
    windSpeed > 0 ? calculateHeadwindComponent(windSpeed, windDirection, runwayHeading) : 0

  return {
    temperature,
    thrustSetting: thrustSetting as 'MAX' | '3_BELOW_PTFS',
    runwaySlope,
    fieldElevation,
    headwindComponent,
  }
})

const flaps0TakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: p.temperature,
    pressureAltitude: p.fieldElevation,
    flapSetting: 0,
    thrustSetting: p.thrustSetting,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
  })

  return Math.round(result.takeoffDistance)
})

const flaps7TakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: p.temperature,
    pressureAltitude: p.fieldElevation,
    flapSetting: 7,
    thrustSetting: p.thrustSetting,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
  })

  return Math.round(result.takeoffDistance)
})

const flaps0ExceedsRunway = computed(() => {
  if (flaps0TakeoffDistance.value === null || !props.runwayLength) return false
  return flaps0TakeoffDistance.value > props.runwayLength
})

const flaps7ExceedsRunway = computed(() => {
  if (flaps7TakeoffDistance.value === null || !props.runwayLength) return false
  return flaps7TakeoffDistance.value > props.runwayLength
})

// Get the selected flap setting from calculator params (default to 7)
const selectedFlapSetting = computed(() => {
  const params = props.mission.told.calculatorParams
  if (params && 'flapSetting' in params) {
    return params.flapSetting
  }
  return 7
})

// Primary takeoff distance based on selected flap setting
const primaryTakeoffDistance = computed(() => {
  return selectedFlapSetting.value === 0 ? flaps0TakeoffDistance.value : flaps7TakeoffDistance.value
})

const primaryExceedsRunway = computed(() => {
  return selectedFlapSetting.value === 0 ? flaps0ExceedsRunway.value : flaps7ExceedsRunway.value
})

// Critical field length calculation
const criticalFieldLength = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const params = props.mission.told.calculatorParams
  const runwayCondition = params && 'runwayCondition' in params ? params.runwayCondition : 'dry'

  // Map runway condition to RCR
  const rcrMap: Record<'dry' | 'wet' | 'icy', RCR> = {
    dry: 23,
    wet: 12,
    icy: 5,
  }

  const p = takeoffParams.value
  const result = calculateCriticalFieldLength({
    grossWeight: props.grossWeight,
    temperatureC: p.temperature,
    pressureAltitude: p.fieldElevation,
    thrustSetting: p.thrustSetting,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
    rcr: rcrMap[runwayCondition as 'dry' | 'wet' | 'icy'],
  })

  return Math.round(result.criticalFieldLength)
})

// Warning: runway shorter than critical field length
const runwayShorterThanCFL = computed(() => {
  if (criticalFieldLength.value === null || !props.runwayLength) return false
  return props.runwayLength < criticalFieldLength.value
})
</script>

<template>
  <div>
    <NText
      :class="{
        'exceeds-runway': primaryExceedsRunway,
        'below-cfl': runwayShorterThanCFL && !primaryExceedsRunway,
      }"
    >
      {{ primaryTakeoffDistance?.toLocaleString() ?? '—' }} ft
    </NText>
    <NText v-if="runwayLength" depth="3" class="detail-text">
      Runway {{ mission.departureRecovery.departureRunwayName }}:
      {{ runwayLength.toLocaleString() }} &times; {{ runwayWidth?.toLocaleString() ?? '—' }} ft
    </NText>
    <NText v-if="primaryExceedsRunway" class="exceeds-runway detail-text">
      Warning: Takeoff distance exceeds runway length
    </NText>
    <NText v-else-if="runwayShorterThanCFL" class="below-cfl detail-text">
      Warning: Runway shorter than critical field length ({{
        criticalFieldLength?.toLocaleString()
      }}
      ft)
    </NText>
  </div>
</template>

<style scoped>
.exceeds-runway {
  color: var(--error-color, #e88080);
  font-weight: 600;
}

.below-cfl {
  color: var(--warning-color, #f0a020);
  font-weight: 600;
}

.detail-text {
  font-size: 12px;
  display: block;
  margin-top: 4px;
}
</style>
