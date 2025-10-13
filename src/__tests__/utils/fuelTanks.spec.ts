import { describe, it, expect } from 'vitest'
import { getFuelCapacity, getLoadoutOnlyWeight } from '@/data/munitions'

describe('Fuel Tank Calculations', () => {
  describe('AERO 1D 300 Gallon Tank (A-10C)', () => {
    const tankId = '{AV8BNA_AERO1D}'
    const emptyTankId = '{AV8BNA_AERO1D_EMPTY}'

    it('should return correct fuel weight for full tank', () => {
      const fuelWeight = getFuelCapacity(tankId)
      // Tank: 2201 lbs total, 198 lbs empty = 2003 lbs fuel
      expect(fuelWeight).toBe(2003)
    })

    it('should return correct empty tank weight', () => {
      const emptyWeight = getLoadoutOnlyWeight(tankId)
      // Should subtract fuel weight to get empty tank weight
      expect(emptyWeight).toBe(198)
    })

    it('should handle empty tank variant', () => {
      const emptyTankWeight = getLoadoutOnlyWeight(emptyTankId)
      // Empty tank variant has weight:198 and additionalFuel:2010 in munitions data
      // getLoadoutOnlyWeight returns totalWeight - additionalFuel = 198 - 2010 = -1812
      expect(emptyTankWeight).toBe(-1812)
    })
  })

  describe('Fuel tank 300 gal (parsed from name)', () => {
    it('should return correct fuel weight when parsed from name', () => {
      // F-4 fuel tank with "300 gal" in the name
      const tankId = '{8A0BE8AE-58D4-4572-9263-3144C0D06364}'
      const fuelWeight = getFuelCapacity(tankId)
      // Should be approximately 300 gal × 6.7 lb/gal = 2010 lbs
      expect(fuelWeight).toBe(2010)
    })
  })

  describe('Fuel tank 610 gal', () => {
    it('should return correct fuel weight', () => {
      // F/A-18 fuel tank with "610 gal" in the name
      const tankId = '{E1F29B21-F291-4589-9FD8-3272EEC69506}'
      const fuelWeight = getFuelCapacity(tankId)
      // Should be approximately 610 gal × 6.7 lb/gal = 4087 lbs
      expect(fuelWeight).toBe(4087)
    })

    it('should return correct empty tank weight', () => {
      const tankId = '{E1F29B21-F291-4589-9FD8-3272EEC69506}'
      const emptyWeight = getLoadoutOnlyWeight(tankId)
      // Total: 4433 lbs, Fuel: 4087 lbs, Empty: 346 lbs
      expect(emptyWeight).toBe(346)
    })
  })

  describe('Fuel tank calculation fallbacks', () => {
    it('should return 0 for non-fuel items', () => {
      const fuelWeight = getFuelCapacity('EMPTY')
      expect(fuelWeight).toBe(0)
    })

    it('should return 0 for items without fuel data', () => {
      const fuelWeight = getFuelCapacity('{SOME_UNKNOWN_ITEM}')
      expect(fuelWeight).toBe(0)
    })
  })
})
