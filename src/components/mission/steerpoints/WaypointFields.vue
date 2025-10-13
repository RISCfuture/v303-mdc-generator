<script setup lang="ts">
import { NAutoComplete, NFormItem, NInput, NInputNumber } from 'naive-ui'
import CoordinateInputField from '@/components/common/CoordinateInputField.vue'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { parseTOT } from '@/composables/useWaypointCalculations'
import { HEIGHT } from '@/styles/design-tokens'
import type { Waypoint } from '@/types'

interface Props {
  waypoint: Waypoint
  totPlaceholder: string
  isWaypointFieldIncomplete?: (
    waypoint: {
      name?: string
      latitude?: number | null
      longitude?: number | null
      altitude?: number | null
    },
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
    />
  </NFormItem>
  <NFormItem label="Type" label-placement="top" class="waypoint-field-small">
    <NAutoComplete
      :value="waypoint.type"
      @update:value="(v: string) => emit('update-field', 'type', v)"
      @blur="emit('blur')"
      :options="
        ['NAV', 'IP', 'TGT', 'PUSH', 'PRE-IP', 'IAF', 'EP'].map((t) => ({ label: t, value: t }))
      "
      :get-show="() => true"
      size="small"
      aria-label="Waypoint Type"
      clearable
    />
  </NFormItem>
  <NFormItem
    label="Latitude"
    label-placement="top"
    class="waypoint-field"
    required
    :validation-status="isWaypointFieldIncomplete?.(waypoint, 'latitude') ? 'error' : undefined"
  >
    <CoordinateInputField
      :model-value="waypoint.latitude"
      @update:model-value="(v: number | null) => emit('update-field', 'latitude', v)"
      type="latitude"
      @blur="emit('blur')"
      placeholder="N --° --.---′"
      size="small"
      :status="isWaypointFieldIncomplete?.(waypoint, 'latitude') ? 'error' : undefined"
      aria-label="Latitude"
    />
  </NFormItem>
  <NFormItem
    label="Longitude"
    label-placement="top"
    class="waypoint-field"
    required
    :validation-status="isWaypointFieldIncomplete?.(waypoint, 'longitude') ? 'error' : undefined"
  >
    <CoordinateInputField
      :model-value="waypoint.longitude"
      @update:model-value="(v: number | null) => emit('update-field', 'longitude', v)"
      type="longitude"
      @blur="emit('blur')"
      placeholder="E ---° --.---′"
      size="small"
      :status="isWaypointFieldIncomplete?.(waypoint, 'longitude') ? 'error' : undefined"
      aria-label="Longitude"
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
    >
      <template #suffix>Z</template>
    </NInput>
  </NFormItem>
</template>

<style scoped>
.waypoint-field,
.waypoint-field-small {
  margin-bottom: 0 !important;
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
  .waypoint-field-small {
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
