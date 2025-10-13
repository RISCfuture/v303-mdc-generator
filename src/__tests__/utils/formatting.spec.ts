import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatWeight,
  formatDate,
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
