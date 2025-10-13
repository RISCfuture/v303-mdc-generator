import { describe, it, expect, beforeEach } from 'vitest'
import { computed } from 'vue'
import { useMissionData } from '@/composables/useMissionData'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment } from '@/__tests__/helpers'

describe('useMissionData', () => {
  setupTestEnvironment({ pinia: true })

  let missionsStore: ReturnType<typeof useMissionsStore>
  let missionId: string

  beforeEach(() => {
    missionsStore = useMissionsStore()

    // Create a test mission using the store's createMission method
    const mission = missionsStore.createMission('v93', 'nevada')
    missionId = mission.id
  })

  describe('availableCrewForDropdown', () => {
    it('should return crew sorted by pilot name', () => {
      const missionIdRef = computed(() => missionId)
      const { availableCrewForDropdown } = useMissionData(missionIdRef)

      const crew = availableCrewForDropdown.value

      // Verify crew is sorted alphabetically by pilot name
      for (let i = 0; i < crew.length - 1; i++) {
        expect(crew[i].pilot.localeCompare(crew[i + 1].pilot)).toBeLessThanOrEqual(0)
      }
    })

    it('should filter out crew members already in the flight and maintain sort order', () => {
      const missionIdRef = computed(() => missionId)
      const mission = missionsStore.getMission(missionId)

      // Add a crew member to the mission (this should filter them out)
      mission.crew.push({
        position: 'Lead',
        pilot: 'Wing',
        callsign: ['FALCON', 'VIPER1'],
        link16Prefix: 'FN',
        stn: 3600,
        mode3: 577,
        aaTacan: 10,
        freq: '251.000',
        laserCode: 1688,
        tailNumber: '86-0267',
      })

      const { availableCrewForDropdown } = useMissionData(missionIdRef)
      const crew = availableCrewForDropdown.value

      // Verify "Wing" is not in the available crew
      expect(crew.find((c) => c.pilot === 'Wing')).toBeUndefined()

      // Verify remaining crew is still sorted alphabetically
      for (let i = 0; i < crew.length - 1; i++) {
        expect(crew[i].pilot.localeCompare(crew[i + 1].pilot)).toBeLessThanOrEqual(0)
      }
    })

    it('should return all available crew when mission has no crew members', () => {
      const missionIdRef = computed(() => missionId)
      const { availableCrewForDropdown } = useMissionData(missionIdRef)

      const crew = availableCrewForDropdown.value

      // When no crew members are added, dropdown should show all available crew (sorted)
      expect(crew.length).toBeGreaterThan(0)

      // Should be sorted
      for (let i = 0; i < crew.length - 1; i++) {
        expect(crew[i].pilot.localeCompare(crew[i + 1].pilot)).toBeLessThanOrEqual(0)
      }
    })

    it('should handle sorting with multiple crew members', () => {
      const missionIdRef = computed(() => missionId)
      const { availableCrewForDropdown } = useMissionData(missionIdRef)

      const crew = availableCrewForDropdown.value

      // Should have multiple crew members for testing sort order
      expect(crew.length).toBeGreaterThan(1)

      // Verify sorting is working correctly by checking specific pairs
      for (let i = 0; i < crew.length - 1; i++) {
        const currentPilot = crew[i].pilot
        const nextPilot = crew[i + 1].pilot
        const comparison = currentPilot.localeCompare(nextPilot)

        expect(comparison).toBeLessThanOrEqual(0)
      }
    })
  })
})
