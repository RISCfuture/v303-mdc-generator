import { describe, it, expect } from 'vitest'
import { isF16, isC130 } from '@/utils/airframeHelpers'

describe('airframeHelpers capability predicates', () => {
  describe('isF16', () => {
    it('is true for F-16 variants', () => {
      expect(isF16('F-16C_50')).toBe(true)
    })

    it('is false for non-F-16 airframes', () => {
      expect(isF16('A-10C_2')).toBe(false)
      expect(isF16('C-130J-30')).toBe(false)
      expect(isF16('')).toBe(false)
    })
  })

  describe('isC130', () => {
    it('is true for C-130 variants', () => {
      expect(isC130('C-130J-30')).toBe(true)
    })

    it('is false for non-C-130 airframes', () => {
      expect(isC130('F-16C_50')).toBe(false)
      expect(isC130('A-10C_2')).toBe(false)
      expect(isC130('')).toBe(false)
    })
  })
})
