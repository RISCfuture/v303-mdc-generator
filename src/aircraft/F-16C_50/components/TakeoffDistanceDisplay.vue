<script setup lang="ts">
import { computed } from 'vue'
import { NSpace, NText } from 'naive-ui'
import type { Mission } from '@/types'
import {
  calculateTakeoffDistance,
  celsiusToFahrenheit,
  calculateHeadwindComponent,
} from '../takeoffDistanceCalculator'

interface Props {
  mission: Mission
  grossWeight: number
  dragIndex?: number
  runwayLength?: number | null
  runwayWidth?: number | null
}

const props = defineProps<Props>()

// Extract takeoff params from mission
const takeoffParams = computed(() => {
  const params = props.mission.told.calculatorParams
  const depRec = props.mission.departureRecovery

  // Extract F-16 specific params
  const temperature = params && 'temperature' in params ? (params.temperature ?? 15) : 15
  const cgPercent = params && 'cgPercent' in params ? (params.cgPercent ?? 35) : 35
  const pitchAttitude = params && 'pitchAttitude' in params ? (params.pitchAttitude ?? 10) : 10
  const runwaySlope = params && 'runwaySlope' in params ? (params.runwaySlope ?? 0) : 0
  const windDirection = params && 'windDirection' in params ? (params.windDirection ?? 0) : 0
  const windSpeed = params && 'windSpeed' in params ? (params.windSpeed ?? 0) : 0

  const fieldElevation = depRec.departureFieldElevation ?? 0
  const runwayHeading = depRec.departureRunwayHeading ?? 0

  // Calculate headwind component
  const headwindComponent =
    windSpeed > 0 ? calculateHeadwindComponent(windDirection, windSpeed, runwayHeading) : 0

  return {
    temperature,
    cgPercent,
    pitchAttitude,
    runwaySlope,
    fieldElevation,
    headwindComponent,
  }
})

const abTakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(p.temperature),
    pressureAltitude: p.fieldElevation,
    powerSetting: 'AB',
    cgPercent: p.cgPercent,
    dragIndex: props.dragIndex ?? 7,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
    pitchAttitude: p.pitchAttitude,
  })

  return Math.round(result.takeoffDistance)
})

const milTakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(p.temperature),
    pressureAltitude: p.fieldElevation,
    powerSetting: 'MIL',
    cgPercent: p.cgPercent,
    dragIndex: props.dragIndex ?? 7,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
    pitchAttitude: p.pitchAttitude,
  })

  return Math.round(result.takeoffDistance)
})

const abExceedsRunway = computed(() => {
  if (abTakeoffDistance.value === null || !props.runwayLength) return false
  return abTakeoffDistance.value > props.runwayLength
})

const milExceedsRunway = computed(() => {
  if (milTakeoffDistance.value === null || !props.runwayLength) return false
  return milTakeoffDistance.value > props.runwayLength
})

// Get the selected power setting from calculator params (default to AB)
const selectedPowerSetting = computed(() => {
  const params = props.mission.told.calculatorParams
  if (params && 'powerSetting' in params) {
    return params.powerSetting
  }
  return 'AB'
})

// Primary and secondary takeoff distances based on selected power setting
const primaryTakeoffDistance = computed(() => {
  return selectedPowerSetting.value === 'AB' ? abTakeoffDistance.value : milTakeoffDistance.value
})

const secondaryTakeoffDistance = computed(() => {
  return selectedPowerSetting.value === 'AB' ? milTakeoffDistance.value : abTakeoffDistance.value
})

const primaryExceedsRunway = computed(() => {
  return selectedPowerSetting.value === 'AB' ? abExceedsRunway.value : milExceedsRunway.value
})

const secondaryExceedsRunway = computed(() => {
  return selectedPowerSetting.value === 'AB' ? milExceedsRunway.value : abExceedsRunway.value
})

const secondaryPowerSetting = computed(() => {
  return selectedPowerSetting.value === 'AB' ? 'MIL' : 'AB'
})
</script>

<template>
  <div>
    <NSpace align="center" :size="8">
      <NText>
        <strong>{{ selectedPowerSetting }}:</strong>
        <span :class="{ 'exceeds-runway': primaryExceedsRunway }">
          {{ primaryTakeoffDistance?.toLocaleString() ?? '—' }} ft
        </span>
      </NText>
      <NText depth="3">
        ({{ secondaryPowerSetting }}:
        <span :class="{ 'exceeds-runway': secondaryExceedsRunway }">
          {{ secondaryTakeoffDistance?.toLocaleString() ?? '—' }} ft</span
        >)
      </NText>
    </NSpace>
    <NText v-if="runwayLength" depth="3" class="detail-text">
      Runway {{ mission.departureRecovery.departureRunwayName }}:
      {{ runwayLength.toLocaleString() }} &times; {{ runwayWidth?.toLocaleString() ?? '—' }} ft
    </NText>
    <NText v-if="primaryExceedsRunway" class="exceeds-runway detail-text">
      Warning: Takeoff distance exceeds runway length
    </NText>
  </div>
</template>

<style scoped>
.exceeds-runway {
  color: var(--error-color, #e88080);
  font-weight: 600;
}

.detail-text {
  font-size: 12px;
  display: block;
  margin-top: 4px;
}
</style>
