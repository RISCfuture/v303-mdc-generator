import { ref, computed, type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { buildStationLoadoutOptions } from '@/data/munitions'
import { getAirframeData } from '@/utils/airframeHelpers'
import { STATION_COUNTS } from '@/data/constants'
import type { LoadoutStation } from '@/types'
import type { PrefabLoadout } from '@/data/loadouts'

/**
 * Composable for managing aircraft loadout
 */
export function useLoadoutManagement(
  missionId: ComputedRef<string>,
  airframe: ComputedRef<string>,
  loadout: ComputedRef<LoadoutStation[]>,
  availableLoadouts: ComputedRef<PrefabLoadout[]>,
) {
  const missionsStore = useMissionsStore()

  // Local state for SCL dropdown
  const selectedSCL = ref<string | null>(null)

  const stationCount = computed(() => {
    return STATION_COUNTS[airframe.value] ?? 9
  })

  // Get actual station definitions from airframe data
  const airframeStations = computed(() => {
    const airframeData = getAirframeData(airframe.value)
    return airframeData?.stations || []
  })

  // Build station-specific munition options that vary by aircraft and station
  function getMunitionOptionsForStation(stationNum: number | string) {
    return buildStationLoadoutOptions(airframe.value, stationNum)
  }

  function loadPrefabLoadout(loadoutName: string | null) {
    if (!loadoutName) return
    const prefab = availableLoadouts.value.find((l) => l.name === loadoutName)
    if (!prefab) return

    missionsStore.updateMission(missionId.value, { loadout: prefab.stations })

    // Clear the dropdown after loading
    selectedSCL.value = null
  }

  function clearAllLoadout() {
    const stations: LoadoutStation[] = []
    const airframeData = getAirframeData(airframe.value)
    if (airframeData) {
      for (const station of airframeData.stations) {
        stations.push({ station: station.station, item: 'EMPTY' })
      }
    }
    missionsStore.updateMission(missionId.value, { loadout: stations })
  }

  function initializeLoadout() {
    const stations: LoadoutStation[] = []
    const airframeData = getAirframeData(airframe.value)
    if (airframeData) {
      for (const station of airframeData.stations) {
        stations.push({ station: station.station, item: 'EMPTY' })
      }
    }
    missionsStore.updateMission(missionId.value, { loadout: stations })
  }

  function updateLoadoutStation(stationNumber: number, munition: string) {
    const updatedLoadout = [...loadout.value]
    const stationIndex = updatedLoadout.findIndex((s) => s.station === stationNumber)

    if (stationIndex >= 0) {
      updatedLoadout[stationIndex] = { station: stationNumber, item: munition }
    } else {
      updatedLoadout.push({ station: stationNumber, item: munition })
    }

    missionsStore.updateMission(missionId.value, { loadout: updatedLoadout })
  }

  // Ensure loadout has correct number of stations
  if (loadout.value.length !== stationCount.value) {
    initializeLoadout()
  }

  return {
    selectedSCL,
    stationCount,
    airframeStations,
    getMunitionOptionsForStation,
    loadPrefabLoadout,
    clearAllLoadout,
    updateLoadoutStation,
  }
}
