import { describe, it, expect, beforeEach } from 'vitest'
import type { Mission } from '@/types'
import { exportAV8BDCSDTC } from '@/services/exporters/dcsDtc/av8b'

describe('AV-8B DCS-DTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-av8b',
      name: 'Test AV-8B Mission',
      callsign: 'HARRIER1',
      date: '2024-06-15',
      missionNumber: 'M040',
      type: 'CAS',
      squadron: 'v93',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot AV8B',
          callsign: 'HR',
          own: '1',
          stn: '11111',
          mode3: '4567',
          aaTcn: '20Y / 83Y',
          intraflight: '251.0',
          laser: '1688',
          tailNumber: '162000',
        },
      ],
      packageMembers: [],
      supportAssets: [],
      waypoints: [
        {
          sequence: 1,
          name: 'WPT 1',
          latitude: 25.5,
          longitude: 55.5,
          elevation: 100,
          altitude: 100,
          speed: 300,
        },
        {
          sequence: 2,
          name: 'TGT 1',
          latitude: 25.6,
          longitude: 55.6,
          elevation: 200,
          altitude: 200,
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
      radioPresets: [],
      departureRecovery: {
        departureProcedure: 'Vertical Takeoff',
        recoveryProcedure: 'Vertical Landing',
      },
      told: {},
      fuel: {
        takeoff: 7000,
        joker: 3500,
        bingo: 2000,
      },
      weather: 'Clear',
      details: { remarks: 'AV-8B CAS mission' },
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Aircraft to AV8B and Version to 2', () => {
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Aircraft).toBe('AV8B')
    expect(result.Version).toBe(2)
    expect(result.KneeboardNotes).toBeNull()
  })

  it('should format coordinates as DDM', () => {
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 25°30.000'")
    expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 055°30.000'")
  })

  it('should export only waypoints (no radios, CMS, or misc)', () => {
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Upload.Waypoints).toBe(true)
    expect(result.Waypoints.Waypoints).toHaveLength(2)
    // AV-8B only has Upload.Waypoints — no other sections
    expect(Object.keys(result.Upload)).toEqual(['Waypoints'])
  })

  it('should set Target flag for TGT waypoints', () => {
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Target).toBe(false)
    expect(result.Waypoints.Waypoints[1].Target).toBe(true)
  })

  it('should set Waypoints upload false when no waypoints', () => {
    mockMission.waypoints = []
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Upload.Waypoints).toBe(false)
    expect(result.Waypoints.Waypoints).toHaveLength(0)
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
    const result = exportAV8BDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 00°00.000'")
    expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 000°00.000'")
  })

  it('should merge template data', () => {
    const template = { Upload: { Waypoints: false } }
    const result = exportAV8BDCSDTC(mockMission, 0, template)
    expect(result.Upload.Waypoints).toBe(true) // mission overwrites
    expect(result.Aircraft).toBe('AV8B')
  })
})
