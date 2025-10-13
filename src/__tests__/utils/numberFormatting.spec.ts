import { describe, it, expect } from 'vitest'
import {
  formatInteger,
  parseInteger,
  formatDecimal,
  parseDecimal,
  getGroupSeparator,
  getDecimalSeparator,
} from '@/utils/numberFormatting'

describe('numberFormatting', () => {
  describe('formatInteger', () => {
    it('should format integers with group separators', () => {
      const result = formatInteger(25000)
      // Should contain a separator (either , or . depending on locale)
      expect(result).toMatch(/25[,.]000/)
    })

    it('should handle null values', () => {
      expect(formatInteger(null)).toBe('')
    })

    it('should format negative numbers', () => {
      const result = formatInteger(-5000)
      expect(result).toContain('5')
      expect(result).toContain('000')
    })

    it('should format zero', () => {
      const result = formatInteger(0)
      expect(result).toBe('0')
    })

    it('should round decimal values to integers', () => {
      // The formatter should handle this via parse
      const result = formatInteger(1234.56)
      // Should show as integer (no decimals)
      expect(result).not.toContain(',56')
      expect(result).not.toContain('.56')
    })
  })

  describe('parseInteger', () => {
    it('should parse formatted integers in en-US style', () => {
      // In en-US locale, comma is group separator
      expect(parseInteger('25,000')).toBe(25000)
    })

    it('should parse plain integers', () => {
      expect(parseInteger('25000')).toBe(25000)
    })

    it('should handle negative numbers', () => {
      expect(parseInteger('-5000')).toBe(-5000)
    })

    it('should handle empty string', () => {
      expect(parseInteger('')).toBeNull()
    })

    it('should round decimal values', () => {
      // In en-US, period is decimal separator
      expect(parseInteger('1234.56')).toBe(1235)
    })
  })

  describe('formatDecimal', () => {
    it('should format decimals with default 2 places', () => {
      const result = formatDecimal(1234.5)
      expect(result).toMatch(/1[,.]234[,.]50/)
    })

    it('should format decimals with custom decimal places', () => {
      const result = formatDecimal(1234.56789, 3)
      expect(result).toMatch(/1[,.]234[,.]568/)
    })

    it('should handle null values', () => {
      expect(formatDecimal(null)).toBe('')
    })
  })

  describe('parseDecimal', () => {
    it('should parse formatted decimals in en-US style', () => {
      // In en-US, comma is group separator, period is decimal
      const result = parseDecimal('1,234.56')
      expect(result).toBeCloseTo(1234.56, 2)
    })

    it('should handle plain decimals', () => {
      expect(parseDecimal('1234.56')).toBeCloseTo(1234.56, 2)
    })

    it('should handle empty string', () => {
      expect(parseDecimal('')).toBeNull()
    })
  })

  describe('getGroupSeparator', () => {
    it('should return a valid group separator', () => {
      const separator = getGroupSeparator()
      // Should be either comma or period
      expect([',', '.', ' ', '']).toContain(separator)
    })
  })

  describe('getDecimalSeparator', () => {
    it('should return a valid decimal separator', () => {
      const separator = getDecimalSeparator()
      // Should be either comma or period
      expect([',', '.']).toContain(separator)
    })
  })

  describe('Realistic aviation values', () => {
    it('should handle altitude values', () => {
      const formatted = formatInteger(25000)
      const parsed = parseInteger(formatted)
      expect(parsed).toBe(25000)
    })

    it('should handle speed values', () => {
      const formatted = formatInteger(350)
      const parsed = parseInteger(formatted)
      expect(parsed).toBe(350)
    })

    it('should handle weight values', () => {
      const formatted = formatInteger(45000)
      const parsed = parseInteger(formatted)
      expect(parsed).toBe(45000)
    })

    it('should handle fuel values', () => {
      const formatted = formatInteger(11087)
      const parsed = parseInteger(formatted)
      expect(parsed).toBe(11087)
    })

    it('should handle small countermeasure values', () => {
      const formatted = formatInteger(60)
      const parsed = parseInteger(formatted)
      expect(parsed).toBe(60)
    })
  })
})
