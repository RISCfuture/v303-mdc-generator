<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NSelect,
  NSpace,
  NButton,
  NInputNumber,
  NText,
  NInput,
  NCard,
  NGrid,
  NGridItem,
} from 'naive-ui'
import AirportSelector from './AirportSelector.vue'
import WeatherInputs from './WeatherInputs.vue'
import type { Mission, Airframe, F16CalculatorParams, A10CalculatorParams } from '@/types'
import {
  calculateSpeeds as calculateF16Speeds,
  calculateHeadwindComponent as calculateF16Headwind,
  calculateCrosswindComponent as calculateF16Crosswind,
  type PowerSetting,
} from '@/utils/f16RotationCalculator'
import {
  calculateSpeeds as calculateA10Speeds,
  calculateHeadwindComponent as calculateA10Headwind,
  calculateCrosswindComponent as calculateA10Crosswind,
  type FlapSetting,
  type SpeedBrakeSetting,
} from '@/utils/a10RotationCalculator'
import {
  calculateTakeoffDistance as calculateF16TakeoffDistance,
  celsiusToFahrenheit,
  exceedsCrosswindLimitations as exceedsF16CrosswindLimitations,
} from '@/utils/f16TakeoffDistanceCalculator'
import {
  calculateTakeoffDistance as calculateA10TakeoffDistance,
  calculateCriticalFieldLength as calculateA10CriticalFieldLength,
  calculateHeadwindComponent as calculateA10TakeoffHeadwind,
  exceedsCrosswindLimitations as exceedsA10CrosswindLimitations,
  type ThrustSetting,
  type RCR,
} from '@/utils/a10TakeoffDistanceCalculator'

interface Props {
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

// Common parameters
const windDirection = ref<number>(0)
const windSpeed = ref<number>(0)
const temperature = ref<number>(15)
const runwayConditionF16 = ref<'dry' | 'wet' | 'snow' | 'ice'>('dry')
const runwayConditionA10 = ref<'dry' | 'wet' | 'icy'>('dry')

// F-16 specific parameters
const powerSetting = ref<PowerSetting>('AB')
const cgPercent = ref<number>(35)
const pitchAttitude = ref<number>(10)
const runwaySlope = ref<number>(0)

// A-10 specific parameters
const flapSetting = ref<FlapSetting>(7)
const speedBrake = ref<SpeedBrakeSetting>('open')
const thrustSetting = ref<ThrustSetting>('MAX')
const runwaySlopeA10 = ref<number>(0)

// Computed wind components
const runwayHeading = computed(() => selectedRunwayHeading.value ?? 0)

const headwindComponent = computed(() => {
  if (windSpeed.value === 0) return 0
  if (props.airframe === 'F-16C_50') {
    return calculateF16Headwind(windDirection.value, windSpeed.value, runwayHeading.value)
  } else {
    return calculateA10Headwind(windDirection.value, windSpeed.value, runwayHeading.value)
  }
})

const crosswindComponent = computed(() => {
  if (windSpeed.value === 0) return 0
  if (props.airframe === 'F-16C_50') {
    return calculateF16Crosswind(windDirection.value, windSpeed.value, runwayHeading.value)
  } else {
    return calculateA10Crosswind(windDirection.value, windSpeed.value, runwayHeading.value)
  }
})

// Calculated speeds preview
const calculatedSpeeds = computed(() => {
  if (!props.grossWeight || props.grossWeight === 0) return null

  if (props.airframe === 'F-16C_50') {
    return calculateF16Speeds({
      grossWeight: props.grossWeight,
      powerSetting: powerSetting.value,
      cgPercent: cgPercent.value,
      pitchAttitude: pitchAttitude.value,
      runwayCondition: runwayConditionF16.value,
      headwindComponent: headwindComponent.value,
      runwaySlope: runwaySlope.value,
    })
  } else if (props.airframe === 'A-10C_2') {
    return calculateA10Speeds({
      grossWeight: props.grossWeight,
      flapSetting: flapSetting.value,
      speedBrakes: speedBrake.value,
      runwayCondition: runwayConditionA10.value,
    })
  }

  return null
})

// Takeoff distance calculations (F-16)
const abTakeoffDistance = computed(() => {
  if (props.airframe !== 'F-16C_50') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateF16TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(temperature.value),
    pressureAltitude: fieldElevation.value ?? 0,
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
  if (props.airframe !== 'F-16C_50') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateF16TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(temperature.value),
    pressureAltitude: fieldElevation.value ?? 0,
    powerSetting: 'MIL',
    cgPercent: cgPercent.value,
    dragIndex: props.dragIndex ?? 7,
    runwaySlope: runwaySlope.value,
    headwindComponent: headwindComponent.value,
    pitchAttitude: pitchAttitude.value,
  })

  return Math.round(result.takeoffDistance)
})

// Takeoff distance calculations (A-10)
const a10TakeoffHeadwind = computed(() => {
  if (props.airframe !== 'A-10C_2') return 0
  if (windSpeed.value === 0) return 0
  return calculateA10TakeoffHeadwind(windSpeed.value, windDirection.value, runwayHeading.value)
})

const flaps0TakeoffDistance = computed(() => {
  if (props.airframe !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateA10TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: temperature.value,
    pressureAltitude: fieldElevation.value ?? 0,
    flapSetting: 0,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlopeA10.value,
    headwindComponent: a10TakeoffHeadwind.value,
  })

  return Math.round(result.takeoffDistance)
})

const flaps7TakeoffDistance = computed(() => {
  if (props.airframe !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const result = calculateA10TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureC: temperature.value,
    pressureAltitude: fieldElevation.value ?? 0,
    flapSetting: 7,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlopeA10.value,
    headwindComponent: a10TakeoffHeadwind.value,
  })

  return Math.round(result.takeoffDistance)
})

const selectedFlapExceedsRunway = computed(() => {
  const distance =
    flapSetting.value === 0 ? flaps0TakeoffDistance.value : flaps7TakeoffDistance.value
  if (distance === null || !props.runwayLength) return false
  return distance > props.runwayLength
})

// Critical field length calculation (A-10)
const criticalFieldLength = computed(() => {
  if (props.airframe !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  // Map runway condition to RCR
  const rcrMap: Record<'dry' | 'wet' | 'icy', RCR> = {
    dry: 23,
    wet: 12,
    icy: 5,
  }

  const result = calculateA10CriticalFieldLength({
    grossWeight: props.grossWeight,
    temperatureC: temperature.value,
    pressureAltitude: fieldElevation.value ?? 0,
    thrustSetting: thrustSetting.value,
    runwaySlope: runwaySlopeA10.value,
    headwindComponent: a10TakeoffHeadwind.value,
    rcr: rcrMap[runwayConditionA10.value],
  })

  return Math.round(result.criticalFieldLength)
})

// Warning: runway shorter than critical field length
const runwayShorterThanCFL = computed(() => {
  if (criticalFieldLength.value === null || !props.runwayLength) return false
  return props.runwayLength < criticalFieldLength.value
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

  if (props.airframe === 'F-16C_50') {
    // Map F-16 runway condition to RCR for crosswind limit calculation
    const rcrMap: Record<string, number> = {
      dry: 23,
      wet: 12,
      snow: 8,
      ice: 4,
    }
    const rcr = rcrMap[runwayConditionF16.value] ?? 23
    return exceedsF16CrosswindLimitations(crosswindComponent.value, rcr)
  } else if (props.airframe === 'A-10C_2') {
    return exceedsA10CrosswindLimitations(crosswindComponent.value)
  }

  return false
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

      // Load calculator params if available
      const params = props.mission.told.calculatorParams
      if (params) {
        windDirection.value = params.windDirection ?? 0
        windSpeed.value = params.windSpeed ?? 0
        temperature.value = params.temperature ?? 15

        // Load aircraft-specific params
        if (props.airframe === 'F-16C_50' && 'powerSetting' in params) {
          runwayConditionF16.value = params.runwayCondition
          powerSetting.value = params.powerSetting
          cgPercent.value = params.cgPercent ?? 35
          pitchAttitude.value = params.pitchAttitude ?? 10
          runwaySlope.value = params.runwaySlope ?? 0
        } else if (props.airframe === 'A-10C_2' && 'flapSetting' in params) {
          runwayConditionA10.value = params.runwayCondition
          flapSetting.value = params.flapSetting
          speedBrake.value = params.speedBrake
          thrustSetting.value = params.thrustSetting ?? 'MAX'
          runwaySlopeA10.value = params.runwaySlope ?? 0
        }
      }
    }
  },
)

function handleCalculate() {
  if (!calculatedSpeeds.value) return

  // Build calculator params object (weather/configuration only)
  let params: F16CalculatorParams | A10CalculatorParams

  if (props.airframe === 'F-16C_50') {
    params = {
      windDirection: windDirection.value,
      windSpeed: windSpeed.value,
      temperature: temperature.value,
      runwayCondition: runwayConditionF16.value,
      powerSetting: powerSetting.value,
      cgPercent: cgPercent.value,
      pitchAttitude: pitchAttitude.value,
      runwaySlope: runwaySlope.value,
    }
  } else {
    params = {
      windDirection: windDirection.value,
      windSpeed: windSpeed.value,
      temperature: temperature.value,
      runwayCondition: runwayConditionA10.value,
      flapSetting: flapSetting.value,
      speedBrake: speedBrake.value,
      thrustSetting: thrustSetting.value,
      runwaySlope: runwaySlopeA10.value,
    }
  }

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
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    :title="`Calculate Takeoff Speeds - ${airframe === 'F-16C_50' ? 'F-16C' : 'A-10C'}`"
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
        :show-wind-components="windSpeed > 0 && selectedRunwayHeading !== undefined"
        :exceeds-crosswind-limit="exceedsCrosswindLimit"
        @update:temperature="(v: number) => (temperature = v)"
        @update:wind-direction="(v: number) => (windDirection = v)"
        @update:wind-speed="(v: number) => (windSpeed = v)"
      />

      <!-- Runway Section -->
      <NCard title="Runway" size="small">
        <NGrid :cols="1" :y-gap="12">
          <NGridItem>
            <label>Condition</label>
            <NSelect
              v-if="airframe === 'F-16C_50'"
              v-model:value="runwayConditionF16"
              :options="[
                { label: 'Dry', value: 'dry' },
                { label: 'Wet', value: 'wet' },
                { label: 'Snow', value: 'snow' },
                { label: 'Ice', value: 'ice' },
              ]"
            />
            <NSelect
              v-else-if="airframe === 'A-10C_2'"
              v-model:value="runwayConditionA10"
              :options="[
                { label: 'Dry', value: 'dry' },
                { label: 'Wet', value: 'wet' },
                { label: 'Icy', value: 'icy' },
              ]"
            />
          </NGridItem>

          <!-- F-16 Runway Slope -->
          <NGridItem v-if="airframe === 'F-16C_50'">
            <label>Slope (%)</label>
            <NInputNumber v-model:value="runwaySlope" :min="-5" :max="5" :step="0.1" />
            <NText depth="3" class="help-text">Positive = upslope, Negative = downslope</NText>
          </NGridItem>

          <!-- A-10 Runway Slope -->
          <NGridItem v-if="airframe === 'A-10C_2'">
            <label>Slope (%)</label>
            <NInputNumber v-model:value="runwaySlopeA10" :min="-5" :max="5" :step="0.1" />
            <NText depth="3" class="help-text">Positive = upslope, Negative = downslope</NText>
          </NGridItem>
        </NGrid>
      </NCard>

      <!-- Configuration Section -->
      <NCard title="Configuration" size="small">
        <NGrid :cols="1" :y-gap="12">
          <!-- F-16 Specific Parameters -->
          <template v-if="airframe === 'F-16C_50'">
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
          </template>

          <!-- A-10 Specific Parameters -->
          <template v-else-if="airframe === 'A-10C_2'">
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
          </template>
        </NGrid>
      </NCard>

      <!-- F-16 Takeoff Distance Section -->
      <NCard v-if="airframe === 'F-16C_50'" title="Takeoff Distance" size="small">
        <NSpace align="center" :size="8">
          <NText strong>{{ powerSetting }}:</NText>
          <NText
            :class="{
              'exceeds-runway': powerSetting === 'AB' ? abExceedsRunway : milExceedsRunway,
            }"
          >
            {{
              (powerSetting === 'AB' ? abTakeoffDistance : milTakeoffDistance)?.toLocaleString() ??
              '—'
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
                (powerSetting === 'AB'
                  ? milTakeoffDistance
                  : abTakeoffDistance
                )?.toLocaleString() ?? '—'
              }}
              ft</span
            >)
          </NText>
        </NSpace>
        <NText v-if="runwayLength" depth="3" class="detail-text">
          Runway {{ selectedRunwayName }}: {{ runwayLength.toLocaleString() }} &times;
          {{ runwayWidth?.toLocaleString() ?? '—' }} ft
          <template v-if="dragIndex !== undefined"> • Drag Index: {{ dragIndex }}</template>
        </NText>
        <NText
          v-if="powerSetting === 'AB' ? abExceedsRunway : milExceedsRunway"
          class="exceeds-runway detail-text"
        >
          ⚠ Takeoff distance exceeds runway length
        </NText>
      </NCard>

      <!-- A-10 Takeoff Distance Section -->
      <NCard v-if="airframe === 'A-10C_2'" title="Takeoff Distance" size="small">
        <NText
          :class="{
            'exceeds-runway': selectedFlapExceedsRunway,
            'below-cfl': runwayShorterThanCFL && !selectedFlapExceedsRunway,
          }"
        >
          {{
            (flapSetting === 0 ? flaps0TakeoffDistance : flaps7TakeoffDistance)?.toLocaleString() ??
            '—'
          }}
          ft
        </NText>
        <NText depth="3" class="detail-text">
          <template v-if="runwayLength">
            Runway {{ selectedRunwayName }}: {{ runwayLength.toLocaleString() }} &times;
            {{ runwayWidth?.toLocaleString() ?? '—' }} ft •
          </template>
          Thrust: {{ thrustSetting === 'MAX' ? 'MAX' : '3% Below PTFS' }}
        </NText>
        <NText v-if="selectedFlapExceedsRunway" class="exceeds-runway detail-text">
          ⚠ Takeoff distance exceeds runway length
        </NText>
        <NText v-else-if="runwayShorterThanCFL" class="below-cfl detail-text">
          ⚠ Runway shorter than critical field length ({{ criticalFieldLength?.toLocaleString() }}
          ft)
        </NText>
      </NCard>
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
