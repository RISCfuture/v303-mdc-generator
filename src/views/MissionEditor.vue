<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NPageHeader,
  NSpace,
  NTabs,
  NTabPane,
  NDropdown,
  NIcon,
  NPopover,
  useMessage,
} from 'naive-ui'
import { ChevronDownOutline, AlertCircleOutline } from '@vicons/ionicons5'
import { useMissionsStore } from '@/stores/missions'
import { getSquadronDisplayName } from '@/data/squadrons'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { getCrewPositionShort } from '@/data/constants'
import type {
  TargetData,
  RadioPreset,
  F16CalculatorParams,
  A10CalculatorParams,
  F16BingoCalculatorParams,
} from '@/types'

// Composables
import { useMissionData } from '@/composables/useMissionData'
import { useMissionWeights } from '@/composables/useMissionWeights'
import { useMissionCallsigns } from '@/composables/useMissionCallsigns'
import { useMissionExport } from '@/composables/useMissionExport'
import { useWaypointManagement } from '@/composables/useWaypointManagement'
import { useCrewManagement } from '@/composables/useCrewManagement'
import { useLoadoutManagement } from '@/composables/useLoadoutManagement'
import { useMissionValidation } from '@/composables/useMissionValidation'
import { usePackageManagement } from '@/composables/usePackageManagement'
import { useSupportAssetManagement } from '@/composables/useSupportAssetManagement'

// Components
import MissionBasicInfo from '@/components/mission/basic-info/MissionBasicInfo.vue'
import MissionSteerpoints from '@/components/mission/steerpoints/MissionSteerpoints.vue'
import MissionFlightMembers from '@/components/mission/flight-members/MissionFlightMembers.vue'
import MissionLoadout from '@/components/mission/loadout/MissionLoadout.vue'
import RadioPresetsEditor from '@/components/mission/radios/RadioPresetsEditor.vue'
import MissionTOLDFuel from '@/components/mission/told-fuel/MissionTOLDFuel.vue'
import MissionTargets from '@/components/mission/targets/MissionTargets.vue'
import MissionBriefing from '@/components/mission/briefing/MissionBriefing.vue'
import MissionECMCMDS from '@/components/mission/ecm-cmds/MissionECMCMDS.vue'
import SpeedCalculatorModal from '@/components/mission/told-fuel/SpeedCalculatorModal.vue'
import BingoCalculatorModal from '@/components/mission/told-fuel/BingoCalculatorModal.vue'
import MissionPackage from '@/components/mission/package/MissionPackage.vue'
import MissionSupportAssets from '@/components/mission/package/MissionSupportAssets.vue'

const route = useRoute()
const router = useRouter()
const missionsStore = useMissionsStore()
const message = useMessage()

const missionId = computed(() => route.params.id as string)

// Use composables
const {
  mission,
  theaterData,
  availableNavaids,
  availableLoadouts,
  availableCrew,
  availableCrewForDropdown,
  mdcExportSupported,
  updateField,
  updateNestedField: updateNestedFieldBase,
} = useMissionData(missionId)

// Debounce timer for image cleanup
let cleanupTimer: ReturnType<typeof setTimeout> | null = null

// Wrapper for updateNestedField with error handling
function updateNestedField(
  parent: 'details' | 'ecmCmds' | 'told' | 'fuel' | 'departureRecovery',
  field: string,
  value: string | number | string[] | undefined,
) {
  try {
    updateNestedFieldBase(parent, field, value)

    // If imageIds were updated, schedule cleanup of unused images (debounced)
    if (field === 'imageIds' && parent === 'details') {
      if (cleanupTimer) clearTimeout(cleanupTimer)
      cleanupTimer = setTimeout(async () => {
        const deletedCount = await missionsStore.cleanupUnusedImagesForMission(missionId.value)
        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} unused images`)
        }
      }, 2000) // Wait 2 seconds after last change before cleaning up
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Storage quota exceeded')) {
      message.error(
        'Storage quota exceeded! Your changes could not be saved. Try removing old missions or images.',
        { duration: 10000 },
      )
    } else {
      message.error(`Failed to save changes: ${error}`)
    }
  }
}

const { loadoutWeight, fuelWeight, grossWeight, calculatedSpeeds, calculatedBingo } =
  useMissionWeights(mission)

const {
  effectiveFlightCallsign,
  effectiveLink16Prefix,
  availableCallsignOptions,
  updateFlightCallsign,
} = useMissionCallsigns(missionId, mission)

const { handleExportPDF, handleExportMDC } = useMissionExport()

// Mission validation
const { isComplete, isWaypointFieldIncomplete, isFieldIncomplete, fieldErrors } =
  useMissionValidation(mission)

// Waypoint management
const waypoints = computed(() => mission.value?.waypoints || [])
const {
  waypointDragDrop,
  addWaypoint,
  addWaypointFromNavaid,
  removeWaypoint,
  handleWaypointDrop,
  moveWaypointUp,
  moveWaypointDown,
} = useWaypointManagement(missionId, waypoints)

// Crew management
const crew = computed(() => mission.value?.crew || [])
const {
  crewDragDrop,
  addCrewMember,
  removeCrewMember,
  handleCrewDrop,
  moveCrewMemberUp,
  moveCrewMemberDown,
} = useCrewManagement(missionId, crew, availableCrew)

// Loadout management
const airframe = computed(() => (mission.value ? getMissionAirframe(mission.value) : ''))
const loadout = computed(() => mission.value?.loadout || [])
const { selectedSCL, airframeStations, loadPrefabLoadout, clearAllLoadout, updateLoadoutStation } =
  useLoadoutManagement(missionId, airframe, loadout, availableLoadouts)

// Package management
const packageMembers = computed(() => mission.value?.packageMembers || [])
const {
  packageDragDrop,
  addPackageMember,
  removePackageMember,
  updatePackageMember,
  handlePackageDrop,
  movePackageMemberUp,
  movePackageMemberDown,
} = usePackageManagement(missionId, packageMembers)

// Support asset management
const supportAssets = computed(() => mission.value?.supportAssets || [])
const {
  supportAssetDragDrop,
  addSupportAsset,
  removeSupportAsset,
  updateSupportAsset,
  handleSupportAssetDrop,
  moveSupportAssetUp,
  moveSupportAssetDown,
} = useSupportAssetManagement(missionId, supportAssets)

// Check if mission exists
if (!mission.value) {
  message.error('Mission not found')
  router.push('/')
}

// Speed calculator modal state
const showSpeedCalculator = ref(false)

// Bingo calculator modal state
const showBingoCalculator = ref(false)

// Active tab state
const activeTab = ref('basic')

// Validation popover state
const showValidationPopover = ref(false)

// Auto-update rotation and refusal speeds when calculated speeds change
// This happens when: loadout changes (gross weight) OR calculator params change
watch(
  calculatedSpeeds,
  (newSpeeds) => {
    if (!mission.value || !newSpeeds) return

    // Only update if the calculated speeds differ from the stored values
    const currentRotation = mission.value.told.rotation
    const currentRefusal = mission.value.told.refusal

    if (currentRotation !== newSpeeds.rotationSpeed || currentRefusal !== newSpeeds.refusalSpeed) {
      // Update the mission with the calculated speeds
      missionsStore.updateMission(missionId.value, {
        told: {
          ...mission.value.told,
          rotation: newSpeeds.rotationSpeed,
          refusal: newSpeeds.refusalSpeed,
        },
      })
    }
  },
  { immediate: true },
)

// Auto-update bingo fuel when calculated bingo changes
// This happens when: crew changes, waypoints change, calculator params change, etc.
watch(
  calculatedBingo,
  (newBingo) => {
    if (!mission.value || newBingo === null) return

    // Only update if the calculated bingo differs from the stored value
    const currentBingo = mission.value.fuel.bingo

    if (currentBingo !== newBingo) {
      // Update the mission with the calculated bingo
      missionsStore.updateMission(missionId.value, {
        fuel: {
          ...mission.value.fuel,
          bingo: newBingo,
        },
      })
    }
  },
  { immediate: true },
)

function goBack() {
  router.push('/')
}

function handleAddWaypointFromNavaid(navaidName: string) {
  const navaid = availableNavaids.value.find((n) => n.name === navaidName)
  if (navaid) {
    addWaypointFromNavaid(navaid)
  }
}

function updateTargetField(
  targetType: 'primaryTarget' | 'secondaryTarget',
  field: keyof TargetData,
  value: TargetData[keyof TargetData],
) {
  if (!mission.value) return
  const target = mission.value.details[targetType] || {}
  missionsStore.updateMission(missionId.value, {
    details: {
      ...mission.value.details,
      [targetType]: { ...target, [field]: value },
    },
  })

  // If imageIds were updated for a target, schedule cleanup
  if (field === 'imageIds') {
    if (cleanupTimer) clearTimeout(cleanupTimer)
    cleanupTimer = setTimeout(async () => {
      const deletedCount = await missionsStore.cleanupUnusedImagesForMission(missionId.value)
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} unused images`)
      }
    }, 2000)
  }
}

function handleOpenSpeedCalculator() {
  showSpeedCalculator.value = true
}

function handleSpeedsCalculated(
  rotation: number,
  refusal: number,
  params: F16CalculatorParams | A10CalculatorParams,
  departureRecoveryUpdate: {
    departureAirportId?: string
    departureRunwayName?: string
    departureRunwayHeading?: number
    departureFieldElevation?: number
  },
) {
  if (!mission.value) return

  missionsStore.updateMission(missionId.value, {
    told: {
      ...mission.value.told,
      rotation,
      refusal,
      calculatorParams: params,
    },
    departureRecovery: {
      ...mission.value.departureRecovery,
      ...departureRecoveryUpdate,
    },
  })
}

function handleOpenBingoCalculator() {
  showBingoCalculator.value = true
}

function handleBingoCalculated(bingo: number, params: F16BingoCalculatorParams) {
  if (!mission.value) return

  missionsStore.updateMission(missionId.value, {
    fuel: {
      ...mission.value.fuel,
      bingo,
      bingoCalculatorParams: params,
    },
  })
}

// Create dropdown options for exporting MDC per crew member
const mdcExportOptions = computed(() => {
  if (!mission.value) return []

  return mission.value.crew.map((member, index) => ({
    label: `${effectiveFlightCallsign.value}${getCrewPositionShort(index)} (${member.pilot})`,
    key: index.toString(),
  }))
})

function handleSelectMDCExport(key: string) {
  if (!mission.value) return
  const crewMemberIndex = parseInt(key)
  handleExportMDC(mission.value, crewMemberIndex)
}
</script>

<template>
  <div v-if="mission" class="mission-editor-wrapper">
    <div class="mission-editor">
      <NPageHeader :title="mission.name || 'Untitled Mission'" @back="goBack">
        <template #subtitle>
          {{ effectiveFlightCallsign || '' }} | {{ getSquadronDisplayName(mission.squadron) }} |
          {{ theaterData?.displayName || mission.theater }}
        </template>
        <template #extra>
          <NSpace>
            <NSpace :size="8" align="center">
              <NPopover
                v-if="!isComplete"
                v-model:show="showValidationPopover"
                trigger="click"
                placement="bottom-start"
              >
                <template #trigger>
                  <NIcon size="20" color="#d03050" style="cursor: pointer">
                    <AlertCircleOutline />
                  </NIcon>
                </template>
                <div style="max-width: 400px">
                  <h4 style="margin: 0 0 12px">Required Fields Missing</h4>
                  <div v-if="fieldErrors.size > 0" style="font-size: 13px">
                    <div
                      v-for="[field, error] in fieldErrors"
                      :key="field"
                      style="margin-bottom: 8px"
                    >
                      <strong>{{ field }}:</strong> {{ error }}
                    </div>
                  </div>
                  <div v-else style="font-size: 13px; color: #999">
                    <p>Mission validation failed but no specific errors were found.</p>
                    <p style="margin-top: 8px; font-family: monospace; font-size: 11px">
                      Debug: Check browser console for validation details.
                    </p>
                  </div>
                </div>
              </NPopover>
              <NButton type="primary" :disabled="!isComplete" @click="handleExportPDF(mission)"
                >Export PDF</NButton
              >
            </NSpace>
            <NDropdown
              v-if="mdcExportSupported"
              trigger="click"
              :options="mdcExportOptions"
              :disabled="!isComplete"
              @select="handleSelectMDCExport"
            >
              <NButton type="primary" :disabled="!isComplete" icon-placement="right">
                <template #icon>
                  <NIcon>
                    <ChevronDownOutline />
                  </NIcon>
                </template>
                Export MDC
              </NButton>
            </NDropdown>
          </NSpace>
        </template>
      </NPageHeader>

      <div class="editor-content">
        <NTabs v-model:value="activeTab" type="line" animated>
          <!-- Basic Info Tab -->
          <NTabPane name="basic" tab="Basic Info">
            <MissionBasicInfo
              :mission="mission"
              :theater-data="theaterData"
              :is-field-incomplete="isFieldIncomplete"
              @update:field="updateField"
              @update:nestedField="updateNestedField"
            />
          </NTabPane>

          <!-- Crew Tab -->
          <NTabPane name="crew" tab="Flight Members">
            <MissionFlightMembers
              :crew="crew"
              :available-crew-for-dropdown="availableCrewForDropdown"
              :crew-drag-drop="crewDragDrop"
              :effective-flight-callsign="effectiveFlightCallsign"
              :effective-link16-prefix="effectiveLink16Prefix"
              :flight-callsign-override="mission.flightCallsignOverride"
              :link16-prefix-override="mission.link16PrefixOverride"
              :available-callsign-options="availableCallsignOptions"
              @add-crew-member="addCrewMember"
              @remove-crew-member="removeCrewMember"
              @crew-drop="handleCrewDrop"
              @move-crew-up="moveCrewMemberUp"
              @move-crew-down="moveCrewMemberDown"
              @update:flight-callsign="updateFlightCallsign"
              @update:link16-prefix="(v: string) => updateField('link16PrefixOverride', v)"
            />
          </NTabPane>

          <!-- Package Tab -->
          <NTabPane name="package" tab="Package">
            <NSpace vertical>
              <MissionPackage
                :package-members="packageMembers"
                :package-drag-drop="packageDragDrop"
                @add-package-member="addPackageMember"
                @remove-package-member="removePackageMember"
                @update-package-member="updatePackageMember"
                @package-drop="handlePackageDrop"
                @move-package-up="movePackageMemberUp"
                @move-package-down="movePackageMemberDown"
              />
              <MissionSupportAssets
                :support-assets="supportAssets"
                :support-asset-drag-drop="supportAssetDragDrop"
                @add-support-asset="addSupportAsset"
                @remove-support-asset="removeSupportAsset"
                @update-support-asset="updateSupportAsset"
                @support-asset-drop="handleSupportAssetDrop"
                @move-support-asset-up="moveSupportAssetUp"
                @move-support-asset-down="moveSupportAssetDown"
              />
            </NSpace>
          </NTabPane>

          <!-- Waypoints Tab -->
          <NTabPane name="waypoints" tab="Steerpoints">
            <MissionSteerpoints
              :waypoints="waypoints"
              :available-navaids="availableNavaids"
              :waypoint-drag-drop="waypointDragDrop"
              :is-waypoint-field-incomplete="isWaypointFieldIncomplete"
              @add-waypoint="addWaypoint"
              @add-waypoint-from-navaid="handleAddWaypointFromNavaid"
              @remove-waypoint="removeWaypoint"
              @waypoint-drop="handleWaypointDrop"
              @move-waypoint-up="moveWaypointUp"
              @move-waypoint-down="moveWaypointDown"
            />
          </NTabPane>

          <!-- Radio Tab -->
          <NTabPane name="radios" tab="Radios">
            <RadioPresetsEditor
              :airframe="airframe"
              :radio-presets="mission.radioPresets"
              :comm-ladders="mission.commLadders"
              @update:radio-presets="(v: RadioPreset[][]) => updateField('radioPresets', v)"
              @update:comm-ladders="(v: number[][]) => updateField('commLadders', v)"
            />
          </NTabPane>

          <!-- Loadout Tab -->
          <NTabPane name="loadout" tab="Loadout">
            <MissionLoadout
              :airframe="airframe"
              :loadout="loadout"
              :airframe-stations="airframeStations"
              :available-loadouts="availableLoadouts"
              :selected-s-c-l="selectedSCL"
              :loadout-weight="loadoutWeight"
              :fuel-weight="fuelWeight"
              :gross-weight="grossWeight"
              :gun-ammo-type="mission.gunAmmoType"
              @update:selected-scl="(v: string | null) => (selectedSCL = v)"
              @load-prefab-loadout="loadPrefabLoadout"
              @clear-all-loadout="clearAllLoadout"
              @update-loadout-station="updateLoadoutStation"
              @update:gun-ammo-type="(v: string | null) => updateField('gunAmmoType', v)"
            />
          </NTabPane>

          <!-- TOLD & Fuel Tab -->
          <NTabPane name="told" tab="TOLD & Fuel">
            <MissionTOLDFuel
              :mission="mission"
              :gross-weight="grossWeight"
              :fuel-weight="fuelWeight"
              :calculated-speeds="calculatedSpeeds"
              :calculated-bingo="calculatedBingo"
              :is-field-incomplete="isFieldIncomplete"
              @update:nested-field="updateNestedField"
              @open-speed-calculator="handleOpenSpeedCalculator"
              @open-bingo-calculator="handleOpenBingoCalculator"
            />
          </NTabPane>

          <!-- ECM/CMDS Tab -->
          <NTabPane name="ecm" tab="ECM/CMDS">
            <MissionECMCMDS
              :mission="mission"
              :airframe="airframe"
              @update:cmds-profile="
                (v: string | null) => updateField('cmdsProfile', v ?? undefined)
              "
              @update:ecm-program="(v: string | null) => updateField('ecmProgram', v ?? undefined)"
              @update:hts-threat-tables="(v: string[]) => updateField('htsThreatTables', v)"
              @update:chaff-total="(v: number) => updateNestedField('ecmCmds', 'chaffTotal', v)"
              @update:flare-total="(v: number) => updateNestedField('ecmCmds', 'flareTotal', v)"
            />
          </NTabPane>

          <!-- Targets Tab -->
          <NTabPane name="targets" tab="Targets">
            <MissionTargets :mission="mission" @update:target-field="updateTargetField" />
          </NTabPane>

          <!-- Briefing Tab -->
          <NTabPane name="briefing" tab="Briefing">
            <MissionBriefing
              :mission="mission"
              :is-field-incomplete="isFieldIncomplete"
              @update:nested-field="updateNestedField"
            />
          </NTabPane>
        </NTabs>
      </div>

      <!-- Speed Calculator Modal -->
      <SpeedCalculatorModal
        v-if="mission"
        :show="showSpeedCalculator"
        :mission="mission"
        :airframe="airframe"
        :gross-weight="grossWeight"
        @update:show="(v: boolean) => (showSpeedCalculator = v)"
        @speeds-calculated="handleSpeedsCalculated"
      />

      <!-- Bingo Calculator Modal -->
      <BingoCalculatorModal
        v-if="mission"
        :show="showBingoCalculator"
        :mission="mission"
        :number-of-pilots="mission.crew.length"
        @update:show="(v: boolean) => (showBingoCalculator = v)"
        @bingo-calculated="handleBingoCalculated"
      />
    </div>
  </div>
</template>

<style scoped>
.mission-editor-wrapper {
  margin: -16px;
  min-height: calc(100vh + 32px);
}

.mission-editor {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 16px;
}

@media (prefers-color-scheme: dark) {
  .mission-editor {
    background: #101014;
  }
}

.editor-content {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
