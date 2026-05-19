<script setup lang="ts">
import { NCard, NForm, NFormItem, NInput, NGrid, NGi } from 'naive-ui'
import { parseTOT } from '@/composables/useWaypointCalculations'
import type { Mission, MissionTiming } from '@/types'

type Props = {
  mission: Mission
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:field': [field: keyof Mission, value: Mission[keyof Mission]]
}>()

const FIELDS: { key: keyof MissionTiming; label: string; placeholder: string }[] = [
  { key: 'step', label: 'STEP', placeholder: 'HHMM' },
  { key: 'taxi', label: 'TAXI', placeholder: 'HHMM' },
  { key: 'takeoff', label: 'T-O', placeholder: 'HHMM' },
  { key: 'push', label: 'PUSH', placeholder: 'HHMM' },
  { key: 'vulTot', label: 'VUL / TOT', placeholder: 'HHMM' },
  { key: 'rtb', label: 'RTB', placeholder: 'HHMM' },
]

function update(key: keyof MissionTiming, value: string) {
  const next: MissionTiming = { ...props.mission.missionTiming, [key]: value }
  emit('update:field', 'missionTiming', next)
}

// Match the steerpoint TOT field: highlight unparseable values inline.
function totStatus(value: string | undefined): 'error' | undefined {
  return value && parseTOT(value) === null ? 'error' : undefined
}
</script>

<template>
  <NCard title="Mission Timing">
    <NForm label-placement="top">
      <NGrid :cols="3" :x-gap="12">
        <NGi v-for="f in FIELDS" :key="f.key">
          <NFormItem :label="f.label">
            <NInput
              :value="mission.missionTiming?.[f.key] ?? ''"
              @update:value="(v: string) => update(f.key, v)"
              :placeholder="f.placeholder"
              :status="totStatus(mission.missionTiming?.[f.key])"
              size="small"
              autocorrect="off"
            >
              <template #suffix>Z</template>
            </NInput>
          </NFormItem>
        </NGi>
      </NGrid>
    </NForm>
  </NCard>
</template>
