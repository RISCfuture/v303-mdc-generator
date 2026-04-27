import { describe, it, expect } from 'vitest'
import { formatDDM } from '@/services/exporters/dcsDtc/coordinates'
import { formatDecimalDegrees } from '@/services/exporters/jafdtc/coordinates'

describe('MDC Coordinate Formatters', () => {
  describe('formatDDM (DCS-DTC)', () => {
    it('should format positive latitude correctly', () => {
      const result = formatDDM(12.576116666667, 'latitude')
      expect(result).toBe('N 12°34.567’')
    })

    it('should format negative latitude correctly', () => {
      const result = formatDDM(-12.576116666667, 'latitude')
      expect(result).toBe('S 12°34.567’')
    })

    it('should format positive longitude correctly', () => {
      const result = formatDDM(123.7613, 'longitude')
      expect(result).toBe('E 123°45.678’')
    })

    it('should format negative longitude correctly', () => {
      const result = formatDDM(-123.7613, 'longitude')
      expect(result).toBe('W 123°45.678’')
    })

    it('should pad latitude degrees to 2 digits', () => {
      const result = formatDDM(5.5, 'latitude')
      expect(result).toBe('N 05°30.000’')
    })

    it('should pad longitude degrees to 3 digits', () => {
      const result = formatDDM(5.5, 'longitude')
      expect(result).toBe('E 005°30.000’')
    })

    it('should handle whole degrees correctly', () => {
      const result = formatDDM(31.0, 'latitude')
      expect(result).toBe('N 31°00.000’')
    })

    it('should match example from F-16 fixture - Camp Bastion', () => {
      const result = formatDDM(31.855433333333, 'latitude')
      expect(result).toBe('N 31°51.326’')
    })

    it('should match example from F-16 fixture - Camp Bastion longitude', () => {
      const result = formatDDM(64.2132, 'longitude')
      expect(result).toBe('E 064°12.792’')
    })

    it('uses U+2019 RIGHT SINGLE QUOTATION MARK, not U+0027 ASCII apostrophe', () => {
      // F-16/F-15E/FA18 DCS-DTC uploaders only strip U+2019; emitting
      // U+0027 makes Uploader.Digits crash on the surviving apostrophe.
      const result = formatDDM(31.855433333333, 'latitude')
      expect(result.codePointAt(result.length - 1)).toBe(0x2019)
      expect(result.includes("'")).toBe(false)
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
      const result = formatDecimalDegrees(31.52045)
      expect(result).toBe('31.52045000')
    })

    it('should match example from A-10C fixture - AKOGE lon', () => {
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
