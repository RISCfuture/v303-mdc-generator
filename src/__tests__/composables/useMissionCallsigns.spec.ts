import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, nextTick } from 'vue'
import { useMissionCallsigns } from '@/composables/useMissionCallsigns'
import { useMissionsStore } from '@/stores/missions'
import type { Mission, CrewMember } from '@/types'
import { setupTestEnvironment } from '@/__tests__/helpers'

// Mock the crew database
vi.mock('@/data/crew', () => ({
  crewDatabase: [
    {
      pilot: 'John Doe',
      callsign: ['VIPER', 'SNAKE'],
      link16Prefix: 'VR',
      stn: 12345,
      mode3: 1234,
      aaTacan: 5,
      freq: '251.000',
      laserCode: 1688,
      tailNumber: '86-0267',
    },
    {
      pilot: 'Jane Smith',
      callsign: ['FALCON', 'HAWK'],
      link16Prefix: 'FN',
      stn: 23456,
      mode3: 2345,
      aaTacan: 6,
      freq: '252.000',
      laserCode: 1677,
      tailNumber: '86-0268',
    },
  ],
}))

describe('useMissionCallsigns', () => {
  setupTestEnvironment({ pinia: true })

  let missionsStore: ReturnType<typeof useMissionsStore>
  let missionId: string

  beforeEach(() => {
    missionsStore = useMissionsStore()
    missionId = 'test-mission'

    // Create a test mission
    const testMission: Mission = {
      id: missionId,
      name: 'Test Mission',
      airframe: 'F-16C',
      theater: 'nevada',
      squadron: 'v93fs',
      date: '2024-01-15',
      missionNumber: '001',
      type: 'CAP',
      crew: [],
      flightCallsignOverride: '',
      link16PrefixOverride: '',
      waypoints: [],
      radioPresets: [[], []],
      loadout: [],
      details: {
        bullseye: { latitude: 0, longitude: 0 },
        primaryTarget: { name: '', latitude: 0, longitude: 0 },
        secondaryTarget: { name: '', latitude: 0, longitude: 0 },
        departureProcedure: '',
        altimeterSetting: '',
        weatherBrief: '',
        specialInstructions: '',
        notes: '',
      },
      cmds: { chaff: 30, flare: 30, jmr: 0, jmrSetting: 0 },
      told: {
        takeoffGrossWeight: 0,
        fuelOnBoard: 0,
        takeoffDistance: 0,
        minAbSpeed: 0,
        maxAbSpeed: 0,
      },
      fuel: {
        bingo: 0,
        joker: 0,
        airRefuelingTacan: '',
        arFrequency: '',
      },
    }

    missionsStore.missions.push(testMission)
  })

  it('should auto-update flight callsign and Link16 prefix when first crew member is added', async () => {
    const missionIdRef = computed(() => missionId)
    const mission = computed(() => missionsStore.getMission(missionId))

    // Set up the composable
    useMissionCallsigns(missionIdRef, mission)

    // Add first crew member
    const crewMember: CrewMember = {
      position: 'Lead',
      pilot: 'John Doe',
      callsign: 'VR',
      own: '1',
      stn: '12345',
      mode3: '1234',
      aaTcn: '5Y / 68Y',
      intraflight: '251.000',
      laser: '1688',
      tailNumber: '86-0267',
    }

    missionsStore.updateMission(missionId, { crew: [crewMember] })
    await nextTick()

    const updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.flightCallsignOverride).toBe('VIPER')
    expect(updatedMission?.link16PrefixOverride).toBe('VR') // First and last letter of VIPER
  })

  it('should auto-update flight callsign and Link16 prefix when lead changes', async () => {
    const missionIdRef = computed(() => missionId)
    const mission = computed(() => missionsStore.getMission(missionId))

    // Set up the composable
    useMissionCallsigns(missionIdRef, mission)

    // Add first crew member (John Doe as lead)
    const crewMember1: CrewMember = {
      position: 'Lead',
      pilot: 'John Doe',
      callsign: 'VR',
      own: '1',
      stn: '12345',
      mode3: '1234',
      aaTcn: '5Y / 68Y',
      intraflight: '251.000',
      laser: '1688',
      tailNumber: '86-0267',
    }

    missionsStore.updateMission(missionId, { crew: [crewMember1] })
    await nextTick()

    // Verify initial callsign
    let updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.flightCallsignOverride).toBe('VIPER')
    expect(updatedMission?.link16PrefixOverride).toBe('VR')

    // Add second crew member
    const crewMember2: CrewMember = {
      position: '2',
      pilot: 'Jane Smith',
      callsign: 'FN',
      own: '2',
      stn: '23456',
      mode3: '2345',
      aaTcn: '6Y / 69Y',
      intraflight: '252.000',
      laser: '1677',
      tailNumber: '86-0268',
    }

    // Swap crew order (Jane becomes lead)
    missionsStore.updateMission(missionId, { crew: [crewMember2, crewMember1] })
    await nextTick()

    // Verify callsign updated to Jane's
    updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.flightCallsignOverride).toBe('FALCON')
    expect(updatedMission?.link16PrefixOverride).toBe('FN') // First and last letter of FALCON
  })

  it('should generate Link16 prefix from callsign correctly', async () => {
    const missionIdRef = computed(() => missionId)
    const mission = computed(() => missionsStore.getMission(missionId))

    const { updateFlightCallsign } = useMissionCallsigns(missionIdRef, mission)

    // Test various callsign patterns
    updateFlightCallsign('VIPER')
    await nextTick()
    let updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.link16PrefixOverride).toBe('VR')

    updateFlightCallsign('SNAKE')
    await nextTick()
    updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.link16PrefixOverride).toBe('SE')

    updateFlightCallsign('ACE')
    await nextTick()
    updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.link16PrefixOverride).toBe('AE')

    // Test single letter
    updateFlightCallsign('X')
    await nextTick()
    updatedMission = missionsStore.getMission(missionId)
    expect(updatedMission?.link16PrefixOverride).toBe('XX')
  })
})
