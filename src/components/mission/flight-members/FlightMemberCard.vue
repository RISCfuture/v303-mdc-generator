<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard, NIcon, NText, NInput } from 'naive-ui'
import { isC130 } from '@/utils/airframeHelpers'
import {
  TrashOutline,
  ReorderThreeOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5'
import { getCrewPositionShort } from '@/data/constants'
import { getFlightNumber } from '@/utils/callsignHelpers'
import { airframeDatabase } from '@/data/airframes'
import { getDatalinkType, getDatalinkLabel, shouldShowSTN } from '@/utils/datalinkHelpers'
import { FONT_SIZE, SPACING } from '@/styles/design-tokens'
import type { CrewMember } from '@/types'

type Props = {
  member: CrewMember
  index: number
  isFirst: boolean
  isLast: boolean
  effectiveFlightCallsign: string
  effectiveLink16Prefix: string
  airframe: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  remove: []
  'move-up': []
  'move-down': []
  dragstart: []
  dragover: [event: DragEvent]
  drop: []
  'update-member': [patch: Partial<CrewMember>]
}>()

// Two-crew airframes (C-130J) carry a copilot per position.
const isTwoCrew = computed(() => isC130(props.airframe))

/**
 * Extract flight number from flight callsign
 * Returns the trailing digit (1-9) if present, otherwise "1"
 */
const flightNumber = computed(() => getFlightNumber(props.effectiveFlightCallsign))

/**
 * Get datalink type and label for display
 */
const datalinkType = computed(() => {
  const aircraftData = airframeDatabase[props.airframe]
  return getDatalinkType(aircraftData)
})

const datalinkLabel = computed(() => getDatalinkLabel(datalinkType.value))
const showSTN = computed(() => shouldShowSTN(datalinkType.value))
</script>

<template>
  <div
    class="crew-item"
    draggable="true"
    @dragstart="emit('dragstart')"
    @dragover="emit('dragover', $event)"
    @drop="emit('drop')"
  >
    <NCard size="small">
      <div class="crew-row">
        <NText depth="3" class="crew-drag-handle">
          <NIcon size="20"><ReorderThreeOutline /></NIcon>
        </NText>
        <div class="crew-mobile-controls">
          <NButton size="tiny" quaternary circle @click="emit('move-up')" :disabled="isFirst">
            <template #icon
              ><NIcon><ArrowUpOutline /></NIcon
            ></template>
          </NButton>
          <NButton size="tiny" quaternary circle @click="emit('move-down')" :disabled="isLast">
            <template #icon
              ><NIcon><ArrowDownOutline /></NIcon
            ></template>
          </NButton>
        </div>
        <div class="crew-position">{{ index + 1 }}</div>
        <div class="crew-info">
          <div class="crew-main-line">
            <strong>{{ effectiveFlightCallsign }}{{ getCrewPositionShort(index) }}</strong> /
            <strong>{{ member.pilot }}</strong> ({{ member.position }})
          </div>
          <NText depth="3" class="crew-details">
            <template v-if="datalinkLabel"
              >{{ datalinkLabel }}: {{ effectiveLink16Prefix }}{{ flightNumber }}{{ index + 1 }} |
            </template>
            <template v-if="showSTN">STN: {{ member.stn }} | </template>
            Mode 3: {{ member.mode3 }} | Laser: {{ member.laser }} | Tail: {{ member.tailNumber }}
          </NText>
        </div>
        <NButton size="small" @click="emit('remove')" type="error">
          <template #icon
            ><NIcon><TrashOutline /></NIcon
          ></template>
        </NButton>
      </div>
      <div v-if="isTwoCrew" class="copilot-row">
        <div class="copilot-field">
          <label>Copilot</label>
          <NInput
            :value="member.copilot ?? ''"
            @update:value="(v: string) => emit('update-member', { copilot: v })"
            size="small"
            autocorrect="off"
            placeholder="Copilot pilot"
          />
        </div>
        <div class="copilot-field">
          <label>Copilot Callsign</label>
          <NInput
            :value="member.copilotCallsign ?? ''"
            @update:value="(v: string) => emit('update-member', { copilotCallsign: v })"
            size="small"
            autocorrect="off"
            placeholder="Copilot callsign"
          />
        </div>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.crew-item {
  cursor: move;
  transition: opacity 0.2s;
}

.crew-item:active {
  opacity: 0.5;
}

.crew-row {
  display: grid;
  grid-template-columns: v-bind('SPACING["2xl"]') v-bind('SPACING["3xl"]') 1fr auto;
  align-items: center;
  gap: v-bind('SPACING.md');
}

.crew-drag-handle {
  display: grid;
  place-items: center;
  cursor: grab;
}

.crew-drag-handle:active {
  cursor: grabbing;
}

.crew-mobile-controls {
  display: none;
  gap: v-bind('SPACING.xs');
}

.crew-position {
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: v-bind('SPACING.lg');
}

.crew-info {
  display: grid;
  gap: v-bind('SPACING.xs');
}

.crew-main-line {
  font-size: v-bind('FONT_SIZE.md');
}

.crew-details {
  font-size: v-bind('FONT_SIZE.sm');
}

.copilot-row {
  display: flex;
  gap: v-bind('SPACING.md');
  margin-top: v-bind('SPACING.sm');
}

.copilot-field {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
}

.copilot-field label {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
  color: #666;
}

/* Mobile responsive styles */

/* Note: 768px matches BREAKPOINT.mobile from design-tokens.ts */
@media (width <= 768px) {
  .crew-row {
    display: flex;
    flex-direction: column;
    gap: v-bind('SPACING.md');
    align-items: stretch;
  }

  .crew-drag-handle {
    display: none;
  }

  .crew-mobile-controls {
    display: flex;
    justify-content: center;
    align-self: center;
  }

  .crew-position {
    display: none;
  }

  .crew-info {
    width: 100%;
  }

  .crew-row :deep(.n-form-item) {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  .crew-row > :last-child {
    align-self: center;
  }
}
</style>
