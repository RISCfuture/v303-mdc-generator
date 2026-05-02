/**
 * Unit tests for F-16C bingo fuel calculator
 */

import { describe, it, expect } from 'vitest'
import {
  calculateBingoFuel,
  calculateDefaultBingo,
  type BingoCalculationParams,
} from '../bingoCalculator'

describe('f16BingoCalculator', () => {
  // Test locations (using realistic coordinates)
  const homeLocation = { latitude: 36.2057, longitude: 65.8476 } // Kandahar
  const targetLocation = { latitude: 34.5553, longitude: 69.2075 } // Kabul (~200 nm)
  const alternateLocation = { latitude: 35.3204, longitude: 62.2281 } // Herat (~200 nm)

  describe('calculateBingoFuel - AAR Expected', () => {
    it('should calculate bingo fuel with AAR for 2-ship', () => {
      const params: BingoCalculationParams = {
        aarExpected: true,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 500 + (2-1) + (15 * ~189) = 500 + 1 + ~2883 = ~3384
      expect(bingo).toBeGreaterThan(3300)
      expect(bingo).toBeLessThan(3500)
    })

    it('should calculate bingo fuel with AAR for 4-ship', () => {
      const params: BingoCalculationParams = {
        aarExpected: true,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 4,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 500 + (4-1) + (15 * ~189) = 500 + 3 + ~2883 = ~3386
      expect(bingo).toBeGreaterThan(3300)
      expect(bingo).toBeLessThan(3500)
    })

    it('should use low altitude modifier when specified', () => {
      const mediumParams: BingoCalculationParams = {
        aarExpected: true,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const lowParams: BingoCalculationParams = {
        ...mediumParams,
        altitudeProfile: 'low',
      }

      const mediumBingo = calculateBingoFuel(mediumParams)
      const lowBingo = calculateBingoFuel(lowParams)

      // Low altitude should require more fuel (20 vs 15 lbs/nm)
      expect(lowBingo).toBeGreaterThan(mediumBingo)
      expect(lowBingo - mediumBingo).toBeCloseTo(1000, -2) // ~5 lbs/nm * 200 nm = ~1000 lbs
    })

    it('should ignore approach type and alternate when AAR expected', () => {
      const baseParams: BingoCalculationParams = {
        aarExpected: true,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const withIFRandAlternate: BingoCalculationParams = {
        ...baseParams,
        approachType: 'IFR',
        alternateLocation,
      }

      const bingo1 = calculateBingoFuel(baseParams)
      const bingo2 = calculateBingoFuel(withIFRandAlternate)

      // Should be identical - AAR formula ignores these fields
      expect(bingo1).toBe(bingo2)
    })
  })

  describe('calculateBingoFuel - No AAR', () => {
    it('should calculate bingo fuel with VFR approach, medium altitude, no alternate', () => {
      const params: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2, // Should be ignored for non-AAR
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 1200 + 400 + (15 * ~189) + 0 = 1200 + 400 + ~2883 = ~4483
      expect(bingo).toBeGreaterThan(4400)
      expect(bingo).toBeLessThan(4600)
    })

    it('should calculate bingo fuel with IFR approach', () => {
      const vfrParams: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const ifrParams: BingoCalculationParams = {
        ...vfrParams,
        approachType: 'IFR',
      }

      const vfrBingo = calculateBingoFuel(vfrParams)
      const ifrBingo = calculateBingoFuel(ifrParams)

      // IFR requires 400 lbs more approach fuel (800 vs 400)
      expect(ifrBingo - vfrBingo).toBe(400)
    })

    it('should include diversion fuel when alternate is specified', () => {
      const noAlternate: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const withAlternate: BingoCalculationParams = {
        ...noAlternate,
        alternateLocation,
      }

      const bingoNoAlt = calculateBingoFuel(noAlternate)
      const bingoWithAlt = calculateBingoFuel(withAlternate)

      // Should add diversion fuel (10 lbs/nm * ~184 nm = ~1840 lbs)
      expect(bingoWithAlt).toBeGreaterThan(bingoNoAlt)
      expect(bingoWithAlt - bingoNoAlt).toBeCloseTo(1844, -2)
    })

    it('should use low altitude modifier', () => {
      const mediumParams: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const lowParams: BingoCalculationParams = {
        ...mediumParams,
        altitudeProfile: 'low',
      }

      const mediumBingo = calculateBingoFuel(mediumParams)
      const lowBingo = calculateBingoFuel(lowParams)

      // Low altitude should require more fuel (20 vs 15 lbs/nm)
      expect(lowBingo).toBeGreaterThan(mediumBingo)
      expect(lowBingo - mediumBingo).toBeCloseTo(1000, -2) // ~5 lbs/nm * 200 nm = ~1000 lbs
    })

    it('should ignore number of pilots for non-AAR', () => {
      const twoShip: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const fourShip: BingoCalculationParams = {
        ...twoShip,
        numberOfPilots: 4,
      }

      const bingo2 = calculateBingoFuel(twoShip)
      const bingo4 = calculateBingoFuel(fourShip)

      // Number of pilots should not affect non-AAR calculation
      expect(bingo2).toBe(bingo4)
    })
  })

  describe('calculateBingoFuel - Edge Cases', () => {
    it('should handle null recovery location', () => {
      const params: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: null,
        targetLocation,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 1200 + 400 + 0 + 0 = 1600 (no enroute fuel)
      expect(bingo).toBe(1600)
    })

    it('should handle null target location', () => {
      const params: BingoCalculationParams = {
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation: null,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 1200 + 400 + 0 + 0 = 1600 (no enroute fuel)
      expect(bingo).toBe(1600)
    })

    it('should handle single pilot flight', () => {
      const params: BingoCalculationParams = {
        aarExpected: true,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 1,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      }

      const bingo = calculateBingoFuel(params)

      // Formula: 500 + (1-1) + (15 * ~189) = 500 + 0 + ~2883 = ~3383
      expect(bingo).toBeGreaterThan(3300)
      expect(bingo).toBeLessThan(3500)
    })
  })

  describe('calculateDefaultBingo', () => {
    it('should use default parameters (no AAR, VFR, medium)', () => {
      const bingo = calculateDefaultBingo(2, homeLocation, targetLocation, null)

      // Should match non-AAR, VFR, medium calculation
      const manualBingo = calculateBingoFuel({
        aarExpected: false,
        approachType: 'VFR',
        altitudeProfile: 'medium',
        numberOfPilots: 2,
        recoveryLocation: homeLocation,
        targetLocation,
        alternateLocation: null,
      })

      expect(bingo).toBe(manualBingo)
    })

    it('should handle alternate location', () => {
      const bingoWithAlt = calculateDefaultBingo(2, homeLocation, targetLocation, alternateLocation)
      const bingoNoAlt = calculateDefaultBingo(2, homeLocation, targetLocation, null)

      // Should include diversion fuel when alternate provided
      expect(bingoWithAlt).toBeGreaterThan(bingoNoAlt)
    })
  })
})
