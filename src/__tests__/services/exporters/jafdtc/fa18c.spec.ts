import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mission } from '@/types'

// Mock crypto.randomUUID to return predictable value
const mockUUID = '12345678-1234-1234-1234-123456789abc'
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
})

const { exportFA18CJAFDTC } = await import('@/services/exporters/jafdtc/fa18c')

describe('F/A-18C JAFDTC Exporter', () => {
  let mockMission: Mission

  beforeEach(() => {
    mockMission = {
      id: 'test-fa18c-jafdtc',
      name: 'Test FA-18C JAFDTC',
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
          latitude: 31.52045,
          longitude: 65.87226667,
          elevation: 500,
          altitude: 500,
          speed: 350,
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
        cmdsPrograms: [
          {
            number: 1,
            chaffBurstQty: 2,
            chaffBurstInterval: 0.05,
            chaffSalvoQty: 8,
            chaffSalvoInterval: 1.5,
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
        [{ number: 1, frequency: '127.500', description: 'AWACS' }],
      ],
      departureRecovery: {
        departureProcedure: 'Unrestricted Climb',
        recoveryProcedure: 'Standard Pattern',
      },
      told: {},
      fuel: {
        takeoff: 14000,
        joker: 7000,
        bingo: 4000,
      },
      weather: 'Clear',
      details: {},
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    }
  })

  it('should set Version to FA18C-1.0 and Airframe to 6', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.Version).toBe('FA18C-1.0')
    expect(result.Airframe).toBe(6)
  })

  it('should format coordinates as decimal degrees', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.WYPT.Points[0].Lat).toBe('31.52045000')
    expect(result.WYPT.Points[0].Lon).toBe('65.87226667')
  })

  it('should export WYPT points', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.WYPT.Points).toHaveLength(2)
    expect(result.WYPT.Points[0].Name).toBe('STPT 1')
    expect(result.WYPT.Points[0].Alt).toBe('500')
    expect(result.WYPT.Points[0].Number).toBe(1)
  })

  it('should export radio presets for 2 radios', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.Radio.Presets).toHaveLength(2)
    expect(result.Radio.Presets[0]).toHaveLength(2)
    expect(result.Radio.Presets[1]).toHaveLength(1)
    expect(result.Radio.Presets[0][0].Frequency).toBe('305.00')
  })

  it('should export 5 CMS programs with flat 0-based shape, padding missing slots', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.CMS.Programs).toHaveLength(5)
    expect(result.CMS.Programs[0].Number).toBe(0) // 0-based
    expect(result.CMS.Programs[0].ChaffQ).toBe('2')
    expect(result.CMS.Programs[0].FlareQ).toBe('1')
    expect(result.CMS.Programs[0].SQ).toBe('8')
    expect(result.CMS.Programs[0].SI).toBe('1.50')
    // Programs 2-5 are not defined in the mission and should be empty defaults
    expect(result.CMS.Programs[1]).toEqual({
      Number: 1,
      ChaffQ: '',
      FlareQ: '',
      SQ: '',
      SI: '',
    })
  })

  it('should set UID and metadata', () => {
    const result = exportFA18CJAFDTC(mockMission)
    expect(result.UID).toBe(mockUUID)
    expect(result.Name).toBe('Test FA-18C JAFDTC')
    expect(result.Filename).toBe('test_fa-18c_jafdtc')
    expect(result.IsFavorite).toBe(false)
    expect(result.LastSystemEdited).toBe(0)
  })

  it('should merge template data', () => {
    const template = { Radio: { IsDefault: true } }
    const result = exportFA18CJAFDTC(mockMission, 0, template)
    expect(result.Radio.IsDefault).toBe(false) // mission overwrites
    expect(result.Version).toBe('FA18C-1.0')
  })
})
