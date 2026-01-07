/**
 * A-10C II Performance Calculator Delegation Module
 *
 * This module registers the A-10C_2 (A-10C II Tank Killer) airframe with
 * the calculator registry, delegating to the A-10A calculator implementation.
 *
 * Note: A-10C_2 uses A-10A performance data until A-10C-specific data is available.
 *
 * @module aircraft/a10c2
 */

import { calculatorRegistry } from '../registry'
import { createA10Calculator } from '../A-10A/calculator'

/**
 * DCS clsid for A-10C II Tank Killer
 */
export const A10C2_CLSID = 'A-10C_2' as const

// Register A-10C_2 calculator with the registry (delegates to A-10A)
calculatorRegistry.register(A10C2_CLSID, createA10Calculator)

// Register A-10C_2 UI components (uses A-10A components)
calculatorRegistry.registerComponent(
  A10C2_CLSID,
  'speedCalculatorForm',
  () => import('../A-10A/components/SpeedCalculatorForm.vue'),
)
calculatorRegistry.registerComponent(
  A10C2_CLSID,
  'takeoffDistanceDisplay',
  () => import('../A-10A/components/TakeoffDistanceDisplay.vue'),
)
calculatorRegistry.registerComponent(
  A10C2_CLSID,
  'ecmCmds',
  () => import('../A-10C/components/EcmCmds.vue'),
)

// Re-export everything from A-10A for backward compatibility
export * from '../A-10A'
