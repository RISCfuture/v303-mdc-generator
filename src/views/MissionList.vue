<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  NButton,
  NCard,
  NPopover,
  NSelect,
  NInput,
  NSpace,
  NIcon,
  NBadge,
  NModal,
  NUpload,
  NText,
  type UploadFileInfo,
  useMessage,
} from 'naive-ui'
import { FunnelOutline, ShareOutline } from '@vicons/ionicons5'
import { useMissionsStore } from '@/stores/missions'
import { useMissionActions } from '@/composables/useMissionActions'
import { useMissionListExport, type ImportPreview } from '@/composables/useMissionListExport'
import MissionTable from '@/components/mission-list/MissionTable.vue'
import MissionCardGrid from '@/components/mission-list/MissionCardGrid.vue'
import CreateMissionModal from '@/components/mission-list/CreateMissionModal.vue'
import StorageWarning from '@/components/common/StorageWarning.vue'
import { getSquadronOptions } from '@/data/squadrons'
import { theaterDatabase } from '@/data/theaters'
import { serializeMission } from '@/utils/missionStorage'
import { validateMissionStorage } from '@/utils/validateMissionStorage'
import { formatFileSize } from '@/utils/formatters'
import type { Squadron, Theater, Mission } from '@/types'

const missionsStore = useMissionsStore()
const { handleCreate, handleEdit, handleDelete, handleDuplicate } = useMissionActions()
const {
  exportMissionList,
  exportSingleMission,
  parseImportFile,
  applyMissionImport,
  applySingleMissionImport,
} = useMissionListExport()
const message = useMessage()

const showCreateModal = ref(false)
const showFilterPopover = ref(false)
const showImportModal = ref(false)
const importPreview = ref<ImportPreview | null>(null)
const uploadFileList = ref<UploadFileInfo[]>([])
const isDragging = ref(false)
const dragCounter = ref(0)

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

async function handleImportFile({ file }: { file: UploadFileInfo }) {
  if (!file.file) {
    message.error('No file selected')
    uploadFileList.value = []
    return false
  }

  try {
    const result = await parseImportFile(file.file)

    // Check if it's a single mission import (has 'mission' property)
    if ('mission' in result) {
      // Single mission import - apply immediately without modal
      await applySingleMissionImport(result)
      // Clear the upload file list to reset the component
      await nextTick()
      uploadFileList.value = []
      return false
    } else {
      // Full backup import - show modal for confirmation
      importPreview.value = result as ImportPreview
      showImportModal.value = true
      // Clear the upload file list to reset the component
      await nextTick()
      uploadFileList.value = []
      return false
    }
  } catch (error) {
    message.error(`Failed to parse backup file: ${error}`)
    console.error('Import parse error:', error)
    // Clear the upload file list on error
    await nextTick()
    uploadFileList.value = []
    return false
  }
}

async function handleConfirmImport() {
  if (!importPreview.value) return

  try {
    await applyMissionImport(importPreview.value.data)
    showImportModal.value = false
    importPreview.value = null
  } catch (error) {
    // Error is already handled in applyMissionImport
    console.error('Import error:', error)
    showImportModal.value = false
    importPreview.value = null
  }
}

function handleCancelImport() {
  showImportModal.value = false
  importPreview.value = null
}

function handleExport(mission: Mission) {
  exportSingleMission(mission)
}

// Drag and drop handlers
function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value++

  // Check if the dragged item is a file
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value--

  // Only set isDragging to false when leaving the entire drop zone
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  // This is necessary to allow drop
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  isDragging.value = false
  dragCounter.value = 0

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  // Process only the first JSON file
  const file = files[0]
  if (!file || !file.name.endsWith('.json')) {
    message.error('Please drop a JSON file')
    return
  }

  try {
    const result = await parseImportFile(file)

    // Check if it's a single mission import (has 'mission' property)
    if ('mission' in result) {
      // Single mission import - apply immediately without modal
      await applySingleMissionImport(result)
      message.success('Mission imported successfully')
    } else {
      // Full backup import - show modal for confirmation
      importPreview.value = result as ImportPreview
      showImportModal.value = true
    }
  } catch (error) {
    message.error(`Failed to import file: ${error}`)
    console.error('Drag and drop import error:', error)
  }
}
</script>

<template>
  <div class="mission-list">
    <NCard
      title="v303 FG Mission Data Card Generator"
      :class="{ 'drag-over': isDragging }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
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
            <NSpace vertical :size="12" class="filter-popover">
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
            </NSpace>
          </NPopover>
          <NButton @click="exportMissionList" :disabled="missionsStore.missionsList.length === 0">
            Export Missions...
          </NButton>
          <NUpload
            v-model:file-list="uploadFileList"
            :show-file-list="false"
            accept=".json"
            :max="1"
            @change="handleImportFile"
            :custom-request="() => {}"
          >
            <NButton>Import Missions...</NButton>
          </NUpload>
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
          @export="handleExport"
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
          @export="handleExport"
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

      <!-- Drag and Drop Overlay -->
      <div v-if="isDragging" class="drag-overlay">
        <NSpace vertical align="center" justify="center" :size="16">
          <NIcon size="48" color="var(--n-primary-color)">
            <ShareOutline />
          </NIcon>
          <NText strong style="font-size: 20px">Drop JSON file to import</NText>
        </NSpace>
      </div>
    </NCard>

    <!-- Footer -->
    <div class="footer">
      <NSpace justify="center">
        <RouterLink to="/squadron-data" class="footer-link"> Edit Squadron Info </RouterLink>
      </NSpace>
    </div>

    <CreateMissionModal v-model:show="showCreateModal" @create="handleCreateMission" />

    <!-- Import Confirmation Modal -->
    <NModal
      v-model:show="showImportModal"
      preset="dialog"
      title="Import Missions"
      :positive-text="importPreview ? 'Replace All Missions' : 'OK'"
      negative-text="Cancel"
      :positive-button-props="{ type: 'error' }"
      @positive-click="handleConfirmImport"
      @negative-click="handleCancelImport"
    >
      <div v-if="importPreview" class="import-preview">
        <p class="warning-text">
          <strong>Warning:</strong> This will delete all existing missions and replace them with the
          imported data.
        </p>
        <div class="import-details">
          <p>
            <strong>Missions to import:</strong>
            {{
              new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
                importPreview.missionCount,
              )
            }}
          </p>
          <p>
            <strong>Exported:</strong>
            {{
              new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(importPreview.exportedAt))
            }}
          </p>
          <p>
            <strong>File size:</strong>
            {{ formatFileSize(importPreview.totalSize) }}
          </p>
        </div>
        <p class="confirm-text">Are you sure you want to continue?</p>
      </div>
    </NModal>
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
  margin: 0;
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

/* Import preview modal styles */
.import-preview {
  padding: 8px 0;
}

.warning-text {
  margin-bottom: 16px;
  padding: 12px;
  background-color: rgb(250 173 20 / 10%);
  border-left: 3px solid #faad14;
  border-radius: 4px;
}

.import-details {
  margin-bottom: 16px;
  padding: 12px;
  background-color: rgb(255 255 255 / 5%);
  border-radius: 4px;
}

.import-details p {
  margin: 6px 0;
  font-size: 14px;
}

.confirm-text {
  margin-top: 16px;
  font-weight: 500;
}

/* Footer styles */
.footer {
  margin-top: 32px;
  padding: 20px 0;
  text-align: center;
  opacity: 0.6;
}

.footer-link {
  color: inherit;
  text-decoration: none;
  font-size: 14px;
  transition: opacity 0.2s ease;
}

.footer-link:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Drag and drop styles */
.drag-over {
  position: relative;
  border: 2px dashed var(--n-primary-color);
  background-color: rgb(24 160 88 / 3%);
  transition: all 0.2s ease;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(255 255 255 / 95%);
  backdrop-filter: blur(4px);
  z-index: 10;
  pointer-events: none;
}

/* Dark mode support for overlay */
@media (prefers-color-scheme: dark) {
  .drag-overlay {
    background-color: rgb(0 0 0 / 85%);
  }
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
