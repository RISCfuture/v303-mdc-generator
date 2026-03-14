import { describe, it, expect, beforeEach } from 'vitest'
import type { Mission } from '@/types'
import { exportCH47FDCSDTC } from '@/services/exporters/dcsDtc/ch47f'

describe('CH-47F DCS-DTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-ch47f',
      name: 'Test CH-47F Mission',
      callsign: 'CHINOOK1',
      date: '2024-06-15',
      missionNumber: 'M050',
      type: 'TRANSPORT',
      squadron: 'v93',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot CH47F',
          callsign: 'CH',
          own: '1',
          stn: '11111',
          mode3: '5678',
          aaTcn: '25Y / 88Y',
          intraflight: '251.0',
          laser: '1688',
          tailNumber: '08-08000',
        },
      ],
      packageMembers: [],
      supportAssets: [],
      waypoints: [
        {
          sequence: 1,
          name: 'LZ ALPHA',
          latitude: 26.0,
          longitude: 56.0,
          elevation: 50,
          altitude: 50,
          speed: 120,
        },
        {
          sequence: 2,
          name: 'LZ BRAVO',
          latitude: 26.5,
          longitude: 56.5,
          elevation: 100,
          altitude: 100,
          speed: 120,
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
        [
          { number: 1, frequency: '305.000', description: 'Tower' },
          { number: 2, frequency: '251.000', description: 'Ground' },
        ],
        [{ number: 1, frequency: '127.500', description: 'CTAF' }],
      ],
      departureRecovery: {
        departureProcedure: 'Standard',
        recoveryProcedure: 'Standard',
      },
      told: {},
      fuel: {
        takeoff: 10000,
        joker: 5000,
        bingo: 3000,
      },
      weather: 'Clear',
      details: { remarks: 'CH-47F transport mission' },
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Aircraft to CH47F and Version to 2', () => {
    const result = exportCH47FDCSDTC(mockMission)
    expect(result.Aircraft).toBe('CH47F')
    expect(result.Version).toBe(2)
    expect(result.KneeboardNotes).toBeNull()
  })

  it('should format coordinates as DDM', () => {
    const result = exportCH47FDCSDTC(mockMission)
    expect(result.Waypoints.Waypoints[0].Latitude).toBe("N 26°00.000'")
    expect(result.Waypoints.Waypoints[0].Longitude).toBe("E 056°00.000'")
  })

  it('should export waypoints and radios', () => {
    const result = exportCH47FDCSDTC(mockMission)
    expect(result.Upload.Waypoints).toBe(true)
    expect(result.Upload.Radios).toBe(true)
    expect(result.Waypoints.Waypoints).toHaveLength(2)
    expect(result.Radios).not.toBeNull()
    expect(result.Radios!.Radio1.Presets).toHaveLength(2)
  })

  it('should set upload flags false when no data', () => {
    mockMission.waypoints = []
    mockMission.radioPresets = []
    const result = exportCH47FDCSDTC(mockMission)
    expect(result.Upload.Waypoints).toBe(false)
    expect(result.Upload.Radios).toBe(false)
    expect(result.Radios).toBeNull()
  })

  it('should use generic DCS-DTC format (WaypointsCapture present)', () => {
    const result = exportCH47FDCSDTC(mockMission)
    expect(result.WaypointsCapture).toEqual({
      NavPointsMode: 0,
      TgtPointsMode: 0,
      NavPointsRangeFrom: 1,
      TgtPointsRangeFrom: 1,
    })
  })
})
