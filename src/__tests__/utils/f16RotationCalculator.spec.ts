/**
 * Unit tests for F-16C rotation and refusal speed calculator
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRotationSpeed,
  calculateRefusalSpeed,
  calculateSpeeds,
  calculateStandardSpeeds,
  type SpeedCalculationParams,
} from '@/utils/f16RotationCalculator'

describe('f16RotationCalculator', () => {
  describe('calculateRotationSpeed', () => {
    it('should calculate rotation speed for typical MIL takeoff', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'MIL',
      }

      const speed = calculateRotationSpeed(params)

      // At 30k lbs, base speed ~158 KIAS, MIL correction -10 = ~148 KIAS
      expect(speed).toBeGreaterThan(145)
      expect(speed).toBeLessThan(152)
    })

    it('should calculate rotation speed for typical AB takeoff', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
      }

      const speed = calculateRotationSpeed(params)

      // At 30k lbs, base speed ~158 KIAS, AB correction -15 = ~143 KIAS
      expect(speed).toBeGreaterThan(140)
      expect(speed).toBeLessThan(147)
    })

    it('should apply CG correction for forward CG', () => {
      const baseParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        cgPercent: 35,
      }

      const forwardCgParams: SpeedCalculationParams = {
        ...baseParams,
        cgPercent: 40, // 5% forward of 35% MAC
      }

      const baseSpeed = calculateRotationSpeed(baseParams)
      const forwardSpeed = calculateRotationSpeed(forwardCgParams)

      // Should add 0.8 KIAS per 1% forward = 4 KIAS
      expect(forwardSpeed).toBeCloseTo(baseSpeed + 4, 0)
    })

    it('should apply CG correction for aft CG', () => {
      const baseParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        cgPercent: 35,
      }

      const aftCgParams: SpeedCalculationParams = {
        ...baseParams,
        cgPercent: 30, // 5% aft of 35% MAC
      }

      const baseSpeed = calculateRotationSpeed(baseParams)
      const aftSpeed = calculateRotationSpeed(aftCgParams)

      // Should subtract 0.8 KIAS per 1% aft = -4 KIAS
      expect(aftSpeed).toBeCloseTo(baseSpeed - 4, 0)
    })

    it('should apply pitch attitude correction for 8 degree pitch', () => {
      const params10deg: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        pitchAttitude: 10,
      }

      const params8deg: SpeedCalculationParams = {
        ...params10deg,
        pitchAttitude: 8,
      }

      const speed10 = calculateRotationSpeed(params10deg)
      const speed8 = calculateRotationSpeed(params8deg)

      // Should add ~8% for 8 degree pitch
      expect(speed8).toBeGreaterThan(speed10 * 1.05)
      expect(speed8).toBeLessThan(speed10 * 1.1)
    })

    it('should increase rotation speed with gross weight', () => {
      const lightParams: SpeedCalculationParams = {
        grossWeight: 25000,
        powerSetting: 'AB',
      }

      const heavyParams: SpeedCalculationParams = {
        grossWeight: 35000,
        powerSetting: 'AB',
      }

      const lightSpeed = calculateRotationSpeed(lightParams)
      const heavySpeed = calculateRotationSpeed(heavyParams)

      expect(heavySpeed).toBeGreaterThan(lightSpeed)
    })

    it('should handle edge case weights', () => {
      const veryLight: SpeedCalculationParams = {
        grossWeight: 20000,
        powerSetting: 'AB',
      }

      const veryHeavy: SpeedCalculationParams = {
        grossWeight: 42000,
        powerSetting: 'AB',
      }

      const lightSpeed = calculateRotationSpeed(veryLight)
      const heavySpeed = calculateRotationSpeed(veryHeavy)

      // Should return reasonable values
      expect(lightSpeed).toBeGreaterThan(100)
      expect(lightSpeed).toBeLessThan(150)
      expect(heavySpeed).toBeGreaterThan(150)
      expect(heavySpeed).toBeLessThan(200)
    })
  })

  describe('calculateRefusalSpeed', () => {
    it('should calculate refusal speed for dry runway MIL', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'MIL',
        runwayCondition: 'dry',
      }

      const speed = calculateRefusalSpeed(params)

      // Should be around 130 KIAS for 30k lbs on dry runway (MIL)
      expect(speed).toBeGreaterThan(125)
      expect(speed).toBeLessThan(135)
    })

    it('should calculate refusal speed for dry runway AB', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
      }

      const speed = calculateRefusalSpeed(params)

      // AB refusal speed should be lower than MIL (around 110 KIAS)
      expect(speed).toBeGreaterThanOrEqual(108)
      expect(speed).toBeLessThan(120)
    })

    it('should increase refusal speed for wet runway', () => {
      const dryParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'MIL',
        runwayCondition: 'dry',
      }

      const wetParams: SpeedCalculationParams = {
        ...dryParams,
        runwayCondition: 'wet',
      }

      const drySpeed = calculateRefusalSpeed(dryParams)
      const wetSpeed = calculateRefusalSpeed(wetParams)

      expect(wetSpeed).toBeGreaterThan(drySpeed)
    })

    it('should increase refusal speed for snow runway', () => {
      const dryParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'MIL',
        runwayCondition: 'dry',
      }

      const snowParams: SpeedCalculationParams = {
        ...dryParams,
        runwayCondition: 'snow',
      }

      const drySpeed = calculateRefusalSpeed(dryParams)
      const snowSpeed = calculateRefusalSpeed(snowParams)

      expect(snowSpeed).toBeGreaterThan(drySpeed)
    })

    it('should increase refusal speed for ice runway', () => {
      const dryParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'MIL',
        runwayCondition: 'dry',
      }

      const iceParams: SpeedCalculationParams = {
        ...dryParams,
        runwayCondition: 'ice',
      }

      const drySpeed = calculateRefusalSpeed(dryParams)
      const iceSpeed = calculateRefusalSpeed(iceParams)

      expect(iceSpeed).toBeGreaterThan(drySpeed)
    })

    it('should apply headwind correction', () => {
      const noWindParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
        headwindComponent: 0,
      }

      const headwindParams: SpeedCalculationParams = {
        ...noWindParams,
        headwindComponent: 10,
      }

      const noWindSpeed = calculateRefusalSpeed(noWindParams)
      const headwindSpeed = calculateRefusalSpeed(headwindParams)

      // Headwind should decrease refusal speed
      expect(headwindSpeed).toBeLessThan(noWindSpeed)
    })

    it('should apply tailwind correction', () => {
      const noWindParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
        headwindComponent: 0,
      }

      const tailwindParams: SpeedCalculationParams = {
        ...noWindParams,
        headwindComponent: -10,
      }

      const noWindSpeed = calculateRefusalSpeed(noWindParams)
      const tailwindSpeed = calculateRefusalSpeed(tailwindParams)

      // Tailwind should increase refusal speed
      expect(tailwindSpeed).toBeGreaterThan(noWindSpeed)
    })

    it('should apply downslope correction', () => {
      const levelParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
        runwaySlope: 0,
      }

      const downslopeParams: SpeedCalculationParams = {
        ...levelParams,
        runwaySlope: -1, // 1% downslope
      }

      const levelSpeed = calculateRefusalSpeed(levelParams)
      const downslopeSpeed = calculateRefusalSpeed(downslopeParams)

      // Downslope should decrease refusal speed
      expect(downslopeSpeed).toBeLessThan(levelSpeed)
    })

    it('should apply upslope correction', () => {
      const levelParams: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
        runwaySlope: 0,
      }

      const upslopeParams: SpeedCalculationParams = {
        ...levelParams,
        runwaySlope: 1, // 1% upslope
      }

      const levelSpeed = calculateRefusalSpeed(levelParams)
      const upslopeSpeed = calculateRefusalSpeed(upslopeParams)

      // Upslope should increase refusal speed
      expect(upslopeSpeed).toBeGreaterThan(levelSpeed)
    })

    it('should increase refusal speed with gross weight', () => {
      const lightParams: SpeedCalculationParams = {
        grossWeight: 25000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
      }

      const heavyParams: SpeedCalculationParams = {
        grossWeight: 35000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
      }

      const lightSpeed = calculateRefusalSpeed(lightParams)
      const heavySpeed = calculateRefusalSpeed(heavyParams)

      expect(heavySpeed).toBeGreaterThan(lightSpeed)
    })
  })

  describe('calculateSpeeds', () => {
    it('should calculate both rotation and refusal speeds', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
      }

      const result = calculateSpeeds(params)

      expect(result).toHaveProperty('rotationSpeed')
      expect(result).toHaveProperty('refusalSpeed')
      expect(result).toHaveProperty('notes')
      expect(result.notes).toBeInstanceOf(Array)
    })

    it('should include configuration notes', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'wet',
        headwindComponent: 10,
        runwaySlope: 1,
        cgPercent: 40,
      }

      const result = calculateSpeeds(params)

      expect(result.notes).toContain('Power: AB')
      expect(result.notes.some((note) => note.includes('Gross weight'))).toBe(true)
      expect(result.notes.some((note) => note.includes('wet'))).toBe(true)
      expect(result.notes.some((note) => note.includes('headwind'))).toBe(true)
      expect(result.notes.some((note) => note.includes('upslope'))).toBe(true)
      expect(result.notes.some((note) => note.includes('CG'))).toBe(true)
    })

    it('should calculate reasonable speed values', () => {
      const params: SpeedCalculationParams = {
        grossWeight: 30000,
        powerSetting: 'AB',
        runwayCondition: 'dry',
      }

      const result = calculateSpeeds(params)

      // Both speeds should be in reasonable ranges
      expect(result.rotationSpeed).toBeGreaterThan(100)
      expect(result.rotationSpeed).toBeLessThan(200)
      expect(result.refusalSpeed).toBeGreaterThan(80)
      expect(result.refusalSpeed).toBeLessThan(180)
    })
  })

  describe('calculateStandardSpeeds', () => {
    it('should calculate speeds with default conditions', () => {
      const result = calculateStandardSpeeds(30000, 'AB')

      expect(result).toHaveProperty('rotationSpeed')
      expect(result).toHaveProperty('refusalSpeed')
      expect(result).toHaveProperty('notes')
    })

    it('should use dry runway by default', () => {
      const result = calculateStandardSpeeds(30000, 'AB')

      // Standard conditions should not include runway condition note
      expect(result.notes.some((note) => note.includes('wet'))).toBe(false)
      expect(result.notes.some((note) => note.includes('snow'))).toBe(false)
    })

    it('should handle different power settings', () => {
      const milResult = calculateStandardSpeeds(30000, 'MIL')
      const abResult = calculateStandardSpeeds(30000, 'AB')

      expect(milResult.rotationSpeed).toBeGreaterThan(abResult.rotationSpeed)
    })

    it('should work across weight range', () => {
      const weights = [20000, 25000, 30000, 35000, 40000]

      weights.forEach((weight) => {
        const result = calculateStandardSpeeds(weight, 'AB')

        // Both speeds should be positive and reasonable
        expect(result.rotationSpeed).toBeGreaterThan(0)
        expect(result.refusalSpeed).toBeGreaterThan(0)
        expect(result.rotationSpeed).toBeLessThan(250)
        expect(result.refusalSpeed).toBeLessThan(250)
      })
    })
  })
})
