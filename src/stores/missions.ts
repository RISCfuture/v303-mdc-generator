import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Mission, Squadron, Theater } from '@/types'
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

const STORAGE_KEY = 'v303-missions'
const STORAGE_VERSION = 2

/**
 * Missions store with automatic LocalStorage persistence
 * All state changes are automatically synced to LocalStorage via Pinia's $subscribe hook
 */
export const useMissionsStore = defineStore('missions', () => {
  // State
  const missions = ref<Mission[]>([])
  const currentMissionId = ref<string | null>(null)

  // Computed
  const currentMission = computed(() => {
    if (!currentMissionId.value) return null
    return missions.value.find((m) => m.id === currentMissionId.value) || null
  })

  const missionsList = computed(() => {
    return [...missions.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  })

  // Actions

  /**
   * Load missions from LocalStorage
   * Note: No schema validation here - missions can be incomplete and still editable.
   * Use isMissionComplete() to check export-readiness.
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        missions.value = []
        return
      }

      const parsed = JSON.parse(stored)

      // Expect versioned storage format
      if (
        parsed &&
        typeof parsed === 'object' &&
        'version' in parsed &&
        parsed.version === STORAGE_VERSION &&
        Array.isArray(parsed.missions)
      ) {
        const serializedMissions = parsed.missions as SerializedMission[]
        missions.value = serializedMissions.map(deserializeMission)
      } else {
        console.warn('Invalid or outdated storage format - clearing')
        missions.value = []
      }
    } catch (error) {
      console.error('Failed to load missions from localStorage:', error)
      missions.value = []
    }
  }

  /**
   * Save missions to LocalStorage
   */
  function saveToStorage() {
    try {
      // Serialize missions for storage
      const serializedMissions = missions.value.map(serializeMission)

      // Store with version
      const storageData = {
        version: STORAGE_VERSION,
        missions: serializedMissions,
      }

      const serialized = JSON.stringify(storageData)
      localStorage.setItem(STORAGE_KEY, serialized)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Mission data may not be saved properly.')
        // Re-throw so the component can catch and show a user-friendly message
        throw new Error(
          'Storage quota exceeded. Please reduce mission data or delete old missions.',
        )
      } else {
        console.error('Failed to save missions to localStorage:', error)
        throw error
      }
    }
  }

  /**
   * Create a new mission with default values
   */
  function createMission(squadron: Squadron, theater: Theater): Mission {
    const now = new Date().toISOString()
    const id = `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
      date: new Date().toISOString().split('T')[0] || '',
      missionNumber: '',
      type: '',
      squadron,
      theater,
      crew: [],
      packageMembers: [],
      supportAssets: theaterDatabase[theater]?.defaultSupportAssets || [],
      waypoints: [],
      bullseye: undefined,
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
        const defaultAirfield = theaterData?.defaultAirfield
        if (defaultAirfield) {
          return {
            departureAirportId: defaultAirfield,
            recoveryAirportId: defaultAirfield,
          }
        }
        return {}
      })(),
      told: {},
      fuel: {
        takeoff: airframeData.internalFuel,
        joker: airframeData.defaultJoker,
        bingo: airframeData.defaultBingo,
        fuelLoadPercentage: 100,
      },
      gunAmmoType: (() => {
        const squadronAmmo = squadronDatabase[squadron]?.defaultGunAmmo
        if (!squadronAmmo) return undefined

        // Check if theater is training to determine which ammo type to use
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
      const updatedMission = {
        ...missions.value[index],
        ...updates,
        id, // Preserve the original ID
        updatedAt: new Date().toISOString(),
      } as Mission
      missions.value[index] = updatedMission
      try {
        saveToStorage()
      } catch (error) {
        // Revert the change if save fails
        missions.value[index] = missions.value[index]
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
    const newId = `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
        ...(mission.details.imageIds || []),
        ...(mission.details.primaryTarget?.imageIds || []),
        ...(mission.details.secondaryTarget?.imageIds || []),
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

  // Initialize store by loading from localStorage
  loadFromStorage()

  return {
    // State
    missions,
    currentMissionId,

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
