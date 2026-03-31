/**
 * F-16C Performance Calculator Module
 *
 * This module exports the F-16C calculator and registers it with the
 * aircraft calculator registry.
 *
 * @module aircraft/f16c
 */

import { calculatorRegistry } from '../registry'
import { createF16Calculator, F16Calculator } from './calculator'

/**
 * DCS clsid for F-16C Block 50
 * This is the canonical identifier used throughout the system
 */
export const F16C_CLSID = 'F-16C_50' as const

// Register F-16C calculator with the registry
calculatorRegistry.register(F16C_CLSID, createF16Calculator)

// Register F-16C UI components with the registry
calculatorRegistry.registerComponent(
  F16C_CLSID,
  'speedCalculatorForm',
  () => import('./components/SpeedCalculatorForm.vue'),
)
calculatorRegistry.registerComponent(
  F16C_CLSID,
  'takeoffDistanceDisplay',
  () => import('./components/TakeoffDistanceDisplay.vue'),
)
calculatorRegistry.registerComponent(
  F16C_CLSID,
  'ecmCmds',
  () => import('./components/EcmCmds.vue'),
)
calculatorRegistry.registerComponent(
  F16C_CLSID,
  'waypointCcipFields',
  () => import('./components/WaypointCcipFields.vue'),
)

// Export calculator class and factory
export { F16Calculator, createF16Calculator }

// Export types
export type {
  F16AltitudeProfile,
  F16ApproachType,
  F16BingoConfig,
  F16PitchAttitude,
  F16PowerSetting,
  F16RunwayCondition,
  F16SpeedConfig,
  F16SpeedParams,
  F16TakeoffConfig,
  F16TakeoffParams,
} from './types'

// Export utility functions from types
export { f16RunwayConditionToRCR } from './types'

// Re-export calculation functions for backward compatibility and direct use
export {
  calculateHeadwindComponent,
  calculateCrosswindComponent,
  calculateRotationSpeed,
  calculateRefusalSpeed,
  calculateSpeeds,
  calculateStandardSpeeds,
} from './rotationCalculator'

export type {
  RunwayCondition,
  PowerSetting,
  SpeedCalculationParams,
  SpeedCalculationResult,
} from './rotationCalculator'

export {
  calculateTakeoffFactor,
  calculateBaseDistance,
  calculateDragIndexCorrection,
  calculateCGCorrection,
  calculateSlopeCorrection,
  calculateWindCorrection,
  calculatePitchCorrection,
  calculateTakeoffDistance,
  calculateStandardTakeoffDistance,
  getDragIndex,
  calculateTotalDragIndex,
  celsiusToFahrenheit,
  getCrosswindLimit,
  exceedsCrosswindLimitations,
} from './takeoffDistanceCalculator'

export type { TakeoffDistanceParams, TakeoffDistanceResult } from './takeoffDistanceCalculator'

export { calculateBingoFuel, calculateDefaultBingo } from './bingoCalculator'

export type { ApproachType, AltitudeProfile, BingoCalculationParams } from './bingoCalculator'

// Export Vue components for aircraft-specific UI
export { default as F16SpeedCalculatorForm } from './components/SpeedCalculatorForm.vue'
export { default as F16TakeoffDistanceDisplay } from './components/TakeoffDistanceDisplay.vue'
