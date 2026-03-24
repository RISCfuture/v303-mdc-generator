<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NSelect, NInputNumber, NText, NCard, NGrid, NGridItem, NInput } from 'naive-ui'
import type { FlapSetting, SpeedBrakeSetting } from '../rotationCalculator'
import type { RCR, ThrustSetting } from '../takeoffDistanceCalculator'
import {
  calculateSpeeds,
  calculateHeadwindComponent,
  calculateCrosswindComponent,
} from '../rotationCalculator'
import {
  calculateTakeoffDistance,
  calculateCriticalFieldLength,
  calculateHeadwindComponent as calculateTakeoffHeadwind,
  exceedsCrosswindLimitations,
} from '../takeoffDistanceCalculator'

type Props = {
  grossWeight: number
  runwayLength?: number | null
  runwayWidth?: number | null
  fieldElevation: number
  runwayHeading: number
  temperature: number
  windDirection: number
  windSpeed: number
  runwayName?: string | null
  // Initial values from saved params
  initialFlapSetting?: FlapSetting
  initialSpeedBrake?: SpeedBrakeSetting
  initialThrustSetting?: ThrustSetting
  initialRunwaySlope?: number
  initialRunwayCondition?: 'dry' | 'wet' | 'icy'
}

const props = withDefaults(defineProps<Props>(), {
  runwayLength: undefined,
  runwayWidth: undefined,
  runwayName: undefined,
  initialFlapSetting: 7,
  initialSpeedBrake: 'open',
  initialThrustSetting: 'MAX',
  initialRunwaySlope: 0,
  initialRunwayCondition: 'dry',
})

const emit = defineEmits<{
  'update:config': [
    config: {
      flapSetting: FlapSetting
      speedBrake: SpeedBrakeSetting
      thrustSetting: ThrustSetting
      runwaySlope: number
      runwayCondition: 'dry' | 'wet' | 'icy'
    },
  ]
  'update:speeds': [speeds: { rotationSpeed: number; refusalSpeed: number } | null]
}>()

// Configuration state
const flapSetting = ref<FlapSetting>(props.initialFlapSetting)
const speedBrake = ref<SpeedBrakeSetting>(props.initialSpeedBrake)
const thrustSetting = ref<ThrustSetting>(props.initialThrustSetting)
const runwaySlope = ref(props.initialRunwaySlope)
const runwayCondition = ref<'dry' | 'wet' | 'icy'>(props.initialRunwayCondition)

// Computed wind components
const headwindComponent = computed(() => {
  if (props.windSpeed === 0) return 0
  return calculateHeadwindComponent(props.windDirection, props.windSpeed, props.runwayHeading)
})

const crosswindComponent = computed(() => {
  if (props.windSpeed === 0) return 0
  return calculateCrosswindComponent(props.windDirection, props.windSpeed, props.runwayHeading)
})

// Takeoff headwind (different calculation for A-10)
const takeoffHeadwind = computed(() => {
  if (props.windSpeed === 0) return 0
  return calculateTakeoffHeadwind(props.windSpeed, props.windDirection, props.runwayHeading)
})

// Calculated speeds
const calculatedSpeeds = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  return calculateSpeeds({
    grossWeight: props.grossWeight,
    flapSetting: flapSetting.value,
    speedBrakes: speedBrake.value,
    runwayCondition: runwayCondition.value,
  })
})

// Takeoff distance calculations
const flaps0TakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: props.temperature,
    pressureAltitude: props.fieldElevation,
    flapSetting: 0,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlope.value,
    headwindComponent: takeoffHeadwind.value,
  })

  return Math.round(result.takeoffDistance)
})

const flaps7TakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: props.temperature,
    pressureAltitude: props.fieldElevation,
    flapSetting: 7,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlope.value,
    headwindComponent: takeoffHeadwind.value,
  })

  return Math.round(result.takeoffDistance)
})

const selectedFlapExceedsRunway = computed(() => {
  const distance =
    flapSetting.value === 0 ? flaps0TakeoffDistance.value : flaps7TakeoffDistance.value
  if (distance === null || !props.runwayLength) return false
  return distance > props.runwayLength
})

// Critical field length calculation
const criticalFieldLength = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const rcrMap: Record<'dry' | 'wet' | 'icy', RCR> = {
    dry: 23,
    wet: 12,
    icy: 5,
  }

  const result = calculateCriticalFieldLength({
    grossWeight: props.grossWeight,
    temperatureC: props.temperature,
    pressureAltitude: props.fieldElevation,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlope.value,
    headwindComponent: takeoffHeadwind.value,
    rcr: rcrMap[runwayCondition.value],
  })

  return Math.round(result.criticalFieldLength)
})

// Warning: runway shorter than critical field length
const runwayShorterThanCFL = computed(() => {
  if (criticalFieldLength.value === null || !props.runwayLength) return false
  return props.runwayLength < criticalFieldLength.value
})

// Crosswind limitation check
const exceedsCrosswindLimit = computed(() => {
  if (crosswindComponent.value === 0) return false
  return exceedsCrosswindLimitations(crosswindComponent.value)
})

// Emit config changes
watch(
  [flapSetting, speedBrake, thrustSetting, runwaySlope, runwayCondition],
  () => {
    emit('update:config', {
      flapSetting: flapSetting.value,
      speedBrake: speedBrake.value,
      thrustSetting: thrustSetting.value,
      runwaySlope: runwaySlope.value,
      runwayCondition: runwayCondition.value,
    })
  },
  { immediate: true },
)

// Emit speeds changes
watch(
  calculatedSpeeds,
  (speeds) => {
    emit('update:speeds', speeds)
  },
  { immediate: true },
)

// Expose for parent access
defineExpose({
  headwindComponent,
  crosswindComponent,
  exceedsCrosswindLimit,
  calculatedSpeeds,
})
</script>

<template>
  <!-- Runway Section -->
  <NCard title="Runway" size="small">
    <NGrid :cols="1" :y-gap="12">
      <NGridItem>
        <label>Condition</label>
        <NSelect
          v-model:value="runwayCondition"
          :options="[
            { label: 'Dry', value: 'dry' },
            { label: 'Wet', value: 'wet' },
            { label: 'Icy', value: 'icy' },
          ]"
        />
      </NGridItem>
      <NGridItem>
        <label>Slope (%)</label>
        <NInputNumber v-model:value="runwaySlope" :min="-5" :max="5" :step="0.1" />
        <NText depth="3" class="help-text">Positive = upslope, Negative = downslope</NText>
      </NGridItem>
    </NGrid>
  </NCard>

  <!-- Configuration Section -->
  <NCard title="Configuration" size="small">
    <NGrid :cols="1" :y-gap="12">
      <NGridItem>
        <label>Gross Weight</label>
        <NInput :value="`${grossWeight.toLocaleString()} lbs`" disabled />
      </NGridItem>

      <NGridItem>
        <label>Flap Setting</label>
        <NSelect
          v-model:value="flapSetting"
          :options="[
            { label: '0° (flaps up)', value: 0 },
            { label: '7° (flaps takeoff)', value: 7 },
          ]"
        />
      </NGridItem>

      <NGridItem>
        <label>Speed Brake</label>
        <NSelect
          v-model:value="speedBrake"
          :options="[
            { label: 'Open (extended)', value: 'open' as const },
            { label: 'Closed (retracted)', value: 'closed' as const },
          ]"
        />
      </NGridItem>

      <NGridItem>
        <label>Thrust Setting</label>
        <NSelect
          v-model:value="thrustSetting"
          :options="[
            { label: 'MAX', value: 'MAX' as const },
            { label: '3% Below PTFS', value: '3_BELOW_PTFS' as const },
          ]"
        />
      </NGridItem>
    </NGrid>
  </NCard>

  <!-- Takeoff Distance Section -->
  <NCard title="Takeoff Distance" size="small">
    <NText
      :class="{
        'exceeds-runway': selectedFlapExceedsRunway,
        'below-cfl': runwayShorterThanCFL && !selectedFlapExceedsRunway,
      }"
    >
      {{
        (flapSetting === 0 ? flaps0TakeoffDistance : flaps7TakeoffDistance)?.toLocaleString() ?? '—'
      }}
      ft
    </NText>
    <NText depth="3" class="detail-text">
      <template v-if="runwayLength">
        Runway {{ runwayName }}: {{ runwayLength.toLocaleString() }} &times;
        {{ runwayWidth?.toLocaleString() ?? '—' }} ft •
      </template>
      Thrust: {{ thrustSetting === 'MAX' ? 'MAX' : '3% Below PTFS' }}
    </NText>
    <NText v-if="selectedFlapExceedsRunway" class="exceeds-runway detail-text">
      Warning: Takeoff distance exceeds runway length
    </NText>
    <NText v-else-if="runwayShorterThanCFL" class="below-cfl detail-text">
      Warning: Runway shorter than critical field length ({{
        criticalFieldLength?.toLocaleString()
      }}
      ft)
    </NText>
  </NCard>
</template>

<style scoped>
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

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
  margin-top: 8px;
}

.help-text {
  font-size: 12px;
}
</style>
