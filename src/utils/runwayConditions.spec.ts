import { describe, it, expect } from 'vitest'
import { runwayConditionToRCR } from './runwayConditions'

describe('runwayConditions', () => {
  describe('runwayConditionToRCR', () => {
    it('should return RCR 23 for dry runway', () => {
      expect(runwayConditionToRCR('dry')).toBe(23)
    })

    it('should return RCR 12 for wet runway', () => {
      expect(runwayConditionToRCR('wet')).toBe(12)
    })

    it('should return RCR 5 for icy runway', () => {
      expect(runwayConditionToRCR('icy')).toBe(5)
    })
  })
})
