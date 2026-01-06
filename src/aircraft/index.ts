/**
 * Aircraft Performance Calculator Module
 *
 * This module provides an extensible architecture for aircraft-specific
 * performance calculations (takeoff distance, rotation/refusal speeds,
 * bingo fuel, crosswind limits, etc.).
 *
 * ## Usage
 *
 * ```typescript
 * import { getAircraftCalculator, hasCalculatorCapability } from '@/aircraft'
 *
 * // Get calculator for a specific airframe
 * const calculator = getAircraftCalculator('F-16C_50')
 * if (calculator) {
 *   const speeds = calculator.calculateSpeeds(params, config)
 * }
 *
 * // Check if airframe supports a capability
 * if (hasCalculatorCapability(airframe, 'bingo')) {
 *   // Show bingo calculator UI
 * }
 * ```
 *
 * ## Adding a New Aircraft
 *
 * 1. Create a new directory under `/src/aircraft/` (e.g., `/src/aircraft/fa18c/`)
 * 2. Define aircraft-specific types in `types.ts`
 * 3. Implement the calculator in `calculator.ts`
 * 4. Register the calculator in `index.ts`
 * 5. Create Vue components for UI
 *
 * @module aircraft
 */

// Export types
export type {
  AircraftCalculator,
  BingoCapableCalculator,
  BingoParams,
  CalculatorCapability,
  CriticalFieldCapableCalculator,
  CriticalFieldLengthResult,
  DragIndexCapableCalculator,
  SpeedCalculationResult,
  TakeoffDistanceResult,
} from './types'

// Export type guards
export { isBingoCapable, isCriticalFieldCapable, isDragIndexCapable } from './types'

// Export registry and convenience functions
export {
  calculatorRegistry,
  getAircraftCalculator,
  hasCalculatorCapability,
  isCalculatorSupported,
  getAircraftComponentLoader,
  hasAircraftComponent,
} from './registry'

// Export component type
export type { AircraftComponentType } from './registry'

// ============================================================================
// Aircraft Calculator Registration
// ============================================================================

// Import and register aircraft-specific calculators
// These imports trigger the registration of each calculator with the registry

// F-16C_50
import './F-16C_50'

// A-10 variants (A-10A is the base implementation, A-10C and A-10C_2 delegate to it)
import './A-10A'
import './A-10C'
import './A-10C_2'
