/**
 * A-10C Performance Calculator Delegation Module
 *
 * This module registers the A-10C airframe with the calculator registry,
 * delegating to the A-10A calculator implementation.
 *
 * Note: A-10C uses A-10A performance data until A-10C-specific data is available.
 *
 * @module aircraft/a10c
 */

import { calculatorRegistry } from '../registry'
import { createA10Calculator } from '../A-10A/calculator'

/**
 * DCS clsid for A-10C Thunderbolt II
 */
export const A10C_CLSID = 'A-10C' as const

// Register A-10C calculator with the registry (delegates to A-10A)
calculatorRegistry.register(A10C_CLSID, createA10Calculator)

// Register A-10C UI components (uses A-10A components)
calculatorRegistry.registerComponent(
  A10C_CLSID,
  'speedCalculatorForm',
  () => import('../A-10A/components/A10SpeedCalculatorForm.vue'),
)
calculatorRegistry.registerComponent(
  A10C_CLSID,
  'takeoffDistanceDisplay',
  () => import('../A-10A/components/A10TakeoffDistanceDisplay.vue'),
)

// Re-export everything from A-10A for backward compatibility
export * from '../A-10A'
