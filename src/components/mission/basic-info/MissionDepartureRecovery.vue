<script setup lang="ts">
import { toRef } from 'vue'
import { NCard, NForm, NFormItem, NSelect, NSpace } from 'naive-ui'
import AirportRunwaySelector from '@/components/common/AirportRunwaySelector.vue'
import { useAirportSelection } from '@/composables/useAirportSelection'
import { FORM } from '@/styles/design-tokens'
import type { Mission } from '@/types'

type Props = {
  mission: Mission
  isFieldIncomplete?: (fieldName: string) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:nestedField': [parent: string, field: string, value: string | number | undefined]
}>()

// Setup composable for alternate airport selection
const theaterRef = toRef(() => props.mission.theater)
const alternateAirport = useAirportSelection(theaterRef)

// Update functions that emit nested field updates
function updateDepartureField(
  field:
    | 'departureAirportId'
    | 'departureRunwayName'
    | 'departureRunwayHeading'
    | 'departureFieldElevation'
    | 'departureProcedure',
  value: string | number | undefined,
) {
  emit('update:nestedField', 'departureRecovery', field, value)
}

function updateRecoveryField(
  field:
    | 'recoveryAirportId'
    | 'recoveryRunwayName'
    | 'recoveryRunwayHeading'
    | 'recoveryFieldElevation'
    | 'recoveryProcedure',
  value: string | number | undefined,
) {
  emit('update:nestedField', 'departureRecovery', field, value)
}

function updateAlternateAirport(airportName: string | null) {
  emit('update:nestedField', 'departureRecovery', 'alternateAirportId', airportName ?? undefined)
}
</script>

<template>
  <NSpace vertical>
    <NCard title="Departure">
      <NForm
        label-placement="left"
        :label-width="FORM.labelWidth"
        :style="{ maxWidth: FORM.maxWidth }"
      >
        <AirportRunwaySelector
          :theater="mission.theater"
          :airport-id="mission.departureRecovery.departureAirportId"
          :runway-name="mission.departureRecovery.departureRunwayName"
          :procedure="mission.departureRecovery.departureProcedure"
          :field-elevation="mission.departureRecovery.departureFieldElevation"
          :is-airport-incomplete="props.isFieldIncomplete?.('departureAirport')"
          :is-runway-incomplete="props.isFieldIncomplete?.('departureRunway')"
          :is-procedure-incomplete="props.isFieldIncomplete?.('departureProcedure')"
          airport-placeholder="Select departure airport"
          runway-placeholder="Select departure runway"
          test-id-prefix="departure"
          @update:airport-id="
            (v: string | undefined) => updateDepartureField('departureAirportId', v)
          "
          @update:runway-name="
            (v: string | undefined) => updateDepartureField('departureRunwayName', v)
          "
          @update:runway-heading="
            (v: number | undefined) => updateDepartureField('departureRunwayHeading', v)
          "
          @update:field-elevation="
            (v: number | undefined) => updateDepartureField('departureFieldElevation', v)
          "
          @update:procedure="(v: string) => updateDepartureField('departureProcedure', v)"
        />
      </NForm>
    </NCard>

    <NCard title="Recovery">
      <NForm
        label-placement="left"
        :label-width="FORM.labelWidth"
        :style="{ maxWidth: FORM.maxWidth }"
      >
        <AirportRunwaySelector
          :theater="mission.theater"
          :airport-id="mission.departureRecovery.recoveryAirportId"
          :runway-name="mission.departureRecovery.recoveryRunwayName"
          :procedure="mission.departureRecovery.recoveryProcedure"
          :field-elevation="mission.departureRecovery.recoveryFieldElevation"
          :is-airport-incomplete="props.isFieldIncomplete?.('recoveryAirport')"
          :is-runway-incomplete="props.isFieldIncomplete?.('recoveryRunway')"
          :is-procedure-incomplete="props.isFieldIncomplete?.('recoveryProcedure')"
          airport-placeholder="Select recovery airport"
          runway-placeholder="Select recovery runway"
          test-id-prefix="recovery"
          @update:airport-id="
            (v: string | undefined) => updateRecoveryField('recoveryAirportId', v)
          "
          @update:runway-name="
            (v: string | undefined) => updateRecoveryField('recoveryRunwayName', v)
          "
          @update:runway-heading="
            (v: number | undefined) => updateRecoveryField('recoveryRunwayHeading', v)
          "
          @update:field-elevation="
            (v: number | undefined) => updateRecoveryField('recoveryFieldElevation', v)
          "
          @update:procedure="(v: string) => updateRecoveryField('recoveryProcedure', v)"
        />

        <NFormItem label="Alternate Airport">
          <NSelect
            :value="mission.departureRecovery.alternateAirportId"
            @update:value="updateAlternateAirport"
            :options="alternateAirport.airfieldOptions.value"
            filterable
            clearable
          />
        </NFormItem>
      </NForm>
    </NCard>
  </NSpace>
</template>
