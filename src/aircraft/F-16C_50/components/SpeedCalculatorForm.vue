<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NSelect, NInputNumber, NText, NCard, NGrid, NGridItem, NInput, NSpace } from 'naive-ui'
import type { PowerSetting } from '../takeoffDistanceCalculator'
import {
  calculateSpeeds,
  calculateHeadwindComponent,
  calculateCrosswindComponent,
} from '../rotationCalculator'
import {
  calculateTakeoffDistance,
  celsiusToFahrenheit,
  exceedsCrosswindLimitations,
} from '../takeoffDistanceCalculator'

interface Props {
  grossWeight: number
  dragIndex?: number
  runwayLength?: number | null
  runwayWidth?: number | null
  fieldElevation: number
  runwayHeading: number
  temperature: number
  windDirection: number
  windSpeed: number
  runwayName?: string | null
  // Initial values from saved params
  initialPowerSetting?: PowerSetting
  initialCgPercent?: number
  initialPitchAttitude?: number
  initialRunwaySlope?: number
  initialRunwayCondition?: 'dry' | 'wet' | 'snow' | 'ice'
}

const props = withDefaults(defineProps<Props>(), {
  initialPowerSetting: 'AB',
  initialCgPercent: 35,
  initialPitchAttitude: 10,
  initialRunwaySlope: 0,
  initialRunwayCondition: 'dry',
})

const emit = defineEmits<{
  'update:config': [
    config: {
      powerSetting: PowerSetting
      cgPercent: number
      pitchAttitude: number
      runwaySlope: number
      runwayCondition: 'dry' | 'wet' | 'snow' | 'ice'
    },
  ]
  'update:speeds': [speeds: { rotationSpeed: number; refusalSpeed: number } | null]
}>()

// Configuration state
const powerSetting = ref<PowerSetting>(props.initialPowerSetting)
const cgPercent = ref<number>(props.initialCgPercent)
const pitchAttitude = ref<number>(props.initialPitchAttitude)
const runwaySlope = ref<number>(props.initialRunwaySlope)
const runwayCondition = ref<'dry' | 'wet' | 'snow' | 'ice'>(props.initialRunwayCondition)

// Computed wind components
const headwindComponent = computed(() => {
  if (props.windSpeed === 0) return 0
  return calculateHeadwindComponent(props.windDirection, props.windSpeed, props.runwayHeading)
})

const crosswindComponent = computed(() => {
  if (props.windSpeed === 0) return 0
  return calculateCrosswindComponent(props.windDirection, props.windSpeed, props.runwayHeading)
})

// Calculated speeds
const calculatedSpeeds = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  return calculateSpeeds({
    grossWeight: props.grossWeight,
    powerSetting: powerSetting.value,
    cgPercent: cgPercent.value,
    pitchAttitude: pitchAttitude.value,
    runwayCondition: runwayCondition.value,
    headwindComponent: headwindComponent.value,
    runwaySlope: runwaySlope.value,
  })
})

// Takeoff distance calculations
const abTakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(props.temperature),
    pressureAltitude: props.fieldElevation,
    powerSetting: 'AB',
    cgPercent: cgPercent.value,
    dragIndex: props.dragIndex ?? 7,
    runwaySlope: runwaySlope.value,
    headwindComponent: headwindComponent.value,
    pitchAttitude: pitchAttitude.value,
  })

  return Math.round(result.takeoffDistance)
})

const milTakeoffDistance = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateTakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(props.temperature),
    pressureAltitude: props.fieldElevation,
    powerSetting: 'MIL',
    cgPercent: cgPercent.value,
    dragIndex: props.dragIndex ?? 7,
    runwaySlope: runwaySlope.value,
    headwindComponent: headwindComponent.value,
    pitchAttitude: pitchAttitude.value,
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

// Crosswind limitation check
const exceedsCrosswindLimit = computed(() => {
  if (crosswindComponent.value === 0) return false
  const rcrMap: Record<string, number> = {
    dry: 23,
    wet: 12,
    snow: 8,
    ice: 4,
  }
  const rcr = rcrMap[runwayCondition.value] ?? 23
  return exceedsCrosswindLimitations(crosswindComponent.value, rcr)
})

// Emit config changes
watch(
  [powerSetting, cgPercent, pitchAttitude, runwaySlope, runwayCondition],
  () => {
    emit('update:config', {
      powerSetting: powerSetting.value,
      cgPercent: cgPercent.value,
      pitchAttitude: pitchAttitude.value,
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
            { label: 'Snow', value: 'snow' },
            { label: 'Ice', value: 'ice' },
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
        <NGrid :cols="2" :x-gap="8">
          <NGridItem>
            <label>Gross Weight</label>
            <NInput :value="`${grossWeight.toLocaleString()} lbs`" disabled />
          </NGridItem>
          <NGridItem>
            <label>CG Position (% MAC)</label>
            <NInputNumber v-model:value="cgPercent" :min="20" :max="35" />
          </NGridItem>
        </NGrid>
      </NGridItem>

      <NGridItem>
        <label>Power Setting</label>
        <NSelect
          v-model:value="powerSetting"
          :options="[
            { label: 'Military (MIL)', value: 'MIL' },
            { label: 'Afterburner (AB)', value: 'AB' },
          ]"
        />
      </NGridItem>

      <NGridItem>
        <label>Pitch Attitude (degrees)</label>
        <NSelect
          v-model:value="pitchAttitude"
          :options="[
            { label: '8°', value: 8 },
            { label: '10° (standard)', value: 10 },
          ]"
        />
      </NGridItem>
    </NGrid>
  </NCard>

  <!-- Takeoff Distance Section -->
  <NCard title="Takeoff Distance" size="small">
    <NSpace align="center" :size="8">
      <NText strong>{{ powerSetting }}:</NText>
      <NText
        :class="{
          'exceeds-runway': powerSetting === 'AB' ? abExceedsRunway : milExceedsRunway,
        }"
      >
        {{
          (powerSetting === 'AB' ? abTakeoffDistance : milTakeoffDistance)?.toLocaleString() ?? '—'
        }}
        ft
      </NText>
      <NText depth="3">
        ({{ powerSetting === 'AB' ? 'MIL' : 'AB' }}:
        <span
          :class="{
            'exceeds-runway': powerSetting === 'AB' ? milExceedsRunway : abExceedsRunway,
          }"
        >
          {{
            (powerSetting === 'AB' ? milTakeoffDistance : abTakeoffDistance)?.toLocaleString() ??
            '—'
          }}
          ft</span
        >)
      </NText>
    </NSpace>
    <NText v-if="runwayLength" depth="3" class="detail-text">
      Runway {{ runwayName }}: {{ runwayLength.toLocaleString() }} &times;
      {{ runwayWidth?.toLocaleString() ?? '—' }} ft
      <template v-if="dragIndex !== undefined"> • Drag Index: {{ dragIndex }}</template>
    </NText>
    <NText
      v-if="powerSetting === 'AB' ? abExceedsRunway : milExceedsRunway"
      class="exceeds-runway detail-text"
    >
      Warning: Takeoff distance exceeds runway length
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

.detail-text {
  font-size: 12px;
  display: block;
  margin-top: 8px;
}

.help-text {
  font-size: 12px;
}
</style>
