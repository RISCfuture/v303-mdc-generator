<script setup lang="ts">
import { NSelect, NInput, NInputNumber, NFlex } from 'naive-ui'
import { airframeDatabase } from '@/data/airframes'
import { FONT_SIZE } from '@/styles/design-tokens'
import { formatSTN, parseSTN } from '@/utils/crewFormatting'
import type { PackageMember } from '@/types'

type Props = {
  member: PackageMember
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof PackageMember, value: PackageMember[keyof PackageMember]]
}>()

// Build aircraft options from airframe database
const aircraftOptions = Object.values(airframeDatabase)
  .filter((airframe) => airframe != null)
  .map((airframe) => ({
    label: airframe.displayName,
    value: airframe.aircraft,
  }))
</script>

<template>
  <NFlex wrap :size="8" align="end" class="package-fields">
    <div class="field">
      <label>Callsign</label>
      <NInput
        :value="member.callsign"
        @update:value="(v: string) => emit('update-field', 'callsign', v)"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field">
      <label>Aircraft</label>
      <NSelect
        :value="member.aircraft"
        @update:value="(v: string) => emit('update-field', 'aircraft', v)"
        :options="aircraftOptions"
        size="small"
      />
    </div>
    <div class="field field-small">
      <label>Time (Z)</label>
      <NInput
        :value="member.time"
        @update:value="(v: string) => emit('update-field', 'time', v)"
        placeholder="1530z"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-small">
      <label>Comms</label>
      <NInput
        :value="member.comms"
        @update:value="(v: string) => emit('update-field', 'comms', v)"
        placeholder="251.0"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-small">
      <label>STN</label>
      <NInputNumber
        :value="member.stn"
        @update:value="(v: number | null) => emit('update-field', 'stn', v)"
        :show-button="false"
        :format="formatSTN"
        :parse="parseSTN"
        placeholder=""
        size="small"
      />
    </div>
    <div class="field field-small">
      <label>A/A TACAN</label>
      <NInput
        :value="member.aaTacan"
        @update:value="(v: string) => emit('update-field', 'aaTacan', v)"
        placeholder="5Y"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-expand">
      <label>Task</label>
      <NInput
        :value="member.task"
        @update:value="(v: string) => emit('update-field', 'task', v)"
        size="small"
      />
    </div>
  </NFlex>
</template>

<style scoped>
.package-fields {
  width: 100%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 1 auto;
}

.field label {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
  color: #666;
}

.field-small {
  width: 120px;
}

.field-expand {
  flex: 1 1 200px;
}

/* Note: 768px matches BREAKPOINT.mobile from design-tokens.ts */
@media (width <= 768px) {
  .field {
    width: 100% !important;
  }

  .field-small {
    width: 100%;
  }

  .field-expand {
    flex: 1 1 100%;
  }
}
</style>
