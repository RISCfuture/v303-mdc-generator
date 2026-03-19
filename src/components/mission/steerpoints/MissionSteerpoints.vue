<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NSelect, NSpace, NText } from 'naive-ui'
import { useMissionsStore } from '@/stores/missions'
import { formatDistance } from '@/utils/formatting'
import { SPACING, FONT_SIZE, GRID } from '@/styles/design-tokens'
import WaypointCard from '@/components/mission/steerpoints/WaypointCard.vue'
import type { Waypoint, Navaid, Airframe } from '@/types'
import type { DragAndDropReturn } from '@/utils/useDragAndDrop'
import {
  calculateWaypointPairs,
  calculateTOTPlaceholders,
} from '@/composables/useWaypointCalculations'

type Props = {
  waypoints: Waypoint[]
  availableNavaids: Navaid[]
  waypointDragDrop: DragAndDropReturn<Waypoint>
  airframe: Airframe
  isWaypointFieldIncomplete?: (
    waypoint: Pick<Waypoint, 'name' | 'latitude' | 'longitude' | 'altitude' | 'speed'>,
    field: 'name' | 'latitude' | 'longitude' | 'altitude',
  ) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-waypoint': []
  'add-waypoint-from-navaid': [navaid: Navaid]
  'remove-waypoint': [index: number]
  'waypoint-drop': [index: number]
  'move-waypoint-up': [index: number]
  'move-waypoint-down': [index: number]
}>()

const missionsStore = useMissionsStore()

// Track selected navaid value for dropdown (index into availableNavaids)
const selectedNavaid = ref<number | null>(null)

// Format navaid type for display
function formatNavaidType(type: string | undefined): string {
  switch (type) {
    case 'AIRFIELD':
      return 'Airfield'
    case 'VOR':
      return 'VOR'
    case 'DME':
      return 'DME'
    case 'VOR_DME':
      return 'VOR/DME'
    case 'TACAN':
      return 'TACAN'
    case 'VORTAC':
      return 'VORTAC'
    case 'NDB':
      return 'NDB'
    case 'RSBN':
      return 'RSBN'
    case 'TOWN':
      return 'Town'
    case 'WAYPOINT':
      return 'Waypoint'
    default:
      return type ?? 'Other'
  }
}

// Compute dropdown options with type shown for duplicate names
const navaidDropdownOptions = computed(() => {
  // Count occurrences of each name
  const nameCounts = new Map<string, number>()
  for (const navaid of props.availableNavaids) {
    nameCounts.set(navaid.name, (nameCounts.get(navaid.name) ?? 0) + 1)
  }

  // Generate options with type suffix for duplicates
  return props.availableNavaids.map((navaid, index) => {
    const isDuplicate = (nameCounts.get(navaid.name) ?? 0) > 1
    const label = isDuplicate ? `${navaid.name} (${formatNavaidType(navaid.type)})` : navaid.name
    return { label, value: index }
  })
})

// Handle navaid selection and clear dropdown
function handleNavaidSelect(navaidIndex: number | null) {
  if (navaidIndex !== null && navaidIndex >= 0) {
    const navaid = props.availableNavaids[navaidIndex]
    emit('add-waypoint-from-navaid', navaid)
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
          :tot-placeholder="totPlaceholders[index] ?? ''"
          :airframe="airframe"
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
              {{ formatDistance(waypointPairs[index]!.distance!) }}
              <template v-if="waypointPairs[index]!.time !== null">
                • {{ formatTime(waypointPairs[index]!.time!) }}
              </template>
            </template>
            <template v-else>&nbsp;</template>
          </NText>
        </div>
      </template>
    </div>

    <div class="add-waypoint-container">
      <NSpace>
        <NSelect
          v-model:value="selectedNavaid"
          :options="navaidDropdownOptions"
          placeholder="Add from database"
          @update:value="handleNavaidSelect"
          :style="{ width: GRID.waypointAutocomplete }"
          clearable
          filterable
        />
        <NButton @click="emit('add-waypoint')">+ Custom Steerpoint</NButton>
      </NSpace>
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

.add-waypoint-container {
  margin-top: v-bind('SPACING.md');
  padding-top: v-bind('SPACING.md');
  border-top: 1px solid rgb(128 128 128 / 20%);
}
</style>
