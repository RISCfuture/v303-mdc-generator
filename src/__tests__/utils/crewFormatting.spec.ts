import { describe, it, expect } from 'vitest'
import {
  formatSTN,
  parseSTN,
  formatMode3,
  incrementMode3,
  formatLaserCode,
} from '@/utils/crewFormatting'

describe('Crew Formatting Utilities', () => {
  describe('formatSTN', () => {
    it('should format STN as 5-digit string', () => {
      expect(formatSTN(3600)).toBe('03600')
    })

    it('should pad with zeros', () => {
      expect(formatSTN(42)).toBe('00042')
    })

    it('should handle null', () => {
      expect(formatSTN(null)).toBe('')
    })
  })

  describe('parseSTN', () => {
    it('should parse valid STN string', () => {
      expect(parseSTN('03600')).toBe(3600)
    })

    it('should handle number input', () => {
      expect(parseSTN(3600)).toBe(3600)
    })

    it('should handle empty string', () => {
      expect(parseSTN('')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(parseSTN('abc')).toBe(null)
    })
  })

  describe('formatMode3', () => {
    it('should format Mode 3 as 4-digit octal string', () => {
      expect(formatMode3(0o1101)).toBe('1101')
    })

    it('should pad with zeros', () => {
      expect(formatMode3(0o42)).toBe('0042')
    })

    it('should handle null', () => {
      expect(formatMode3(null)).toBe('')
    })

    it('should convert decimal to octal representation', () => {
      expect(formatMode3(577)).toBe('1101') // 577 decimal = 1101 octal
    })
  })

  describe('incrementMode3', () => {
    it('should increment Mode 3 by 1 in normal cases', () => {
      expect(incrementMode3(0o1301)).toBe(0o1302) // 1301 -> 1302
      expect(incrementMode3(0o1302)).toBe(0o1303) // 1302 -> 1303
      expect(incrementMode3(0o1303)).toBe(0o1304) // 1303 -> 1304
    })

    it('should skip to next octal position when reaching 7', () => {
      expect(incrementMode3(0o1307)).toBe(0o1310) // 1307 -> 1310 (skips 1308, 1309)
      expect(incrementMode3(0o1317)).toBe(0o1320) // 1317 -> 1320
      expect(incrementMode3(0o1327)).toBe(0o1330) // 1327 -> 1330
    })

    it('should handle carry to next digit position', () => {
      expect(incrementMode3(0o1377)).toBe(0o1400) // 1377 -> 1400
      expect(incrementMode3(0o1777)).toBe(0o2000) // 1777 -> 2000
      expect(incrementMode3(0o7777)).toBe(0o0000) // 7777 -> 0000 (wraps)
    })

    it('should handle multiple carries', () => {
      expect(incrementMode3(0o0777)).toBe(0o1000) // 0777 -> 1000
      expect(incrementMode3(0o7677)).toBe(0o7700) // 7677 -> 7700
    })

    it('should handle zero', () => {
      expect(incrementMode3(0o0000)).toBe(0o0001) // 0000 -> 0001
    })

    it('should work with decimal representation', () => {
      expect(incrementMode3(577)).toBe(578) // 1101 -> 1102 in octal
      expect(incrementMode3(583)).toBe(584) // 1107 -> 1110 in octal
    })
  })

  describe('formatLaserCode', () => {
    it('should format laser code with +1 to each digit', () => {
      expect(formatLaserCode(0o1677)).toBe('2788')
    })

    it('should handle null', () => {
      expect(formatLaserCode(null)).toBe('')
    })

    it('should convert each octal digit to next value', () => {
      expect(formatLaserCode(0o0000)).toBe('1111') // 0->1 for each digit
      expect(formatLaserCode(0o7777)).toBe('8888') // 7->8 for each digit
    })
  })
})
