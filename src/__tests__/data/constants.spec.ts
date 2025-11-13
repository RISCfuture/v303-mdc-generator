import { describe, it, expect } from 'vitest'
import {
  MISSION_TYPES,
  STEERPOINT_TYPES,
  STATION_COUNTS,
  getCrewPositionLabel,
  getCrewPositionShort,
} from '@/data/constants'

describe('constants', () => {
  describe('MISSION_TYPES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(MISSION_TYPES)).toBe(true)
      expect(MISSION_TYPES.length).toBeGreaterThan(0)
    })

    it('should contain expected mission types', () => {
      const expectedTypes = ['CAP', 'CAS', 'SEAD', 'STRIKE']
      expectedTypes.forEach((type) => {
        expect(MISSION_TYPES).toContain(type)
      })
    })

    it('should contain only uppercase strings', () => {
      MISSION_TYPES.forEach((type) => {
        expect(type).toBe(type.toUpperCase())
      })
    })

    it('should not have duplicates', () => {
      const uniqueTypes = [...new Set(MISSION_TYPES)]
      expect(uniqueTypes.length).toBe(MISSION_TYPES.length)
    })
  })

  describe('STEERPOINT_TYPES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(STEERPOINT_TYPES)).toBe(true)
      expect(STEERPOINT_TYPES.length).toBeGreaterThan(0)
    })

    it('should contain expected steerpoint types', () => {
      const expectedTypes = ['IP', 'TGT', 'NAV']
      expectedTypes.forEach((type) => {
        expect(STEERPOINT_TYPES).toContain(type)
      })
    })

    it('should not have duplicates', () => {
      const uniqueTypes = [...new Set(STEERPOINT_TYPES)]
      expect(uniqueTypes.length).toBe(STEERPOINT_TYPES.length)
    })
  })

  describe('STATION_COUNTS', () => {
    it('should be a non-empty object', () => {
      expect(typeof STATION_COUNTS).toBe('object')
      expect(Object.keys(STATION_COUNTS).length).toBeGreaterThan(0)
    })

    it('should have positive integer station counts', () => {
      Object.values(STATION_COUNTS).forEach((count) => {
        expect(count).toBeGreaterThan(0)
        expect(Number.isInteger(count)).toBe(true)
      })
    })

    it('should include known aircraft types', () => {
      const keys = Object.keys(STATION_COUNTS)
      // Check for A-10C or F-16C variants
      expect(keys.some((key) => key.includes('A-10C') || key.includes('F-16C'))).toBe(true)
    })

    it('should have reasonable station counts (1-20 range)', () => {
      Object.values(STATION_COUNTS).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(1)
        expect(count).toBeLessThanOrEqual(20)
      })
    })
  })

  describe('getCrewPositionLabel', () => {
    it('should return "LEAD" for index 0', () => {
      expect(getCrewPositionLabel(0)).toBe('LEAD')
    })

    it('should return "WING" for index 1', () => {
      expect(getCrewPositionLabel(1)).toBe('WING')
    })

    it('should return "ELEMENT LEAD" for index 2', () => {
      expect(getCrewPositionLabel(2)).toBe('ELEMENT LEAD')
    })

    it('should return "ELEMENT WING" for index 3', () => {
      expect(getCrewPositionLabel(3)).toBe('ELEMENT WING')
    })

    it('should return "POSITION N" for index >= 4', () => {
      expect(getCrewPositionLabel(4)).toBe('POSITION 5')
      expect(getCrewPositionLabel(5)).toBe('POSITION 6')
      expect(getCrewPositionLabel(10)).toBe('POSITION 11')
    })

    it('should handle large indices', () => {
      expect(getCrewPositionLabel(99)).toBe('POSITION 100')
    })
  })

  describe('getCrewPositionShort', () => {
    it('should return "-1" for index 0', () => {
      expect(getCrewPositionShort(0)).toBe('-1')
    })

    it('should return "-2" for index 1', () => {
      expect(getCrewPositionShort(1)).toBe('-2')
    })

    it('should return "-3" for index 2', () => {
      expect(getCrewPositionShort(2)).toBe('-3')
    })

    it('should return "-4" for index 3', () => {
      expect(getCrewPositionShort(3)).toBe('-4')
    })

    it('should return "-N" for index >= 4', () => {
      expect(getCrewPositionShort(4)).toBe('-5')
      expect(getCrewPositionShort(5)).toBe('-6')
      expect(getCrewPositionShort(10)).toBe('-11')
    })

    it('should handle large indices', () => {
      expect(getCrewPositionShort(99)).toBe('-100')
    })

    it('should be consistent with getCrewPositionLabel numbering', () => {
      for (let i = 0; i < 10; i++) {
        const short = getCrewPositionShort(i)
        const number = parseInt(short.replace('-', ''))
        expect(number).toBe(i + 1)
      }
    })
  })
})
