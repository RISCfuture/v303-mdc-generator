import { describe, it, expect, beforeEach } from 'vitest'
import type { Mission } from '@/types'
import { exportF15EDCSDTC } from '@/services/exporters/dcsDtc/f15e'

describe('F-15E DCS-DTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-f15e',
      name: 'Test F-15E Mission',
      callsign: 'EAGLE1',
      flightCallsignOverride: 'EAGLE',
      link16PrefixOverride: 'EG',
      date: '2024-06-15',
      missionNumber: 'M030',
      type: 'STRIKE',
      squadron: 'v93',
      theater: 'PersianGulf',
      crew: [
        {
          position: 'LEAD',
          pilot: 'Test Pilot F15E',
          callsign: 'EG',
          own: '1',
          stn: '11111',
          mode3: '3456',
          aaTcn: '15X / 78X',
          intraflight: '251.0',
          laser: '1511',
          tailNumber: '91-0300',
        },
      ],
      packageMembers: [],
      supportAssets: [],
      waypoints: [
        {
          sequence: 1,
          name: 'STPT 1',
          latitude: 31.855433333333,
          longitude: 64.2132,
          elevation: 2906,
          altitude: 2906,
          speed: 450,
        },
        {
          sequence: 2,
          name: 'TGT 1',
          latitude: 31.9,
          longitude: 64.25,
          elevation: 3000,
          altitude: 3000,
          speed: null,
          type: 'TGT',
          timeOnTarget: '15:00:00',
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
          { number: 2, frequency: '251.000', description: 'AWACS' },
        ],
        [{ number: 1, frequency: '127.500', description: 'Ground' }],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        recoveryProcedure: 'Standard Pattern',
      },
      told: { minAgl: 400 },
      fuel: {
        takeoff: 20000,
        joker: 10000,
        bingo: 6000,
      },
      weather: 'Clear',
      details: { remarks: 'F-15E strike mission' },
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Aircraft to F15E and Version to 2', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.Aircraft).toBe('F15E')
    expect(result.Version).toBe(2)
    expect(result.KneeboardNotes).toBeNull()
  })

  it('should format coordinates as DDM', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.RouteA.Waypoints[0].Latitude).toBe("N 31°51.326'")
    expect(result.RouteA.Waypoints[0].Longitude).toBe("E 064°12.792'")
  })

  it('should use RouteA for waypoints', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.RouteA.Waypoints).toHaveLength(2)
    expect(result.RouteA.Waypoints[1].Target).toBe(true)
    expect(result.RouteA.Waypoints[1].TimeOverSteerpoint).toBe('15:00:00')
  })

  it('should export radio presets for 2 radios', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.Radios).not.toBeNull()
    expect(result.Radios!.Radio1.Presets).toHaveLength(2)
    expect(result.Radios!.Radio2.Presets).toHaveLength(1)
  })

  it('should export Misc with TACAN, bingo, CARA ALOW, laser', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.Misc.TACANChannel).toBe(15)
    expect(result.Misc.TACANBand).toBe(0) // X band
    expect(result.Misc.Bingo).toBe(6000)
    expect(result.Misc.CARAALOW).toBe(400)
    expect(result.Misc.CARAALOWToBeUpdated).toBe(true)
    expect(result.Misc.TGPCode).toBe(1511)
    expect(result.Misc.LSTCode).toBe(1511)
  })

  it('should set upload flags correctly', () => {
    const result = exportF15EDCSDTC(mockMission)
    expect(result.Upload.RouteA).toBe(true)
    expect(result.Upload.Radios).toBe(true)
    expect(result.Upload.Misc).toBe(true)
    expect(result.Upload.Kneeboard).toBe(false)
  })

  it('should set RouteA upload false when no waypoints', () => {
    mockMission.waypoints = []
    const result = exportF15EDCSDTC(mockMission)
    expect(result.Upload.RouteA).toBe(false)
  })

  it('should merge template data', () => {
    const template = { Misc: { Bingo: 999 } }
    const result = exportF15EDCSDTC(mockMission, 0, template)
    expect(result.Misc.Bingo).toBe(6000) // mission overwrites
    expect(result.Aircraft).toBe('F15E')
  })
})
