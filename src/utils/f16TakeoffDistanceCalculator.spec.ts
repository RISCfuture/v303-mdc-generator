import { describe, it, expect } from 'vitest'
import {
  calculateTakeoffFactor,
  calculateBaseDistance,
  calculateTakeoffDistance,
  calculateStandardTakeoffDistance,
  getDragIndex,
  calculateTotalDragIndex,
  celsiusToFahrenheit,
} from './f16TakeoffDistanceCalculator'

describe('F-16 Takeoff Distance Calculator', () => {
  describe('Manual Sample Problem Verification', () => {
    // From TO GR1F-16CJ-1-1 sample problem:
    // Conditions: 42°C (108°F), 2000 ft pressure altitude, 33,000 lbs
    // MIL takeoff factor = 2.54, AB takeoff factor = 1.44
    // MIL distance = 4,950 ft, AB distance = 2,664 ft

    const sampleTempC = 42
    const sampleTempF = celsiusToFahrenheit(sampleTempC)
    const sampleAltitude = 2000

    it('should calculate AB takeoff factor close to manual value (1.44)', () => {
      const factor = calculateTakeoffFactor(sampleTempF, sampleAltitude, 'AB')
      // Allow 10% tolerance for regression approximation
      expect(factor).toBeGreaterThan(1.44 * 0.9)
      expect(factor).toBeLessThan(1.44 * 1.1)
    })

    it('should calculate MIL takeoff factor close to manual value (2.54)', () => {
      const factor = calculateTakeoffFactor(sampleTempF, sampleAltitude, 'MIL')
      // Allow 10% tolerance for regression approximation
      expect(factor).toBeGreaterThan(2.54 * 0.9)
      expect(factor).toBeLessThan(2.54 * 1.1)
    })

    it('should calculate AB takeoff distance close to manual value (2,664 ft)', () => {
      const result = calculateTakeoffDistance({
        grossWeight: 33000,
        temperatureF: sampleTempF,
        pressureAltitude: sampleAltitude,
        powerSetting: 'AB',
        cgPercent: 35, // baseline
        dragIndex: 0, // chart baseline (not clean aircraft)
        runwaySlope: 0,
        headwindComponent: 0,
        pitchAttitude: 10,
      })
      // Allow 15% tolerance for combined regression approximations
      expect(result.takeoffDistance).toBeGreaterThan(2664 * 0.85)
      expect(result.takeoffDistance).toBeLessThan(2664 * 1.15)
    })

    it('should calculate MIL takeoff distance close to manual value (4,950 ft)', () => {
      // Manual sample: NonAB factor 2.54, GW 33000, CG 35.5%, DI 150, slope 1% up, wind 10kt head
      // Result: 4,950 ft
      const result = calculateTakeoffDistance({
        grossWeight: 33000,
        temperatureF: sampleTempF,
        pressureAltitude: sampleAltitude,
        powerSetting: 'MIL',
        cgPercent: 35.5,
        dragIndex: 150,
        runwaySlope: 1, // 1% uphill
        headwindComponent: 10, // 10 kt headwind
        pitchAttitude: 10,
      })
      // Allow 15% tolerance
      expect(result.takeoffDistance).toBeGreaterThan(4950 * 0.85)
      expect(result.takeoffDistance).toBeLessThan(4950 * 1.15)
    })
  })

  describe('calculateTakeoffFactor', () => {
    it('should increase factor with higher temperature', () => {
      const factorCold = calculateTakeoffFactor(32, 0, 'AB') // 0°C
      const factorHot = calculateTakeoffFactor(100, 0, 'AB') // 38°C
      expect(factorHot).toBeGreaterThan(factorCold)
    })

    it('should increase factor with higher altitude', () => {
      const factorLow = calculateTakeoffFactor(70, 0, 'AB')
      const factorHigh = calculateTakeoffFactor(70, 6000, 'AB')
      expect(factorHigh).toBeGreaterThan(factorLow)
    })

    it('should have MIL factor approximately 1.76x AB factor', () => {
      const abFactor = calculateTakeoffFactor(70, 2000, 'AB')
      const milFactor = calculateTakeoffFactor(70, 2000, 'MIL')
      const ratio = milFactor / abFactor
      expect(ratio).toBeCloseTo(1.76, 1)
    })
  })

  describe('calculateBaseDistance', () => {
    it('should increase distance with higher factor', () => {
      const distLow = calculateBaseDistance(1.5)
      const distHigh = calculateBaseDistance(3.0)
      expect(distHigh).toBeGreaterThan(distLow)
    })

    it('should return reasonable distances for typical factors', () => {
      // Factor 1.5 should be around 2,500-3,000 ft
      const dist = calculateBaseDistance(1.5)
      expect(dist).toBeGreaterThan(2000)
      expect(dist).toBeLessThan(4000)
    })
  })

  describe('Corrections', () => {
    const baseParams = {
      grossWeight: 30000,
      temperatureF: 70,
      pressureAltitude: 0,
      powerSetting: 'AB' as const,
    }

    it('should increase distance with forward CG', () => {
      const baseline = calculateTakeoffDistance({ ...baseParams, cgPercent: 35 })
      const forwardCG = calculateTakeoffDistance({ ...baseParams, cgPercent: 40 })
      expect(forwardCG.takeoffDistance).toBeGreaterThan(baseline.takeoffDistance)
    })

    it('should decrease distance with aft CG', () => {
      const baseline = calculateTakeoffDistance({ ...baseParams, cgPercent: 35 })
      const aftCG = calculateTakeoffDistance({ ...baseParams, cgPercent: 30 })
      expect(aftCG.takeoffDistance).toBeLessThan(baseline.takeoffDistance)
    })

    it('should increase distance with higher drag index', () => {
      const clean = calculateTakeoffDistance({ ...baseParams, dragIndex: 7 })
      const loaded = calculateTakeoffDistance({ ...baseParams, dragIndex: 100 })
      expect(loaded.takeoffDistance).toBeGreaterThan(clean.takeoffDistance)
    })

    it('should increase distance with upslope', () => {
      const level = calculateTakeoffDistance({ ...baseParams, runwaySlope: 0 })
      const uphill = calculateTakeoffDistance({ ...baseParams, runwaySlope: 2 })
      expect(uphill.takeoffDistance).toBeGreaterThan(level.takeoffDistance)
    })

    it('should decrease distance with downslope', () => {
      const level = calculateTakeoffDistance({ ...baseParams, runwaySlope: 0 })
      const downhill = calculateTakeoffDistance({ ...baseParams, runwaySlope: -2 })
      expect(downhill.takeoffDistance).toBeLessThan(level.takeoffDistance)
    })

    it('should decrease distance with headwind', () => {
      const noWind = calculateTakeoffDistance({ ...baseParams, headwindComponent: 0 })
      const headwind = calculateTakeoffDistance({ ...baseParams, headwindComponent: 15 })
      expect(headwind.takeoffDistance).toBeLessThan(noWind.takeoffDistance)
    })

    it('should increase distance with tailwind', () => {
      const noWind = calculateTakeoffDistance({ ...baseParams, headwindComponent: 0 })
      const tailwind = calculateTakeoffDistance({ ...baseParams, headwindComponent: -15 })
      expect(tailwind.takeoffDistance).toBeGreaterThan(noWind.takeoffDistance)
    })

    it('should increase distance by 18% for 8-degree pitch', () => {
      const pitch10 = calculateTakeoffDistance({ ...baseParams, pitchAttitude: 10 })
      const pitch8 = calculateTakeoffDistance({ ...baseParams, pitchAttitude: 8 })
      const ratio = pitch8.takeoffDistance / pitch10.takeoffDistance
      expect(ratio).toBeCloseTo(1.18, 1)
    })
  })

  describe('getDragIndex', () => {
    it('should return correct drag index for known CLSIDs', () => {
      expect(getDragIndex('{AIM-9M}')).toBe(4)
      expect(getDragIndex('{GBU-12}')).toBe(5)
      expect(getDragIndex('{Mk-82}')).toBe(7)
      expect(getDragIndex('{AGM_65D}')).toBe(13)
    })

    it('should handle CLSIDs with and without braces', () => {
      expect(getDragIndex('AIM-9M')).toBe(4)
      expect(getDragIndex('{AIM-9M}')).toBe(4)
    })

    it('should return category default for unknown weapons', () => {
      expect(getDragIndex('UNKNOWN_WEAPON', 'air-to-air')).toBe(4)
      expect(getDragIndex('UNKNOWN_WEAPON', 'air-to-ground')).toBe(10)
    })

    it('should return fallback for completely unknown items', () => {
      expect(getDragIndex('COMPLETELY_UNKNOWN')).toBe(10)
    })

    it('should match patterns for common weapon names', () => {
      expect(getDragIndex('{AIM-9X_SOME_VARIANT}')).toBe(4)
      expect(getDragIndex('GBU-12_VARIANT')).toBe(5)
      expect(getDragIndex('SOME_CBU-87_THING')).toBe(20)
    })
  })

  describe('calculateTotalDragIndex', () => {
    it('should start with clean aircraft drag index (7)', () => {
      const total = calculateTotalDragIndex([])
      expect(total).toBe(7)
    })

    it('should add drag indexes for stores', () => {
      const total = calculateTotalDragIndex([
        { clsid: '{AIM-9M}' }, // 4
        { clsid: '{AIM-9M}' }, // 4
      ])
      expect(total).toBe(7 + 4 + 4) // 15
    })

    it('should ignore EMPTY stations', () => {
      const total = calculateTotalDragIndex([
        { clsid: '{AIM-9M}' },
        { clsid: 'EMPTY' },
        { clsid: '{AIM-9M}' },
      ])
      expect(total).toBe(7 + 4 + 4) // 15
    })

    it('should calculate realistic loadout drag index', () => {
      // Typical A-G loadout: 2x AIM-9M, 2x GBU-12, LITENING pod
      const total = calculateTotalDragIndex([
        { clsid: '{AIM-9M}' }, // 4
        { clsid: '{AIM-9M}' }, // 4
        { clsid: '{GBU-12}' }, // 5
        { clsid: '{GBU-12}' }, // 5
        { clsid: '{AN_AAQ-28_LITENING}' }, // 3
      ])
      expect(total).toBe(7 + 4 + 4 + 5 + 5 + 3) // 28
    })
  })

  describe('Temperature conversion', () => {
    it('should convert Celsius to Fahrenheit correctly', () => {
      expect(celsiusToFahrenheit(0)).toBe(32)
      expect(celsiusToFahrenheit(100)).toBe(212)
      expect(celsiusToFahrenheit(42)).toBeCloseTo(107.6, 1)
    })
  })

  describe('calculateStandardTakeoffDistance', () => {
    it('should use default values for corrections', () => {
      const result = calculateStandardTakeoffDistance(30000, 70, 0, 'AB')
      expect(result.corrections.cg).toBe(1)
      expect(result.corrections.slope).toBe(1)
      expect(result.corrections.wind).toBeCloseTo(1, 1)
      expect(result.corrections.pitch).toBe(1)
    })

    it('should return reasonable distance for standard day sea level', () => {
      // Standard day (59°F), sea level, 30,000 lbs, AB
      const result = calculateStandardTakeoffDistance(30000, 59, 0, 'AB')
      // Should be roughly 2,000-3,500 ft
      expect(result.takeoffDistance).toBeGreaterThan(1500)
      expect(result.takeoffDistance).toBeLessThan(4000)
    })
  })
})
