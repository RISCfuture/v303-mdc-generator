import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateMissionStorage } from '@/utils/validateMissionStorage'
import { serializeMission } from '@/utils/missionStorage'
import type { Mission } from '@/types'

describe('validateMissionStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

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

  describe('validateMissionStorage', () => {
    it('should validate correct mission storage format', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      if (!result.valid) {
        console.log('Validation errors:', JSON.stringify(result.errors, null, 2))
      }

      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject storage with wrong version', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      const storageData = {
        version: 1, // Wrong version
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject storage without required fields', () => {
      const storageData = {
        version: 2,
        // Missing missions array
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.some((e) => e.message.includes('required'))).toBe(true)
    })

    it('should accept mission with any squadron string (dynamic squadrons)', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      serialized.sq = 'test-squadron' // Squadrons are dynamic, schema doesn't restrict

      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      // Schema doesn't enforce specific squadron values since they're dynamic
      expect(result.valid).toBe(true)
    })

    it('should accept mission with any theater string (dynamic theaters)', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      serialized.th = 'Antarctica' // Theaters are dynamic, schema doesn't restrict

      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      // Schema doesn't enforce specific theater values since they're dynamic
      expect(result.valid).toBe(true)
    })

    it('should reject waypoint with invalid latitude', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      serialized.wp[0]!.lat = 100 // Invalid latitude (> 90)

      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should reject waypoint with invalid longitude', () => {
      const mission = createValidMission()
      const serialized = serializeMission(mission)
      serialized.wp[0]!.lon = 200 // Invalid longitude (> 180)

      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should validate mission with all optional fields', () => {
      const mission = createValidMission()
      mission.bullseye = {
        latitude: 33.0,
        longitude: 36.0,
        waypointNumber: 1,
        description: 'BULLSEYE',
      }
      mission.details = {
        remarks: 'Test remarks',
        primaryTarget: {
          name: 'Target 1',
          dmpi: 'DMPI 1',
          latitude: 33.5,
          longitude: 36.2,
          elevation: 1500,
        },
      }

      const serialized = serializeMission(mission)
      const storageData = {
        version: 2,
        missions: [serialized],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(true)
    })

    it('should validate empty missions array', () => {
      const storageData = {
        version: 2,
        missions: [],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(true)
    })

    it('should validate multiple missions', () => {
      const mission1 = createValidMission()
      const mission2 = createValidMission()
      mission2.id = 'test-2'
      mission2.name = 'Test Mission 2'

      const serialized1 = serializeMission(mission1)
      const serialized2 = serializeMission(mission2)

      const storageData = {
        version: 2,
        missions: [serialized1, serialized2],
      }

      const result = validateMissionStorage(storageData)

      expect(result.valid).toBe(true)
    })

    describe('completeness validation (required fields for export)', () => {
      it('should reject mission without mission type', () => {
        const mission = createValidMission()
        mission.type = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors).toBeDefined()
      })

      it('should reject mission without crew', () => {
        const mission = createValidMission()
        mission.crew = []
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/cr'))).toBe(true)
      })

      it('should reject mission without callsign', () => {
        const mission = createValidMission()
        mission.callsign = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/cs'))).toBe(true)
      })

      it('should reject mission without link16 prefix', () => {
        const mission = createValidMission()
        mission.link16PrefixOverride = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/l16'))).toBe(true)
      })

      it('should reject mission without waypoints', () => {
        const mission = createValidMission()
        mission.waypoints = []
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/wp'))).toBe(true)
      })

      it('should allow waypoint with empty name', () => {
        const mission = createValidMission()
        mission.waypoints[0]!.name = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(true)
      })

      it('should allow waypoint with null altitude (valid for storage, but not complete for export)', () => {
        const mission = createValidMission()
        mission.waypoints[0]!.altitude = null
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Schema validation should pass (null is allowed for storage)
        // The composable will check for completeness (non-null required for export)
        expect(result.valid).toBe(true)
      })

      it('should allow blank waypoint (all fields null)', () => {
        const mission = createValidMission()
        mission.waypoints.push({
          sequence: 2,
          name: 'BLANK',
          latitude: null,
          longitude: null,
          altitude: null,
          speed: null,
        })
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Blank waypoints (all fields null) should pass schema validation
        expect(result.valid).toBe(true)
      })

      it('should allow multiple blank waypoints in sequence', () => {
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
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Multiple blank waypoints should be valid
        expect(result.valid).toBe(true)
      })

      it('should allow mission without loadout items (all EMPTY is valid)', () => {
        const mission = createValidMission()
        mission.loadout = mission.loadout.map((s) => ({ ...s, item: 'EMPTY' }))
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Schema allows empty loadout array (minItems: 0)
        // Serialization filters out EMPTY items, resulting in empty array
        expect(result.valid).toBe(true)
        expect(serialized.ld).toHaveLength(0)
      })

      it('should reject mission without rotation speed', () => {
        const mission = createValidMission()
        mission.told.rotation = undefined
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/tld'))).toBe(true)
      })

      it('should reject mission without refusal speed', () => {
        const mission = createValidMission()
        mission.told.refusal = undefined
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/tld'))).toBe(true)
      })

      it('should allow empty departure procedure', () => {
        const mission = createValidMission()
        mission.departureRecovery.departureProcedure = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Empty string is now allowed (no defaults)
        expect(result.valid).toBe(true)
        expect(serialized.dr.depProc).toBe('')
      })

      it('should allow empty recovery procedure', () => {
        const mission = createValidMission()
        mission.departureRecovery.recoveryProcedure = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        // Empty string is now allowed (no defaults)
        expect(result.valid).toBe(true)
        expect(serialized.dr.recProc).toBe('')
      })

      it('should reject mission without remarks', () => {
        const mission = createValidMission()
        mission.details.remarks = ''
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
        expect(result.errors?.some((e) => e.path.includes('/det'))).toBe(true)
      })

      it('should validate radio presets with valid frequency format', () => {
        const mission = createValidMission()
        mission.radioPresets = [
          [
            { number: 1, frequency: '251.000', description: 'Test' },
            { number: 2, frequency: '305.500', description: 'Tower' },
          ],
          [],
        ]
        const serialized = serializeMission(mission)

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(true)
      })

      it('should reject radio preset with invalid frequency format', () => {
        const mission = createValidMission()
        mission.radioPresets = [
          [
            { number: 1, frequency: '251', description: 'Test' }, // Invalid format
          ],
          [],
        ]

        const serialized = serializeMission(mission)
        // Manually override to test schema validation
        if (serialized.c1) {
          serialized.c1[0]!.frequency = '251'
        }

        const storageData = {
          version: 2,
          missions: [serialized],
        }

        const result = validateMissionStorage(storageData)

        expect(result.valid).toBe(false)
      })
    })
  })
})
