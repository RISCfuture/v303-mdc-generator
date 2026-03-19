<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { NButton, NCard, NIcon, NText } from 'naive-ui'
import {
  TrashOutline,
  ReorderThreeOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5'
import { GRID, SPACING, FONT_SIZE } from '@/styles/design-tokens'
import { formatInteger } from '@/utils/numberFormatting'
import { getAircraftComponentLoader } from '@/aircraft'
import WaypointFields from './WaypointFields.vue'
import type { Waypoint, Airframe } from '@/types'

type Props = {
  waypoint: Waypoint
  index: number
  isFirst: boolean
  isLast: boolean
  isFirstTgt: boolean
  totPlaceholder: string
  airframe: Airframe
  isWaypointFieldIncomplete?: (
    waypoint: Pick<Waypoint, 'name' | 'latitude' | 'longitude' | 'altitude' | 'speed'>,
    field: 'name' | 'latitude' | 'longitude' | 'altitude',
  ) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof Waypoint, value: unknown]
  remove: []
  'move-up': []
  'move-down': []
  dragstart: []
  dragover: [event: DragEvent]
  drop: []
  blur: []
}>()

// Dynamic component for airframe-specific CCIP fields (F-16 only)
const ccipFieldsComponent = computed<Component | null>(() => {
  const loader = getAircraftComponentLoader(props.airframe, 'waypointCcipFields')
  return loader ? defineAsyncComponent(loader) : null
})
</script>

<template>
  <div
    class="waypoint-item"
    draggable="true"
    @dragstart="emit('dragstart')"
    @dragover="emit('dragover', $event)"
    @drop="emit('drop')"
  >
    <NCard size="small">
      <div class="waypoint-content">
        <div class="waypoint-main">
          <div class="waypoint-row">
            <NText depth="3" class="waypoint-drag-handle">
              <NIcon size="20"><ReorderThreeOutline /></NIcon>
            </NText>
            <div class="waypoint-mobile-controls">
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
            <div class="waypoint-seq">{{ formatInteger(waypoint.sequence) }}</div>
            <WaypointFields
              :waypoint="waypoint"
              :tot-placeholder="totPlaceholder"
              :is-waypoint-field-incomplete="isWaypointFieldIncomplete"
              @update-field="
                (field: keyof Waypoint, value: unknown) => emit('update-field', field, value)
              "
              @blur="emit('blur')"
            />
          </div>

          <!-- CCIP Fields for TGT type waypoints (F-16 only via registry) -->
          <component
            v-if="waypoint.type === 'TGT' && ccipFieldsComponent"
            :is="ccipFieldsComponent"
            :waypoint="waypoint"
            :is-first-tgt="props.isFirstTgt"
            @update-field="
              (field: keyof Waypoint, value: unknown) => emit('update-field', field, value)
            "
            @blur="emit('blur')"
          />
        </div>
        <NButton class="waypoint-delete" size="small" @click="emit('remove')" type="error">
          <template #icon>
            <NIcon><TrashOutline /></NIcon>
          </template>
        </NButton>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.waypoint-item {
  cursor: move;
  transition: opacity 0.2s;
}

.waypoint-item:active {
  opacity: 0.5;
}

.waypoint-content {
  display: flex;
  align-items: center;
  gap: v-bind('SPACING.md');
}

.waypoint-main {
  flex: 1;
}

.waypoint-row {
  display: grid;
  grid-template-columns:
    v-bind('GRID.dragHandle') v-bind('GRID.position') 1fr v-bind('GRID.columnSmall')
    1fr 1fr v-bind('GRID.columnTOT') v-bind('GRID.columnMedium') v-bind('GRID.columnSmall');
  gap: v-bind('SPACING.md');
  align-items: end;
}

.waypoint-drag-handle {
  display: grid;
  place-items: center;
  cursor: grab;
  align-self: center;
}

.waypoint-drag-handle:active {
  cursor: grabbing;
}

.waypoint-mobile-controls {
  display: none;
  gap: v-bind('SPACING.xs');
}

.waypoint-seq {
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: v-bind('FONT_SIZE.md');
  align-self: center;
}

.waypoint-delete {
  flex-shrink: 0;
}

/* Mobile responsive styles */

/* Note: 768px matches BREAKPOINT.mobile from design-tokens.ts */
@media (width <= 768px) {
  .waypoint-content {
    flex-direction: column;
  }

  .waypoint-row {
    display: flex;
    flex-direction: column;
    gap: v-bind('SPACING.md');
    align-items: stretch;
  }

  .waypoint-drag-handle {
    display: none;
  }

  .waypoint-mobile-controls {
    display: flex;
    justify-content: center;
    align-self: center;
  }

  .waypoint-seq {
    display: none;
  }

  .waypoint-delete {
    align-self: center;
  }
}
</style>
