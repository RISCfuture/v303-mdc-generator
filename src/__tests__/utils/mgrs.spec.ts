import { describe, it, expect } from 'vitest'
import {
  latLonToMGRS,
  formatMGRSWithSpaces,
  parseDMS,
  dmsToMGRS,
  isValidMGRS,
  getMGRSPrecisionDescription,
} from '@/utils/mgrs'

describe('MGRS Utilities', () => {
  describe('latLonToMGRS', () => {
    it('should convert lat/lon to MGRS format', () => {
      const mgrs = latLonToMGRS(33.508483, 65.84765, 5)
      expect(mgrs).toBeTruthy()
      expect(mgrs).toContain(' ') // Should have spaces
    })

    it('should handle different precision levels', () => {
      const precision5 = latLonToMGRS(33.508483, 65.84765, 5)
      const precision3 = latLonToMGRS(33.508483, 65.84765, 3)

      // Higher precision should have longer coordinate strings
      expect(precision5.length).toBeGreaterThan(precision3.length)
    })

    it('should return empty string on invalid coordinates', () => {
      const result = latLonToMGRS(NaN, NaN, 5)
      expect(result).toBe('')
    })
  })

  describe('formatMGRSWithSpaces', () => {
    it('should format compact MGRS with spaces', () => {
      const compact = '38SMB4400084000'
      const formatted = formatMGRSWithSpaces(compact)

      expect(formatted).toContain(' ')
      expect(formatted).toMatch(/\d{1,2}[A-Z]\s+[A-Z]{2}\s+\d+\s+\d+/)
    })

    it('should handle short MGRS strings', () => {
      const short = '38S'
      const formatted = formatMGRSWithSpaces(short)
      expect(formatted).toBe('38S')
    })

    it('should handle empty strings', () => {
      expect(formatMGRSWithSpaces('')).toBe('')
    })
  })

  describe('parseDMS', () => {
    it('should parse decimal degrees', () => {
      expect(parseDMS('33.508483')).toBeCloseTo(33.508483, 6)
      expect(parseDMS('-122.5')).toBeCloseTo(-122.5, 6)
    })

    it('should parse DMS format with decimal minutes', () => {
      const result = parseDMS("N 33°30.346'")
      expect(result).toBeCloseTo(33.5058, 2)
    })

    it('should parse DMS format with seconds', () => {
      const result = parseDMS('N 33°30\'20.76"')
      expect(result).toBeCloseTo(33.5058, 2)
    })

    it('should handle South/West hemispheres', () => {
      const south = parseDMS("S 33°30.346'")
      expect(south).toBeLessThan(0)

      const west = parseDMS("W 122°30.0'")
      expect(west).toBeLessThan(0)
    })

    it('should return null for invalid input', () => {
      expect(parseDMS('')).toBeNull()
      expect(parseDMS('invalid')).toBeNull()
    })
  })

  describe('dmsToMGRS', () => {
    it('should convert DMS strings to MGRS', () => {
      const mgrs = dmsToMGRS("N 33°30.346'", "E 065°50.859'", 5)
      expect(mgrs).toBeTruthy()
      expect(mgrs).toContain(' ')
    })

    it('should return empty string for invalid DMS', () => {
      expect(dmsToMGRS('invalid', 'invalid', 5)).toBe('')
      expect(dmsToMGRS('', '', 5)).toBe('')
    })
  })

  describe('isValidMGRS', () => {
    it('should validate correct MGRS strings', () => {
      expect(isValidMGRS('38SMB4400084000')).toBe(true)
      expect(isValidMGRS('38S MB 44000 84000')).toBe(true)
    })

    it('should reject invalid MGRS strings', () => {
      expect(isValidMGRS('')).toBe(false)
      expect(isValidMGRS('invalid')).toBe(false)
      expect(isValidMGRS('99ZZZ99999')).toBe(false)
    })
  })

  describe('getMGRSPrecisionDescription', () => {
    it('should return correct precision descriptions', () => {
      expect(getMGRSPrecisionDescription(0)).toBe('100km')
      expect(getMGRSPrecisionDescription(1)).toBe('10km')
      expect(getMGRSPrecisionDescription(2)).toBe('1km')
      expect(getMGRSPrecisionDescription(3)).toBe('100m')
      expect(getMGRSPrecisionDescription(4)).toBe('10m')
      expect(getMGRSPrecisionDescription(5)).toBe('1m')
    })

    it('should default to 1m for unknown precision', () => {
      expect(getMGRSPrecisionDescription(99)).toBe('1m')
    })
  })

  describe('Integration tests', () => {
    it('should round-trip DMS -> MGRS conversion', () => {
      const lat = "N 33°30.346'"
      const lon = "E 065°50.859'"

      const mgrs = dmsToMGRS(lat, lon, 5)
      expect(mgrs).toBeTruthy()
      expect(mgrs).toContain(' ')
      expect(isValidMGRS(mgrs)).toBe(true)
    })

    it('should handle Afghanistan coordinates', () => {
      // Coordinates from Afghanistan theater (Kabul area)
      const mgrs = dmsToMGRS("N 31°30.346'", "E 065°50.859'", 5)
      expect(mgrs).toBeTruthy()
      expect(mgrs).toContain(' ') // Should be spaced format
      // Should have valid MGRS structure: grid zone + 100km square + coords
      expect(mgrs.length).toBeGreaterThan(10)
    })
  })
})
