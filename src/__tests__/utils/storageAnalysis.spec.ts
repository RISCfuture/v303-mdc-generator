import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateStorageStats,
  getStorageStatus,
  estimateMissionSize,
  formatBytes,
  STORAGE_LIMITS,
} from '@/utils/storageAnalysis'
import type { Mission } from '@/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock Blob for byte size calculation
global.Blob = class Blob {
  public size: number
  public constructor(parts: unknown[]) {
    // Simple approximation: count characters (will be UTF-16)
    const str = parts.join('')
    this.size = str.length * 2 // UTF-16 uses 2 bytes per character (simplified)
  }
} as unknown as typeof Blob

describe('storageAnalysis', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
      expect(formatBytes(500)).toBe('500 Bytes')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
    })
  })

  describe('calculateStorageStats', () => {
    it('should return zero stats when localStorage is empty', async () => {
      const stats = await calculateStorageStats()

      expect(stats.totalBytes).toBe(0)
      expect(stats.missionCount).toBe(0)
      expect(stats.averageMissionSize).toBe(0)
      expect(stats.estimatedMissionsRemaining).toBe(0)
    })

    it('should calculate stats correctly with missions', async () => {
      const mockStorage = {
        version: 2,
        missions: [
          { id: '1', n: 'Mission 1' },
          { id: '2', n: 'Mission 2' },
        ],
      }

      localStorage.setItem('v303-missions', JSON.stringify(mockStorage))

      const stats = await calculateStorageStats()

      expect(stats.missionCount).toBe(2)
      expect(stats.totalBytes).toBeGreaterThan(0)
      expect(stats.averageMissionSize).toBeGreaterThan(0)
      expect(stats.percentUsed).toBeGreaterThan(0)
      expect(stats.remainingBytes).toBeGreaterThan(0)
    })

    it('should handle malformed storage data', async () => {
      localStorage.setItem('v303-missions', 'invalid json')

      const stats = await calculateStorageStats()

      expect(stats.totalBytes).toBeGreaterThan(0) // Still has data
      expect(stats.missionCount).toBe(0) // But can't parse missions
    })
  })

  describe('getStorageStatus', () => {
    it('should return ok status when storage is mostly empty', async () => {
      const mockStorage = {
        version: 2,
        missions: [{ id: '1', n: 'Small mission' }],
      }

      localStorage.setItem('v303-missions', JSON.stringify(mockStorage))

      const status = await getStorageStatus()

      expect(status.level).toBe('ok')
      expect(status.shouldWarn).toBe(false)
    })

    it('should return warning status at 80% capacity', async () => {
      // Create a large string to simulate 80% usage
      // Account for UTF-16 encoding (2 bytes per char) and JSON overhead
      const targetSize = Math.floor(STORAGE_LIMITS.CONSERVATIVE_LIMIT * 0.8)
      // Each character is 2 bytes in UTF-16, plus JSON overhead (~50 bytes)
      const missionData = 'x'.repeat(Math.floor((targetSize - 50) / 2))

      const mockStorage = {
        version: 2,
        missions: [{ id: '1', data: missionData }],
      }

      localStorage.setItem('v303-missions', JSON.stringify(mockStorage))

      const status = await getStorageStatus()

      expect(status.stats.percentUsed).toBeGreaterThanOrEqual(0.75) // 75% as decimal
      expect(status.level).toMatch(/warning|critical/u)
      expect(status.shouldWarn).toBe(true)
    })
  })

  describe('estimateMissionSize', () => {
    it('should estimate mission size', () => {
      const mockMission: Mission = {
        id: 'test-1',
        name: 'Test Mission',
        callsign: 'VIPER',
        date: '2024-01-01',
        missionNumber: '001',
        type: 'CAP',
        squadron: 'v93 FS',
        theater: 'Nevada',
        crew: [],
        waypoints: [],
        loadout: [],
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
        },
        radioPresets: [],
        departureRecovery: {},
        told: {},
        fuel: {
          takeoff: 11000,
          joker: 5000,
          bingo: 3000,
        },
        details: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const size = estimateMissionSize(mockMission)

      expect(size).toBeGreaterThan(0)
      expect(typeof size).toBe('number')
    })

    it('should estimate larger missions correctly', () => {
      const smallMission: Mission = {
        id: 'test-1',
        name: 'Small',
        callsign: 'TEST',
        date: '2024-01-01',
        missionNumber: '001',
        type: 'CAP',
        squadron: 'v93 FS',
        theater: 'Nevada',
        crew: [],
        waypoints: [],
        loadout: [],
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
        },
        radioPresets: [],
        departureRecovery: {},
        told: {},
        fuel: { takeoff: 11000, joker: 5000, bingo: 3000 },
        details: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const largeMission: Mission = {
        ...smallMission,
        id: 'test-2',
        name: 'Large Mission with Many Waypoints',
        waypoints: Array.from({ length: 20 }, (_, i) => ({
          sequence: i + 1,
          name: `WP${i + 1}`,
          latitude: 36.0 + i * 0.1,
          longitude: -115.0 + i * 0.1,
          altitude: 15000 + i * 1000,
        })),
        crew: Array.from({ length: 4 }, (_, i) => ({
          position: i === 0 ? 'LEAD' : `${i + 1}`,
          pilot: `Pilot ${i + 1}`,
          callsign: `CS${i}`,
          own: `${i + 1}`,
          stn: '1234',
          mode3: '5678',
          aaTcn: '99Y',
          intraflight: '123.45',
          laser: '1688',
        })),
      }

      const smallSize = estimateMissionSize(smallMission)
      const largeSize = estimateMissionSize(largeMission)

      expect(largeSize).toBeGreaterThan(smallSize)
    })
  })

  describe('STORAGE_LIMITS constants', () => {
    it('should have reasonable limits defined', () => {
      expect(STORAGE_LIMITS.TYPICAL_LIMIT).toBe(5 * 1024 * 1024) // 5MB
      expect(STORAGE_LIMITS.CONSERVATIVE_LIMIT).toBe(4.5 * 1024 * 1024) // 4.5MB
      expect(STORAGE_LIMITS.WARNING_THRESHOLD).toBe(0.8) // 80%
      expect(STORAGE_LIMITS.CRITICAL_THRESHOLD).toBe(0.9) // 90%

      // Conservative limit should be less than typical
      expect(STORAGE_LIMITS.CONSERVATIVE_LIMIT).toBeLessThan(STORAGE_LIMITS.TYPICAL_LIMIT)

      // Warning should come before critical
      expect(STORAGE_LIMITS.WARNING_THRESHOLD).toBeLessThan(STORAGE_LIMITS.CRITICAL_THRESHOLD)
    })
  })
})
