/**
 * F-16C Performance Calculator
 *
 * Implements the AircraftCalculator interface for the F-16C Block 50
 * with F110-GE-129 engine. Wraps the existing calculation functions
 * to provide a unified interface.
 *
 * @module aircraft/f16c/calculator
 */

import type {
  AircraftCalculator,
  BingoCapableCalculator,
  BingoParams,
  CalculatorCapability,
  DragIndexCapableCalculator,
  SpeedCalculationResult,
  TakeoffDistanceResult,
} from '../types'
import type {
  F16BingoConfig,
  F16SpeedConfig,
  F16SpeedParams,
  F16TakeoffConfig,
  F16TakeoffParams,
} from './types'
import { f16RunwayConditionToRCR } from './types'

// Import existing calculation functions
import { calculateSpeeds } from './rotationCalculator'
import {
  calculateTakeoffDistance as calcTakeoffDistance,
  celsiusToFahrenheit,
  calculateTotalDragIndex,
  getDragIndex as getDragIndexLookup,
  getCrosswindLimit as getF16CrosswindLimit,
  exceedsCrosswindLimitations as exceedsF16CrosswindLimit,
} from './takeoffDistanceCalculator'
import { calculateBingoFuel } from './bingoCalculator'

/**
 * F-16C capabilities
 */
const F16_CAPABILITIES: readonly CalculatorCapability[] = [
  'speeds',
  'takeoffDistance',
  'bingo',
  'dragIndex',
] as const

/**
 * F-16C Performance Calculator
 *
 * Supports:
 * - Rotation and refusal speed calculations
 * - Takeoff distance calculations with drag index
 * - Bingo fuel calculations with AAR support
 * - Crosswind limitation checking
 */
export class F16Calculator
  implements
    AircraftCalculator<F16SpeedParams, F16SpeedConfig, F16TakeoffParams, F16TakeoffConfig>,
    BingoCapableCalculator<F16BingoConfig>,
    DragIndexCapableCalculator
{
  readonly airframe = 'F-16C_50' as const
  readonly displayName = 'F-16C'
  readonly capabilities = F16_CAPABILITIES

  /**
   * Check if this calculator supports a specific capability
   */
  hasCapability(capability: CalculatorCapability): boolean {
    return this.capabilities.includes(capability)
  }

  /**
   * Get default speed calculation configuration
   */
  getDefaultSpeedConfig(): F16SpeedConfig {
    return {
      powerSetting: 'AB',
      runwayCondition: 'dry',
      cgPercent: 35,
      pitchAttitude: 10,
    }
  }

  /**
   * Get default takeoff distance configuration
   */
  getDefaultTakeoffConfig(): F16TakeoffConfig {
    return {
      powerSetting: 'AB',
      cgPercent: 35,
      pitchAttitude: 10,
    }
  }

  /**
   * Get default bingo calculator configuration
   */
  getDefaultBingoConfig(): F16BingoConfig {
    return {
      aarExpected: false,
      approachType: 'VFR',
      altitudeProfile: 'medium',
    }
  }

  /**
   * Calculate rotation and refusal speeds
   */
  calculateSpeeds(params: F16SpeedParams, config: F16SpeedConfig): SpeedCalculationResult {
    return calculateSpeeds({
      grossWeight: params.grossWeight,
      powerSetting: config.powerSetting,
      cgPercent: config.cgPercent,
      pitchAttitude: config.pitchAttitude,
      runwayCondition: config.runwayCondition,
      headwindComponent: params.headwindComponent,
      runwaySlope: params.runwaySlope,
    })
  }

  /**
   * Calculate takeoff distance
   */
  calculateTakeoffDistance(
    params: F16TakeoffParams,
    config: F16TakeoffConfig,
  ): TakeoffDistanceResult {
    const result = calcTakeoffDistance({
      grossWeight: params.grossWeight,
      temperatureF: celsiusToFahrenheit(params.temperatureC),
      pressureAltitude: params.pressureAltitude,
      powerSetting: config.powerSetting,
      cgPercent: config.cgPercent,
      dragIndex: params.dragIndex ?? 7, // Clean aircraft default
      runwaySlope: params.runwaySlope,
      headwindComponent: params.headwindComponent,
      pitchAttitude: config.pitchAttitude,
    })

    return {
      baseDistance: result.baseDistance,
      takeoffDistance: result.takeoffDistance,
      corrections: result.corrections,
      notes: result.notes,
    }
  }

  /**
   * Get crosswind limit for given configuration
   * F-16 crosswind limit varies by RCR (20-25 knots)
   */
  getCrosswindLimit(_config: F16TakeoffConfig): number {
    // F-16 crosswind limit depends on runway condition
    // Since F16TakeoffConfig doesn't include runway condition,
    // we need to accept it through a different mechanism
    // For now, return the dry runway limit (worst case is 20kt at RCR 4)
    return getF16CrosswindLimit(23) // Dry runway = 25 kt
  }

  /**
   * Get crosswind limit for a specific runway condition
   */
  getCrosswindLimitForCondition(runwayCondition: F16SpeedConfig['runwayCondition']): number {
    const rcr = f16RunwayConditionToRCR(runwayCondition)
    return getF16CrosswindLimit(rcr)
  }

  /**
   * Check if crosswind exceeds limitations
   */
  exceedsCrosswindLimit(crosswindKnots: number, _config: F16TakeoffConfig): boolean {
    // Use dry runway (most permissive) as default
    return exceedsF16CrosswindLimit(crosswindKnots, 23)
  }

  /**
   * Check if crosswind exceeds limitations for a specific runway condition
   */
  exceedsCrosswindLimitForCondition(
    crosswindKnots: number,
    runwayCondition: F16SpeedConfig['runwayCondition'],
  ): boolean {
    const rcr = f16RunwayConditionToRCR(runwayCondition)
    return exceedsF16CrosswindLimit(crosswindKnots, rcr)
  }

  /**
   * Calculate bingo fuel
   */
  calculateBingo(params: BingoParams, config: F16BingoConfig): number {
    return calculateBingoFuel({
      aarExpected: config.aarExpected,
      approachType: config.approachType,
      altitudeProfile: config.altitudeProfile,
      numberOfPilots: params.numberOfPilots,
      recoveryLocation: params.recoveryLocation,
      targetLocation: params.targetLocation,
      alternateLocation: params.alternateLocation,
    })
  }

  /**
   * Calculate total drag index from a loadout
   */
  calculateDragIndex(stores: { clsid: string; category?: string }[]): number {
    return calculateTotalDragIndex(stores)
  }

  /**
   * Get drag index for a single store
   */
  getDragIndex(clsid: string, category?: string): number {
    return getDragIndexLookup(clsid, category)
  }
}

/**
 * Factory function to create an F16Calculator instance
 */
export function createF16Calculator(): F16Calculator {
  return new F16Calculator()
}
