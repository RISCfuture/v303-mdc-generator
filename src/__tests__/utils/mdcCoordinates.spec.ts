import { describe, it, expect } from 'vitest'
import { formatDDM } from '@/services/exporters/dcsDtc/coordinates'
import { formatDecimalDegrees } from '@/services/exporters/jafdtc/coordinates'

describe('MDC Coordinate Formatters', () => {
  describe('formatDDM (DCS-DTC)', () => {
    it('should format positive latitude correctly', () => {
      // N 12°34.567'
      const result = formatDDM(12.576116666667, 'latitude')
      expect(result).toBe("N 12°34.567'")
    })

    it('should format negative latitude correctly', () => {
      const result = formatDDM(-12.576116666667, 'latitude')
      expect(result).toBe("S 12°34.567'")
    })

    it('should format positive longitude correctly', () => {
      // E 123°45.678'
      const result = formatDDM(123.7613, 'longitude')
      expect(result).toBe("E 123°45.678'")
    })

    it('should format negative longitude correctly', () => {
      const result = formatDDM(-123.7613, 'longitude')
      expect(result).toBe("W 123°45.678'")
    })

    it('should pad latitude degrees to 2 digits', () => {
      const result = formatDDM(5.5, 'latitude')
      expect(result).toBe("N 05°30.000'")
    })

    it('should pad longitude degrees to 3 digits', () => {
      const result = formatDDM(5.5, 'longitude')
      expect(result).toBe("E 005°30.000'")
    })

    it('should handle whole degrees correctly', () => {
      const result = formatDDM(31.0, 'latitude')
      expect(result).toBe("N 31°00.000'")
    })

    it('should match example from F-16 fixture - Camp Bastion', () => {
      // "Latitude": "N 31°51.326'"
      const result = formatDDM(31.855433333333, 'latitude')
      expect(result).toBe("N 31°51.326'")
    })

    it('should match example from F-16 fixture - Camp Bastion longitude', () => {
      // "Longitude": "E 064°12.792'"
      const result = formatDDM(64.2132, 'longitude')
      expect(result).toBe("E 064°12.792'")
    })
  })

  describe('formatDecimalDegrees (JAFDTC)', () => {
    it('should format positive coordinate with 8 decimal places', () => {
      const result = formatDecimalDegrees(31.52045)
      expect(result).toBe('31.52045000')
    })

    it('should format negative coordinate with 8 decimal places', () => {
      const result = formatDecimalDegrees(-65.87226667)
      expect(result).toBe('-65.87226667')
    })

    it('should match example from A-10C fixture - AKOGE lat', () => {
      // "Lat": "31.52045000"
      const result = formatDecimalDegrees(31.52045)
      expect(result).toBe('31.52045000')
    })

    it('should match example from A-10C fixture - AKOGE lon', () => {
      // "Lon": "65.87226667"
      const result = formatDecimalDegrees(65.87226667)
      expect(result).toBe('65.87226667')
    })

    it('should handle whole numbers correctly', () => {
      const result = formatDecimalDegrees(31)
      expect(result).toBe('31.00000000')
    })

    it('should handle zero correctly', () => {
      const result = formatDecimalDegrees(0)
      expect(result).toBe('0.00000000')
    })
  })
})
