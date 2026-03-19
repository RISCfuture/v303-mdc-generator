<script setup lang="ts">
import { NAutoComplete, NFormItem, NInput, NInputNumber } from 'naive-ui'
import CoordinateField from '@/components/common/CoordinateField.vue'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { parseTOT } from '@/composables/useWaypointCalculations'
import { HEIGHT } from '@/styles/design-tokens'
import { STEERPOINT_TYPES } from '@/data/constants'
import type { Waypoint, CoordinateFormat } from '@/types'

type Props = {
  waypoint: Waypoint
  totPlaceholder: string
  isWaypointFieldIncomplete?: (
    waypoint: Pick<Waypoint, 'name' | 'latitude' | 'longitude' | 'altitude' | 'speed'>,
    field: 'name' | 'latitude' | 'longitude' | 'altitude',
  ) => boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof Waypoint, value: unknown]
  blur: []
}>()

// Validate TOT field - returns object for Naive UI form validation
const totValidationRule = {
  validator: (_rule: unknown, value: string) => {
    if (!value || value.trim() === '') {
      return true
    }
    if (parseTOT(value) !== null) {
      return true
    }
    return false
  },
  message: 'Invalid format. Use HH:MM, HHMM, or HHMMz',
  trigger: ['blur', 'input'],
}
</script>

<template>
  <NFormItem
    label="Name"
    label-placement="top"
    class="waypoint-field"
    required
    :validation-status="isWaypointFieldIncomplete?.(waypoint, 'name') ? 'error' : undefined"
  >
    <NInput
      :value="waypoint.name"
      @update:value="(v: string) => emit('update-field', 'name', v)"
      @blur="emit('blur')"
      size="small"
      :status="isWaypointFieldIncomplete?.(waypoint, 'name') ? 'error' : undefined"
      aria-label="Name"
      autocorrect="off"
    />
  </NFormItem>
  <NFormItem label="Type" label-placement="top" class="waypoint-field-small">
    <NAutoComplete
      :value="waypoint.type"
      @update:value="(v: string) => emit('update-field', 'type', v)"
      @blur="emit('blur')"
      :options="STEERPOINT_TYPES.map((t: string) => ({ label: t, value: t }))"
      :get-show="() => true"
      size="small"
      aria-label="Waypoint Type"
      clearable
      autocorrect="off"
    />
  </NFormItem>
  <NFormItem
    label="Coordinate"
    label-placement="top"
    class="waypoint-field-wide"
    required
    :validation-status="
      isWaypointFieldIncomplete?.(waypoint, 'latitude') ||
      isWaypointFieldIncomplete?.(waypoint, 'longitude')
        ? 'error'
        : undefined
    "
  >
    <CoordinateField
      :latitude="waypoint.latitude"
      :longitude="waypoint.longitude"
      :format="waypoint.coordinateFormat ?? 'DDM'"
      @update:latitude="(v: number | null) => emit('update-field', 'latitude', v)"
      @update:longitude="(v: number | null) => emit('update-field', 'longitude', v)"
      @update:format="(v: CoordinateFormat) => emit('update-field', 'coordinateFormat', v)"
      size="small"
      label=""
    />
  </NFormItem>
  <NFormItem
    label="Alt"
    label-placement="top"
    class="waypoint-field-small"
    required
    :validation-status="isWaypointFieldIncomplete?.(waypoint, 'altitude') ? 'error' : undefined"
  >
    <NInputNumber
      :value="waypoint.altitude"
      @update:value="(v: number | null) => emit('update-field', 'altitude', v)"
      @blur="emit('blur')"
      :show-button="false"
      :format="formatInteger"
      :parse="parseInteger"
      placeholder="25000"
      size="small"
      :status="isWaypointFieldIncomplete?.(waypoint, 'altitude') ? 'error' : undefined"
      aria-label="Altitude"
    >
      <template #suffix>ft</template>
    </NInputNumber>
  </NFormItem>
  <NFormItem label="Speed" label-placement="top" class="waypoint-field-small">
    <NInputNumber
      :value="waypoint.speed"
      @update:value="(v: number | null) => emit('update-field', 'speed', v)"
      @blur="emit('blur')"
      :show-button="false"
      :format="formatInteger"
      :parse="parseInteger"
      placeholder="---"
      size="small"
      aria-label="IAS"
    >
      <template #suffix>kts</template>
    </NInputNumber>
  </NFormItem>
  <NFormItem
    label="TOT"
    label-placement="top"
    class="waypoint-field-small"
    :rule="totValidationRule"
    :show-feedback="false"
  >
    <NInput
      :value="waypoint.timeOnTarget"
      @update:value="(v: string) => emit('update-field', 'timeOnTarget', v)"
      @blur="emit('blur')"
      :placeholder="totPlaceholder"
      size="small"
      :status="
        waypoint.timeOnTarget && parseTOT(waypoint.timeOnTarget) === null ? 'error' : undefined
      "
      autocorrect="off"
    >
      <template #suffix>Z</template>
    </NInput>
  </NFormItem>
</template>

<style scoped>
.waypoint-field,
.waypoint-field-small,
.waypoint-field-wide {
  margin-bottom: 0 !important;
}

.waypoint-field-wide {
  min-width: 300px;
}

/* Ensure consistent alignment regardless of validation state */
:deep(.n-form-item) {
  align-self: end;

  /* Force all form items to same height by hiding overflow */
  max-height: v-bind('HEIGHT.formItemMax'); /* label + input */
  overflow: visible;
}

:deep(.n-form-item-blank) {
  min-height: v-bind('HEIGHT.inputSmall'); /* Match small input height */
}

/* Hide validation feedback to prevent layout shifts */
:deep(.n-form-item-feedback-wrapper) {
  display: none;
}

/* Mobile responsive styles */
@media (width <= 768px) {
  .waypoint-field,
  .waypoint-field-small,
  .waypoint-field-wide {
    width: 100%;
  }

  :deep(.n-form-item) {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  :deep(.n-form-item-blank) {
    padding-top: 4px !important;
  }

  :deep(.n-form-item-label) {
    padding-bottom: 4px !important;
  }
}
</style>
