import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { Mission, Squadron, Theater, Waypoint } from '@/types'
import { getDefaultRadioPresets } from '@/data/channelization'
import {
  serializeMission,
  deserializeMission,
  type SerializedMission,
} from '@/utils/missionStorage'
import { getAirframeData, getRadioCount } from '@/utils/airframeHelpers'
import { getSquadronAirframe, squadronDatabase } from '@/data/squadrons'
import { STATION_COUNTS } from '@/data/constants'
import { imageStorage } from '@/services/imageStorage'
import { theaterDatabase } from '@/data/theaters'
import { getAirfieldsForTheater } from '@/data/airfields'

export const STORAGE_KEY = 'v303-missions'
export const STORAGE_VERSION = 2

export type MissionsStorageData = {
  version: number
  missions: SerializedMission[]
}

const defaultStorageData = (): MissionsStorageData => ({
  version: STORAGE_VERSION,
  missions: [],
})

/**
 * Missions store with LocalStorage persistence via VueUse's useLocalStorage.
 * Mutating actions call saveToStorage() to push the serialized envelope through the storage ref.
 */
export const useMissionsStore = defineStore('missions', () => {
  // Persistent versioned storage backed by useLocalStorage. The serializer preserves
  // the {version, missions} envelope and discards data with an unexpected version.
  const storageRef = useLocalStorage(STORAGE_KEY, defaultStorageData(), {
    flush: 'sync',
    listenToStorageChanges: false,
    serializer: {
      read: (raw: string): MissionsStorageData => {
        try {
          const parsed: unknown = JSON.parse(raw)
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            'version' in parsed &&
            (parsed as Record<string, unknown>).version === STORAGE_VERSION &&
            Array.isArray((parsed as Record<string, unknown>).missions)
          ) {
            return parsed as MissionsStorageData
          }
          console.warn('Invalid or outdated storage format - clearing')
          return defaultStorageData()
        } catch (error) {
          console.error('Failed to parse missions from localStorage:', error)
          return defaultStorageData()
        }
      },
      write: (value: MissionsStorageData): string => JSON.stringify(value),
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Mission data may not be saved properly.')
      } else {
        console.error('Mission storage error:', error)
      }
    },
  })

  // State
  const missions = ref<Mission[]>([])
  const currentMissionId = ref<string | null>(null)

  // Computed
  const currentMission = computed(() => {
    if (!currentMissionId.value) return null
    return missions.value.find((m) => m.id === currentMissionId.value) ?? null
  })

  const missionsList = computed(() => {
    return [...missions.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  })

  // Actions

  /**
   * Reload missions from LocalStorage into the in-memory state.
   */
  function loadFromStorage() {
    try {
      missions.value = storageRef.value.missions.map(deserializeMission)
    } catch (error) {
      console.error('Failed to deserialize missions from storage:', error)
      missions.value = []
    }
  }

  loadFromStorage()

  /**
   * Persist missions to LocalStorage. Throws on QuotaExceededError so callers
   * (e.g. updateMission) can revert their optimistic mutation.
   */
  function saveToStorage() {
    try {
      storageRef.value = {
        version: STORAGE_VERSION,
        missions: missions.value.map(serializeMission),
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const quotaError = new Error(
          'Storage quota exceeded. Please reduce mission data or delete old missions.',
        )
        ;(quotaError as unknown as { cause: unknown }).cause = error
        throw quotaError
      }
      throw error
    }
  }

  /**
   * Create a new mission with default values
   */
  function createMission(squadron: Squadron, theater: Theater): Mission {
    const now = new Date().toISOString()
    const id = `mission-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    const airframe = getSquadronAirframe(squadron)
    const airframeData = getAirframeData(airframe)

    if (!airframeData) {
      throw new Error(`Airframe data not found for ${airframe}`)
    }

    const mission: Mission = {
      id,
      name: 'Untitled Mission',
      callsign: '',
      flightCallsignOverride: '',
      link16PrefixOverride: '',
      date: new Date().toISOString().split('T')[0] ?? '',
      missionNumber: '',
      type: '',
      squadron,
      theater,
      crew: [],
      packageMembers: [],
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      supportAssets: theaterDatabase[theater]?.defaultSupportAssets ?? [],
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      bullseye: theaterDatabase[theater]?.defaultBullseye,
      loadout: Array.from({ length: STATION_COUNTS[airframe] || 11 }, (_, i) => ({
        station: i + 1,
        item: 'EMPTY',
      })),
      ecmCmds: {
        cmdsPrograms: [
          {
            number: 1,
            flareBurstQty: 6,
            flareBurstInterval: 0.075,
            flareSalvoQty: 1,
            flareSalvoInterval: 0.5,
            chaffBurstQty: 3,
            chaffBurstInterval: 0.3,
            chaffSalvoQty: 1,
            chaffSalvoInterval: 0.75,
          },
        ],
        chaffBingo: 10,
        flareBingo: 10,
        chaffTotal: airframeData.defaultChaff,
        flareTotal: airframeData.defaultFlare,
      },
      radioPresets: (() => {
        const radioCount = getRadioCount(airframe)
        const radios: typeof mission.radioPresets = []
        for (let i = 0; i < radioCount; i++) {
          radios[i] = getDefaultRadioPresets(theater, airframe, i)
        }
        return radios
      })(),
      departureRecovery: (() => {
        const theaterData = theaterDatabase[theater]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard: theater key may not exist in database
        const defaultAirfield = theaterData?.defaultAirfield
        if (defaultAirfield) {
          return {
            departureAirportId: defaultAirfield,
            recoveryAirportId: defaultAirfield,
          }
        }
        return {}
      })(),
      waypoints: (() => {
        // Auto-create steerpoint 1 from default airfield if set
        const theaterData = theaterDatabase[theater]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard: theater key may not exist in database
        const defaultAirfield = theaterData?.defaultAirfield
        if (defaultAirfield) {
          const airfields = getAirfieldsForTheater(theater)
          const airfield = airfields.find((af) => af.name === defaultAirfield)
          if (airfield) {
            const steerpoint1: Waypoint = {
              sequence: 1,
              name: airfield.name,
              latitude: airfield.position.latitude,
              longitude: airfield.position.longitude,
              elevation: airfield.position.elevation, // Already in feet MSL
              altitude: airfield.position.elevation ?? 0, // Pre-fill altitude with elevation, or 0 if undefined
              speed: null,
              type: 'PARK',
            }
            return [steerpoint1]
          }
        }
        return []
      })(),
      told: {},
      fuel: {
        takeoff: airframeData.internalFuel,
        joker: airframeData.defaultJoker,
        bingo: airframeData.defaultBingo,
        fuelLoadPercentage: 100,
      },
      gunAmmoType: (() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const squadronAmmo = squadronDatabase[squadron]?.defaultGunAmmo
        if (!squadronAmmo) return undefined

        // Check if theater is training to determine which ammo type to use
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const isTraining = theaterDatabase[theater]?.isTraining ?? false
        return isTraining ? squadronAmmo.training : squadronAmmo.combat
      })(),
      weather: '',
      details: {
        remarks: '',
      },
      createdAt: now,
      updatedAt: now,
    }

    missions.value.push(mission)
    currentMissionId.value = id
    saveToStorage()

    return mission
  }

  /**
   * Get a mission by ID
   */
  function getMission(id: string): Mission | undefined {
    return missions.value.find((m) => m.id === id)
  }

  /**
   * Update a mission
   */
  function updateMission(id: string, updates: Partial<Omit<Mission, 'id' | 'createdAt'>>) {
    const index = missions.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      const originalMission = missions.value[index]
      const updatedMission = {
        ...originalMission,
        ...updates,
        id, // Preserve the original ID
        updatedAt: new Date().toISOString(),
      }
      missions.value[index] = updatedMission
      try {
        saveToStorage()
      } catch (error) {
        // Revert the change if save fails
        missions.value[index] = originalMission
        throw error
      }
    }
  }

  /**
   * Delete a mission and cleanup associated images
   */
  async function deleteMission(id: string) {
    const index = missions.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      // Delete associated images from IndexedDB
      try {
        await imageStorage.deleteImagesByMission(id)
      } catch (error) {
        console.error(`Failed to delete images for mission ${id}:`, error)
      }

      missions.value.splice(index, 1)
      if (currentMissionId.value === id) {
        currentMissionId.value = null
      }
      saveToStorage()
    }
  }

  /**
   * Set the current mission being edited
   */
  function setCurrentMission(id: string | null) {
    if (id && !getMission(id)) {
      console.warn(`Mission with id ${id} not found`)
      return
    }
    currentMissionId.value = id
  }

  /**
   * Duplicate a mission
   */
  function duplicateMission(id: string): Mission | null {
    const original = getMission(id)
    if (!original) return null

    const now = new Date().toISOString()
    const newId = `mission-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    const duplicate: Mission = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    }

    missions.value.push(duplicate)
    saveToStorage()

    return duplicate
  }

  /**
   * Cleanup orphaned images (images not referenced by any mission)
   */
  async function cleanupOrphanedImages(): Promise<number> {
    try {
      const validMissionIds = missions.value.map((m) => m.id)
      const deletedCount = await imageStorage.cleanupOrphanedImages(validMissionIds)

      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup orphaned images:', error)
      return 0
    }
  }

  /**
   * Cleanup unused images for a specific mission
   * Removes images from IndexedDB that are not referenced in the mission's markdown
   */
  async function cleanupUnusedImagesForMission(missionId: string): Promise<number> {
    try {
      const mission = getMission(missionId)
      if (!mission) return 0

      // Collect all referenced image IDs from all markdown fields
      const referencedImageIds = new Set<string>([
        ...(mission.details.imageIds ?? []),
        ...(mission.details.primaryTarget?.imageIds ?? []),
        ...(mission.details.secondaryTarget?.imageIds ?? []),
      ])

      // Get all images for this mission from IndexedDB
      const allImages = await imageStorage.getImagesByMission(missionId)

      // Find images that are in IndexedDB but not referenced in markdown
      const orphanedImages = allImages.filter((img) => !referencedImageIds.has(img.id))

      // Delete orphaned images
      await Promise.all(orphanedImages.map((img) => imageStorage.deleteImage(img.id)))

      if (orphanedImages.length > 0) {
        console.log(
          `[cleanupUnusedImages] Deleted ${orphanedImages.length} unused images for mission ${missionId}`,
        )
      }

      return orphanedImages.length
    } catch (error) {
      console.error('Failed to cleanup unused images for mission:', error)
      return 0
    }
  }

  return {
    // State
    missions,
    currentMissionId,
    storageRef,

    // Computed
    currentMission,
    missionsList,

    // Actions
    createMission,
    getMission,
    updateMission,
    deleteMission,
    setCurrentMission,
    duplicateMission,
    loadFromStorage,
    saveToStorage,
    cleanupOrphanedImages,
    cleanupUnusedImagesForMission,
  }
})
