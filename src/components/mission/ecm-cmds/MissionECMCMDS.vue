<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NForm, NFormItem, NSelect, NCheckboxGroup, NCheckbox } from 'naive-ui'
import { FORM } from '@/styles/design-tokens'
import { getAirframeData } from '@/utils/airframeHelpers'
import type { Mission, Airframe } from '@/types'

interface Props {
  mission: Mission
  airframe: Airframe
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:cmds-profile': [value: string | null]
  'update:ecm-programs': [value: string[]]
  'update:hts-threat-tables': [value: string[]]
}>()

// Get airframe data to determine available profiles and programs
const airframeData = computed(() => getAirframeData(props.airframe))

// CMDS Profile options
const cmdsProfileOptions = computed(() => {
  if (!airframeData.value || !airframeData.value.cmdsProfiles) return []
  return airframeData.value.cmdsProfiles.map((profile: string) => ({
    label: profile,
    value: profile,
  }))
})

// ECM Program options
const ecmProgramOptions = computed(() => {
  if (!airframeData.value || !airframeData.value.ecmPrograms) return []
  return airframeData.value.ecmPrograms
})

// HTS Threat Table options
const htsThreatTableOptions = computed(() => {
  if (!airframeData.value || !airframeData.value.htsThreatTables) return []
  return airframeData.value.htsThreatTables
})

// For F-16, use multi-select dropdown; for A-10, use checkboxes
const isF16 = computed(() => props.airframe === 'F-16C_50')

function updateCmdsProfile(value: string | null) {
  emit('update:cmds-profile', value)
}

function updateEcmPrograms(value: string[]) {
  emit('update:ecm-programs', value)
}

function updateHtsThreatTables(value: string[]) {
  emit('update:hts-threat-tables', value)
}
</script>

<template>
  <NCard title="Countermeasures & ECM">
    <NForm
      label-placement="left"
      :label-width="FORM.labelWidth"
      :style="{ maxWidth: FORM.maxWidth }"
    >
      <!-- CMDS Profile -->
      <NFormItem v-if="cmdsProfileOptions.length > 0" label="CMDS Profile">
        <NSelect
          :value="mission.cmdsProfile"
          @update:value="updateCmdsProfile"
          :options="cmdsProfileOptions"
          placeholder="Select CMDS profile"
          clearable
        />
      </NFormItem>

      <!-- ECM Programs -->
      <NFormItem v-if="ecmProgramOptions.length > 0" label="ECM Programs">
        <!-- Multi-select dropdown for F-16 -->
        <NSelect
          v-if="isF16"
          :value="mission.ecmPrograms || []"
          @update:value="updateEcmPrograms"
          :options="ecmProgramOptions.map((prog: string) => ({ label: prog, value: prog }))"
          multiple
          placeholder="Select ECM programs"
          clearable
        />

        <!-- Checkboxes for A-10 -->
        <NCheckboxGroup v-else :value="mission.ecmPrograms || []" @update:value="updateEcmPrograms">
          <NCheckbox
            v-for="program in ecmProgramOptions"
            :key="program"
            :value="program"
            :label="program"
            style="margin-right: 12px"
          />
        </NCheckboxGroup>
      </NFormItem>

      <!-- HTS Threat Tables -->
      <NFormItem v-if="htsThreatTableOptions.length > 0" label="HTS Threat Tables">
        <NSelect
          :value="mission.htsThreatTables || []"
          @update:value="updateHtsThreatTables"
          :options="htsThreatTableOptions.map((table: string) => ({ label: table, value: table }))"
          multiple
          placeholder="Select HTS threat tables"
          clearable
        />
      </NFormItem>
    </NForm>
  </NCard>
</template>
