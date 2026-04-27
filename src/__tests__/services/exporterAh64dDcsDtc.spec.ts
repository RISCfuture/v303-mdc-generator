import { describe, it, expect, beforeEach } from 'vitest'
import type { Mission } from '@/types'
import { exportAH64DDCSDTC } from '@/services/exporters/dcsDtc/ah64d'

describe('AH-64D DCS-DTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-ah64d',
      name: 'Test AH-64D Mission',
      callsign: 'UGLY',
      flightCallsignOverride: 'UGLY',
      link16PrefixOverride: 'UG',
      date: '2024-06-15',
      missionNumber: 'M010',
      type: 'CAS',
      squadron: 'v1-151',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot AH',
          callsign: 'UG',
          own: '1',
          stn: '11111',
          mode3: '2345',
          aaTcn: '5Y / 68Y',
          intraflight: '251.0',
          laser: '1511',
          tailNumber: '04-05000',
        },
      ],
      packageMembers: [],
      supportAssets: [],
      waypoints: [
        {
          sequence: 1,
          name: 'STPT 1',
          latitude: 12.576116666667,
          longitude: 123.7613,
          elevation: 500,
          altitude: 500,
          speed: 120,
        },
        {
          sequence: 2,
          name: 'IP ALPHA',
          latitude: 31.855433333333,
          longitude: 64.2132,
          elevation: 2906,
          altitude: 2906,
          speed: 100,
          type: 'IP',
        },
        {
          sequence: 3,
          name: 'TGT 1',
          latitude: 31.9,
          longitude: 64.25,
          elevation: 3000,
          altitude: 3000,
          speed: null,
          timeOnTarget: '14:30:00',
          type: 'TGT',
        },
        {
          sequence: 4,
          name: 'LZ EAGLE',
          latitude: 32.0,
          longitude: 64.3,
          elevation: 2800,
          altitude: 2800,
          speed: null,
          type: 'LDG',
        },
        {
          sequence: 5,
          name: 'TGT 2',
          latitude: 31.95,
          longitude: 64.28,
          elevation: 3100,
          altitude: 3100,
          speed: null,
          type: 'TGT',
        },
      ],
      bullseye: undefined,
      loadout: [],
      ecmCmds: {
        cmdsPrograms: [],
        chaffBingo: 0,
        flareBingo: 0,
      },
      radioPresets: [
        // COM1 (VHF)
        [
          { number: 1, frequency: '127.500', description: 'Tower' },
          { number: 2, frequency: '141.000', description: 'Ground' },
          { number: 3, frequency: '135.250', description: 'Approach' },
        ],
        // COM2 (HF)
        [
          { number: 1, frequency: '5.000', description: 'HF Net 1' },
          { number: 2, frequency: '8.000', description: 'HF Net 2' },
          { number: 3, frequency: '12.000', description: 'HF Net 3' },
        ],
        // COM3 (UHF)
        [
          { number: 1, frequency: '305.000', description: 'UHF Pri' },
          { number: 2, frequency: '251.000', description: 'UHF Sec' },
          { number: 3, frequency: '340.200', description: 'AWACS' },
        ],
        // COM4 (FM1)
        [
          { number: 1, frequency: '30.000', description: 'FM1 Net' },
          { number: 2, frequency: '45.500', description: 'FM1 Alt' },
          { number: 3, frequency: '52.750', description: 'FM1 Sec' },
        ],
        // COM5 (FM2)
        [
          { number: 1, frequency: '60.000', description: 'FM2 Net' },
          { number: 2, frequency: '72.250', description: 'FM2 Alt' },
          { number: 3, frequency: '80.500', description: 'FM2 Sec' },
        ],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        recoveryProcedure: 'Standard Pattern',
      },
      told: {},
      fuel: {
        takeoff: 2400,
        joker: 1200,
        bingo: 800,
      },
      weather: 'Clear',
      details: {
        remarks: 'AH-64D CAS mission',
      },
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Aircraft to AH64D and Version to 2', () => {
    const result = exportAH64DDCSDTC(mockMission)
    expect(result.Aircraft).toBe('AH64D')
    expect(result.Version).toBe(2)
    expect(result.KneeboardNotes).toBeNull()
  })

  it('should format coordinates as DDM', () => {
    const result = exportAH64DDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe('N 12°34.567’')
    expect(result.Waypoints.Waypoints[0].Longitude).toBe('E 123°45.678’')
  })

  describe('waypoint identifier mapping', () => {
    it('should map TGT to CC', () => {
      const result = exportAH64DDCSDTC(mockMission)
      const tgtWp = result.Waypoints.Waypoints.find((wp) => wp.Name === 'TGT 1')
      expect(tgtWp?.Identifier).toBe('CC')
      expect(tgtWp?.Target).toBe(true)
    })

    it('should map IP to RP', () => {
      const result = exportAH64DDCSDTC(mockMission)
      const ipWp = result.Waypoints.Waypoints.find((wp) => wp.Name === 'IP ALPHA')
      expect(ipWp?.Identifier).toBe('RP')
    })

    it('should map LDG to LZ', () => {
      const result = exportAH64DDCSDTC(mockMission)
      const ldgWp = result.Waypoints.Waypoints.find((wp) => wp.Name === 'LZ EAGLE')
      expect(ldgWp?.Identifier).toBe('LZ')
    })

    it('should default to WP for untyped waypoints', () => {
      const result = exportAH64DDCSDTC(mockMission)
      const wp = result.Waypoints.Waypoints[0]
      expect(wp.Identifier).toBe('WP')
    })

    it('should set PointType to WP for all waypoints', () => {
      const result = exportAH64DDCSDTC(mockMission)
      for (const wp of result.Waypoints.Waypoints) {
        expect(wp.PointType).toBe('WP')
      }
    })

    it('should set Free to empty string', () => {
      const result = exportAH64DDCSDTC(mockMission)
      for (const wp of result.Waypoints.Waypoints) {
        expect(wp.Free).toBe('')
      }
    })
  })

  describe('target extraction', () => {
    it('should extract TGT waypoints into Targets', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Targets.Waypoints).toHaveLength(2)
    })

    it('should use independent 1-based sequencing for targets', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Targets.Waypoints[0].Sequence).toBe(1)
      expect(result.Targets.Waypoints[1].Sequence).toBe(2)
    })

    it('should set PointType to TG and Identifier to TG', () => {
      const result = exportAH64DDCSDTC(mockMission)
      for (const tgt of result.Targets.Waypoints) {
        expect(tgt.PointType).toBe('TG')
        expect(tgt.Identifier).toBe('TG')
      }
    })

    it('should format target coordinates as DDM', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Targets.Waypoints[0].Latitude).toMatch(/^[NS]\s/)
      expect(result.Targets.Waypoints[0].Longitude).toMatch(/^[EW]\s/)
    })
  })

  it('should have empty ControlMeasures', () => {
    const result = exportAH64DDCSDTC(mockMission)
    expect(result.ControlMeasures.Waypoints).toEqual([])
  })

  describe('radio transposition', () => {
    it('should transpose per-radio presets to per-preset frequencies', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Radios.Radio.Presets).toHaveLength(3)
    })

    it('should map 5 radios to frequency slots 0-4', () => {
      const result = exportAH64DDCSDTC(mockMission)
      const preset1 = result.Radios.Radio.Presets[0]
      expect(preset1.Frequencies[0]).toBe('127.50') // COM1 VHF
      expect(preset1.Frequencies[1]).toBe('5.00') // COM2 HF
      expect(preset1.Frequencies[2]).toBe('305.00') // COM3 UHF
      expect(preset1.Frequencies[3]).toBe('30.00') // COM4 FM1
      expect(preset1.Frequencies[4]).toBe('60.00') // COM5 FM2
    })

    it('should default slot 5 (6th) to "0.000"', () => {
      const result = exportAH64DDCSDTC(mockMission)
      for (const preset of result.Radios.Radio.Presets) {
        expect(preset.Frequencies).toHaveLength(6)
        expect(preset.Frequencies[5]).toBe('0.000')
      }
    })

    it('should build 5 SelectedModes entries', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Radios.Radio.SelectedModes).toHaveLength(5)
      expect(result.Radios.Radio.SelectedModes[0].Number).toBe(1)
      expect(result.Radios.Radio.SelectedModes[4].Number).toBe(5)
    })
  })

  describe('laser codes', () => {
    it('should map crew laser to codes A and R', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.LaserCodes.A).toBe('1511')
      expect(result.LaserCodes.R).toBe('1511')
    })

    it('should default B, C, D to 1688', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.LaserCodes.B).toBe('1688')
      expect(result.LaserCodes.C).toBe('1688')
      expect(result.LaserCodes.D).toBe('1688')
    })
  })

  describe('routes', () => {
    it('should generate a single default route', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Routes.Routes).toHaveLength(1)
      expect(result.Routes.Routes[0]).toEqual({
        Code: 0,
        Mode: 1,
        Waypoints: null,
        IncludeAllWaypoints: true,
        IncludeAllHazards: true,
        IncludeAllControlMeasures: true,
      })
    })
  })

  describe('TSD defaults', () => {
    it('should provide TSD display settings', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.TSD).toBeDefined()
      expect(result.TSD.ShowPresentPosition).toBe(true)
      expect(result.TSD.ShowASEThreats).toBe(true)
      expect(result.TSD.ShowThreatRings).toBe(true)
      expect(result.TSD.MapShowGrid).toBe(true)
    })
  })

  describe('upload flags', () => {
    it('should set Waypoints true when waypoints exist', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Waypoints).toBe(true)
    })

    it('should set Targets true when TGT waypoints exist', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Targets).toBe(true)
    })

    it('should set Radios true when radio presets exist', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Radios).toBe(true)
    })

    it('should set LaserCodes true when laser code exists', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.LaserCodes).toBe(true)
    })

    it('should set Routes true always', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Routes).toBe(true)
    })

    it('should set ControlMeasures false', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.ControlMeasures).toBe(false)
    })

    it('should set TSD false by default', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.TSD).toBe(false)
    })

    it('should set Waypoints false when no waypoints exist', () => {
      mockMission.waypoints = []
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Waypoints).toBe(false)
      expect(result.Upload.Targets).toBe(false)
    })

    it('should set Radios false when no radio presets exist', () => {
      mockMission.radioPresets = []
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.Upload.Radios).toBe(false)
    })
  })

  describe('template merging', () => {
    it('should merge TSD from template', () => {
      const template = {
        TSD: {
          ShowPresentPosition: false,
          NavPhaseShowEnemyUnits: true,
        },
        Upload: {
          TSD: true,
        },
      }
      const result = exportAH64DDCSDTC(mockMission, 0, template)
      // Mission data overwrites template
      expect(result.TSD.ShowPresentPosition).toBe(true)
      // But template Upload.TSD=true gets overwritten by mission's false
      expect(result.Upload.TSD).toBe(false)
    })

    it('should work without template', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result).toBeDefined()
      expect(result.Aircraft).toBe('AH64D')
    })
  })

  describe('WaypointsCapture', () => {
    it('should include correct defaults', () => {
      const result = exportAH64DDCSDTC(mockMission)
      expect(result.WaypointsCapture).toEqual({
        NavPointsMode: 0,
        TgtPointsMode: 0,
        NavPointsRangeFrom: 1,
        TgtPointsRangeFrom: 1,
      })
    })
  })
})
