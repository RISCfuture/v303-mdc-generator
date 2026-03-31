/**
 * A-10A Performance Calculator Module
 *
 * This module exports the A-10A calculator and registers it with the
 * aircraft calculator registry.
 *
 * Note: The performance data in this module is sourced from A-10A documentation.
 * A-10C and A-10C_2 calculators delegate to this module.
 *
 * @module aircraft/a10a
 */

import { calculatorRegistry } from '../registry'
import { createA10Calculator, A10Calculator } from './calculator'

/**
 * DCS clsid for A-10A Thunderbolt II
 * This is the canonical identifier used throughout the system
 */
export const A10A_CLSID = 'A-10A' as const

// Register A-10A calculator with the registry
calculatorRegistry.register(A10A_CLSID, createA10Calculator)

// Register A-10A UI components with the registry
calculatorRegistry.registerComponent(
  A10A_CLSID,
  'speedCalculatorForm',
  () => import('./components/SpeedCalculatorForm.vue'),
)
calculatorRegistry.registerComponent(
  A10A_CLSID,
  'takeoffDistanceDisplay',
  () => import('./components/TakeoffDistanceDisplay.vue'),
)

// Export calculator class and factory
export { A10Calculator, createA10Calculator }

// Export types from local types module
export type {
  A10CriticalFieldConfig,
  A10FlapSetting,
  A10RCR,
  A10RunwayCondition as A10CalculatorRunwayCondition,
  A10SpeedBrakeSetting,
  A10SpeedConfig,
  A10SpeedParams,
  A10TakeoffConfig,
  A10TakeoffParams,
  A10ThrustSetting,
} from './types'

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
  FlapSetting,
  SpeedBrakeSetting,
  A10RunwayCondition,
  A10SpeedCalculationParams,
  A10SpeedCalculationResult,
} from './rotationCalculator'

export {
  calculateTakeoffIndex,
  calculateBaseDistance,
  calculateBaseCriticalFieldLength,
  calculateWindCorrection,
  calculateSlopeCorrection,
  calculateRCRCorrection,
  calculateTakeoffDistance,
  calculateCriticalFieldLength,
  calculateStandardTakeoffDistance,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  calculateHeadwindComponent as calculateTakeoffHeadwindComponent,
  getRecommendedFlapSetting,
  exceedsCrosswindLimitations,
} from './takeoffDistanceCalculator'

export type {
  RCR,
  ThrustSetting,
  FlapSetting as TakeoffFlapSetting,
  A10TakeoffDistanceParams,
  A10CriticalFieldLengthParams,
  A10TakeoffDistanceResult,
  A10CriticalFieldLengthResult,
} from './takeoffDistanceCalculator'

// Export Vue components for aircraft-specific UI
export { default as A10SpeedCalculatorForm } from './components/SpeedCalculatorForm.vue'
export { default as A10TakeoffDistanceDisplay } from './components/TakeoffDistanceDisplay.vue'
