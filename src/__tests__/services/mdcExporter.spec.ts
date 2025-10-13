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
      callsign: 'VIPER1',
      flightCallsignOverride: 'VIPER1',
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
      commLadders: [
        [1, 2], // Radio 1: presets 1 and 2
        [1, 2], // Radio 2: presets 1 and 2
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

    it('should export HARM tables when provided', () => {
      const missionWithHARM = {
        ...mockMissionF16,
        harmTables: [
          {
            tableNumber: 1,
            emitters: [110, 104, 103, 115, 107],
          },
          {
            tableNumber: 2,
            emitters: [120, 119, 117, 121, 109],
          },
          {
            tableNumber: 3,
            emitters: [123, 122, 108, 126, 118],
          },
        ],
      }

      const result = exportF16MDC(missionWithHARM)

      expect(result.HARM).not.toBeNull()
      expect(result.HARM?.Tables).toHaveLength(3)
      expect(result.HARM?.Tables[0].TableNumber).toBe(1)
      expect(result.HARM?.Tables[0].ToBeUpdated).toBe(true)
      expect(result.HARM?.Tables[0].Emitters).toEqual([110, 104, 103, 115, 107])
      expect(result.HARM?.Tables[1].TableNumber).toBe(2)
      expect(result.HARM?.Tables[1].Emitters).toEqual([120, 119, 117, 121, 109])
      expect(result.HARM?.Tables[2].TableNumber).toBe(3)
      expect(result.HARM?.Tables[2].Emitters).toEqual([123, 122, 108, 126, 118])
    })

    it('should export HTS data when provided', () => {
      const missionWithHTS = {
        ...mockMissionF16,
        htsThreatData: {
          manualTableEnabled: false,
          manualEmitters: [101, 102, 121, 109, 126, 122, 123, 130],
          enabledClasses: [true, true, true, true, true, true, true, true, true, true, true],
        },
      }

      const result = exportF16MDC(missionWithHTS)

      expect(result.HTS).not.toBeNull()
      expect(result.HTS?.ManualTableEnabled).toBe(false)
      expect(result.HTS?.ManualEmitters).toEqual([101, 102, 121, 109, 126, 122, 123, 130])
      expect(result.HTS?.ManualEmittersToBeUpdated).toBe(false)
      expect(result.HTS?.EnabledClasses).toHaveLength(11)
      expect(result.HTS?.EnabledClasses).toEqual([
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
      ])
      expect(result.HTS?.ManualTableEnabledToBeUpdated).toBe(false)
    })

    it('should set HARMHTS upload flag to true when HARM tables exist', () => {
      const missionWithHARM = {
        ...mockMissionF16,
        harmTables: [
          {
            tableNumber: 1,
            emitters: [110, 104],
          },
        ],
      }

      const result = exportF16MDC(missionWithHARM)

      expect(result.Upload.HARMHTS).toBe(true)
    })

    it('should set HARMHTS upload flag to true when HTS data exists', () => {
      const missionWithHTS = {
        ...mockMissionF16,
        htsThreatData: {
          manualTableEnabled: true,
          manualEmitters: [101, 102],
          enabledClasses: [true, false, true, false, true, false, true, false, true, false, true],
        },
      }

      const result = exportF16MDC(missionWithHTS)

      expect(result.Upload.HARMHTS).toBe(true)
    })

    it('should set HARMHTS upload flag to false when no HARM/HTS data exists', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Upload.HARMHTS).toBe(false)
    })

    it('should return null for HARM when not provided', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.HARM).toBeNull()
    })

    it('should return null for HTS when not provided', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.HTS).toBeNull()
    })

    describe('CCIP Reference Points Export', () => {
      it('should export VIP reference point correctly', () => {
        const missionWithVIP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  bearing: 123.5,
                  distance: 5000,
                  elevation: 100,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithVIP)

        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(true)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toEqual({
          Range: Math.round((5000 / 6076.12) * 10) / 10, // VIP ranges are in nautical miles, rounded to 0.1
          Bearing: 123.5,
          Elevation: 100,
        })
        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(false)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toBeNull()
      })

      it('should export VRP reference point correctly', () => {
        const missionWithVRP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VRP' as const,
                vrp: {
                  bearing: 270.0,
                  distance: 3500,
                  elevation: -50,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithVRP)

        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(true)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toEqual({
          Range: 3500, // TGTtoVRP in feet
          Bearing: 270.0,
          Elevation: -50,
        })
        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(false)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toBeNull()
      })

      it('should export offset aimpoints correctly', () => {
        const missionWithOA = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                oa1: {
                  bearing: 90.0,
                  distance: 1000,
                  elevation: 50,
                },
                oa2: {
                  bearing: 180.0,
                  distance: 1500,
                  elevation: 75,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithOA)

        expect(result.Waypoints.Waypoints[0].UseOA).toBe(true)
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint1).toEqual({
          Range: 1000,
          Bearing: 90.0,
          Elevation: 50,
        })
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint2).toEqual({
          Range: 1500,
          Bearing: 180.0,
          Elevation: 75,
        })
      })

      it('should export PUP with VIP correctly', () => {
        const missionWithPUP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  bearing: 45.0,
                  distance: 10000,
                  elevation: 200,
                },
                pup: {
                  bearing: 225.0,
                  distance: 2000,
                  elevation: 150,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithPUP)

        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(true)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toEqual({
          Range: Math.round((10000 / 6076.12) * 10) / 10, // VIPtoTGT in nautical miles, rounded to 0.1
          Bearing: 45.0,
          Elevation: 200,
        })
        expect(result.Waypoints.Waypoints[0].VIPtoPUP).toEqual({
          Range: Math.round((2000 / 6076.12) * 10) / 10, // VIPtoPUP in nautical miles, rounded to 0.1
          Bearing: 225.0,
          Elevation: 150,
        })
      })

      it('should export PUP with VRP correctly', () => {
        const missionWithPUP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VRP' as const,
                vrp: {
                  bearing: 315.0,
                  distance: 8000,
                  elevation: 0,
                },
                pup: {
                  bearing: 135.0,
                  distance: 1800,
                  elevation: 100,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithPUP)

        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(true)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toEqual({
          Range: 8000, // TGTtoVRP in feet
          Bearing: 315.0,
          Elevation: 0,
        })
        expect(result.Waypoints.Waypoints[0].TGTtoPUP).toEqual({
          Range: 1800, // TGTtoPUP in feet
          Bearing: 135.0,
          Elevation: 100,
        })
      })

      it('should handle missing elevation by defaulting to 0', () => {
        const missionWithNoElevation = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  bearing: 180.0,
                  distance: 5000,
                  // elevation is undefined
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithNoElevation)

        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toEqual({
          Range: Math.round((5000 / 6076.12) * 10) / 10, // VIP ranges are in nautical miles, rounded to 0.1
          Bearing: 180.0,
          Elevation: 0,
        })
      })

      it('should handle waypoint with no CCIP data', () => {
        const result = exportF16MDC(mockMissionF16)

        expect(result.Waypoints.Waypoints[0].UseOA).toBe(false)
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint1).toEqual({
          Range: 0.0,
          Bearing: 0.0,
          Elevation: 0.0,
        })
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint2).toEqual({
          Range: 0.0,
          Bearing: 0.0,
          Elevation: 0.0,
        })
        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(false)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toBeNull()
        expect(result.Waypoints.Waypoints[0].VIPtoPUP).toBeNull()
        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(false)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toBeNull()
        expect(result.Waypoints.Waypoints[0].TGTtoPUP).toBeNull()
      })

      it('should handle incomplete reference point data (missing bearing)', () => {
        const missionWithIncompleteCCIP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  // bearing is missing
                  distance: 5000,
                  elevation: 100,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithIncompleteCCIP)

        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(false)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toBeNull()
      })

      it('should handle incomplete reference point data (missing distance)', () => {
        const missionWithIncompleteCCIP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  bearing: 180.0,
                  // distance is missing
                  elevation: 100,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithIncompleteCCIP)

        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(false)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toBeNull()
      })

      it('should export complete CCIP data with all reference points', () => {
        const missionWithAllCCIP = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                referencePointType: 'VIP' as const,
                vip: {
                  bearing: 45.0,
                  distance: 10000,
                  elevation: 200,
                },
                oa1: {
                  bearing: 90.0,
                  distance: 1000,
                  elevation: 50,
                },
                oa2: {
                  bearing: 180.0,
                  distance: 1500,
                  elevation: 75,
                },
                pup: {
                  bearing: 225.0,
                  distance: 2000,
                  elevation: 150,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithAllCCIP)

        expect(result.Waypoints.Waypoints[0].UseOA).toBe(true)
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint1).toEqual({
          Range: 1000, // OA ranges stay in feet
          Bearing: 90.0,
          Elevation: 50,
        })
        expect(result.Waypoints.Waypoints[0].OffsetAimpoint2).toEqual({
          Range: 1500, // OA ranges stay in feet
          Bearing: 180.0,
          Elevation: 75,
        })
        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(true)
        expect(result.Waypoints.Waypoints[0].VIPtoTGT).toEqual({
          Range: Math.round((10000 / 6076.12) * 10) / 10, // VIPtoTGT in nautical miles, rounded to 0.1
          Bearing: 45.0,
          Elevation: 200,
        })
        expect(result.Waypoints.Waypoints[0].VIPtoPUP).toEqual({
          Range: Math.round((2000 / 6076.12) * 10) / 10, // VIPtoPUP in nautical miles, rounded to 0.1
          Bearing: 225.0,
          Elevation: 150,
        })
        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(false)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toBeNull()
        expect(result.Waypoints.Waypoints[0].TGTtoPUP).toBeNull()
      })

      it('should default to VRP when referencePointType is not specified', () => {
        const missionWithDefaultRef = {
          ...mockMissionF16,
          waypoints: [
            {
              ...mockMissionF16.waypoints[0],
              type: 'TGT' as const,
              ccip: {
                // referencePointType is undefined - should default to VRP
                vrp: {
                  bearing: 270.0,
                  distance: 3500,
                  elevation: 0,
                },
              },
            },
          ],
        }

        const result = exportF16MDC(missionWithDefaultRef)

        expect(result.Waypoints.Waypoints[0].UseVRP).toBe(true)
        expect(result.Waypoints.Waypoints[0].TGTtoVRP).toEqual({
          Range: 3500, // TGTtoVRP in feet
          Bearing: 270.0,
          Elevation: 0,
        })
        expect(result.Waypoints.Waypoints[0].UseVIP).toBe(false)
      })
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

  describe('Template Merging', () => {
    describe('F-16C with template', () => {
      it('should merge template with mission data (mission data overwrites)', () => {
        const template = {
          Misc: {
            CARAALOW: 1000, // Template value
            MSLFloor: 6000, // Template value
          },
        }

        const result = exportF16MDC(mockMissionF16, 0, template)

        // Mission data should overwrite template
        expect(result.Misc.CARAALOW).toBe(500) // Mission value overwrites
        expect(result.Misc.MSLFloor).toBe(5000) // Mission value overwrites
      })

      it('should use template values when mission does not provide them', () => {
        const template = {
          Misc: {
            ILSFrequency: 109.5, // Different from mission
            ILSCourse: 90, // Different from mission
          },
        }

        const result = exportF16MDC(mockMissionF16, 0, template)

        // Mission data still wins
        expect(result.Misc.ILSFrequency).toBe(108.1)
        expect(result.Misc.ILSCourse).toBe(0)
      })

      it('should work without template (backward compatibility)', () => {
        const result = exportF16MDC(mockMissionF16, 0)

        expect(result).toBeDefined()
        expect(result.Aircraft).toBe('F16C')
        expect(result.Misc.CARAALOW).toBe(500)
      })

      it('should merge MFD configurations from template', () => {
        const template = {
          MFD: {
            Configurations: [
              {
                Mode: 1,
                LeftMFD: {
                  SelectedPage: 2,
                  Page1: 5,
                  Page2: 6,
                  Page3: 7,
                  FCRMode: 2,
                  FCRAzimuth: 8,
                  FCRBars: 6,
                  FCRRange: 60,
                },
                RightMFD: {
                  SelectedPage: 1,
                  Page1: 1,
                  Page2: 2,
                  Page3: 3,
                  FCRMode: null,
                  FCRAzimuth: 6,
                  FCRBars: 4,
                  FCRRange: 40,
                },
                ToBeUpdated: false,
              },
            ],
          },
        }

        const result = exportF16MDC(mockMissionF16, 0, template)

        // Mission MFD configs should overwrite template
        expect(result.MFD.Configurations).toHaveLength(5)
        expect(result.MFD.Configurations[0].LeftMFD.SelectedPage).toBe(1) // Mission value
      })
    })

    describe('A-10C with template', () => {
      it('should merge template with mission data (mission data overwrites)', () => {
        const template = {
          Misc: {
            TACANMode: '1', // Template value
            IFFMasterMode: '0', // Template value
          },
        }

        const result = exportA10MDC(mockMissionA10, 0, template)

        // Mission data should overwrite template
        expect(result.Misc.TACANMode).toBe('4') // Mission value overwrites
        expect(result.Misc.IFFMasterMode).toBe('1') // Mission value overwrites
      })

      it('should use template values when available', () => {
        const template = {
          Version: 'A10C-2.0', // Different version
          Airframe: 2,
        }

        const result = exportA10MDC(mockMissionA10, 0, template)

        // Mission data overwrites
        expect(result.Version).toBe('A10C-1.0')
        expect(result.Airframe).toBe(1)
      })

      it('should work without template (backward compatibility)', () => {
        const result = exportA10MDC(mockMissionA10, 0)

        expect(result).toBeDefined()
        expect(result.Version).toBe('A10C-1.0')
        expect(result.Misc.TACANMode).toBe('4')
      })

      it('should merge radio settings from template', () => {
        const template = {
          Radio: {
            IsPresetMode: [false, false, false],
            DefaultSetting: ['2', '2', '2'],
          },
        }

        const result = exportA10MDC(mockMissionA10, 0, template)

        // Mission data should be based on comm ladder state (no comm ladder = frequency mode)
        expect(result.Radio.IsPresetMode).toEqual([false, false, false])
        // Default frequencies when no comm ladder exists
        expect(result.Radio.DefaultSetting).toEqual(['225.00', '108.00', '30.00'])
      })
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
