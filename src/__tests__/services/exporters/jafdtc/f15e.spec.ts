import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mission } from '@/types'

// Mock crypto.randomUUID to return predictable value
const mockUUID = '12345678-1234-1234-1234-123456789abc'
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
})

const { exportF15EJAFDTC } = await import('@/services/exporters/jafdtc/f15e')

describe('F-15E JAFDTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-f15e-jafdtc',
      name: 'Test F-15E JAFDTC',
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
          latitude: 31.52045,
          longitude: 65.87226667,
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
        [{ number: 1, frequency: '305.000', description: 'Tower' }],
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
      details: {},
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Version to F15E-1.0 and Airframe to 4', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.Version).toBe('F15E-1.0')
    expect(result.Airframe).toBe(4)
  })

  it('should format coordinates as decimal degrees', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.STPT.Points[0].Lat).toBe('31.52045000')
    expect(result.STPT.Points[0].Lon).toBe('65.87226667')
  })

  it('should export STPT points with Route A and IsTarget', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.STPT.Points).toHaveLength(2)
    expect(result.STPT.Points[0].Route).toBe('A')
    expect(result.STPT.Points[0].IsTarget).toBe(false)
    expect(result.STPT.Points[1].IsTarget).toBe(true)
    expect(result.STPT.Points[1].Name).toBe('TGT 1')
  })

  it('should export UFC with TACAN, ILS, and LowAltWarn', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.UFC.TACANChannel).toBe('15')
    expect(result.UFC.TACANBand).toBe('X') // X band
    expect(result.UFC.TACANMode).toBe('1')
    expect(result.UFC.LowAltWarn).toBe('400')
    expect(result.UFC.ILSFrequency).toBe('108.10')
    expect(result.UFC.ILSCourse).toBe('0')
  })

  it('should export Misc with bingo', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.Misc.Bingo).toBe('6000')
  })

  it('should export radio presets for 2 radios', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.Radio.Presets).toHaveLength(2)
    expect(result.Radio.Presets[0]).toHaveLength(1)
    expect(result.Radio.Presets[1]).toHaveLength(1)
    expect(result.Radio.Presets[0][0].Frequency).toBe('305.00')
  })

  it('should set UID and metadata', () => {
    const result = exportF15EJAFDTC(mockMission)
    expect(result.UID).toBe(mockUUID)
    expect(result.Name).toBe('Test F-15E JAFDTC')
    expect(result.Filename).toBe('test_f-15e_jafdtc')
    expect(result.IsFavorite).toBe(false)
  })

  it('should merge template data', () => {
    const template = { Misc: { Bingo: '999' } }
    const result = exportF15EJAFDTC(mockMission, 0, template)
    expect(result.Misc.Bingo).toBe('6000') // mission overwrites
    expect(result.Version).toBe('F15E-1.0')
  })

  it('should default LowAltWarn to 500 when no TOLD data', () => {
    mockMission.told = {}
    const result = exportF15EJAFDTC(mockMission)
    expect(result.UFC.LowAltWarn).toBe('500')
  })
})
