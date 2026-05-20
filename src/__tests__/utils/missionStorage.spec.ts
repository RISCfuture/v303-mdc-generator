import { describe, it, expect } from 'vitest'
import { serializeMission, deserializeMission } from '@/utils/missionStorage'
import type { Mission } from '@/types'

describe('missionStorage', () => {
  const createTestMission = (): Mission => ({
    id: 'test-mission-1',
    name: 'Test SEAD Mission',
    callsign: 'VIPER',
    date: '2024-01-15',
    missionNumber: 'ATO-001',
    type: 'SEAD',
    squadron: 'v93',
    theater: 'Syria',
    crew: [
      {
        position: 'LEAD',
        pilot: 'John "Viper" Smith',
        callsign: 'VIPER',
        own: '1',
        stn: '12345',
        mode3: '1234',
        aaTcn: '5Y / 68Y',
        intraflight: '305.0',
        laser: '1688',
        tailNumber: '86-0267',
      },
    ],
    waypoints: [
      {
        sequence: 1,
        name: 'DAMASCUS',
        latitude: 33.5102,
        longitude: 36.2765,
        altitude: 25000,
        speed: 350,
      },
      {
        sequence: 2,
        name: 'CUSTOM WP',
        latitude: 34.1234,
        longitude: 37.5678,
        altitude: 20000,
      },
    ],
    loadout: [
      { station: 1, item: 'EMPTY' },
      { station: 2, item: 'AIM-9M' },
      { station: 3, item: 'AGM-88C' },
      { station: 4, item: 'EMPTY' },
      { station: 5, item: 'TANK-300-EXT' },
      { station: 6, item: 'EMPTY' },
      { station: 7, item: 'AGM-88C' },
      { station: 8, item: 'EMPTY' },
      { station: 9, item: 'EMPTY' },
      { station: 10, item: 'EMPTY' },
      { station: 11, item: 'EMPTY' },
      { station: 12, item: 'EMPTY' },
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
    radioPresets: [
      [
        { number: 1, frequency: '251.000', description: 'GHOST' },
        { number: 2, frequency: '264.000', description: 'MANILA' },
      ],
      [],
    ],
    flightCallsignOverride: '',
    link16PrefixOverride: '',
    departureRecovery: {
      departureProcedure: 'Unrestricted Climb',
      recoveryProcedure: 'TAC Recovery',
    },
    told: {},
    fuel: {
      takeoff: 12000,
      joker: 4500,
      bingo: 3000,
    },
    weather: '',
    details: {
      remarks: 'Test mission remarks',
      primaryTarget: {
        name: 'SAM Site',
        dmpi: 'Radar',
        latitude: 34.5,
        longitude: 37.2,
        elevation: 1500,
      },
    },
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T11:00:00.000Z',
  })

  describe('serializeMission', () => {
    it('should serialize a mission for storage', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      expect(serialized.id).toBe('test-mission-1')
      expect(serialized.n).toBe('Test SEAD Mission')
      expect(serialized.sq).toBe('v93')
      expect(serialized.th).toBe('Syria')
      expect(serialized.cr).toEqual(['John "Viper" Smith'])
    })

    it('should not store EMPTY loadout stations', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      // Only non-empty stations should be stored
      expect(serialized.ld).toHaveLength(4) // 1 AIM-9M, 2 AGM-88C, 1 tank = 4 total
      expect(serialized.ld).toContainEqual([2, 'AIM-9M'])
      expect(serialized.ld).toContainEqual([3, 'AGM-88C'])
      expect(serialized.ld).toContainEqual([5, 'TANK-300-EXT'])
      expect(serialized.ld).toContainEqual([7, 'AGM-88C'])
    })

    it('should store all fuel values since they are user-editable', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      expect(serialized.f.to).toBe(12000)
      expect(serialized.f.j).toBe(4500)
      expect(serialized.f.b).toBe(3000)
    })

    it('should store custom fuel values', () => {
      const mission = createTestMission()
      mission.fuel.joker = 5000
      mission.fuel.bingo = 3500
      const serialized = serializeMission(mission)

      expect(serialized.f.to).toBe(12000)
      expect(serialized.f.j).toBe(5000)
      expect(serialized.f.b).toBe(3500)
    })

    it('should omit default CMDS values', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      // Default CMDS should not be stored
      expect(serialized.cmds).toBeUndefined()
    })

    it('should store custom CMDS values', () => {
      const mission = createTestMission()
      mission.ecmCmds.chaffBingo = 15
      mission.ecmCmds.flareBingo = 20
      const serialized = serializeMission(mission)

      expect(serialized.cmds).toBeDefined()
      expect(serialized.cmds?.cb).toBe(15)
      expect(serialized.cmds?.fb).toBe(20)
    })

    it('should store all waypoint coordinates since they are user-editable', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      // All waypoints should have coordinates
      const damascusWp = serialized.wp.find((wp) => wp.name === 'DAMASCUS')
      expect(damascusWp).toBeDefined()
      expect(damascusWp?.lat).toBe(33.5102)
      expect(damascusWp?.lon).toBe(36.2765)

      const customWp = serialized.wp.find((wp) => wp.name === 'CUSTOM WP')
      expect(customWp).toBeDefined()
      expect(customWp?.lat).toBe(34.1234)
      expect(customWp?.lon).toBe(37.5678)
    })

    it('should omit empty weather value', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      expect(serialized.wx).toBeUndefined() // empty string is omitted
    })

    it('should include departure and recovery values (required by schema)', () => {
      const mission = createTestMission()
      const serialized = serializeMission(mission)

      // Schema requires these fields, values come from test mission
      expect(serialized.dr.depProc).toBe('Unrestricted Climb')
      expect(serialized.dr.recProc).toBe('TAC Recovery')
    })
  })

  describe('deserializeMission', () => {
    it('should deserialize a mission from storage back to full format', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.id).toBe(original.id)
      expect(deserialized.name).toBe(original.name)
      expect(deserialized.squadron).toBe(original.squadron)
      expect(deserialized.theater).toBe(original.theater)
    })

    it('should reconstruct crew from pilot names', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.crew).toHaveLength(1)
      expect(deserialized.crew[0]?.pilot).toBe('John "Viper" Smith')
      expect(deserialized.crew[0]?.position).toBe('LEAD')
    })

    it('should reconstruct loadout with EMPTY stations', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      // Should have all 12 stations for F-16C (1-12)
      expect(deserialized.loadout).toHaveLength(12)
      expect(deserialized.loadout[0]?.item).toBe('EMPTY')
      expect(deserialized.loadout[1]?.item).toBe('AIM-9M')
      expect(deserialized.loadout[4]?.item).toBe('TANK-300-EXT')
    })

    it('should restore fuel values', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.fuel.takeoff).toBe(12000)
      expect(deserialized.fuel.joker).toBe(4500)
      expect(deserialized.fuel.bingo).toBe(3000)
    })

    it('should restore default CMDS values', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.ecmCmds.chaffBingo).toBe(10)
      expect(deserialized.ecmCmds.flareBingo).toBe(10)
      expect(deserialized.ecmCmds.cmdsPrograms).toHaveLength(1)
    })

    it('should restore empty weather', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.weather).toBe('')
    })

    it('should restore departure and recovery procedures', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.departureRecovery.departureProcedure).toBe('Unrestricted Climb')
      expect(deserialized.departureRecovery.recoveryProcedure).toBe('TAC Recovery')
    })

    it('should preserve mission details', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      expect(deserialized.details.remarks).toBe('Test mission remarks')
      // Note: 'threats' field was removed from MissionDetails interface
      expect(deserialized.details.primaryTarget?.name).toBe('SAM Site')
      expect(deserialized.details.primaryTarget?.latitude).toBe(34.5)
    })
  })

  describe('round-trip serialization', () => {
    it('should preserve all data through serialize/deserialize cycle', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      const deserialized = deserializeMission(serialized)

      // Key fields should match
      expect(deserialized.id).toBe(original.id)
      expect(deserialized.name).toBe(original.name)
      expect(deserialized.type).toBe(original.type)
      expect(deserialized.crew.length).toBe(original.crew.length)
      expect(deserialized.waypoints.length).toBe(original.waypoints.length)
      expect(deserialized.loadout.length).toBe(original.loadout.length)
    })

    it('should preserve custom bingoCalculatorParams across serialize/deserialize', () => {
      const original = createTestMission()
      original.fuel.bingoCalculatorParams = {
        aarExpected: true,
        approachType: 'IFR',
        altitudeProfile: 'low',
      }

      const serialized = serializeMission(original)
      expect(serialized.f.bcp).toEqual({
        aarExpected: true,
        approachType: 'IFR',
        altitudeProfile: 'low',
      })

      const deserialized = deserializeMission(serialized)
      expect(deserialized.fuel.bingoCalculatorParams).toEqual(original.fuel.bingoCalculatorParams)
    })

    it('should leave bingoCalculatorParams undefined when not set', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)
      expect(serialized.f.bcp).toBeUndefined()

      const deserialized = deserializeMission(serialized)
      expect(deserialized.fuel.bingoCalculatorParams).toBeUndefined()
    })

    it('should significantly reduce storage size', () => {
      const original = createTestMission()
      const serialized = serializeMission(original)

      const originalSize = JSON.stringify(original).length
      const serializedSize = JSON.stringify(serialized).length

      // Serialized should be smaller
      expect(serializedSize).toBeLessThan(originalSize)

      // Log storage reduction for visibility
      const ratio = ((1 - serializedSize / originalSize) * 100).toFixed(1)
      console.log(
        `Storage reduction: ${serializedSize} bytes (${ratio}% smaller than ${originalSize} bytes)`,
      )
    })
  })

  describe('aircraft-capability fields (airframe-scoped, optional)', () => {
    it('omits new fields from storage when unset', () => {
      const serialized = serializeMission(createTestMission())
      expect(serialized.wpr).toBeUndefined()
      expect(serialized.mt).toBeUndefined()
      expect(serialized.dz).toBeUndefined()
      expect(serialized.co).toBeUndefined()
    })

    it('legacy missions (no new fields) deserialize with them undefined', () => {
      const deserialized = deserializeMission(serializeMission(createTestMission()))
      expect(deserialized.weaponProfiles).toBeUndefined()
      expect(deserialized.missionTiming).toBeUndefined()
      expect(deserialized.dropZone).toBeUndefined()
      expect(deserialized.crew[0]?.copilot).toBeUndefined()
    })

    it('round-trips weapon profiles, mission timing and drop zone', () => {
      const original = createTestMission()
      original.weaponProfiles = [
        {
          label: 'PROFILE 1',
          weapon: 'GBU-12',
          releaseType: 'CCIP',
          spacing: 175,
          releaseAngle: 45,
        },
      ]
      original.missionTiming = { step: '1200', taxi: '1210', takeoff: '1220', vulTot: '1300' }
      original.dropZone = { dzName: 'DZ ALPHA', runInCourse: 270, loadType: 'CDS', chuteCount: 4 }

      const result = deserializeMission(serializeMission(original))
      expect(result.weaponProfiles).toEqual(original.weaponProfiles)
      expect(result.missionTiming).toEqual(original.missionTiming)
      expect(result.dropZone).toEqual(original.dropZone)
    })

    it('round-trips copilot data index-aligned with crew', () => {
      const original = createTestMission()
      original.crew = [{ ...original.crew[0], copilot: 'Jane "Apex" Doe', copilotCallsign: 'APEX' }]
      const result = deserializeMission(serializeMission(original))
      expect(result.crew[0]?.copilot).toBe('Jane "Apex" Doe')
      expect(result.crew[0]?.copilotCallsign).toBe('APEX')
    })

    it('round-trips extended support-asset fields', () => {
      const original = createTestMission()
      original.supportAssets = [
        {
          callsign: 'SHELL',
          role: 'TANKER',
          frequency: '305.5',
          preset: 12,
          aaTacan: '5Y',
          location: 'TRACK A',
          altitude: 22000,
          uhf: '251.0',
          notes: 'AR window 1300-1330',
          assetKind: 'TANKER',
        },
      ]
      const result = deserializeMission(serializeMission(original))
      expect(result.supportAssets[0]).toEqual(original.supportAssets[0])
    })
  })
})
