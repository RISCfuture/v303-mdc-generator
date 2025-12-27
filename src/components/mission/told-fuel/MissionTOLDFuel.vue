<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NForm, NFormItem, NInput, NInputNumber, NDivider, NButton } from 'naive-ui'
import { formatNumber } from '@/utils/formatting'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { isHelicopter } from '@/utils/airframeHelpers'
import { FORM, SPACING } from '@/styles/design-tokens'
import type { Mission } from '@/types'

interface Props {
  mission: Mission
  grossWeight: number
  fuelWeight: number
  calculatedSpeeds: { rotationSpeed: number; refusalSpeed: number } | null
  calculatedBingo: number | null
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
