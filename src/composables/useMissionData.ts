import { computed, type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { getNavaidsForTheater } from '@/data/navaids'
import { theaterDatabase } from '@/data/theaters'
import { getLoadoutsForAirframe } from '@/data/loadouts'
import { crewDatabase, crewBySquadron } from '@/data/crew'
import { getMissionAirframe } from '@/utils/missionHelpers'
import type { Mission } from '@/types'

/**
 * Composable for accessing mission data and related lookups
 */
export function useMissionData(missionId: ComputedRef<string>) {
  const missionsStore = useMissionsStore()

  const mission = computed(() => missionsStore.getMission(missionId.value))

  const theaterData = computed(() => {
    if (!mission.value) return null
    return theaterDatabase[mission.value.theater]
  })

  const availableNavaids = computed(() => {
    if (!mission.value) return []
    return getNavaidsForTheater(mission.value.theater)
  })

  const availableLoadouts = computed(() => {
    if (!mission.value) return []
    const airframe = getMissionAirframe(mission.value)
    return getLoadoutsForAirframe(airframe)
  })

  const availableCrew = computed(() => {
    if (!mission.value) return crewDatabase
    // Filter crew database based on squadron
    return crewBySquadron[mission.value.squadron] || []
  })

  const availableCrewForDropdown = computed(() => {
    if (!mission.value) return availableCrew.value
    // Filter out crew members who are already in the flight
    const addedPilots = new Set(mission.value.crew.map((c) => c.pilot))
    const filtered = availableCrew.value.filter((c) => !addedPilots.has(c.pilot))
    // Sort by pilot name
    return filtered.sort((a, b) => a.pilot.localeCompare(b.pilot))
  })

  const mdcExportSupported = computed(() => {
    if (!mission.value) return false
    const airframe = getMissionAirframe(mission.value)
    return airframe === 'F-16C_50' || airframe === 'A-10C_2'
  })

  function updateField(field: keyof Mission, value: string | number | string[][] | boolean) {
    if (!mission.value) return
    missionsStore.updateMission(missionId.value, { [field]: value })
  }

  function updateNestedField(
    parent: 'details' | 'ecmCmds' | 'told' | 'fuel' | 'departureRecovery',
    field: string,
    value: string | number | string[] | undefined,
  ) {
    if (!mission.value) return
    const parentObj = mission.value[parent]
    try {
      missionsStore.updateMission(missionId.value, {
        [parent]: { ...parentObj, [field]: value },
      })
    } catch (error) {
      // Re-throw to let the component handle it
      throw error
    }
  }

  return {
    mission,
    theaterData,
    availableNavaids,
    availableLoadouts,
    availableCrew,
    availableCrewForDropdown,
    mdcExportSupported,
    updateField,
    updateNestedField,
  }
}
