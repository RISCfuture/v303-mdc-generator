<script setup lang="ts">
import { NCard, NForm, NSpace } from 'naive-ui'
import TargetSection from '@/components/mission/notes-targets/TargetSection.vue'
import type { TargetData, Mission } from '@/types'

defineProps<{
  mission: Mission
}>()

const emit = defineEmits<{
  'update:target-field': [
    targetType: 'primaryTarget' | 'secondaryTarget',
    field: keyof TargetData,
    value: TargetData[keyof TargetData],
  ]
}>()
</script>

<template>
  <NSpace vertical>
    <NCard title="Primary Target">
      <NForm label-placement="top">
        <TargetSection
          :target="mission.details.primaryTarget"
          :mission-id="mission.id"
          @update-field="
            (field: keyof TargetData, value: TargetData[keyof TargetData]) =>
              emit('update:target-field', 'primaryTarget', field, value)
          "
        />
      </NForm>
    </NCard>

    <NCard title="Secondary Target">
      <NForm label-placement="top">
        <TargetSection
          :target="mission.details.secondaryTarget"
          :mission-id="mission.id"
          @update-field="
            (field: keyof TargetData, value: TargetData[keyof TargetData]) =>
              emit('update:target-field', 'secondaryTarget', field, value)
          "
        />
      </NForm>
    </NCard>
  </NSpace>
</template>
