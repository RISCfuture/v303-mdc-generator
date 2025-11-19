import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useMissionValidation } from '@/composables/useMissionValidation'
import type { Mission } from '@/types'

describe('useMissionValidation', () => {
  const createValidMission = (): Mission => ({
    id: 'test-1',
    name: 'Test Mission',
    callsign: 'VIPER',
    date: '2024-01-15',
    missionNumber: 'ATO-001',
    type: 'SEAD',
    squadron: 'v93',
    theater: 'Syria',
    crew: [
      {
        position: 'LEAD',
        pilot: 'Test Pilot',
        callsign: 'VR',
        own: '1',
        stn: '111',
        mode3: '1234',
        aaTcn: '1Y / 64Y',
        intraflight: '251.000',
        laser: '1111',
      },
    ],
    packageMembers: [],
    supportAssets: [],
    waypoints: [
      {
        sequence: 1,
        name: 'WP1',
        latitude: 33.5,
        longitude: 36.2,
        altitude: 25000,
      },
    ],
    loadout: [
      { station: 1, item: 'EMPTY' },
      { station: 2, item: 'AIM-9M' },
      { station: 3, item: 'EMPTY' },
      { station: 4, item: 'EMPTY' },
      { station: 5, item: 'EMPTY' },
      { station: 6, item: 'EMPTY' },
      { station: 7, item: 'EMPTY' },
      { station: 8, item: 'EMPTY' },
      { station: 9, item: 'EMPTY' },
    ],
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
    },
    radioPresets: [[], []],
    flightCallsignOverride: '',
    link16PrefixOverride: 'VR',
    departureRecovery: {
      departureProcedure: 'Unrestricted Climb',
      departureAirportId: 'KNTD',
      departureRunwayName: '18',
      recoveryProcedure: 'TAC Recovery',
      recoveryAirportId: 'KNTD',
      recoveryRunwayName: '36',
    },
    told: {
      rotation: 150,
      refusal: 140,
    },
    fuel: {
      takeoff: 12000,
      joker: 4500,
      bingo: 3000,
    },
    weather: '',
    details: {
      remarks: 'Test mission remarks',
    },
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T11:00:00.000Z',
  })

  describe('blank waypoints', () => {
    it('should consider mission complete with blank waypoint', () => {
      const mission = createValidMission()
      mission.waypoints.push({
        sequence: 2,
        name: 'BLANK',
        latitude: null,
        longitude: null,
        altitude: null,
        speed: null,
      })
      const missionRef = ref(mission)
      const { isComplete } = useMissionValidation(missionRef)

      expect(isComplete.value).toBe(true)
    })

    it('should consider mission complete with multiple blank waypoints', () => {
      const mission = createValidMission()
      mission.waypoints.push(
        {
          sequence: 2,
          name: 'BLANK1',
          latitude: null,
          longitude: null,
          altitude: null,
          speed: null,
        },
        {
          sequence: 3,
          name: 'BLANK2',
          latitude: null,
          longitude: null,
          altitude: null,
          speed: null,
        },
      )
      const missionRef = ref(mission)
      const { isComplete } = useMissionValidation(missionRef)

      expect(isComplete.value).toBe(true)
    })

    it('should not consider blank waypoint field as incomplete', () => {
      const blankWaypoint = {
        name: 'BLANK',
        latitude: null,
        longitude: null,
        altitude: null,
        speed: null,
      }
      const mission = createValidMission()
      const missionRef = ref(mission)
      const { isWaypointFieldIncomplete } = useMissionValidation(missionRef)

      expect(isWaypointFieldIncomplete(blankWaypoint, 'latitude')).toBe(false)
      expect(isWaypointFieldIncomplete(blankWaypoint, 'longitude')).toBe(false)
      expect(isWaypointFieldIncomplete(blankWaypoint, 'altitude')).toBe(false)
    })

    it('should reject mission with partially filled waypoint', () => {
      const mission = createValidMission()
      mission.waypoints.push({
        sequence: 2,
        name: 'PARTIAL',
        latitude: 33.5, // Only latitude filled
        longitude: null,
        altitude: null,
        speed: null,
      })
      const missionRef = ref(mission)
      const { isComplete } = useMissionValidation(missionRef)

      expect(isComplete.value).toBe(false)
    })

    it('should detect partially filled waypoint field as incomplete', () => {
      const partialWaypoint = {
        name: 'PARTIAL',
        latitude: 33.5, // Has latitude
        longitude: null, // Missing longitude
        altitude: null, // Missing altitude
        speed: null,
      }
      const mission = createValidMission()
      const missionRef = ref(mission)
      const { isWaypointFieldIncomplete } = useMissionValidation(missionRef)

      expect(isWaypointFieldIncomplete(partialWaypoint, 'latitude')).toBe(false) // Has value
      expect(isWaypointFieldIncomplete(partialWaypoint, 'longitude')).toBe(true) // Missing
      expect(isWaypointFieldIncomplete(partialWaypoint, 'altitude')).toBe(true) // Missing
    })

    it('should validate mission with mix of blank and complete waypoints', () => {
      const mission = createValidMission()
      mission.waypoints.push(
        {
          sequence: 2,
          name: 'BLANK',
          latitude: null,
          longitude: null,
          altitude: null,
          speed: null,
        },
        {
          sequence: 3,
          name: 'WP3',
          latitude: 34.5,
          longitude: 37.2,
          altitude: 30000,
          speed: 350,
        },
      )
      const missionRef = ref(mission)
      const { isComplete } = useMissionValidation(missionRef)

      expect(isComplete.value).toBe(true)
    })
  })
})
