/**
 * A-10C Performance Calculator
 *
 * Implements the AircraftCalculator interface for the A-10C Thunderbolt II
 * with TF34-GE-100A engines. Wraps the existing calculation functions
 * to provide a unified interface.
 *
 * @module aircraft/a10c/calculator
 */

import type {
  AircraftCalculator,
  CalculatorCapability,
  CriticalFieldCapableCalculator,
  CriticalFieldLengthResult,
  SpeedCalculationResult,
  TakeoffDistanceResult,
} from '../types'
import type {
  A10CriticalFieldConfig,
  A10SpeedConfig,
  A10SpeedParams,
  A10TakeoffConfig,
  A10TakeoffParams,
} from './types'

// Import existing calculation functions
import { calculateSpeeds } from './rotationCalculator'
import {
  calculateTakeoffDistance as calcTakeoffDistance,
  calculateCriticalFieldLength as calcCriticalFieldLength,
  exceedsCrosswindLimitations as exceedsA10CrosswindLimit,
} from './takeoffDistanceCalculator'

/**
 * A-10C crosswind limit (constant)
 */
const A10_CROSSWIND_LIMIT = 35

/**
 * A-10C capabilities
 */
const A10_CAPABILITIES: readonly CalculatorCapability[] = [
  'speeds',
  'takeoffDistance',
  'criticalField',
] as const

/**
 * A-10C Performance Calculator
 *
 * Supports:
 * - Rotation and refusal speed calculations
 * - Takeoff distance calculations
 * - Critical field length calculations (engine-out scenario)
 * - Crosswind limitation checking
 */
export class A10Calculator
  implements
    AircraftCalculator<A10SpeedParams, A10SpeedConfig, A10TakeoffParams, A10TakeoffConfig>,
    CriticalFieldCapableCalculator<A10TakeoffParams, A10CriticalFieldConfig>
{
  readonly airframe = 'A-10C_2' as const
  readonly displayName = 'A-10C'
  readonly capabilities = A10_CAPABILITIES

  /**
   * Check if this calculator supports a specific capability
   */
  hasCapability(capability: CalculatorCapability): boolean {
    return this.capabilities.includes(capability)
  }

  /**
   * Get default speed calculation configuration
   */
  getDefaultSpeedConfig(): A10SpeedConfig {
    return {
      flapSetting: 0,
      speedBrake: 'open',
      runwayCondition: 'dry',
    }
  }

  /**
   * Get default takeoff distance configuration
   */
  getDefaultTakeoffConfig(): A10TakeoffConfig {
    return {
      flapSetting: 0,
      thrustSetting: 'MAX',
    }
  }

  /**
   * Get default critical field length configuration
   */
  getDefaultCriticalFieldConfig(): A10CriticalFieldConfig {
    return {
      thrustSetting: 'MAX',
      rcr: 23, // Dry
    }
  }

  /**
   * Calculate rotation and refusal speeds
   */
  calculateSpeeds(params: A10SpeedParams, config: A10SpeedConfig): SpeedCalculationResult {
    return calculateSpeeds({
      grossWeight: params.grossWeight,
      flapSetting: config.flapSetting,
      speedBrakes: config.speedBrake,
      runwayCondition: config.runwayCondition,
    })
  }

  /**
   * Calculate takeoff distance
   */
  calculateTakeoffDistance(
    params: A10TakeoffParams,
    config: A10TakeoffConfig,
  ): TakeoffDistanceResult {
    const result = calcTakeoffDistance({
      grossWeight: params.grossWeight,
      temperatureC: params.temperatureC,
      pressureAltitude: params.pressureAltitude,
      flapSetting: config.flapSetting,
      thrustSetting: config.thrustSetting,
      runwaySlope: params.runwaySlope,
      headwindComponent: params.headwindComponent,
    })

    return {
      baseDistance: result.baseDistance,
      takeoffDistance: result.takeoffDistance,
      corrections: result.corrections,
      notes: result.notes,
    }
  }

  /**
   * Calculate critical field length (engine-out scenario)
   */
  calculateCriticalFieldLength(
    params: A10TakeoffParams,
    config: A10CriticalFieldConfig,
  ): CriticalFieldLengthResult {
    const result = calcCriticalFieldLength({
      grossWeight: params.grossWeight,
      temperatureC: params.temperatureC,
      pressureAltitude: params.pressureAltitude,
      thrustSetting: config.thrustSetting,
      runwaySlope: params.runwaySlope,
      headwindComponent: params.headwindComponent,
      rcr: config.rcr,
    })

    return {
      baseLength: result.baseLength,
      criticalFieldLength: result.criticalFieldLength,
      corrections: result.corrections,
      notes: result.notes,
    }
  }

  /**
   * Get crosswind limit
   * A-10C has a constant 35 knot crosswind limit regardless of conditions
   */
  getCrosswindLimit(_config: A10TakeoffConfig): number {
    return A10_CROSSWIND_LIMIT
  }

  /**
   * Check if crosswind exceeds limitations
   */
  exceedsCrosswindLimit(crosswindKnots: number, _config: A10TakeoffConfig): boolean {
    return exceedsA10CrosswindLimit(crosswindKnots)
  }
}

/**
 * Factory function to create an A10Calculator instance
 */
export function createA10Calculator(): A10Calculator {
  return new A10Calculator()
}
