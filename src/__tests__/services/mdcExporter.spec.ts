import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mission } from '@/types'

// Mock crypto.randomUUID to return predictable value
const mockUUID = '12345678-1234-1234-1234-123456789abc'
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
})

// Import after mocking crypto
const { downloadMDC, exportF16MDC, exportA10MDC } = await import('@/services/mdcExporter')

describe('MDC Exporter', () => {
  let mockMissionF16: Mission
  let mockMissionA10: Mission

  beforeEach(() => {
    // Mock F-16C mission
    mockMissionF16 = {
      id: 'test-f16',
      name: 'Test F-16 Mission',
      callsign: 'VIPER',
      flightCallsignOverride: 'VIPER',
      link16PrefixOverride: 'VR',
      date: '2024-01-15',
      missionNumber: 'M001',
      type: 'STRIKE',
      squadron: 'v93',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot 1',
          callsign: 'VR',
          own: '1',
          stn: '12234',
          mode3: '1234',
          aaTcn: '10Y / 73Y',
          intraflight: '251.0',
          laser: '1688',
          tailNumber: '86-0267',
        },
        {
          position: 'WING',
          pilot: 'Test Pilot 2',
          callsign: 'VR',
          own: '2',
          stn: '12445',
          mode3: '1235',
          aaTcn: '11Y / 74Y',
          intraflight: '251.0',
          laser: '1687',
          tailNumber: '86-0268',
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
          elevation: 1000,
          altitude: 15000,
          speed: 350,
          timeOnTarget: '11:23:45',
          target: false,
        },
        {
          sequence: 2,
          name: 'Camp Bastion',
          latitude: 31.855433333333,
          longitude: 64.2132,
          elevation: 2906,
          altitude: 20000,
          timeOnTarget: null,
          target: true,
        },
      ],
      bullseye: undefined,
      loadout: [],
      ecmCmds: {
        cmdsPrograms: [
          {
            number: 1,
            flareBurstQty: 1,
            flareBurstInterval: 0.1,
            flareSalvoQty: 2,
            flareSalvoInterval: 2,
            chaffBurstQty: 1,
            chaffBurstInterval: 0.1,
            chaffSalvoQty: 4,
            chaffSalvoInterval: 1,
          },
        ],
        chaffBingo: 12,
        flareBingo: 14,
      },
      radioPresets: [
        [
          { number: 1, frequency: '300.00', description: 'preset 1' },
          { number: 2, frequency: '305.00', description: 'preset 2' },
        ],
        [
          { number: 1, frequency: '123.45', description: 'p1' },
          { number: 2, frequency: '124.50', description: 'p2' },
        ],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        departureAirportId: 'KNTD',
        recoveryProcedure: 'Standard Pattern',
      },
      told: {
        grossWeight: 25000,
        rotation: 140,
        refusal: 180,
        minAgl: 500,
        minMsl: 5000,
      },
      fuel: {
        takeoff: 7000,
        joker: 3500,
        bingo: 3000,
      },
      weather: 'Clear',
      details: {
        remarks: 'Test mission',
        primaryTarget: {
          name: 'Test Target',
          dmpi: 'Building',
          latitude: 31.85,
          longitude: 64.21,
          elevation: 2900,
          remarks: 'Test remarks',
        },
        secondaryTarget: undefined,
        timeOnTarget: '1200Z',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    // Mock A-10C mission
    mockMissionA10 = {
      id: 'test-a10',
      name: 'Test A-10 Mission',
      callsign: 'HAWG',
      flightCallsignOverride: 'HAWG',
      link16PrefixOverride: 'HG',
      date: '2024-01-15',
      missionNumber: 'M002',
      type: 'CAS',
      squadron: 'v303',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot A',
          callsign: 'HG',
          own: '1',
          stn: '11111',
          mode3: '1234',
          aaTcn: '1Y / 64Y',
          intraflight: '251.0',
          laser: '1611',
          tailNumber: '80-0123',
        },
      ],
      packageMembers: [],
      supportAssets: [],
      waypoints: [
        {
          sequence: 1,
          name: 'AKOGE',
          latitude: 31.52045,
          longitude: 65.87226667,
          elevation: 3346,
          altitude: 3346,
        },
        {
          sequence: 2,
          name: 'BENUL',
          latitude: 31.56458333,
          longitude: 65.9433,
          elevation: 3444,
          altitude: 3444,
        },
      ],
      bullseye: undefined,
      loadout: [],
      ecmCmds: {
        cmdsPrograms: [],
        chaffBingo: 10,
        flareBingo: 10,
      },
      radioPresets: [
        [
          { number: 1, frequency: '251.000', description: 'p1' },
          { number: 2, frequency: '251.000', description: 'p2' },
        ],
        [
          { number: 1, frequency: '305.000', description: 'p1' },
          { number: 2, frequency: '305.000', description: 'p2' },
        ],
        [
          { number: 1, frequency: '30.000', description: 'p1' },
          { number: 2, frequency: '30.000', description: 'aesf' },
        ],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        recoveryProcedure: 'TAC Recovery',
      },
      told: {},
      fuel: {
        takeoff: 11000,
        joker: 5000,
        bingo: 3000,
      },
      weather: 'Clear',
      details: {
        remarks: 'CAS mission',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
  })

  describe('F-16C Export', () => {
    it('should format coordinates correctly', () => {
      // We'll test this indirectly through the export
      const result = exportF16MDC(mockMissionF16)

      expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 12°34.567'")
      expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 123°45.678'")
      expect(result.Waypoints.Waypoints[1].Latitude).toBe("N 31°51.326'")
      expect(result.Waypoints.Waypoints[1].Longitude).toBe("E 064°12.792'")
    })

    it('should extract TACAN from crew lead correctly', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Misc.TACANChannel).toBe(10)
      expect(result.Misc.TACANBand).toBe(1) // Y band
    })

    it('should build datalink members correctly', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Datalink).not.toBeNull()
      expect(result.Datalink?.Members).toEqual([12234, 12445, 0, 0, 0, 0, 0, 0])
      expect(result.Datalink?.TDOAMembers).toEqual([
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
      ])
      expect(result.Datalink?.DatalinkMode).toBe(1) // TNDL
    })

    it('should map radio presets correctly', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Radios).not.toBeNull()
      expect(result.Radios?.Radio1.Presets).toHaveLength(2)
      expect(result.Radios?.Radio1.Presets[0].Frequency).toBe('300.00')
      expect(result.Radios?.Radio1.Mode).toBe(1) // Preset mode
      expect(result.Radios?.Radio1.SelectedPreset).toBe('1')
    })

    it('should use mission bingo fuel', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Misc.Bingo).toBe(3000)
    })

    it('should use flight lead laser code', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Misc.TGPCode).toBe(1688)
      expect(result.Misc.LSTCode).toBe(1688)
    })
  })

  describe('A-10C Export', () => {
    it('should format coordinates with 8 decimal places', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.WYPT.Points[0].Lat).toBe('31.52045000')
      expect(result.WYPT.Points[0].Lon).toBe('65.87226667')
      expect(result.WYPT.Points[1].Lat).toBe('31.56458333')
      expect(result.WYPT.Points[1].Lon).toBe('65.94330000')
    })

    it('should extract TACAN from crew lead correctly', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.Misc.TACANChannel).toBe('1')
      expect(result.Misc.TACANBand).toBe('1') // Y band
      expect(result.Misc.TACANMode).toBe('4') // A/A TR
    })

    it('should extract IFF from crew lead correctly', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.Misc.IFFMode3Code).toBe('1234')
      expect(result.Misc.IFFMasterMode).toBe('1') // STBY
      expect(result.Misc.IFFMode4On).toBe('True')
    })

    it('should map radio presets correctly with modulation', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.Radio.Presets).toHaveLength(3)
      // Radio 1 (VHF AM) should have modulation "0"
      expect(result.Radio.Presets[0][0].Modulation).toBe('0')
      // Radio 2 (UHF) should have empty modulation
      expect(result.Radio.Presets[1][0].Modulation).toBe('')
      // Radio 3 (VHF FM) should have empty modulation
      expect(result.Radio.Presets[2][0].Modulation).toBe('')
    })

    it('should use flight lead laser code', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.TGP.LaserCode).toBe('1611')
      expect(result.TGP.LSS).toBe('1611')
      expect(result.DSMS.LaserCode).toBe('1611')
    })

    it('should generate UUID', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.UID).toBe(mockUUID)
    })

    it('should format filename correctly', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.Filename).toBe('test_a-10_mission')
      expect(result.Name).toBe('Test A-10 Mission')
    })

    it('should set correct version and airframe', () => {
      const result = exportA10MDC(mockMissionA10)

      expect(result.Version).toBe('A10C-1.0')
      expect(result.Airframe).toBe(1)
    })
  })

  describe('downloadMDC', () => {
    it('should throw error for unsupported airframe', () => {
      // Create a mission with a squadron that maps to an unsupported airframe
      // For this test, we'll use a fake squadron that would return an unsupported airframe
      const unsupportedMission = {
        ...mockMissionF16,
        squadron: 'test-unsupported' as Mission['squadron'],
      }

      // This will throw because getSquadronAirframe will fail or return an unsupported airframe
      expect(() => downloadMDC(unsupportedMission)).toThrow()
    })
  })
})
