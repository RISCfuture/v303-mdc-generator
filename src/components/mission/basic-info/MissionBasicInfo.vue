<script setup lang="ts">
import { NCard, NDatePicker, NForm, NFormItem, NInput, NSpace, NAutoComplete } from 'naive-ui'
import { getSquadronDisplayName } from '@/data/squadrons'
import { MISSION_TYPES } from '@/data/constants'
import { formatDateForStorage, parseDateToTimestamp } from '@/utils/formatting'
import { FORM } from '@/styles/design-tokens'
import type { Mission } from '@/types'
import MissionDepartureRecovery from './MissionDepartureRecovery.vue'
import CoordinateInputField from '@/components/common/CoordinateInputField.vue'

interface Props {
  mission: Mission
  theaterData: { displayName: string; ifgUrl?: string } | null
  isFieldIncomplete?: (fieldName: string) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:field': [field: string, value: string | number | object]
  'update:nestedField': [parent: string, field: string, value: string | number | undefined]
}>()

const missionTypeOptions = MISSION_TYPES.map((type) => ({ label: type, value: type }))

// Date formatting for NDatePicker display
// Determine locale-appropriate date format
const locale = navigator.language || 'en-US'
const sampleDate = new Date(2024, 0, 15) // Jan 15, 2024
const localeDateStr = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(sampleDate)

// Derive format string from locale (NDatePicker uses date-fns format strings)
let datePickerFormat = 'yyyy-MM-dd' // Default ISO format
if (localeDateStr.startsWith('01')) {
  // Starts with month (US format)
  datePickerFormat = 'MM/dd/yyyy'
} else if (localeDateStr.startsWith('15')) {
  // Starts with day (European format)
  datePickerFormat = 'dd/MM/yyyy'
} else if (localeDateStr.startsWith('2024')) {
  // Starts with year (Asian format)
  datePickerFormat = 'yyyy/MM/dd'
}
</script>

<template>
  <NSpace vertical>
    <NCard title="Mission Information">
      <NForm
        label-placement="left"
        :label-width="FORM.labelWidth"
        :style="{ maxWidth: FORM.maxWidth }"
      >
        <NFormItem
          label="Date"
          :validation-status="props.isFieldIncomplete?.('date') ? 'error' : undefined"
        >
          <NDatePicker
            :value="parseDateToTimestamp(mission.date)"
            @update:value="
              (v: number | null) => v && emit('update:field', 'date', formatDateForStorage(v))
            "
            :format="datePickerFormat"
            type="date"
            style="width: 100%"
            :status="props.isFieldIncomplete?.('date') ? 'error' : undefined"
            aria-label="Date"
          />
        </NFormItem>
        <NFormItem
          label="Mission Name"
          :validation-status="props.isFieldIncomplete?.('name') ? 'error' : undefined"
        >
          <NInput
            :value="mission.name"
            @update:value="(v: string) => emit('update:field', 'name', v)"
            :status="props.isFieldIncomplete?.('name') ? 'error' : undefined"
            aria-label="Mission Name"
          />
        </NFormItem>
        <NFormItem label="Mission Number">
          <NInput
            :value="mission.missionNumber"
            @update:value="(v: string) => emit('update:field', 'missionNumber', v)"
            aria-label="Mission Number"
          />
        </NFormItem>
        <NFormItem
          label="Mission Type"
          :validation-status="props.isFieldIncomplete?.('type') ? 'error' : undefined"
        >
          <NAutoComplete
            :value="mission.type"
            @update:value="(v: string) => emit('update:field', 'type', v)"
            :options="missionTypeOptions"
            :get-show="() => true"
            :status="props.isFieldIncomplete?.('type') ? 'error' : undefined"
            aria-label="Mission Type"
          />
        </NFormItem>
        <NFormItem label="Squadron">
          <NInput :value="getSquadronDisplayName(mission.squadron)" disabled />
        </NFormItem>
        <NFormItem label="Theater">
          <NSpace align="center">
            <NInput :value="theaterData?.displayName || mission.theater" disabled style="flex: 1" />
            <a
              v-if="theaterData?.ifgUrl"
              :href="theaterData.ifgUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              IFG
            </a>
          </NSpace>
        </NFormItem>
        <NFormItem label="Weather">
          <NInput
            :value="mission.weather"
            @update:value="(v: string) => emit('update:field', 'weather', v)"
            aria-label="Weather"
          />
        </NFormItem>
      </NForm>
    </NCard>

    <NCard title="Bullseye">
      <NForm
        label-placement="left"
        :label-width="FORM.labelWidth"
        :style="{ maxWidth: FORM.maxWidth }"
      >
        <NFormItem label="Latitude">
          <CoordinateInputField
            :model-value="mission.bullseye?.latitude ?? null"
            @update:model-value="
              (v: number | null) =>
                emit('update:field', 'bullseye', {
                  ...(mission.bullseye || {}),
                  latitude: v,
                })
            "
            type="latitude"
            placeholder="N 36° 12.345′"
            aria-label="Bullseye Latitude"
          />
        </NFormItem>
        <NFormItem label="Longitude">
          <CoordinateInputField
            :model-value="mission.bullseye?.longitude ?? null"
            @update:model-value="
              (v: number | null) =>
                emit('update:field', 'bullseye', {
                  ...(mission.bullseye || {}),
                  longitude: v,
                })
            "
            type="longitude"
            placeholder="E 065° 50.857′"
            aria-label="Bullseye Longitude"
          />
        </NFormItem>
      </NForm>
    </NCard>

    <MissionDepartureRecovery
      :mission="mission"
      :is-field-incomplete="isFieldIncomplete"
      @update:nestedField="
        (parent: string, field: string, value: string | number | undefined) =>
          emit('update:nestedField', parent, field, value)
      "
    />
  </NSpace>
</template>
