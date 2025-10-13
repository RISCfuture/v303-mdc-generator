import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatDecimal,
  formatWeight,
  formatSpeed,
  formatAltitude,
  formatDate,
  formatTime,
  formatDateTime,
  formatDateForStorage,
} from '@/utils/formatting'

describe('Formatting Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers without decimals', () => {
      expect(formatNumber(1000)).toMatch(/1[,\s]?000/)
    })

    it('should handle undefined', () => {
      expect(formatNumber(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatNumber(null)).toBe('-')
    })

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('formatDecimal', () => {
    it('should format numbers with one decimal place', () => {
      expect(formatDecimal(5.5)).toMatch(/5[.,]5/)
    })

    it('should handle undefined', () => {
      expect(formatDecimal(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatDecimal(null)).toBe('-')
    })
  })

  describe('formatWeight', () => {
    it('should format weight with lb/lbs unit', () => {
      const result = formatWeight(12000)
      expect(result).toMatch(/\blb[s]?\b/) // Match 'lb' or 'lbs'
      expect(result).toContain('12')
    })

    it('should handle undefined', () => {
      expect(formatWeight(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatWeight(null)).toBe('-')
    })
  })

  describe('formatSpeed', () => {
    it('should format speed with kts unit', () => {
      const result = formatSpeed(350)
      expect(result).toContain('kts')
      expect(result).toContain('350')
    })

    it('should handle undefined', () => {
      expect(formatSpeed(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatSpeed(null)).toBe('-')
    })
  })

  describe('formatAltitude', () => {
    it('should format altitude with ft unit', () => {
      const result = formatAltitude(25000)
      expect(result).toContain('ft')
      expect(result).toContain('25')
    })

    it('should handle undefined', () => {
      expect(formatAltitude(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatAltitude(null)).toBe('-')
    })
  })

  describe('formatDate', () => {
    it('should format date from string', () => {
      const result = formatDate('2025-10-13')
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should format date from Date object', () => {
      const result = formatDate(new Date('2025-10-13'))
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should handle undefined', () => {
      expect(formatDate(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatDate(null)).toBe('-')
    })
  })

  describe('formatTime', () => {
    it('should format time from string', () => {
      const result = formatTime('2025-10-13T18:00:00')
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should format time from Date object', () => {
      const result = formatTime(new Date('2025-10-13T18:00:00'))
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should handle undefined', () => {
      expect(formatTime(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatTime(null)).toBe('-')
    })
  })

  describe('formatDateTime', () => {
    it('should format datetime from string', () => {
      const result = formatDateTime('2025-10-13T18:00:00')
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should format datetime from Date object', () => {
      const result = formatDateTime(new Date('2025-10-13T18:00:00'))
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should handle undefined', () => {
      expect(formatDateTime(undefined)).toBe('-')
    })

    it('should handle null', () => {
      expect(formatDateTime(null)).toBe('-')
    })
  })

  describe('formatDateForStorage', () => {
    it('should format date to YYYY-MM-DD from Date object', () => {
      const result = formatDateForStorage(new Date('2025-10-13'))
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should format date to YYYY-MM-DD from timestamp', () => {
      const result = formatDateForStorage(new Date('2025-10-13').getTime())
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle undefined', () => {
      expect(formatDateForStorage(undefined)).toBe('')
    })

    it('should handle null', () => {
      expect(formatDateForStorage(null)).toBe('')
    })
  })
})
