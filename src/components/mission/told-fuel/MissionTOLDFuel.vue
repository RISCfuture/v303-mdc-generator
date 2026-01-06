<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NForm, NFormItem, NInput, NInputNumber, NDivider, NButton, NText } from 'naive-ui'
import { formatNumber } from '@/utils/formatting'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { isHelicopter } from '@/utils/airframeHelpers'
import { FORM, SPACING } from '@/styles/design-tokens'
import { calculateTakeoffDistance, celsiusToFahrenheit } from '@/utils/f16TakeoffDistanceCalculator'
import { calculateHeadwindComponent } from '@/utils/f16RotationCalculator'
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
  if (airframe.value !== 'F-16C_50') return null
  if (!props.grossWeight || props.grossWeight === 0) return null

  const p = takeoffParams.value
  const result = calculateTakeoffDistance({
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
  const result = calculateTakeoffDistance({
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
          <div :style="{ display: 'flex', alignItems: 'center', gap: SPACING.sm }">
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
              style="flex: 1"
            >
              <template #suffix>kts</template>
            </NInputNumber>
            <NButton v-if="showCalculator" size="small" @click="handleOpenCalculator">
              Calculate…
            </NButton>
          </div>
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
        <NFormItem v-if="airframe === 'F-16C_50'" label="Takeoff Distance">
          <div>
            <div>
              <NText>
                <strong>{{ selectedPowerSetting }}:</strong>
                <span :class="{ 'exceeds-runway': primaryExceedsRunway }" style="margin-left: 4px">
                  {{ primaryTakeoffDistance?.toLocaleString() ?? '—' }} ft
                </span>
              </NText>
              <NText depth="3" style="margin-left: 8px">
                ({{ secondaryPowerSetting }}:
                <span :class="{ 'exceeds-runway': secondaryExceedsRunway }">
                  {{ secondaryTakeoffDistance?.toLocaleString() ?? '—' }} ft</span
                >)
              </NText>
            </div>
            <NText
              v-if="runwayLength"
              depth="3"
              style="font-size: 12px; display: block; margin-top: 4px"
            >
              Runway {{ mission.departureRecovery.departureRunwayName }}:
              {{ runwayLength.toLocaleString() }} &times;
              {{ runwayWidth?.toLocaleString() ?? '—' }} ft
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
        <div :style="{ display: 'flex', alignItems: 'center', gap: SPACING.sm }">
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
            style="flex: 1"
          >
            <template #suffix>lbs</template>
          </NInputNumber>
          <NButton v-if="showBingoCalculator" size="small" @click="handleOpenBingoCalculator">
            Calculate…
          </NButton>
        </div>
      </NFormItem>
    </NForm>
  </NCard>
</template>

<style scoped>
.exceeds-runway {
  color: var(--error-color, #e88080);
  font-weight: 600;
}
</style>
