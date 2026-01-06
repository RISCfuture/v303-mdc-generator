import { describe, it, expect } from 'vitest'
import {
  calculateTakeoffIndex,
  calculateBaseDistance,
  calculateTakeoffDistance,
  calculateStandardTakeoffDistance,
  calculateCriticalFieldLength,
  calculateWindCorrection,
  calculateSlopeCorrection,
  calculateRCRCorrection,
  calculateHeadwindComponent,
  getRecommendedFlapSetting,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from './a10TakeoffDistanceCalculator'

describe('A-10C Takeoff Distance Calculator', () => {
  describe('Chart Verification', () => {
    // Verify against digitized chart data points
    // Sea level, 20°C, 40,000 lbs, Flaps 0°
    // Expected takeoff index ~5.3, distance ~5,000 ft

    it('should calculate takeoff index close to chart values at sea level, 20°C', () => {
      const index = calculateTakeoffIndex(20, 0, 'MAX')
      // From chart: approximately 5.3
      expect(index).toBeGreaterThan(5.0)
      expect(index).toBeLessThan(5.6)
    })

    it('should calculate takeoff index close to chart values at 4000 ft, 30°C', () => {
      const index = calculateTakeoffIndex(30, 4000, 'MAX')
      // From chart: approximately 8.9
      expect(index).toBeGreaterThan(8.5)
      expect(index).toBeLessThan(9.5)
    })

    it('should calculate takeoff distance close to chart values for 40k lbs, index 6', () => {
      // At index 6, 40k lbs, Flaps 0: approximately 5,000 ft
      const distance = calculateBaseDistance(6, 40000, 0)
      expect(distance).toBeGreaterThan(4500)
      expect(distance).toBeLessThan(5500)
    })

    it('should calculate shorter distance with Flaps 7 vs Flaps 0', () => {
      const distFlaps0 = calculateBaseDistance(6, 40000, 0)
      const distFlaps7 = calculateBaseDistance(6, 40000, 7)
      expect(distFlaps7).toBeLessThan(distFlaps0)
      // Flaps 7 should reduce distance by approximately 10-15%
      const reduction = (distFlaps0 - distFlaps7) / distFlaps0
      expect(reduction).toBeGreaterThan(0.08)
      expect(reduction).toBeLessThan(0.18)
    })
  })

  describe('calculateTakeoffIndex', () => {
    it('should increase index with higher temperature', () => {
      const indexCold = calculateTakeoffIndex(-10, 0, 'MAX')
      const indexHot = calculateTakeoffIndex(40, 0, 'MAX')
      expect(indexHot).toBeGreaterThan(indexCold)
    })

    it('should increase index with higher altitude', () => {
      const indexLow = calculateTakeoffIndex(20, 0, 'MAX')
      const indexHigh = calculateTakeoffIndex(20, 6000, 'MAX')
      expect(indexHigh).toBeGreaterThan(indexLow)
    })

    it('should increase index with 3% Below PTFS thrust setting', () => {
      const indexMax = calculateTakeoffIndex(20, 2000, 'MAX')
      const indexBelow = calculateTakeoffIndex(20, 2000, '3_BELOW_PTFS')
      expect(indexBelow).toBeGreaterThan(indexMax)
      // Offset should be approximately 0.4
      expect(indexBelow - indexMax).toBeCloseTo(0.4, 1)
    })

    it('should clamp index to chart limits (4-11)', () => {
      // Very cold, low altitude should not go below 4
      const indexMin = calculateTakeoffIndex(-40, -1000, 'MAX')
      expect(indexMin).toBeGreaterThanOrEqual(4)

      // Very hot, high altitude should not exceed 11
      const indexMax = calculateTakeoffIndex(60, 8000, 'MAX')
      expect(indexMax).toBeLessThanOrEqual(11)
    })
  })

  describe('calculateBaseDistance', () => {
    it('should increase distance with higher takeoff index', () => {
      const distLow = calculateBaseDistance(5, 40000, 0)
      const distHigh = calculateBaseDistance(8, 40000, 0)
      expect(distHigh).toBeGreaterThan(distLow)
    })

    it('should increase distance with higher gross weight', () => {
      const distLight = calculateBaseDistance(6, 30000, 0)
      const distHeavy = calculateBaseDistance(6, 50000, 0)
      expect(distHeavy).toBeGreaterThan(distLight)
    })

    it('should return reasonable distances for typical conditions', () => {
      // Index 6, 40k lbs, Flaps 0: should be around 5,000 ft
      const dist = calculateBaseDistance(6, 40000, 0)
      expect(dist).toBeGreaterThan(4000)
      expect(dist).toBeLessThan(6000)
    })

    it('should not return negative distances', () => {
      const dist = calculateBaseDistance(4, 20000, 7)
      expect(dist).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Wind Correction', () => {
    it('should decrease distance with headwind', () => {
      const noWind = calculateWindCorrection(0)
      const headwind = calculateWindCorrection(20)
      expect(headwind).toBeLessThan(noWind)
    })

    it('should increase distance with tailwind', () => {
      const noWind = calculateWindCorrection(0)
      const tailwind = calculateWindCorrection(-20)
      expect(tailwind).toBeGreaterThan(noWind)
    })

    it('should have larger effect for tailwind than headwind', () => {
      // Tailwind effect is typically larger than headwind effect
      const headwind20 = calculateWindCorrection(20)
      const tailwind20 = calculateWindCorrection(-20)
      const headwindEffect = 1 - headwind20
      const tailwindEffect = tailwind20 - 1
      expect(tailwindEffect).toBeGreaterThan(headwindEffect)
    })
  })

  describe('Slope Correction', () => {
    it('should increase distance with uphill slope', () => {
      const level = calculateSlopeCorrection(0)
      const uphill = calculateSlopeCorrection(2)
      expect(uphill).toBeGreaterThan(level)
    })

    it('should decrease distance with downhill slope', () => {
      const level = calculateSlopeCorrection(0)
      const downhill = calculateSlopeCorrection(-2)
      expect(downhill).toBeLessThan(level)
    })

    it('should apply approximately 7% per 1% slope', () => {
      const level = calculateSlopeCorrection(0)
      const uphill1 = calculateSlopeCorrection(1)
      const change = (uphill1 - level) / level
      // Should be approximately 7%
      expect(change).toBeGreaterThan(0.05)
      expect(change).toBeLessThan(0.1)
    })
  })

  describe('RCR Correction', () => {
    it('should return 1.0 for dry runway (RCR 23)', () => {
      expect(calculateRCRCorrection(23)).toBe(1.0)
    })

    it('should return 1.2 for wet runway (RCR 12)', () => {
      expect(calculateRCRCorrection(12)).toBe(1.2)
    })

    it('should return 1.5 for icy runway (RCR 5)', () => {
      expect(calculateRCRCorrection(5)).toBe(1.5)
    })
  })

  describe('calculateTakeoffDistance', () => {
    const baseParams = {
      grossWeight: 40000,
      temperatureC: 20,
      pressureAltitude: 0,
      flapSetting: 0 as const,
    }

    it('should return complete result with all fields', () => {
      const result = calculateTakeoffDistance(baseParams)
      expect(result).toHaveProperty('takeoffIndex')
      expect(result).toHaveProperty('baseDistance')
      expect(result).toHaveProperty('takeoffDistance')
      expect(result).toHaveProperty('corrections')
      expect(result).toHaveProperty('notes')
    })

    it('should apply wind correction', () => {
      const noWind = calculateTakeoffDistance({ ...baseParams, headwindComponent: 0 })
      const headwind = calculateTakeoffDistance({ ...baseParams, headwindComponent: 20 })
      expect(headwind.takeoffDistance).toBeLessThan(noWind.takeoffDistance)
    })

    it('should apply slope correction', () => {
      const level = calculateTakeoffDistance({ ...baseParams, runwaySlope: 0 })
      const uphill = calculateTakeoffDistance({ ...baseParams, runwaySlope: 2 })
      expect(uphill.takeoffDistance).toBeGreaterThan(level.takeoffDistance)
    })

    it('should handle 3% Below PTFS thrust setting', () => {
      const maxThrust = calculateTakeoffDistance({ ...baseParams, thrustSetting: 'MAX' })
      const belowPTFS = calculateTakeoffDistance({ ...baseParams, thrustSetting: '3_BELOW_PTFS' })
      expect(belowPTFS.takeoffDistance).toBeGreaterThan(maxThrust.takeoffDistance)
    })

    it('should clamp weight to valid range', () => {
      const overweight = calculateTakeoffDistance({ ...baseParams, grossWeight: 60000 })
      expect(overweight.notes.some((n) => n.includes('clamped'))).toBe(true)
    })

    it('should include appropriate notes', () => {
      const result = calculateTakeoffDistance({
        ...baseParams,
        runwaySlope: 2,
        headwindComponent: 15,
      })
      expect(result.notes.some((n) => n.includes('Flaps'))).toBe(true)
      expect(result.notes.some((n) => n.includes('Slope'))).toBe(true)
      expect(result.notes.some((n) => n.includes('Wind'))).toBe(true)
    })
  })

  describe('calculateCriticalFieldLength', () => {
    const baseParams = {
      grossWeight: 40000,
      temperatureC: 20,
      pressureAltitude: 0,
    }

    it('should return longer distance than normal takeoff', () => {
      const takeoff = calculateTakeoffDistance({
        ...baseParams,
        flapSetting: 0,
      })
      const cfl = calculateCriticalFieldLength(baseParams)
      expect(cfl.criticalFieldLength).toBeGreaterThan(takeoff.takeoffDistance)
    })

    it('should increase with worse RCR', () => {
      const dry = calculateCriticalFieldLength({ ...baseParams, rcr: 23 })
      const wet = calculateCriticalFieldLength({ ...baseParams, rcr: 12 })
      const icy = calculateCriticalFieldLength({ ...baseParams, rcr: 5 })

      expect(wet.criticalFieldLength).toBeGreaterThan(dry.criticalFieldLength)
      expect(icy.criticalFieldLength).toBeGreaterThan(wet.criticalFieldLength)
    })

    it('should apply RCR correction factor correctly', () => {
      const dry = calculateCriticalFieldLength({ ...baseParams, rcr: 23 })
      const wet = calculateCriticalFieldLength({ ...baseParams, rcr: 12 })

      // Wet should be approximately 20% more
      const ratio = wet.criticalFieldLength / dry.criticalFieldLength
      expect(ratio).toBeCloseTo(1.2, 1)
    })

    it('should include RCR in notes', () => {
      const result = calculateCriticalFieldLength({ ...baseParams, rcr: 12 })
      expect(result.notes.some((n) => n.includes('RCR'))).toBe(true)
    })
  })

  describe('calculateStandardTakeoffDistance', () => {
    it('should use default values for corrections', () => {
      const result = calculateStandardTakeoffDistance(40000, 20, 0, 0)
      expect(result.corrections.wind).toBeCloseTo(1, 1)
      expect(result.corrections.slope).toBeCloseTo(1, 1)
    })

    it('should return reasonable distance for standard day sea level', () => {
      // Standard day (15°C), sea level, 40,000 lbs, Flaps 0
      const result = calculateStandardTakeoffDistance(40000, 15, 0, 0)
      // Should be roughly 4,000-6,000 ft
      expect(result.takeoffDistance).toBeGreaterThan(3500)
      expect(result.takeoffDistance).toBeLessThan(6500)
    })
  })

  describe('calculateHeadwindComponent', () => {
    it('should return positive for direct headwind', () => {
      // Wind from 360, runway 36 (360)
      const headwind = calculateHeadwindComponent(20, 360, 360)
      expect(headwind).toBeCloseTo(20, 0)
    })

    it('should return negative for direct tailwind', () => {
      // Wind from 180, runway 36 (360)
      const tailwind = calculateHeadwindComponent(20, 180, 360)
      expect(tailwind).toBeCloseTo(-20, 0)
    })

    it('should return zero for crosswind', () => {
      // Wind from 270, runway 36 (360)
      const crosswind = calculateHeadwindComponent(20, 270, 360)
      expect(Math.abs(crosswind)).toBeLessThan(1)
    })

    it('should handle quartering winds correctly', () => {
      // Wind from 315, runway 36 (360) - 45 degree quartering headwind
      const quartering = calculateHeadwindComponent(20, 315, 360)
      // Should be about 20 * cos(45°) ≈ 14.14
      expect(quartering).toBeCloseTo(14.14, 0)
    })
  })

  describe('getRecommendedFlapSetting', () => {
    it('should recommend Flaps 7 for high weight', () => {
      const result = getRecommendedFlapSetting(45000, 20, 0)
      expect(result.flapSetting).toBe(7)
      expect(result.reason).toContain('high weight')
    })

    it('should recommend Flaps 7 for hot temperature', () => {
      const result = getRecommendedFlapSetting(35000, 35, 0)
      expect(result.flapSetting).toBe(7)
      expect(result.reason).toContain('hot temperature')
    })

    it('should recommend Flaps 7 for high altitude', () => {
      const result = getRecommendedFlapSetting(35000, 20, 5000)
      expect(result.flapSetting).toBe(7)
      expect(result.reason).toContain('high altitude')
    })

    it('should recommend Flaps 0 for normal conditions', () => {
      const result = getRecommendedFlapSetting(35000, 20, 0)
      expect(result.flapSetting).toBe(0)
    })
  })

  describe('Temperature conversion', () => {
    it('should convert Celsius to Fahrenheit correctly', () => {
      expect(celsiusToFahrenheit(0)).toBe(32)
      expect(celsiusToFahrenheit(100)).toBe(212)
      expect(celsiusToFahrenheit(20)).toBeCloseTo(68, 1)
    })

    it('should convert Fahrenheit to Celsius correctly', () => {
      expect(fahrenheitToCelsius(32)).toBe(0)
      expect(fahrenheitToCelsius(212)).toBe(100)
      expect(fahrenheitToCelsius(68)).toBeCloseTo(20, 1)
    })

    it('should round-trip correctly', () => {
      const tempC = 25
      const tempF = celsiusToFahrenheit(tempC)
      const tempCBack = fahrenheitToCelsius(tempF)
      expect(tempCBack).toBeCloseTo(tempC, 5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum weight', () => {
      const result = calculateTakeoffDistance({
        grossWeight: 20000,
        temperatureC: 15,
        pressureAltitude: 0,
        flapSetting: 0,
      })
      expect(result.takeoffDistance).toBeGreaterThan(0)
    })

    it('should handle maximum weight', () => {
      const result = calculateTakeoffDistance({
        grossWeight: 50000,
        temperatureC: 15,
        pressureAltitude: 0,
        flapSetting: 0,
      })
      expect(result.takeoffDistance).toBeGreaterThan(0)
    })

    it('should handle extreme cold', () => {
      const result = calculateTakeoffDistance({
        grossWeight: 40000,
        temperatureC: -30,
        pressureAltitude: 0,
        flapSetting: 0,
      })
      expect(result.takeoffDistance).toBeGreaterThan(0)
    })

    it('should handle high altitude', () => {
      const result = calculateTakeoffDistance({
        grossWeight: 40000,
        temperatureC: 20,
        pressureAltitude: 6000,
        flapSetting: 0,
      })
      expect(result.takeoffDistance).toBeGreaterThan(0)
    })

    it('should handle combined adverse conditions', () => {
      // Hot, high, heavy with tailwind and uphill
      const result = calculateTakeoffDistance({
        grossWeight: 50000,
        temperatureC: 40,
        pressureAltitude: 5000,
        flapSetting: 0,
        thrustSetting: '3_BELOW_PTFS',
        runwaySlope: 2,
        headwindComponent: -10, // tailwind
      })
      expect(result.takeoffDistance).toBeGreaterThan(0)
      // Should be a very long takeoff run
      expect(result.takeoffDistance).toBeGreaterThan(10000)
    })
  })
})
