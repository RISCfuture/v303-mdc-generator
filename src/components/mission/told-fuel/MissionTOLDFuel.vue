<script setup lang="ts">
import { computed } from 'vue'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NDivider,
  NButton,
  NText,
  NFlex,
  NSpace,
} from 'naive-ui'
import { formatNumber } from '@/utils/formatting'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { isHelicopter } from '@/utils/airframeHelpers'
import { FORM } from '@/styles/design-tokens'
import {
  calculateTakeoffDistance as calculateF16TakeoffDistance,
  celsiusToFahrenheit,
} from '@/utils/f16TakeoffDistanceCalculator'
import { calculateHeadwindComponent as calculateF16Headwind } from '@/utils/f16RotationCalculator'
import {
  calculateTakeoffDistance as calculateA10TakeoffDistance,
  calculateCriticalFieldLength as calculateA10CriticalFieldLength,
  calculateHeadwindComponent as calculateA10Headwind,
  type RCR,
} from '@/utils/a10TakeoffDistanceCalculator'
import type { Mission } from '@/types'

interface Props {
  mission: Mission
  grossWeight: number
  fuelWeight: number
  calculatedSpeeds: { rotationSpeed: number; refusalSpeed: number } | null
  calculatedBingo: number | null
  calculatedDragIndex?: number
  runwayLength?: number | null
  runwayWidth?: number | null
  isFieldIncomplete?: (fieldName: string) => boolean
}

const props = defineProps<Props>()

const airframe = computed(() => getMissionAirframe(props.mission))

// Show calculator button only for A-10 and F-16
const showCalculator = computed(() => airframe.value === 'F-16C_50' || airframe.value === 'A-10C_2')

// Hide rotation/refusal speeds for helicopters (they don't have these)
const showRotationRefusal = computed(() => !isHelicopter(airframe.value))

// Show bingo calculator button only when bingo can be calculated (F-16C with target waypoint)
const showBingoCalculator = computed(
  () => airframe.value === 'F-16C_50' && props.calculatedBingo !== null,
)

// Takeoff distance calculations (F-16 only)
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
    windSpeed > 0 ? calculateF16Headwind(windDirection, windSpeed, runwayHeading) : 0

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
  if (airframe.value !== 'F-16C_50') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateF16TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(p.temperature),
    pressureAltitude: p.fieldElevation,
    powerSetting: 'AB',
    cgPercent: p.cgPercent,
    dragIndex: props.calculatedDragIndex ?? 7,
    runwaySlope: p.runwaySlope,
    headwindComponent: p.headwindComponent,
    pitchAttitude: p.pitchAttitude,
  })

  return Math.round(result.takeoffDistance)
})

const milTakeoffDistance = computed(() => {
  if (airframe.value !== 'F-16C_50') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateF16TakeoffDistance({
    grossWeight: props.grossWeight,
    temperatureF: celsiusToFahrenheit(p.temperature),
    pressureAltitude: p.fieldElevation,
    powerSetting: 'MIL',
    cgPercent: p.cgPercent,
    dragIndex: props.calculatedDragIndex ?? 7,
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

// A-10 Takeoff distance calculations
const a10TakeoffParams = computed(() => {
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
    windSpeed > 0 ? calculateA10Headwind(windSpeed, windDirection, runwayHeading) : 0

  return {
    temperature,
    thrustSetting: thrustSetting as 'MAX' | '3_BELOW_PTFS',
    runwaySlope,
    fieldElevation,
    headwindComponent,
  }
})

const flaps0TakeoffDistance = computed(() => {
  if (airframe.value !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = a10TakeoffParams.value
  const result = calculateA10TakeoffDistance({
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
  if (airframe.value !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = a10TakeoffParams.value
  const result = calculateA10TakeoffDistance({
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
const primaryA10TakeoffDistance = computed(() => {
  return selectedFlapSetting.value === 0 ? flaps0TakeoffDistance.value : flaps7TakeoffDistance.value
})

const primaryA10ExceedsRunway = computed(() => {
  return selectedFlapSetting.value === 0 ? flaps0ExceedsRunway.value : flaps7ExceedsRunway.value
})

// Critical field length calculation (A-10)
const criticalFieldLength = computed(() => {
  if (airframe.value !== 'A-10C_2') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const params = props.mission.told.calculatorParams
  const runwayCondition = params && 'runwayCondition' in params ? params.runwayCondition : 'dry'

  // Map runway condition to RCR
  const rcrMap: Record<'dry' | 'wet' | 'icy', RCR> = {
    dry: 23,
    wet: 12,
    icy: 5,
  }

  const p = a10TakeoffParams.value
  const result = calculateA10CriticalFieldLength({
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

const emit = defineEmits<{
  'update:nested-field': [
    parent: 'details' | 'ecmCmds' | 'told' | 'fuel' | 'departureRecovery',
    field: string,
    value: string | number | string[] | undefined,
  ]
  'open-speed-calculator': []
  'open-bingo-calculator': []
}>()

function handleOpenCalculator() {
  emit('open-speed-calculator')
}

function handleOpenBingoCalculator() {
  emit('open-bingo-calculator')
}
</script>

<template>
  <NCard title="Takeoff & Landing Data">
    <NForm
      label-placement="left"
      :label-width="FORM.labelWidth"
      :style="{ maxWidth: FORM.maxWidth }"
    >
      <NFormItem label="MIN AGL">
        <NInputNumber
          :value="mission.told.minAgl"
          @update:value="
            (v: number | null) => emit('update:nested-field', 'told', 'minAgl', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>
      <NFormItem label="MIN MSL">
        <NInputNumber
          :value="mission.told.minMsl"
          @update:value="
            (v: number | null) => emit('update:nested-field', 'told', 'minMsl', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>

      <NDivider />

      <NFormItem label="Gross Weight">
        <NInput :value="formatNumber(grossWeight)" disabled placeholder="Auto-calculated">
          <template #suffix>lbs</template>
        </NInput>
      </NFormItem>

      <template v-if="showRotationRefusal">
        <NFormItem
          label="Rotation Speed"
          :validation-status="props.isFieldIncomplete?.('rotation') ? 'error' : undefined"
        >
          <NFlex align="center" :size="8">
            <NInputNumber
              :value="mission.told.rotation"
              @update:value="
                (v: number | null) =>
                  emit('update:nested-field', 'told', 'rotation', v ?? undefined)
              "
              :show-button="false"
              :format="formatInteger"
              :parse="parseInteger"
              :placeholder="
                airframe === 'F-16C_50'
                  ? 'Auto-calculated (AB)'
                  : airframe === 'A-10C_2'
                    ? 'Auto-calculated (flaps 0)'
                    : 'Manual entry'
              "
              :status="props.isFieldIncomplete?.('rotation') ? 'error' : undefined"
              class="flex-input"
            >
              <template #suffix>kts</template>
            </NInputNumber>
            <NButton v-if="showCalculator" size="small" @click="handleOpenCalculator">
              Calculate…
            </NButton>
          </NFlex>
        </NFormItem>
        <NFormItem
          label="Refusal Speed"
          :validation-status="props.isFieldIncomplete?.('refusal') ? 'error' : undefined"
        >
          <NInputNumber
            :value="mission.told.refusal"
            @update:value="
              (v: number | null) => emit('update:nested-field', 'told', 'refusal', v ?? undefined)
            "
            :show-button="false"
            :format="formatInteger"
            :parse="parseInteger"
            :placeholder="
              airframe === 'F-16C_50'
                ? 'Auto-calculated (AB, dry)'
                : airframe === 'A-10C_2'
                  ? 'Auto-calculated (dry, SB open)'
                  : 'Manual entry'
            "
            :status="props.isFieldIncomplete?.('refusal') ? 'error' : undefined"
          >
            <template #suffix>kts</template>
          </NInputNumber>
        </NFormItem>

        <!-- F-16 Takeoff Distance Display -->
        <NFormItem
          v-if="airframe === 'F-16C_50'"
          label="Takeoff Distance"
          class="top-aligned-label"
        >
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
              {{ runwayLength.toLocaleString() }} &times;
              {{ runwayWidth?.toLocaleString() ?? '—' }} ft
            </NText>
            <NText v-if="primaryExceedsRunway" class="exceeds-runway detail-text">
              ⚠ Takeoff distance exceeds runway length
            </NText>
          </div>
        </NFormItem>

        <!-- A-10 Takeoff Distance Display -->
        <NFormItem v-if="airframe === 'A-10C_2'" label="Takeoff Distance" class="top-aligned-label">
          <div>
            <NText
              :class="{
                'exceeds-runway': primaryA10ExceedsRunway,
                'below-cfl': runwayShorterThanCFL && !primaryA10ExceedsRunway,
              }"
            >
              {{ primaryA10TakeoffDistance?.toLocaleString() ?? '—' }} ft
            </NText>
            <NText v-if="runwayLength" depth="3" class="detail-text">
              Runway {{ mission.departureRecovery.departureRunwayName }}:
              {{ runwayLength.toLocaleString() }} &times;
              {{ runwayWidth?.toLocaleString() ?? '—' }} ft
            </NText>
            <NText v-if="primaryA10ExceedsRunway" class="exceeds-runway detail-text">
              ⚠ Takeoff distance exceeds runway length
            </NText>
            <NText v-else-if="runwayShorterThanCFL" class="below-cfl detail-text">
              ⚠ Runway shorter than critical field length ({{
                criticalFieldLength?.toLocaleString()
              }}
              ft)
            </NText>
          </div>
        </NFormItem>
      </template>
      <NDivider />

      <NFormItem label="Takeoff Fuel">
        <NInput :value="formatNumber(fuelWeight)" disabled placeholder="Auto-calculated">
          <template #suffix>lbs</template>
        </NInput>
      </NFormItem>
      <NFormItem label="Joker">
        <NInputNumber
          :value="mission.fuel.joker"
          @update:value="
            (v: number | null) => emit('update:nested-field', 'fuel', 'joker', v ?? 4500)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
        >
          <template #suffix>lbs</template>
        </NInputNumber>
      </NFormItem>
      <NFormItem
        label="Bingo"
        :validation-status="props.isFieldIncomplete?.('bingo') ? 'error' : undefined"
      >
        <NFlex align="center" :size="8">
          <NInputNumber
            :value="mission.fuel.bingo"
            @update:value="
              (v: number | null) => emit('update:nested-field', 'fuel', 'bingo', v ?? 3000)
            "
            :show-button="false"
            :format="formatInteger"
            :parse="parseInteger"
            :placeholder="showBingoCalculator ? 'Auto-calculated' : 'Manual entry'"
            :status="props.isFieldIncomplete?.('bingo') ? 'error' : undefined"
            class="flex-input"
          >
            <template #suffix>lbs</template>
          </NInputNumber>
          <NButton v-if="showBingoCalculator" size="small" @click="handleOpenBingoCalculator">
            Calculate…
          </NButton>
        </NFlex>
      </NFormItem>
    </NForm>
  </NCard>
</template>

<style scoped>
.flex-input {
  flex: 1;
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
  margin-top: 4px;
}

.top-aligned-label :deep(.n-form-item-label) {
  align-items: flex-start;
  padding-top: 2px;
}
</style>
