<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NSelect, NForm, NFormItem, NInput, NAutoComplete, NText } from 'naive-ui'
import { FORM, SPACING, WIDTH } from '@/styles/design-tokens'
import { airframeDatabase } from '@/data/airframes'
import { getDatalinkType, getDatalinkLabel } from '@/utils/datalinkHelpers'
import FlightMemberCard from '@/components/mission/flight-members/FlightMemberCard.vue'
import type { CrewMember } from '@/types'
import type { DragAndDropReturn } from '@/utils/useDragAndDrop'
import type { CrewDatabaseEntry } from '@/composables/useCrewManagement'

interface Props {
  crew: CrewMember[]
  availableCrewForDropdown: CrewDatabaseEntry[]
  crewDragDrop: DragAndDropReturn<CrewMember>
  effectiveFlightCallsign: string
  effectiveLink16Prefix: string
  flightCallsignOverride?: string
  link16PrefixOverride?: string
  availableCallsignOptions: { label: string; value: string }[]
  airframe: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-crew-member': [pilotName: string]
  'remove-crew-member': [index: number]
  'crew-drop': [index: number]
  'move-crew-up': [index: number]
  'move-crew-down': [index: number]
  'update:flight-callsign': [value: string]
  'update:link16-prefix': [value: string]
}>()

// Get datalink type and label for display
const datalinkType = computed(() => {
  const aircraftData = airframeDatabase[props.airframe]
  return getDatalinkType(aircraftData)
})

const datalinkLabel = computed(() => getDatalinkLabel(datalinkType.value) || 'Link16')
const showDatalinkPrefix = computed(() => datalinkType.value !== null)
</script>

<template>
  <div>
    <NCard title="Flight Composition" :style="{ marginBottom: SPACING['2xl'] }">
      <div v-if="crew.length === 0" class="empty-state">
        <NText type="error" strong>At least one flight member is required</NText>
      </div>

      <div v-else class="crew-list">
        <FlightMemberCard
          v-for="(member, index) in crew"
          :key="index"
          :member="member"
          :index="index"
          :is-first="index === 0"
          :is-last="index === crew.length - 1"
          :effective-flight-callsign="effectiveFlightCallsign"
          :effective-link16-prefix="effectiveLink16Prefix"
          :airframe="airframe"
          @remove="emit('remove-crew-member', index)"
          @move-up="emit('move-crew-up', index)"
          @move-down="emit('move-crew-down', index)"
          @dragstart="crewDragDrop.handleDragStart(index)"
          @dragover="crewDragDrop.handleDragOver"
          @drop="emit('crew-drop', index)"
        />
      </div>

      <div class="add-crew-container">
        <NSelect
          :options="
            availableCrewForDropdown.map((c: CrewDatabaseEntry) => ({
              label: `${c.pilot} (${c.callsign.join(' / ')})`,
              value: c.pilot,
            }))
          "
          placeholder="Add crew member"
          @update:value="(v: string) => emit('add-crew-member', v)"
          :style="{ width: WIDTH.dropdown }"
          clearable
          filterable
        />
      </div>
    </NCard>

    <NCard title="Flight Callsign">
      <NForm label-placement="top" :style="{ maxWidth: FORM.maxWidth }">
        <div class="callsign-row">
          <NFormItem
            label="Flight Callsign"
            :validation-status="!flightCallsignOverride ? 'error' : undefined"
            :feedback="!flightCallsignOverride ? 'Flight callsign is required' : undefined"
            class="flight-callsign-field"
          >
            <NAutoComplete
              :value="flightCallsignOverride"
              @update:value="(v: string) => emit('update:flight-callsign', v)"
              :options="availableCallsignOptions"
              :get-show="() => true"
              placeholder="Select or enter callsign"
              autocorrect="off"
            />
          </NFormItem>
          <NFormItem
            v-if="showDatalinkPrefix"
            :label="`${datalinkLabel} Prefix`"
            :validation-status="!link16PrefixOverride ? 'error' : undefined"
            :feedback="!link16PrefixOverride ? `${datalinkLabel} prefix is required` : undefined"
            class="link16-prefix-field"
          >
            <NInput
              :value="link16PrefixOverride"
              @update:value="(v: string) => emit('update:link16-prefix', v)"
              placeholder="Enter 2-letter prefix"
              maxlength="2"
              autocorrect="off"
            />
          </NFormItem>
        </div>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.callsign-row {
  display: flex;
  gap: v-bind('SPACING.md');
  align-items: flex-start;
}

.flight-callsign-field {
  flex: 1;
}

.link16-prefix-field {
  flex: 0 0 auto;
  width: v-bind('WIDTH.link16Prefix');
}

.empty-state {
  text-align: center;
  padding: v-bind('SPACING["4xl"]') v-bind('SPACING.xl');
}

.crew-list {
  display: grid;
  gap: v-bind('SPACING.md');
}

.add-crew-container {
  margin-top: v-bind('SPACING.md');
  padding-top: v-bind('SPACING.md');
  border-top: 1px solid rgb(128 128 128 / 20%);
}
</style>
