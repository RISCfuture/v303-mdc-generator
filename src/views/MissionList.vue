<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NCard, NPopover, NSelect, NInput, NSpace, NIcon, NBadge } from 'naive-ui'
import { FunnelOutline } from '@vicons/ionicons5'
import { useMissionsStore } from '@/stores/missions'
import { useMissionActions } from '@/composables/useMissionActions'
import MissionTable from '@/components/mission-list/MissionTable.vue'
import MissionCardGrid from '@/components/mission-list/MissionCardGrid.vue'
import CreateMissionModal from '@/components/mission-list/CreateMissionModal.vue'
import StorageWarning from '@/components/common/StorageWarning.vue'
import { getSquadronOptions } from '@/data/squadrons'
import { theaterDatabase } from '@/data/theaters'
import { serializeMission } from '@/utils/missionStorage'
import { validateMissionStorage } from '@/utils/validateMissionStorage'
import type { Squadron, Theater, Mission } from '@/types'

const missionsStore = useMissionsStore()
const { handleCreate, handleEdit, handleDelete, handleDuplicate } = useMissionActions()

const showCreateModal = ref(false)
const showFilterPopover = ref(false)

// Filter state
const filterState = ref<'all' | 'ready' | 'draft'>('all')
const filterName = ref('')
const filterSquadron = ref<string>('all')
const filterTheater = ref<string>('all')

// Helper function to check if mission is complete (same logic as in missionTableColumns.ts)
function isMissionComplete(mission: Mission): boolean {
  try {
    const serialized = serializeMission(mission)
    const result = validateMissionStorage({
      version: 2,
      missions: [serialized],
    })

    if (!result.valid) return false

    const hasInvalidWaypoints = mission.waypoints.some(
      (wp) => wp.latitude === null || wp.longitude === null || wp.altitude === null,
    )
    if (hasInvalidWaypoints) return false

    return true
  } catch (_error) {
    return false
  }
}

// Filtered missions computed property
const filteredMissions = computed(() => {
  let missions = missionsStore.missionsList

  // Filter by state
  if (filterState.value !== 'all') {
    missions = missions.filter((mission) => {
      const isComplete = isMissionComplete(mission)
      return filterState.value === 'ready' ? isComplete : !isComplete
    })
  }

  // Filter by name (prefix search, case-insensitive)
  if (filterName.value.trim()) {
    const searchTerm = filterName.value.trim().toLowerCase()
    missions = missions.filter((mission) =>
      (mission.name || 'Untitled Mission').toLowerCase().startsWith(searchTerm),
    )
  }

  // Filter by squadron
  if (filterSquadron.value !== 'all') {
    missions = missions.filter((mission) => mission.squadron === filterSquadron.value)
  }

  // Filter by theater
  if (filterTheater.value !== 'all') {
    missions = missions.filter((mission) => mission.theater === filterTheater.value)
  }

  return missions
})

// Count active filters
const activeFilterCount = computed(() => {
  let count = 0
  if (filterState.value !== 'all') count++
  if (filterName.value.trim()) count++
  if (filterSquadron.value !== 'all') count++
  if (filterTheater.value !== 'all') count++
  return count
})

// Filter options
const stateOptions = [
  { label: 'All', value: 'all' },
  { label: 'Ready', value: 'ready' },
  { label: 'Draft', value: 'draft' },
]

const squadronOptions = [{ label: 'All', value: 'all' }, ...getSquadronOptions()]

const theaterOptions = [
  { label: 'All', value: 'all' },
  ...Object.keys(theaterDatabase).map((key) => ({
    label: theaterDatabase[key as Theater].displayName,
    value: key,
  })),
]

function clearFilters() {
  filterState.value = 'all'
  filterName.value = ''
  filterSquadron.value = 'all'
  filterTheater.value = 'all'
}

function handleCreateMission(squadron: Squadron, theater: Theater) {
  handleCreate(squadron, theater)
  showCreateModal.value = false
}
</script>

<template>
  <div class="mission-list">
    <NCard title="v303 FG Mission Data Card Generator">
      <template #header-extra>
        <NSpace :size="12">
          <NPopover v-model:show="showFilterPopover" trigger="click" placement="bottom-end">
            <template #trigger>
              <NBadge :value="activeFilterCount" :show="activeFilterCount > 0">
                <NButton quaternary circle>
                  <template #icon>
                    <NIcon>
                      <FunnelOutline />
                    </NIcon>
                  </template>
                </NButton>
              </NBadge>
            </template>
            <div class="filter-popover">
              <h4>Filter Missions</h4>
              <NSpace vertical :size="12">
                <div>
                  <label class="filter-label">State</label>
                  <NSelect
                    v-model:value="filterState"
                    :options="stateOptions"
                    placeholder="Select state"
                  />
                </div>
                <div>
                  <label class="filter-label">Name</label>
                  <NInput
                    v-model:value="filterName"
                    placeholder="Search by name prefix..."
                    clearable
                  />
                </div>
                <div>
                  <label class="filter-label">Squadron</label>
                  <NSelect
                    v-model:value="filterSquadron"
                    :options="squadronOptions"
                    placeholder="Select squadron"
                  />
                </div>
                <div>
                  <label class="filter-label">Theater</label>
                  <NSelect
                    v-model:value="filterTheater"
                    :options="theaterOptions"
                    placeholder="Select theater"
                  />
                </div>
                <NButton block @click="clearFilters" :disabled="activeFilterCount === 0">
                  Clear Filters
                </NButton>
              </NSpace>
            </div>
          </NPopover>
          <NButton type="primary" @click="showCreateModal = true"> + New Mission </NButton>
        </NSpace>
      </template>

      <!-- Storage Warning -->
      <StorageWarning />

      <!-- Desktop Table View -->
      <div class="desktop-view">
        <MissionTable
          :missions="filteredMissions"
          @edit="handleEdit"
          @duplicate="handleDuplicate"
          @delete="handleDelete"
        />
      </div>

      <!-- Mobile Grid View -->
      <div class="mobile-view">
        <MissionCardGrid
          v-if="filteredMissions.length > 0"
          :missions="filteredMissions"
          @edit="handleEdit"
          @duplicate="handleDuplicate"
          @delete="handleDelete"
        />
      </div>

      <div v-if="missionsStore.missionsList.length === 0" class="empty-state">
        <p>No missions yet. Create your first mission to get started!</p>
        <NButton type="primary" @click="showCreateModal = true"> + New Mission </NButton>
      </div>

      <div
        v-if="missionsStore.missionsList.length > 0 && filteredMissions.length === 0"
        class="empty-state"
      >
        <p>No missions match the current filters.</p>
        <NButton @click="clearFilters">Clear Filters</NButton>
      </div>
    </NCard>

    <CreateMissionModal v-model:show="showCreateModal" @create="handleCreateMission" />
  </div>
</template>

<style scoped>
.mission-list {
  max-width: 1400px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  opacity: 0.6;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

/* Desktop table view - visible by default */
.desktop-view {
  display: block;
}

/* Mobile grid view - hidden by default */
.mobile-view {
  display: none;
}

/* Filter popover styles */
.filter-popover {
  width: 280px;
  padding: 4px;
}

.filter-popover h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.filter-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  opacity: 0.8;
}

/* Mobile responsive styles */
@media (width <= 768px) {
  /* Hide desktop table, show mobile grid */
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }
}
</style>
