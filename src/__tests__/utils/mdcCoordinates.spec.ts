import { describe, it, expect } from 'vitest'
import { formatF16LatLon, formatA10LatLon } from '@/utils/coordinates'

describe('MDC Coordinate Formatters', () => {
  describe('formatF16LatLon', () => {
    it('should format positive latitude correctly', () => {
      // N 12°34.567'
      const result = formatF16LatLon(12.576116666667, 'latitude')
      expect(result).toBe("N 12°34.567'")
    })

    it('should format negative latitude correctly', () => {
      const result = formatF16LatLon(-12.576116666667, 'latitude')
      expect(result).toBe("S 12°34.567'")
    })

    it('should format positive longitude correctly', () => {
      // E 123°45.678'
      const result = formatF16LatLon(123.7613, 'longitude')
      expect(result).toBe("E 123°45.678'")
    })

    it('should format negative longitude correctly', () => {
      const result = formatF16LatLon(-123.7613, 'longitude')
      expect(result).toBe("W 123°45.678'")
    })

    it('should pad latitude degrees to 2 digits', () => {
      const result = formatF16LatLon(5.5, 'latitude')
      expect(result).toMatch(/^N 05°/)
    })

    it('should pad longitude degrees to 3 digits', () => {
      const result = formatF16LatLon(5.5, 'longitude')
      expect(result).toMatch(/^E 005°/)
    })

    it('should handle whole degrees correctly', () => {
      const result = formatF16LatLon(31.0, 'latitude')
      expect(result).toBe("N 31°00'")
    })

    it('should match example from F-16 fixture - Camp Bastion', () => {
      // "Latitude": "N 31°51.326'"
      const result = formatF16LatLon(31.855433333333, 'latitude')
      expect(result).toBe("N 31°51.326'")
    })

    it('should match example from F-16 fixture - Camp Bastion longitude', () => {
      // "Longitude": "E 064°12.792'"
      const result = formatF16LatLon(64.2132, 'longitude')
      expect(result).toBe("E 064°12.792'")
    })
  })

  describe('formatA10LatLon', () => {
    it('should format positive coordinate with 8 decimal places', () => {
      const result = formatA10LatLon(31.52045)
      expect(result).toBe('31.52045000')
    })

    it('should format negative coordinate with 8 decimal places', () => {
      const result = formatA10LatLon(-65.87226667)
      expect(result).toBe('-65.87226667')
    })

    it('should match example from A-10C fixture - AKOGE lat', () => {
      // "Lat": "31.52045000"
      const result = formatA10LatLon(31.52045)
      expect(result).toBe('31.52045000')
    })

    it('should match example from A-10C fixture - AKOGE lon', () => {
      // "Lon": "65.87226667"
      const result = formatA10LatLon(65.87226667)
      expect(result).toBe('65.87226667')
    })

    it('should handle whole numbers correctly', () => {
      const result = formatA10LatLon(31)
      expect(result).toBe('31.00000000')
    })

    it('should handle zero correctly', () => {
      const result = formatA10LatLon(0)
      expect(result).toBe('0.00000000')
    })
  })
})
