import { describe, it, expect } from 'vitest'
import type { Waypoint } from '@/types'
import {
  calculateDistance,
  calculateTime,
  parseTOT,
  formatTOT,
  calculateTOTPlaceholders,
  calculateWaypointPairs,
} from '@/composables/useWaypointCalculations'

describe('useWaypointCalculations', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two waypoints in nautical miles', () => {
      const wp1: Waypoint = {
        sequence: 1,
        name: 'WP1',
        latitude: 36.2057583,
        longitude: 65.8476583,
        altitude: 10000,
      }
      const wp2: Waypoint = {
        sequence: 2,
        name: 'WP2',
        latitude: 36.3,
        longitude: 66.0,
        altitude: 10000,
      }

      const distance = calculateDistance(wp1, wp2)
      expect(distance).not.toBeNull()
      expect(distance!).toBeGreaterThan(0)
      // Distance should be approximately 9-10 nautical miles
      expect(distance!).toBeCloseTo(9.3, 0.5)
    })

    it('should return null if coordinates are missing', () => {
      const wp1: Waypoint = {
        sequence: 1,
        name: 'WP1',
        latitude: 0,
        longitude: 0,
        altitude: 10000,
      }
      const wp2: Waypoint = {
        sequence: 2,
        name: 'WP2',
        latitude: 0,
        longitude: 0,
        altitude: 10000,
      }

      const distance = calculateDistance(wp1, wp2)
      expect(distance).toBeCloseTo(0, 0)
    })
  })

  describe('calculateTime', () => {
    it('should calculate time in minutes given distance and speed', () => {
      const distance = 100 // nautical miles
      const speed = 300 // knots

      const time = calculateTime(distance, speed)
      expect(time).not.toBeNull()
      expect(time!).toBeCloseTo(20, 0.1) // 100 / 300 * 60 = 20 minutes
    })

    it('should return null if distance is 0', () => {
      const time = calculateTime(0, 300)
      expect(time).toBeNull()
    })

    it('should return null if speed is 0', () => {
      const time = calculateTime(100, 0)
      expect(time).toBeNull()
    })

    it('should return null if speed is negative', () => {
      const time = calculateTime(100, -300)
      expect(time).toBeNull()
    })
  })

  describe('parseTOT', () => {
    it('should parse HH:MM format', () => {
      expect(parseTOT('12:30')).toBe(750) // 12 * 60 + 30
      expect(parseTOT('18:00')).toBe(1080) // 18 * 60
      expect(parseTOT('0:00')).toBe(0)
    })

    it('should parse HHMM format', () => {
      expect(parseTOT('1230')).toBe(750)
      expect(parseTOT('1800')).toBe(1080)
      expect(parseTOT('0000')).toBe(0)
    })

    it('should parse HHMMz format', () => {
      expect(parseTOT('1230z')).toBe(750)
      expect(parseTOT('1800Z')).toBe(1080)
    })

    it('should return null for invalid formats', () => {
      expect(parseTOT('invalid')).toBeNull()
      expect(parseTOT('25:00')).toBeNull() // Invalid hour
      expect(parseTOT('12:60')).toBeNull() // Invalid minute
      expect(parseTOT('')).toBeNull()
      expect(parseTOT(undefined)).toBeNull()
    })
  })

  describe('formatTOT', () => {
    it('should format minutes since midnight to HHMMz (with z)', () => {
      expect(formatTOT(750)).toBe('1230z') // 12:30
      expect(formatTOT(1080)).toBe('1800z') // 18:00
      expect(formatTOT(0)).toBe('0000z') // 00:00
    })

    it('should handle times that wrap past midnight', () => {
      expect(formatTOT(1440)).toBe('0000z') // 24:00 = 00:00
      expect(formatTOT(1500)).toBe('0100z') // 25:00 = 01:00
    })
  })

  describe('calculateTOTPlaceholders', () => {
    it('should return "----" for waypoints without reference TOT', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          speed: 300,
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
          speed: 300,
        },
      ]

      const placeholders = calculateTOTPlaceholders(waypoints)
      expect(placeholders).toEqual(['----', '----'])
    })

    it('should use entered TOT as placeholder', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          timeOnTarget: '1200z',
        },
      ]

      const placeholders = calculateTOTPlaceholders(waypoints)
      expect(placeholders[0]).toBe('1200z')
    })

    it('should calculate downpath TOT from reference point', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          speed: 300,
          timeOnTarget: '1200z', // 12:00 = 720 minutes
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
          speed: 300,
        },
      ]

      const placeholders = calculateTOTPlaceholders(waypoints)
      expect(placeholders[0]).toBe('1200z')
      // WP2 should have calculated TOT (exact value depends on distance)
      expect(placeholders[1]).not.toBe('----')
      expect(placeholders[1]).toMatch(/\d{4}z/)
    })

    it('should reset calculation at each entered TOT', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          speed: 300,
          timeOnTarget: '1200z',
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
          speed: 300,
        },
        {
          sequence: 3,
          name: 'WP3',
          latitude: 36.2,
          longitude: 65.2,
          altitude: 10000,
          speed: 300,
          timeOnTarget: '1300z', // New reference point
        },
        {
          sequence: 4,
          name: 'WP4',
          latitude: 36.3,
          longitude: 65.3,
          altitude: 10000,
          speed: 300,
        },
      ]

      const placeholders = calculateTOTPlaceholders(waypoints)
      expect(placeholders[0]).toBe('1200z')
      expect(placeholders[2]).toBe('1300z')
      // WP4 should calculate from WP3's TOT, not WP1's
      expect(placeholders[3]).not.toBe('----')
    })

    it('should return "----" if speed is missing on FROM waypoint', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          timeOnTarget: '1200z',
          // No speed on WP1
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
          speed: 300,
        },
        {
          sequence: 3,
          name: 'WP3',
          latitude: 36.2,
          longitude: 65.2,
          altitude: 10000,
          speed: 300,
        },
      ]

      const placeholders = calculateTOTPlaceholders(waypoints)
      expect(placeholders[0]).toBe('1200z')
      expect(placeholders[1]).toBe('----') // Can't calculate from WP1 to WP2 without WP1's speed
      expect(placeholders[2]).toBe('----') // Can't calculate past missing speed
    })
  })

  describe('calculateWaypointPairs', () => {
    it('should calculate distance and time for waypoint pairs', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          speed: 300,
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
          speed: 300,
        },
      ]

      const pairs = calculateWaypointPairs(waypoints)
      expect(pairs).toHaveLength(1)
      expect(pairs[0].from).toBe(waypoints[0])
      expect(pairs[0].to).toBe(waypoints[1])
      expect(pairs[0].distance).not.toBeNull()
      expect(pairs[0].time).not.toBeNull()
    })

    it('should return null time if speed is missing', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
          // No speed
        },
        {
          sequence: 2,
          name: 'WP2',
          latitude: 36.1,
          longitude: 65.1,
          altitude: 10000,
        },
      ]

      const pairs = calculateWaypointPairs(waypoints)
      expect(pairs[0].distance).not.toBeNull()
      expect(pairs[0].time).toBeNull()
    })

    it('should return empty array for single waypoint', () => {
      const waypoints: Waypoint[] = [
        {
          sequence: 1,
          name: 'WP1',
          latitude: 36.0,
          longitude: 65.0,
          altitude: 10000,
        },
      ]

      const pairs = calculateWaypointPairs(waypoints)
      expect(pairs).toHaveLength(0)
    })
  })
})
