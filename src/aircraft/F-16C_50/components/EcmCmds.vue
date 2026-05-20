<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NForm, NFormItem, NInputNumber, NSelect, NSlider, NSpace, NFlex } from 'naive-ui'
import { FORM } from '@/styles/design-tokens'
import { getAirframeData } from '@/utils/airframeHelpers'
import type { Mission, Airframe } from '@/types'

type Props = {
  mission: Mission
  airframe: Airframe
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:cmds-profile': [value: string | null]
  'update:ecm-program': [value: string | null]
  'update:hts-threat-tables': [value: string[]]
  'update:chaff-total': [value: number]
  'update:flare-total': [value: number]
  'update:chaff-bingo': [value: number]
  'update:flare-bingo': [value: number]
}>()

// Get airframe data to determine available profiles and programs
const airframeData = computed(() => getAirframeData(props.airframe))

// CMDS Profile options
const cmdsProfileOptions = computed(() => {
  if (!airframeData.value?.cmdsProfiles) return []
  return airframeData.value.cmdsProfiles.map((profile: string) => ({
    label: profile,
    value: profile,
  }))
})

// ECM Program options
const ecmProgramOptions = computed(() => {
  if (!airframeData.value?.ecmPrograms) return []
  return airframeData.value.ecmPrograms
})

// HTS Threat Table options
const htsThreatTableOptions = computed(() => {
  if (!airframeData.value?.htsThreatTables) return []
  return airframeData.value.htsThreatTables
})

function updateCmdsProfile(value: string | null) {
  emit('update:cmds-profile', value)
}

function updateEcmProgram(value: string | null) {
  emit('update:ecm-program', value)
}

function updateHtsThreatTables(value: string[]) {
  emit('update:hts-threat-tables', value)
}

// Countermeasure management
const cmdsCapacity = computed(() => airframeData.value?.cmdsCapacity ?? 0)
const chaffIncrement = computed(() => airframeData.value?.chaffIncrement ?? 1)
const flareIncrement = computed(() => airframeData.value?.flareIncrement ?? 1)

const chaffTotal = computed(() => props.mission.ecmCmds.chaffTotal ?? 0)
const flareTotal = computed(() => props.mission.ecmCmds.flareTotal ?? 0)

// Chaff/flare bingo thresholds (F-16 CMDS BIT page). Default to 10 when
// unset so the editor always shows a sensible value.
const chaffBingo = computed(() => props.mission.ecmCmds.chaffBingo ?? 10)
const flareBingo = computed(() => props.mission.ecmCmds.flareBingo ?? 10)

function updateChaffBingo(value: number | null) {
  emit('update:chaff-bingo', value ?? 0)
}

function updateFlareBingo(value: number | null) {
  emit('update:flare-bingo', value ?? 0)
}

function updateChaffTotal(value: number | null) {
  const newChaff = value ?? 0
  const currentFlare = flareTotal.value

  // If total exceeds capacity, reduce flare to make room
  if (newChaff + currentFlare > cmdsCapacity.value) {
    const newFlare = Math.max(0, cmdsCapacity.value - newChaff)
    // Round down to nearest increment
    const adjustedFlare = Math.floor(newFlare / flareIncrement.value) * flareIncrement.value
    emit('update:flare-total', adjustedFlare)
  }

  emit('update:chaff-total', newChaff)
}

function updateFlareTotal(value: number | null) {
  const newFlare = value ?? 0
  const currentChaff = chaffTotal.value

  // If total exceeds capacity, reduce chaff to make room
  if (newFlare + currentChaff > cmdsCapacity.value) {
    const newChaff = Math.max(0, cmdsCapacity.value - newFlare)
    // Round down to nearest increment
    const adjustedChaff = Math.floor(newChaff / chaffIncrement.value) * chaffIncrement.value
    emit('update:chaff-total', adjustedChaff)
  }

  emit('update:flare-total', newFlare)
}
</script>

<template>
  <NSpace vertical :size="16">
    <!-- Countermeasures Card -->
    <NCard title="Countermeasures">
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

        <!-- Chaff Total -->
        <NFormItem v-if="cmdsCapacity > 0" label="Chaff">
          <NFlex align="center" :wrap="false" style="width: 100%">
            <div style="flex: 1; min-width: 0">
              <NSlider
                :value="chaffTotal"
                @update:value="updateChaffTotal"
                :step="chaffIncrement"
                :min="0"
                :max="cmdsCapacity"
                :tooltip="true"
              />
            </div>
            <span style="min-width: 40px; text-align: right">{{ chaffTotal }}</span>
          </NFlex>
        </NFormItem>

        <!-- Flare Total -->
        <NFormItem v-if="cmdsCapacity > 0" label="Flare">
          <NFlex align="center" :wrap="false" style="width: 100%">
            <div style="flex: 1; min-width: 0">
              <NSlider
                :value="flareTotal"
                @update:value="updateFlareTotal"
                :step="flareIncrement"
                :min="0"
                :max="cmdsCapacity"
                :tooltip="true"
              />
            </div>
            <span style="min-width: 40px; text-align: right">{{ flareTotal }}</span>
          </NFlex>
        </NFormItem>

        <!-- Chaff Bingo -->
        <NFormItem label="Chaff Bingo">
          <NInputNumber
            :value="chaffBingo"
            @update:value="updateChaffBingo"
            :min="0"
            :max="cmdsCapacity"
            :step="1"
            style="width: 120px"
          />
        </NFormItem>

        <!-- Flare Bingo -->
        <NFormItem label="Flare Bingo">
          <NInputNumber
            :value="flareBingo"
            @update:value="updateFlareBingo"
            :min="0"
            :max="cmdsCapacity"
            :step="1"
            style="width: 120px"
          />
        </NFormItem>
      </NForm>
    </NCard>

    <!-- ECM Card -->
    <NCard title="ECM">
      <NForm
        label-placement="left"
        :label-width="FORM.labelWidth"
        :style="{ maxWidth: FORM.maxWidth }"
      >
        <!-- ECM Program -->
        <NFormItem v-if="ecmProgramOptions.length > 0" label="ECM Program">
          <NSelect
            :value="mission.ecmProgram"
            @update:value="updateEcmProgram"
            :options="[
              { label: '(None)', value: null as unknown as string },
              ...ecmProgramOptions.map((prog: string) => ({ label: prog, value: prog })),
            ]"
            placeholder="Select ECM program"
            clearable
          />
        </NFormItem>

        <!-- HTS Threat Tables -->
        <NFormItem v-if="htsThreatTableOptions.length > 0" label="HTS Threat Tables">
          <NSelect
            :value="mission.htsThreatTables || []"
            @update:value="updateHtsThreatTables"
            :options="
              htsThreatTableOptions.map((table: string) => ({ label: table, value: table }))
            "
            multiple
            placeholder="Select HTS threat tables"
            clearable
          />
        </NFormItem>
      </NForm>
    </NCard>
  </NSpace>
</template>
