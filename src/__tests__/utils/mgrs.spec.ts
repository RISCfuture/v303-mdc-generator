import { describe, it, expect } from 'vitest'
import {
  latLonToMGRS,
  mgrsToLatLon,
  parseMGRS,
  detectMGRSPrecision,
  formatMGRSWithSpaces,
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

  describe('mgrsToLatLon', () => {
    it('should convert MGRS to lat/lon', () => {
      const mgrsString = '38S MB 44000 84000'
      const result = mgrsToLatLon(mgrsString)

      expect(result).not.toBeNull()
      expect(result?.lat).toBeGreaterThan(0)
      expect(result?.lon).toBeGreaterThan(0)
    })

    it('should handle compact MGRS format', () => {
      const compact = '38SMB4400084000'
      const result = mgrsToLatLon(compact)

      expect(result).not.toBeNull()
      expect(result?.lat).toBeGreaterThan(0)
      expect(result?.lon).toBeGreaterThan(0)
    })

    it('should validate lat/lon ranges', () => {
      // Invalid MGRS that might produce out-of-range coordinates
      const result = mgrsToLatLon('99ZZZ9999999999')
      expect(result).toBeNull()
    })

    it('should return null for invalid MGRS', () => {
      expect(mgrsToLatLon('')).toBeNull()
      expect(mgrsToLatLon('invalid')).toBeNull()
      expect(mgrsToLatLon('123')).toBeNull()
    })

    it('should round-trip accurately', () => {
      const originalLat = 33.508483
      const originalLon = 65.84765
      const mgrsString = latLonToMGRS(originalLat, originalLon, 5)
      const result = mgrsToLatLon(mgrsString)

      expect(result).not.toBeNull()
      expect(result?.lat).toBeCloseTo(originalLat, 4)
      expect(result?.lon).toBeCloseTo(originalLon, 4)
    })
  })

  describe('parseMGRS', () => {
    it('should parse valid MGRS string', () => {
      const result = parseMGRS('38S MB 44000 84000')
      expect(result).toBe('38SMB4400084000')
    })

    it('should normalize to uppercase', () => {
      const result = parseMGRS('38s mb 44000 84000')
      expect(result).toBe('38SMB4400084000')
    })

    it('should remove spaces', () => {
      const result = parseMGRS('38SMB4400084000')
      expect(result).toBe('38SMB4400084000')
    })

    it('should return null for invalid format', () => {
      expect(parseMGRS('')).toBeNull()
      expect(parseMGRS('invalid')).toBeNull()
      expect(parseMGRS('123')).toBeNull()
      expect(parseMGRS('ABCDE')).toBeNull()
    })

    it('should validate MGRS by attempting conversion', () => {
      // This looks like MGRS format but may not be a valid coordinate
      const result = parseMGRS('99ZZZ9999999999')
      // Should return null because mgrs.inverse will fail
      expect(result).toBeNull()
    })
  })

  describe('detectMGRSPrecision', () => {
    it('should detect precision 5 (1m)', () => {
      const mgrsString = '38S MB 44000 84000'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(5)
    })

    it('should detect precision 4 (10m)', () => {
      const mgrsString = '38S MB 4400 8400'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(4)
    })

    it('should detect precision 3 (100m)', () => {
      const mgrsString = '38S MB 440 840'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(3)
    })

    it('should detect precision 2 (1km)', () => {
      const mgrsString = '38S MB 44 84'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(2)
    })

    it('should detect precision 1 (10km)', () => {
      const mgrsString = '38S MB 4 8'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(1)
    })

    it('should detect precision 0 (100km)', () => {
      const mgrsString = '38S MB'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(0)
    })

    it('should handle compact format', () => {
      const mgrsString = '38SMB4400084000'
      const precision = detectMGRSPrecision(mgrsString)
      expect(precision).toBe(5)
    })

    it('should return null for invalid MGRS', () => {
      expect(detectMGRSPrecision('')).toBeNull()
      expect(detectMGRSPrecision('invalid')).toBeNull()
    })
  })
})
