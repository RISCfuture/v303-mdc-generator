import { describe, it, expect } from 'vitest'
import { calculateHeadwindComponent, calculateCrosswindComponent } from './f16RotationCalculator'

describe('Wind Component Calculations', () => {
  describe('calculateHeadwindComponent', () => {
    it('should calculate direct headwind correctly', () => {
      // Wind from 360°, runway heading 360° (directly into wind)
      const headwind = calculateHeadwindComponent(360, 20, 360)
      expect(headwind).toBeCloseTo(20, 1)
    })

    it('should calculate direct tailwind correctly', () => {
      // Wind from 180°, runway heading 360° (directly with wind)
      const headwind = calculateHeadwindComponent(180, 20, 360)
      expect(headwind).toBeCloseTo(-20, 1)
    })

    it('should calculate zero headwind for perpendicular wind', () => {
      // Wind from 270°, runway heading 360° (perpendicular)
      const headwind = calculateHeadwindComponent(270, 20, 360)
      expect(headwind).toBeCloseTo(0, 1)
    })

    it('should calculate headwind component for 45-degree angle', () => {
      // Wind from 315°, runway heading 360° (45° from left)
      const headwind = calculateHeadwindComponent(315, 20, 360)
      // cos(45°) ≈ 0.707, so 20 * 0.707 ≈ 14.14
      expect(headwind).toBeCloseTo(14.14, 1)
    })

    it('should handle runway heading 90° correctly', () => {
      // Wind from 90°, runway heading 90° (directly into wind)
      const headwind = calculateHeadwindComponent(90, 15, 90)
      expect(headwind).toBeCloseTo(15, 1)
    })

    it('should calculate tailwind component for 135-degree angle', () => {
      // Wind from 225°, runway heading 360° (135° from left rear)
      const headwind = calculateHeadwindComponent(225, 20, 360)
      // cos(135°) ≈ -0.707, so 20 * -0.707 ≈ -14.14
      expect(headwind).toBeCloseTo(-14.14, 1)
    })

    it('should handle zero wind speed', () => {
      const headwind = calculateHeadwindComponent(270, 0, 360)
      expect(headwind).toBe(0)
    })
  })

  describe('calculateCrosswindComponent', () => {
    it('should calculate zero crosswind for direct headwind', () => {
      // Wind from 360°, runway heading 360°
      const crosswind = calculateCrosswindComponent(360, 20, 360)
      expect(crosswind).toBeCloseTo(0, 1)
    })

    it('should calculate right crosswind correctly', () => {
      // Wind from 90°, runway heading 360° (from the right)
      const crosswind = calculateCrosswindComponent(90, 20, 360)
      expect(crosswind).toBeCloseTo(20, 1)
    })

    it('should calculate left crosswind correctly', () => {
      // Wind from 270°, runway heading 360° (from the left)
      const crosswind = calculateCrosswindComponent(270, 20, 360)
      expect(crosswind).toBeCloseTo(-20, 1)
    })

    it('should calculate crosswind component for 45-degree angle', () => {
      // Wind from 315°, runway heading 360° (45° from left)
      const crosswind = calculateCrosswindComponent(315, 20, 360)
      // sin(45°) ≈ -0.707, so 20 * -0.707 ≈ -14.14 (from left)
      expect(crosswind).toBeCloseTo(-14.14, 1)
    })

    it('should handle runway heading 180° correctly', () => {
      // Wind from 270°, runway heading 180° (from the right)
      const crosswind = calculateCrosswindComponent(270, 15, 180)
      expect(crosswind).toBeCloseTo(15, 1)
    })

    it('should handle zero wind speed', () => {
      const crosswind = calculateCrosswindComponent(90, 0, 360)
      expect(crosswind).toBe(0)
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle Nellis AFB Runway 21L with 30° crosswind from right', () => {
      // Runway 21L heading: ~210°
      // Wind from 240° at 15 knots
      const runwayHeading = 210
      const windDirection = 240
      const windSpeed = 15

      const headwind = calculateHeadwindComponent(windDirection, windSpeed, runwayHeading)
      const crosswind = calculateCrosswindComponent(windDirection, windSpeed, runwayHeading)

      // 30° angle: cos(30°) ≈ 0.866, sin(30°) ≈ 0.5
      expect(headwind).toBeCloseTo(15 * 0.866, 1) // ~12.99 kt headwind
      expect(crosswind).toBeCloseTo(15 * 0.5, 1) // ~7.5 kt from right
    })

    it('should handle variable wind conditions', () => {
      // Runway 27 (270°), wind from 300° at 25 knots
      const runwayHeading = 270
      const windDirection = 300
      const windSpeed = 25

      const headwind = calculateHeadwindComponent(windDirection, windSpeed, runwayHeading)
      const crosswind = calculateCrosswindComponent(windDirection, windSpeed, runwayHeading)

      // 30° angle from right front
      expect(headwind).toBeCloseTo(25 * Math.cos((30 * Math.PI) / 180), 1)
      expect(crosswind).toBeCloseTo(25 * Math.sin((30 * Math.PI) / 180), 1)
    })
  })
})
