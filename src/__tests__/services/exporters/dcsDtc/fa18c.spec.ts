import { describe, it, expect, beforeEach } from 'vitest'
import type { Mission } from '@/types'
import { exportFA18CDCSDTC } from '@/services/exporters/dcsDtc/fa18c'

describe('F/A-18C DCS-DTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-fa18c',
      name: 'Test FA-18C Mission',
      callsign: 'HORNET1',
      flightCallsignOverride: 'HORNET',
      link16PrefixOverride: 'HN',
      date: '2024-06-15',
      missionNumber: 'M020',
      type: 'STRIKE',
      squadron: 'v93',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot FA18',
          callsign: 'HN',
          own: '1',
          stn: '11111',
          mode3: '2345',
          aaTcn: '10Y / 73Y',
          intraflight: '251.0',
          laser: '1688',
          tailNumber: '165000',
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
          speed: 350,
        },
        {
          sequence: 2,
          name: 'TGT 1',
          latitude: 31.855433333333,
          longitude: 64.2132,
          elevation: 2906,
          altitude: 2906,
          speed: 400,
          type: 'TGT',
          timeOnTarget: '14:30:00',
        },
      ],
      bullseye: { waypointNumber: 25, latitude: 30.0, longitude: 60.0 },
      loadout: [],
      ecmCmds: {
        cmdsPrograms: [
          {
            number: 1,
            chaffBurstQty: 1,
            chaffBurstInterval: 0.02,
            chaffSalvoQty: 10,
            chaffSalvoInterval: 1.0,
            flareBurstQty: 1,
            flareBurstInterval: 0.02,
            flareSalvoQty: 10,
            flareSalvoInterval: 1.0,
          },
        ],
        chaffBingo: 10,
        flareBingo: 10,
      },
      radioPresets: [
        [
          { number: 1, frequency: '305.000', description: 'Tower' },
          { number: 2, frequency: '251.000', description: 'Ground' },
        ],
        [
          { number: 1, frequency: '127.500', description: 'AWACS' },
          { number: 2, frequency: '135.250', description: 'Approach' },
        ],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        recoveryProcedure: 'Standard Pattern',
      },
      told: { minAgl: 300, minMsl: 4000 },
      fuel: {
        takeoff: 14000,
        joker: 7000,
        bingo: 4000,
      },
      weather: 'Clear',
      details: { remarks: 'FA-18C strike mission' },
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Aircraft to FA18C and Version to 2', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Aircraft).toBe('FA18C')
    expect(result.Version).toBe(2)
    expect(result.KneeboardNotes).toBeNull()
  })

  it('should format coordinates as DDM', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 12°34.567'")
    expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 123°45.678'")
  })

  it('should set Target flag for TGT waypoints', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Target).toBe(false)
    expect(result.Waypoints.Waypoints[1].Target).toBe(true)
  })

  it('should export CMS programs', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.CMS.Programs).toHaveLength(1)
    expect(result.CMS.Programs[0].ChaffBurstQty).toBe(1)
    expect(result.CMS.ChaffBingo).toBe(10)
    expect(result.CMS.FlareBingo).toBe(10)
  })

  it('should export radio presets for 2 radios', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Radios).not.toBeNull()
    expect(result.Radios!.Radio1.Presets).toHaveLength(2)
    expect(result.Radios!.Radio2.Presets).toHaveLength(2)
    expect(result.Radios!.Radio1.Presets[0].Frequency).toBe('305.00')
  })

  it('should set Radios null when no presets exist', () => {
    mockMission.radioPresets = []
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Radios).toBeNull()
  })

  it('should export Misc with TACAN, bingo, ILS, laser', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Misc.TACANChannel).toBe(10)
    expect(result.Misc.TACANBand).toBe(1) // Y band
    expect(result.Misc.Bingo).toBe(4000)
    expect(result.Misc.BingoToBeUpdated).toBe(true)
    expect(result.Misc.TGPCode).toBe(1688)
    expect(result.Misc.LSTCode).toBe(1688)
    expect(result.Misc.LaserStartTime).toBe(8)
  })

  it('should export altitude warnings from TOLD data', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Misc.BaroWarn).toBe(4000)
    expect(result.Misc.BaroWarnToBeUpdated).toBe(true)
    expect(result.Misc.RadarWarn).toBe(300)
    expect(result.Misc.RadarWarnToBeUpdated).toBe(true)
  })

  it('should set bullseye from mission data', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Misc.BullseyeToBeUpdated).toBe(true)
    expect(result.Misc.BullseyeWP).toBe(25)
  })

  it('should set upload flags correctly', () => {
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Upload.Waypoints).toBe(true)
    expect(result.Upload.CMS).toBe(true)
    expect(result.Upload.Radios).toBe(true)
    expect(result.Upload.Misc).toBe(true)
    expect(result.Upload.Kneeboard).toBe(false)
  })

  it('should merge template data', () => {
    const template = {
      Misc: { TGPCode: 1111 },
    }
    const result = exportFA18CDCSDTC(mockMission, 0, template)
    // Mission data overwrites template
    expect(result.Misc.TGPCode).toBe(1688)
    expect(result.Aircraft).toBe('FA18C')
  })

  it('should handle blank waypoints', () => {
    mockMission.waypoints = [
      {
        sequence: 1,
        name: 'BLANK',
        latitude: null,
        longitude: null,
        altitude: null,
        elevation: null,
        speed: null,
      },
    ]
    const result = exportFA18CDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 00°00.000'")
    expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 000°00.000'")
    expect(result.Waypoints.Waypoints[0].Elevation).toBe(0)
  })
})
