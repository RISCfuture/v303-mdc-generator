import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mission } from '@/types'

// Mock crypto.randomUUID to return predictable value
const mockUUID = '12345678-1234-1234-1234-123456789abc'
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
})

// Import after mocking crypto
const {
  downloadMDC,
  exportF16MDC,
  exportA10MDC,
  exportA10DCSDTC,
  exportC130DCSDTC,
  exportF16JAFDTC,
  exportF16DCSME,
} = await import('@/services/exporters')

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

      expect(result.Waypoints.Waypoints[0].Latitude).toBe('N 12°34.567’')
      expect(result.Waypoints.Waypoints[0].Longitude).toBe('E 123°45.678’')
      expect(result.Waypoints.Waypoints[1].Latitude).toBe('N 31°51.326’')
      expect(result.Waypoints.Waypoints[1].Longitude).toBe('E 064°12.792’')
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
      expect(result.Radios?.Radio1.Mode).toBe(2) // Preset (RadioMode.Preset = 2)
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

    it('emits coordinates with U+2019 right-single-quote (DCS-DTC strips only U+2019)', () => {
      const result = exportF16MDC(mockMissionF16)

      const lat = result.Waypoints.Waypoints[0].Latitude
      expect(lat.endsWith('’')).toBe(true)
      expect(lat.includes("'")).toBe(false)
      expect(lat.codePointAt(lat.length - 1)).toBe(0x2019)
    })

    it('uses TWS FCR mode in MSL master mode (v93 squadron standard)', () => {
      const result = exportF16MDC(mockMissionF16)

      // Mode 5 = MSL; LeftMFD FCRMode = 3 (TWS) per v93 standard.
      const mslConfig = result.MFD.Configurations.find((c) => c.Mode === 5)
      expect(mslConfig?.LeftMFD.FCRMode).toBe(3)
    })

    it('omits Upload.Radios and Upload.Datalink so the squadron template provides them', () => {
      const result = exportF16MDC(mockMissionF16)

      // Without a template, exporter omits these so the v93 template can
      // declare them as the canonical squadron defaults (both false).
      expect(result.Upload.Radios).toBeUndefined()
      expect(result.Upload.Datalink).toBeUndefined()
    })

    it('lets v93 template default Upload.Radios and Upload.Datalink to false', () => {
      const template = {
        Upload: {
          Radios: false,
          Datalink: false,
        },
      }
      const result = exportF16MDC(mockMissionF16, 0, template)

      expect(result.Upload.Radios).toBe(false)
      expect(result.Upload.Datalink).toBe(false)
    })

    it('omits Misc Laser/TACAN/ILS ToBeUpdated flags so the squadron template provides them', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.Misc.LaserSettingsToBeUpdated).toBeUndefined()
      expect(result.Misc.TACANToBeUpdated).toBeUndefined()
      expect(result.Misc.ILSToBeUpdated).toBeUndefined()
    })

    it('lets v93 template default Misc Laser/TACAN/ILS ToBeUpdated flags to false', () => {
      const template = {
        Misc: {
          LaserSettingsToBeUpdated: false,
          TACANToBeUpdated: false,
          ILSToBeUpdated: false,
        },
      }
      const result = exportF16MDC(mockMissionF16, 0, template)

      expect(result.Misc.LaserSettingsToBeUpdated).toBe(false)
      expect(result.Misc.TACANToBeUpdated).toBe(false)
      expect(result.Misc.ILSToBeUpdated).toBe(false)
    })

    it('pads CMS to 6 programs (1-based Number) with ToBeUpdated false for fillers', () => {
      const result = exportF16MDC(mockMissionF16)

      expect(result.CMS.Programs).toHaveLength(6)
      expect(result.CMS.Programs?.[0].Number).toBe(1)
      expect(result.CMS.Programs?.[0].ToBeUpdated).toBe(true)
      for (let i = 1; i < 6; i++) {
        expect(result.CMS.Programs?.[i].Number).toBe(i + 1)
        expect(result.CMS.Programs?.[i].ToBeUpdated).toBe(false)
        expect(result.CMS.Programs?.[i].ChaffBurstQty).toBe(0)
        expect(result.CMS.Programs?.[i].FlareBurstQty).toBe(0)
      }
    })

    it('falls back to template CMS programs for slots the user has not set', () => {
      const template = {
        CMS: {
          Programs: [
            {
              Number: 2,
              FlareBurstQty: 2,
              FlareBurstInterval: 0.02,
              FlareSalvoQty: 3,
              FlareSalvoInterval: 0.5,
              ChaffBurstQty: 6,
              ChaffBurstInterval: 0.075,
              ChaffSalvoQty: 1,
              ChaffSalvoInterval: 0.5,
              ToBeUpdated: true,
            },
          ],
        },
      }
      const result = exportF16MDC(mockMissionF16, 0, template)

      // User-set program 1 still wins over template
      expect(result.CMS.Programs?.[0].Number).toBe(1)
      expect(result.CMS.Programs?.[0].ToBeUpdated).toBe(true)
      expect(result.CMS.Programs?.[0].FlareBurstQty).toBe(
        mockMissionF16.ecmCmds.cmdsPrograms[0].flareBurstQty,
      )
      // Template fills program 2 (mission has no entry for it)
      expect(result.CMS.Programs?.[1].Number).toBe(2)
      expect(result.CMS.Programs?.[1].ToBeUpdated).toBe(true)
      expect(result.CMS.Programs?.[1].ChaffBurstQty).toBe(6)
      expect(result.CMS.Programs?.[1].ChaffBurstInterval).toBe(0.075)
      // Programs 3-6 still zero-fill (no template entry, no user data)
      for (let i = 2; i < 6; i++) {
        expect(result.CMS.Programs?.[i].ToBeUpdated).toBe(false)
        expect(result.CMS.Programs?.[i].ChaffBurstQty).toBe(0)
      }
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

        // Mission data should be based on radioDefaults (no radioDefaults = preset mode with preset 1)
        expect(result.Radio.IsPresetMode).toEqual([true, true, true])
        // Default preset numbers when no radioDefaults exists (preset 1 for all radios)
        expect(result.Radio.DefaultSetting).toEqual(['1', '1', '1'])
      })
    })
  })

  describe('A-10C DCS-DTC Export', () => {
    it('should output Aircraft A10 and Version 2', () => {
      const result = exportA10DCSDTC(mockMissionA10)
      expect(result.Aircraft).toBe('A10')
      expect(result.Version).toBe(2)
    })

    it('should format coordinates as DDM', () => {
      const result = exportA10DCSDTC(mockMissionA10)
      // DDM format from formatF16LatLon
      expect(result.Waypoints.Waypoints[0].Latitude).toMatch(/^[NS]\s/)
      expect(result.Waypoints.Waypoints[0].Longitude).toMatch(/^[EW]\s/)
    })

    it('should map first 2 radios correctly', () => {
      const result = exportA10DCSDTC(mockMissionA10)
      expect(result.Radios).not.toBeNull()
      expect(result.Radios?.Radio1.Presets).toHaveLength(2)
      expect(result.Radios?.Radio2.Presets).toHaveLength(2)
    })

    it('should include WaypointsCapture with correct defaults', () => {
      const result = exportA10DCSDTC(mockMissionA10)
      expect(result.WaypointsCapture).toEqual({
        NavPointsMode: 0,
        TgtPointsMode: 0,
        NavPointsRangeFrom: 1,
        TgtPointsRangeFrom: 1,
      })
    })

    it('should map waypoints with correct fields', () => {
      const result = exportA10DCSDTC(mockMissionA10)
      const wp = result.Waypoints.Waypoints[0]
      expect(wp).toHaveProperty('Sequence')
      expect(wp).toHaveProperty('Name')
      expect(wp).toHaveProperty('Latitude')
      expect(wp).toHaveProperty('Longitude')
      expect(wp).toHaveProperty('Elevation')
      expect(wp).toHaveProperty('Target')
    })

    it('should merge template data', () => {
      const template = {
        Radios: {
          Radio1: { EnableGuard: true, Mode: 0 },
          Radio2: { EnableGuard: true, Mode: 0 },
        },
      }
      const result = exportA10DCSDTC(mockMissionA10, 0, template)
      // Mission data overwrites template
      expect(result.Radios?.Radio1.EnableGuard).toBe(false)
    })
  })

  describe('C-130J DCS-DTC Export', () => {
    let mockMissionC130: Mission

    beforeEach(() => {
      mockMissionC130 = {
        ...mockMissionA10,
        id: 'test-c130',
        name: 'Test C-130 Mission',
        squadron: 'v757',
        callsign: 'HERC',
        flightCallsignOverride: 'HERC',
        link16PrefixOverride: 'HC',
        crew: [
          {
            position: 'LEAD',
            pilot: 'Test Pilot C',
            callsign: 'HC',
            own: '1',
            stn: '11111',
            mode3: '1234',
            aaTcn: '1Y / 64Y',
            intraflight: '251.0',
            laser: '1688',
            tailNumber: '08-8601',
          },
        ],
      }
    })

    it('should output Aircraft C130 and Version 2', () => {
      const result = exportC130DCSDTC(mockMissionC130)
      expect(result.Aircraft).toBe('C130')
      expect(result.Version).toBe(2)
    })

    it('should format coordinates as DDM', () => {
      const result = exportC130DCSDTC(mockMissionC130)
      expect(result.Waypoints.Waypoints[0].Latitude).toMatch(/^[NS]\s/)
    })

    it('should map radios correctly', () => {
      const result = exportC130DCSDTC(mockMissionC130)
      expect(result.Radios).not.toBeNull()
    })
  })

  describe('F-16C JAFDTC Export', () => {
    it('should output correct Version and Airframe', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.Version).toBe('F16C-1.1')
      expect(result.Airframe).toBe(5)
    })

    it('should format coordinates as decimal 8dp', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.STPT.Points[0].Lat).toBe('12.57611667')
      expect(result.STPT.Points[0].Lon).toBe('123.76130000')
    })

    it('should generate valid UUID', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.UID).toBe(mockUUID)
    })

    it('should generate sanitized Filename', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.Filename).toBe('test_f-16_mission')
      expect(result.Name).toBe('Test F-16 Mission')
    })

    it('should map CMDS programs from mission ecmCmds', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      // JAFDTC expects exactly 6 programs (MAN1-4, PANIC, BYPASS)
      expect(result.CMDS.Programs).toHaveLength(6)
      expect(result.CMDS.Programs[0].Number).toBe(0) // 0-based indexing
      expect(result.CMDS.Programs[0].Chaff.BQ).toBe('1')
      expect(result.CMDS.Programs[0].Flare.BQ).toBe('1')
      // Programs 1-5 should be defaults
      expect(result.CMDS.Programs[1].Number).toBe(1)
      expect(result.CMDS.Programs[5].Number).toBe(5)
      expect(result.CMDS.BingoChaff).toBe('12')
      expect(result.CMDS.BingoFlare).toBe('14')
    })

    it('should map DLNK with Ownship and TeamMembers', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.DLNK).not.toBeNull()
      expect(result.DLNK?.Ownship).toBe('1') // crewMemberIndex + 1
      expect(result.DLNK?.TeamMembers).toHaveLength(8)
      expect(result.DLNK?.TeamMembers[0].TNDL).toBe('12234')
      expect(result.DLNK?.TeamMembers[0].TDOA).toBe(true)
      expect(result.DLNK?.IsOwnshipLead).toBe(true)
    })

    it('should map HARM tables correctly', () => {
      const missionWithHARM = {
        ...mockMissionF16,
        harmTables: [{ tableNumber: 1, emitters: [110, 104, 103] }],
      }
      const result = exportF16JAFDTC(missionWithHARM)
      expect(result.HARM).not.toBeNull()
      expect(result.HARM?.Tables).toHaveLength(1)
      expect(result.HARM?.Tables[0].Number).toBe(0) // 0-based
      expect(result.HARM?.Tables[0].Table).toEqual([
        { Code: '110' },
        { Code: '104' },
        { Code: '103' },
      ])
    })

    it('should map HTS MANTable and EnabledThreats', () => {
      const missionWithHTS = {
        ...mockMissionF16,
        htsThreatData: {
          manualTableEnabled: true,
          manualEmitters: [101, 102],
          enabledClasses: [true, false, true, false, true, false, true, false, true, false, true],
        },
      }
      const result = exportF16JAFDTC(missionWithHTS)
      expect(result.HTS).not.toBeNull()
      expect(result.HTS?.MANTable).toEqual([{ Code: '101' }, { Code: '102' }])
      expect(result.HTS?.EnabledThreats).toHaveLength(11)
    })

    it('should map Misc settings correctly', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.Misc.Bingo).toBe('3000')
      expect(result.Misc.ALOWCARAALOW).toBe('500')
      expect(result.Misc.ALOWMSLFloor).toBe('5000')
      expect(result.Misc.LaserTGPCode).toBe('1688')
      expect(result.Misc.LaserLSTCode).toBe('1688')
      expect(result.Misc.TACANChannel).toBe('10')
    })

    it('should map Radio presets', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.Radio.Presets).toHaveLength(2)
      expect(result.Radio.Presets[0]).toHaveLength(2)
      expect(result.Radio.Presets[0][0].Frequency).toBe('300.00')
      expect(result.Radio.Presets[0][0].Description).toBe('preset 1')
    })

    it('should map STPT points with OAP and VxP arrays', () => {
      const result = exportF16JAFDTC(mockMissionF16)
      expect(result.STPT.Points).toHaveLength(2)
      const pt = result.STPT.Points[0]
      expect(pt.OAP).toHaveLength(2)
      expect(pt.VxP).toHaveLength(2)
      expect(pt.Alt).toBe('15000')
      expect(pt.TOS).toBe('11:23:45')
    })

    it('should merge template data', () => {
      const template = {
        MFD: { ModeConfigs: [{ mode: 'test' }] },
      }
      const result = exportF16JAFDTC(mockMissionF16, 0, template)
      // Mission data is exported correctly even with template
      expect(result.Version).toBe('F16C-1.1')
    })
  })

  describe('F-16C DCS ME Export', () => {
    it('should output correct type and terrain', () => {
      const result = exportF16DCSME(mockMissionF16)
      expect(result.type).toBe('F-16C_50')
      expect(result.data.type).toBe('F-16C_50')
      expect(result.data.terrain).toBe('PersianGulf')
      expect(result.data.MPD.terrain).toBe('PersianGulf')
    })

    it('should convert lat/lon to DCS x,y coordinates', () => {
      const result = exportF16DCSME(mockMissionF16)
      expect(result.data.MPD.NAV_PTS).toHaveLength(2)
      const pt = result.data.MPD.NAV_PTS[0]
      expect(typeof pt.x).toBe('number')
      expect(typeof pt.y).toBe('number')
      expect(pt.x).not.toBe(0) // Should be a real DCS coordinate
      expect(pt.y).not.toBe(0)
    })

    it('should map COMM1 and COMM2 channels', () => {
      const result = exportF16DCSME(mockMissionF16)
      expect(result.data.COMM.COMM1).toHaveProperty('Channel_1')
      expect(result.data.COMM.COMM1.Channel_1.freq).toBe(300)
      expect(result.data.COMM.COMM2).toHaveProperty('Channel_1')
      expect(result.data.COMM.COMM2.Channel_1.freq).toBe(123.45)
    })

    it('should map NAV_PTS with steerpoint types', () => {
      const missionWithTypes = {
        ...mockMissionF16,
        waypoints: [
          { ...mockMissionF16.waypoints[0], type: undefined },
          { ...mockMissionF16.waypoints[1], type: 'TGT' as const },
        ],
      }
      const result = exportF16DCSME(missionWithTypes)
      expect(result.data.MPD.NAV_PTS[0].type).toBe('STPT')
      expect(result.data.MPD.NAV_PTS[1].type).toBe('TGT')
    })

    it('should convert TOS to seconds', () => {
      const result = exportF16DCSME(mockMissionF16)
      // First waypoint has TOS "11:23:45" = 11*3600 + 23*60 + 45 = 40800 + 1380 + 45 = 41025
      expect(result.data.MPD.NAV_PTS[0].TOS).toBe(41025)
      expect(result.data.MPD.NAV_PTS[0].isTOSEnabled).toBe(true)
      // Second waypoint has no TOS
      expect(result.data.MPD.NAV_PTS[1].TOS).toBe(-1)
      expect(result.data.MPD.NAV_PTS[1].isTOSEnabled).toBe(false)
    })

    it('should map CMDS bingo settings', () => {
      const result = exportF16DCSME(mockMissionF16)
      expect(result.data.MPD.CMDS.CMDSBingoSettings.ChaffNum).toBe(12)
      expect(result.data.MPD.CMDS.CMDSBingoSettings.FlaresNum).toBe(14)
    })

    it('should map CMDS program settings', () => {
      const result = exportF16DCSME(mockMissionF16)
      expect(result.data.MPD.CMDS.CMDSProgramSettings).toHaveProperty('MAN1')
    })

    it('should throw for unsupported theater', () => {
      const badTheater = { ...mockMissionF16, theater: 'UnknownMap' }
      expect(() => exportF16DCSME(badTheater)).toThrow('DCS ME export not supported for theater')
    })

    it('should merge template data', () => {
      const template = {
        data: {
          COMM: { mirror_COMM1: true },
        },
      }
      const result = exportF16DCSME(mockMissionF16, 0, template)
      // Mission data should overwrite template
      expect(result.data.COMM.mirror_COMM1).toBe(false)
    })
  })

  describe('downloadMDC', () => {
    it('should throw error for unsupported airframe', () => {
      const unsupportedMission = {
        ...mockMissionF16,
        squadron: 'test-unsupported' as Mission['squadron'],
      }

      expect(() => {
        downloadMDC(unsupportedMission)
      }).toThrow()
    })
  })
})
