<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NSelect, NSpace, NText } from 'naive-ui'
import { useMissionsStore } from '@/stores/missions'
import { formatDistance } from '@/utils/formatting'
import { SPACING, FONT_SIZE, GRID } from '@/styles/design-tokens'
import WaypointCard from '@/components/mission/steerpoints/WaypointCard.vue'
import type { Waypoint, Navaid } from '@/types'
import type { DragAndDropReturn } from '@/utils/useDragAndDrop'
import {
  calculateWaypointPairs,
  calculateTOTPlaceholders,
} from '@/composables/useWaypointCalculations'

interface Props {
  waypoints: Waypoint[]
  availableNavaids: Navaid[]
  waypointDragDrop: DragAndDropReturn<Waypoint>
  isWaypointFieldIncomplete?: (
    waypoint: {
      name?: string
      latitude?: number | null
      longitude?: number | null
      altitude?: number | null
    },
    field: 'name' | 'latitude' | 'longitude' | 'altitude',
  ) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-waypoint': []
  'add-waypoint-from-navaid': [navaidName: string]
  'remove-waypoint': [index: number]
  'waypoint-drop': [index: number]
  'move-waypoint-up': [index: number]
  'move-waypoint-down': [index: number]
}>()

const missionsStore = useMissionsStore()

// Track selected navaid value for dropdown
const selectedNavaid = ref<string | null>(null)

// Handle navaid selection and clear dropdown
function handleNavaidSelect(navaidName: string | null) {
  if (navaidName) {
    emit('add-waypoint-from-navaid', navaidName)
    selectedNavaid.value = null // Clear the dropdown after selection
  }
}

// Calculate waypoint pairs with distance/time information
const waypointPairs = computed(() => calculateWaypointPairs(props.waypoints))

// Calculate TOT placeholders for all waypoints
const totPlaceholders = computed(() => calculateTOTPlaceholders(props.waypoints))

// Find the index of the first TGT waypoint
const firstTgtIndex = computed(() => {
  return props.waypoints.findIndex((wp) => wp.type === 'TGT')
})

// Format time with Intl.NumberFormat
const formatTime = (minutes: number) => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(minutes)
  return `${formatted} min`
}
</script>

<template>
  <NCard title="Flight Plan">
    <template #header-extra>
      <NSpace>
        <NSelect
          v-model:value="selectedNavaid"
          :options="availableNavaids.map((n: Navaid) => ({ label: n.name, value: n.name }))"
          placeholder="Add from database"
          @update:value="handleNavaidSelect"
          :style="{ width: GRID.waypointAutocomplete }"
          clearable
          filterable
        />
        <NButton @click="emit('add-waypoint')">+ Custom Steerpoint</NButton>
      </NSpace>
    </template>

    <div v-if="waypoints.length === 0" class="empty-state">
      <NText type="error" strong>At least one steerpoint is required</NText>
    </div>

    <div v-else class="waypoints-list">
      <template v-for="(wp, index) in waypoints" :key="index">
        <WaypointCard
          :waypoint="wp"
          :index="index"
          :is-first="index === 0"
          :is-last="index === waypoints.length - 1"
          :is-first-tgt="index === firstTgtIndex"
          :tot-placeholder="totPlaceholders[index]"
          :is-waypoint-field-incomplete="isWaypointFieldIncomplete"
          @update-field="
            (field: keyof Waypoint, value: unknown) => {
              wp[field] = value as never
            }
          "
          @remove="emit('remove-waypoint', index)"
          @move-up="emit('move-waypoint-up', index)"
          @move-down="emit('move-waypoint-down', index)"
          @dragstart="waypointDragDrop.handleDragStart(index)"
          @dragover="waypointDragDrop.handleDragOver"
          @drop="emit('waypoint-drop', index)"
          @blur="missionsStore.saveToStorage()"
        />

        <!-- Interstitial distance/time text between waypoints -->
        <div
          v-if="index < waypoints.length - 1"
          :style="{ textAlign: 'center', padding: `${SPACING.xs} 0` }"
        >
          <NText depth="3" :style="{ fontSize: FONT_SIZE.xs, userSelect: 'none' }">
            <template v-if="waypointPairs[index]?.distance !== null">
              {{ formatDistance(waypointPairs[index].distance!) }}
              <template v-if="waypointPairs[index].time !== null">
                • {{ formatTime(waypointPairs[index].time!) }}
              </template>
            </template>
            <template v-else>&nbsp;</template>
          </NText>
        </div>
      </template>
    </div>
  </NCard>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: v-bind('SPACING["4xl"]') v-bind('SPACING.xl');
}

.waypoints-list {
  display: grid;
  gap: v-bind('SPACING.md');
}
</style>
