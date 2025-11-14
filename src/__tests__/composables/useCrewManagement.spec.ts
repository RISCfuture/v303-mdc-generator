import { describe, it, expect, beforeEach } from 'vitest'
import { computed } from 'vue'
import { useCrewManagement } from '@/composables/useCrewManagement'
import { useMissionsStore } from '@/stores/missions'
import type { Mission } from '@/types'
import { setupTestEnvironment } from '@/__tests__/helpers'

// Mock crew database
const mockCrewDatabase = [
  {
    pilot: 'Pilot A',
    callsign: ['ALPHA'],
    link16Prefix: 'AL',
    stn: 3600,
    mode3: 0o1301, // 577 in decimal
    aaTacan: 5,
    freq: '251.000',
    laserCode: 0o1677,
    tailNumber: '86-0267',
  },
  {
    pilot: 'Pilot B',
    callsign: ['BRAVO'],
    link16Prefix: 'BR',
    stn: 3610,
    mode3: 0o1401, // 641 in decimal
    aaTacan: 6,
    freq: '252.000',
    laserCode: 0o1666,
    tailNumber: '86-0268',
  },
  {
    pilot: 'Pilot C',
    callsign: ['CHARLIE'],
    link16Prefix: 'CH',
    stn: 3620,
    mode3: 0o1501, // 705 in decimal
    aaTacan: 7,
    freq: '253.000',
    laserCode: 0o1655,
    tailNumber: '86-0269',
  },
  {
    pilot: 'Pilot D',
    callsign: ['DELTA'],
    link16Prefix: 'DE',
    stn: 3630,
    mode3: 0o1601, // 769 in decimal
    aaTacan: 8,
    freq: '254.000',
    laserCode: 0o1644,
    tailNumber: '86-0270',
  },
]

describe('useCrewManagement', () => {
  setupTestEnvironment({ pinia: true })

  let missionsStore: ReturnType<typeof useMissionsStore>
  let missionId: string

  beforeEach(() => {
    missionsStore = useMissionsStore()
    missionId = 'test-mission'

    // Create a minimal test mission
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

  describe('Mode-3 Assignment', () => {
    it('should assign lead their own mode-3 code from database', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember } = useCrewManagement(missionIdRef, crew, availableCrew, airframe)

      // Add first pilot as lead
      addCrewMember('Pilot A')

      const updatedMission = missionsStore.getMission(missionId)
      expect(updatedMission?.crew[0].mode3).toBe('1301') // 0o1301 formatted as octal
    })

    it('should assign wingmen incremented mode-3 codes based on lead', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember } = useCrewManagement(missionIdRef, crew, availableCrew, airframe)

      // Add 4-ship flight
      addCrewMember('Pilot A') // Lead: 1301
      addCrewMember('Pilot B') // -2: 1302 (lead + 1)
      addCrewMember('Pilot C') // -3: 1303 (lead + 2)
      addCrewMember('Pilot D') // -4: 1304 (lead + 3)

      const updatedMission = missionsStore.getMission(missionId)
      expect(updatedMission?.crew[0].mode3).toBe('1301')
      expect(updatedMission?.crew[1].mode3).toBe('1302')
      expect(updatedMission?.crew[2].mode3).toBe('1303')
      expect(updatedMission?.crew[3].mode3).toBe('1304')
    })

    it('should handle octal boundaries correctly when incrementing mode-3', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])

      // Create pilot with mode-3 near octal boundary (1307)
      const pilotNearBoundary = {
        pilot: 'Boundary Pilot',
        callsign: ['EDGE'],
        link16Prefix: 'ED',
        stn: 3700,
        mode3: 0o1307, // 583 in decimal
        aaTacan: 9,
        freq: '255.000',
        laserCode: 0o1633,
        tailNumber: '86-0271',
      }

      const availableCrew = computed(() => [pilotNearBoundary, ...mockCrewDatabase])
      const airframe = computed(() => mission.value?.airframe || 'F-16C')
      const { addCrewMember } = useCrewManagement(missionIdRef, crew, availableCrew, airframe)

      // Add lead with mode-3 1307
      addCrewMember('Boundary Pilot') // Lead: 1307
      addCrewMember('Pilot A') // -2: should be 1310 (skips 1308, 1309)
      addCrewMember('Pilot B') // -3: should be 1311
      addCrewMember('Pilot C') // -4: should be 1312

      const updatedMission = missionsStore.getMission(missionId)
      expect(updatedMission?.crew[0].mode3).toBe('1307')
      expect(updatedMission?.crew[1].mode3).toBe('1310') // Skips invalid 1308, 1309
      expect(updatedMission?.crew[2].mode3).toBe('1311')
      expect(updatedMission?.crew[3].mode3).toBe('1312')
    })
  })

  describe('Reordering and Mode-3 Recalculation', () => {
    it('should recalculate mode-3 codes when moving crew members up', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember, moveCrewMemberUp } = useCrewManagement(
        missionIdRef,
        crew,
        availableCrew,
        airframe,
      )

      // Build 4-ship with Pilot A as lead
      addCrewMember('Pilot A') // Lead: 1301
      addCrewMember('Pilot B') // -2: 1302
      addCrewMember('Pilot C') // -3: 1303
      addCrewMember('Pilot D') // -4: 1304

      // Move Pilot B (index 1) to lead position (index 0)
      moveCrewMemberUp(1)

      const updatedMission = missionsStore.getMission(missionId)
      // Pilot B is now lead, so uses their original mode3: 1401
      expect(updatedMission?.crew[0].pilot).toBe('Pilot B')
      expect(updatedMission?.crew[0].mode3).toBe('1401')
      // Pilot A is now -2, gets lead's mode3 + 1
      expect(updatedMission?.crew[1].pilot).toBe('Pilot A')
      expect(updatedMission?.crew[1].mode3).toBe('1402')
      // Others are recalculated based on new lead
      expect(updatedMission?.crew[2].mode3).toBe('1403')
      expect(updatedMission?.crew[3].mode3).toBe('1404')
    })

    it('should recalculate mode-3 codes when moving crew members down', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember, moveCrewMemberDown } = useCrewManagement(
        missionIdRef,
        crew,
        availableCrew,
        airframe,
      )

      // Build 4-ship with Pilot A as lead
      addCrewMember('Pilot A') // Lead: 1301
      addCrewMember('Pilot B') // -2: 1302
      addCrewMember('Pilot C') // -3: 1303
      addCrewMember('Pilot D') // -4: 1304

      // Move lead (Pilot A) down to position 1
      moveCrewMemberDown(0)

      const updatedMission = missionsStore.getMission(missionId)
      // Pilot B is now lead
      expect(updatedMission?.crew[0].pilot).toBe('Pilot B')
      expect(updatedMission?.crew[0].mode3).toBe('1401')
      // Pilot A is now -2
      expect(updatedMission?.crew[1].pilot).toBe('Pilot A')
      expect(updatedMission?.crew[1].mode3).toBe('1402')
    })

    it('should recalculate mode-3 codes when removing a crew member', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember, removeCrewMember } = useCrewManagement(
        missionIdRef,
        crew,
        availableCrew,
        airframe,
      )

      // Build 4-ship
      addCrewMember('Pilot A') // Lead: 1301
      addCrewMember('Pilot B') // -2: 1302
      addCrewMember('Pilot C') // -3: 1303
      addCrewMember('Pilot D') // -4: 1304

      // Remove -2 (index 1)
      removeCrewMember(1)

      const updatedMission = missionsStore.getMission(missionId)
      // Lead stays the same
      expect(updatedMission?.crew[0].pilot).toBe('Pilot A')
      expect(updatedMission?.crew[0].mode3).toBe('1301')
      // Pilot C is now -2 (previously -3)
      expect(updatedMission?.crew[1].pilot).toBe('Pilot C')
      expect(updatedMission?.crew[1].mode3).toBe('1302')
      // Pilot D is now -3 (previously -4)
      expect(updatedMission?.crew[2].pilot).toBe('Pilot D')
      expect(updatedMission?.crew[2].mode3).toBe('1303')
    })

    it('should recalculate mode-3 codes when removing lead', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember, removeCrewMember } = useCrewManagement(
        missionIdRef,
        crew,
        availableCrew,
        airframe,
      )

      // Build 3-ship
      addCrewMember('Pilot A') // Lead: 1301
      addCrewMember('Pilot B') // -2: 1302
      addCrewMember('Pilot C') // -3: 1303

      // Remove lead
      removeCrewMember(0)

      const updatedMission = missionsStore.getMission(missionId)
      // Pilot B becomes new lead with their original mode3
      expect(updatedMission?.crew[0].pilot).toBe('Pilot B')
      expect(updatedMission?.crew[0].mode3).toBe('1401')
      // Pilot C is now -2 with lead's mode3 + 1
      expect(updatedMission?.crew[1].pilot).toBe('Pilot C')
      expect(updatedMission?.crew[1].mode3).toBe('1402')
    })
  })

  describe('Position and Own Number Updates', () => {
    it('should correctly assign positions and own numbers when adding crew', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember } = useCrewManagement(missionIdRef, crew, availableCrew, airframe)

      addCrewMember('Pilot A')
      addCrewMember('Pilot B')
      addCrewMember('Pilot C')
      addCrewMember('Pilot D')

      const updatedMission = missionsStore.getMission(missionId)
      expect(updatedMission?.crew[0].position).toBe('LEAD')
      expect(updatedMission?.crew[0].own).toBe('1')
      expect(updatedMission?.crew[1].position).toBe('WING')
      expect(updatedMission?.crew[1].own).toBe('2')
      expect(updatedMission?.crew[2].position).toBe('ELEMENT LEAD')
      expect(updatedMission?.crew[2].own).toBe('3')
      expect(updatedMission?.crew[3].position).toBe('ELEMENT WING')
      expect(updatedMission?.crew[3].own).toBe('4')
    })

    it('should update positions and own numbers after reordering', () => {
      const missionIdRef = computed(() => missionId)
      const mission = computed(() => missionsStore.getMission(missionId))
      const crew = computed(() => mission.value?.crew || [])
      const availableCrew = computed(() => mockCrewDatabase)
      const airframe = computed(() => mission.value?.airframe || 'F-16C')

      const { addCrewMember, moveCrewMemberUp } = useCrewManagement(
        missionIdRef,
        crew,
        availableCrew,
        airframe,
      )

      addCrewMember('Pilot A')
      addCrewMember('Pilot B')

      // Move -2 to lead
      moveCrewMemberUp(1)

      const updatedMission = missionsStore.getMission(missionId)
      expect(updatedMission?.crew[0].pilot).toBe('Pilot B')
      expect(updatedMission?.crew[0].position).toBe('LEAD')
      expect(updatedMission?.crew[0].own).toBe('1')
      expect(updatedMission?.crew[1].pilot).toBe('Pilot A')
      expect(updatedMission?.crew[1].position).toBe('WING')
      expect(updatedMission?.crew[1].own).toBe('2')
    })
  })
})
