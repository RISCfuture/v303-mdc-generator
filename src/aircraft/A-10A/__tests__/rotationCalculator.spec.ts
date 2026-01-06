/**
 * Unit tests for A-10C Rotation Calculator
 */

import { describe, it, expect } from 'vitest'
import {
  calculateRotationSpeed,
  calculateRefusalSpeed,
  calculateSpeeds,
  calculateStandardSpeeds,
  type A10SpeedCalculationParams,
} from '../rotationCalculator'

describe('a10RotationCalculator', () => {
  describe('calculateRotationSpeed', () => {
    it('should calculate rotation speed for typical weight with flaps 0', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        flapSetting: 0,
      }
      const speed = calculateRotationSpeed(params)
      // At 35k lbs, flaps 0, speed should be around 127 KIAS
      expect(speed).toBeGreaterThan(125)
      expect(speed).toBeLessThan(130)
    })

    it('should calculate rotation speed for typical weight with flaps 7', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        flapSetting: 7,
      }
      const speed = calculateRotationSpeed(params)
      // At 35k lbs, flaps 7, speed should be around 130 KIAS
      expect(speed).toBeGreaterThan(128)
      expect(speed).toBeLessThan(133)
    })

    it('should show higher rotation speed for flaps 7 vs flaps 0', () => {
      const weight = 35000
      const flaps0Speed = calculateRotationSpeed({
        grossWeight: weight,
        flapSetting: 0,
      })
      const flaps7Speed = calculateRotationSpeed({
        grossWeight: weight,
        flapSetting: 7,
      })
      // Flaps 7 should have slightly higher rotation speed
      expect(flaps7Speed).toBeGreaterThan(flaps0Speed)
    })

    it('should default to flaps 0 when not specified', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
      }
      const speed = calculateRotationSpeed(params)
      const explicitFlaps0 = calculateRotationSpeed({
        grossWeight: 35000,
        flapSetting: 0,
      })
      expect(speed).toBe(explicitFlaps0)
    })

    it('should handle light weight', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 25000,
        flapSetting: 0,
      }
      const speed = calculateRotationSpeed(params)
      // At 25k lbs (lower bound), speed should be around 108 KIAS
      expect(speed).toBeGreaterThan(105)
      expect(speed).toBeLessThan(112)
    })

    it('should handle heavy weight', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 50000,
        flapSetting: 0,
      }
      const speed = calculateRotationSpeed(params)
      // At 50k lbs (upper bound), speed should be around 154 KIAS
      expect(speed).toBeGreaterThan(152)
      expect(speed).toBeLessThan(157)
    })

    it('should increase rotation speed with increasing weight', () => {
      const lightSpeed = calculateRotationSpeed({
        grossWeight: 30000,
        flapSetting: 0,
      })
      const heavySpeed = calculateRotationSpeed({
        grossWeight: 40000,
        flapSetting: 0,
      })
      expect(heavySpeed).toBeGreaterThan(lightSpeed)
    })
  })

  describe('calculateRefusalSpeed', () => {
    it('should calculate refusal speed for dry runway', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      }
      const speed = calculateRefusalSpeed(params)
      // At 35k lbs, dry runway (RCR 23), speed should be around 100 KIAS
      expect(speed).toBeGreaterThan(95)
      expect(speed).toBeLessThan(105)
    })

    it('should calculate refusal speed for wet runway', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        runwayCondition: 'wet',
        speedBrakes: 'open',
      }
      const speed = calculateRefusalSpeed(params)
      // At 35k lbs, wet runway (RCR 12), speed should be around 130 KIAS
      expect(speed).toBeGreaterThan(125)
      expect(speed).toBeLessThan(135)
    })

    it('should calculate refusal speed for icy runway', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        runwayCondition: 'icy',
        speedBrakes: 'open',
      }
      const speed = calculateRefusalSpeed(params)
      // At 35k lbs, icy runway (RCR 4), speed should be around 168 KIAS
      expect(speed).toBeGreaterThan(163)
      expect(speed).toBeLessThan(173)
    })

    it('should show higher refusal speed for worse runway conditions', () => {
      const weight = 35000
      const drySpeed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      const wetSpeed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'wet',
        speedBrakes: 'open',
      })
      const icySpeed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'icy',
        speedBrakes: 'open',
      })

      // Worse conditions = higher refusal speed
      expect(wetSpeed).toBeGreaterThan(drySpeed)
      expect(icySpeed).toBeGreaterThan(wetSpeed)
    })

    it('should apply speed brake correction for dry runway', () => {
      const weight = 35000
      const speedBrakesOpen = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      const speedBrakesClosed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'dry',
        speedBrakes: 'closed',
      })

      // Speed brakes closed should reduce refusal speed by 6%
      const expectedClosed = Math.round(speedBrakesOpen * 0.94)
      expect(speedBrakesClosed).toBeCloseTo(expectedClosed, 0)
    })

    it('should apply speed brake correction for wet runway', () => {
      const weight = 35000
      const speedBrakesOpen = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'wet',
        speedBrakes: 'open',
      })
      const speedBrakesClosed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'wet',
        speedBrakes: 'closed',
      })

      // Speed brakes closed should reduce refusal speed by 3%
      const expectedClosed = Math.round(speedBrakesOpen * 0.97)
      expect(speedBrakesClosed).toBeCloseTo(expectedClosed, 0)
    })

    it('should not apply speed brake correction for icy runway', () => {
      const weight = 35000
      const speedBrakesOpen = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'icy',
        speedBrakes: 'open',
      })
      const speedBrakesClosed = calculateRefusalSpeed({
        grossWeight: weight,
        runwayCondition: 'icy',
        speedBrakes: 'closed',
      })

      // No documented correction for icy conditions
      expect(speedBrakesClosed).toBe(speedBrakesOpen)
    })

    it('should default to dry runway and speed brakes open', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
      }
      const speed = calculateRefusalSpeed(params)
      const explicit = calculateRefusalSpeed({
        grossWeight: 35000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      expect(speed).toBe(explicit)
    })

    it('should increase refusal speed with increasing weight', () => {
      const lightSpeed = calculateRefusalSpeed({
        grossWeight: 30000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      const heavySpeed = calculateRefusalSpeed({
        grossWeight: 40000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      expect(heavySpeed).toBeGreaterThan(lightSpeed)
    })

    it('should handle weights outside digitized range', () => {
      // Test below 30k (lowest digitized weight)
      const light = calculateRefusalSpeed({
        grossWeight: 28000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      expect(light).toBeGreaterThan(0)

      // Test above 45k (highest digitized weight)
      const heavy = calculateRefusalSpeed({
        grossWeight: 48000,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      })
      expect(heavy).toBeGreaterThan(0)
    })
  })

  describe('calculateSpeeds', () => {
    it('should calculate both rotation and refusal speeds', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        flapSetting: 0,
        runwayCondition: 'dry',
        speedBrakes: 'open',
      }
      const result = calculateSpeeds(params)

      expect(result.rotationSpeed).toBeGreaterThan(0)
      expect(result.refusalSpeed).toBeGreaterThan(0)
      expect(result.notes).toHaveLength(2) // weight + flaps
    })

    it('should include notes for all non-default settings', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
        flapSetting: 7,
        runwayCondition: 'wet',
        speedBrakes: 'closed',
      }
      const result = calculateSpeeds(params)

      expect(result.notes).toContain('Gross weight: 35000 lbs')
      expect(result.notes).toContain('Flaps: 7°')
      expect(result.notes).toContain('Speed brakes: closed')
      expect(result.notes).toContain('Runway: wet')
    })

    it('should not include notes for default settings', () => {
      const params: A10SpeedCalculationParams = {
        grossWeight: 35000,
      }
      const result = calculateSpeeds(params)

      // Should only have weight and flaps notes (flaps defaults to 0)
      const nonWeightNotes = result.notes.filter((n) => !n.includes('Gross weight'))
      expect(nonWeightNotes).toHaveLength(1) // Just flaps
    })
  })

  describe('calculateStandardSpeeds', () => {
    it('should use default standard conditions', () => {
      const result = calculateStandardSpeeds(35000)

      expect(result.rotationSpeed).toBeGreaterThan(0)
      expect(result.refusalSpeed).toBeGreaterThan(0)
      expect(result.notes).toContain('Gross weight: 35000 lbs')
    })

    it('should accept flap setting override', () => {
      const flaps0 = calculateStandardSpeeds(35000, 0)
      const flaps7 = calculateStandardSpeeds(35000, 7)

      expect(flaps7.rotationSpeed).toBeGreaterThan(flaps0.rotationSpeed)
      expect(flaps0.notes).toContain('Flaps: 0°')
      expect(flaps7.notes).toContain('Flaps: 7°')
    })
  })

  describe('edge cases and ranges', () => {
    it('should handle minimum operational weight', () => {
      // Empty weight + minimum fuel
      const minWeight = 29000 + 2000
      const result = calculateStandardSpeeds(minWeight)

      expect(result.rotationSpeed).toBeGreaterThan(0)
      expect(result.refusalSpeed).toBeGreaterThan(0)
    })

    it('should handle maximum takeoff weight', () => {
      const maxWeight = 50000
      const result = calculateStandardSpeeds(maxWeight)

      expect(result.rotationSpeed).toBeGreaterThan(0)
      expect(result.refusalSpeed).toBeGreaterThan(0)
    })

    it('should return integer values for all speeds', () => {
      const result = calculateStandardSpeeds(35000)

      expect(Number.isInteger(result.rotationSpeed)).toBe(true)
      expect(Number.isInteger(result.refusalSpeed)).toBe(true)
    })
  })
})
