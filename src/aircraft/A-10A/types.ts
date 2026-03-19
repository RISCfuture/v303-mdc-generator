/**
 * A-10C Performance Calculator Types
 *
 * Type definitions specific to the A-10C Thunderbolt II with TF34-GE-100A engines.
 *
 * @module aircraft/a10c/types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Flap setting for A-10C takeoff
 */
export type A10FlapSetting = 0 | 7

/**
 * Speed brake configuration for A-10C
 */
export type A10SpeedBrakeSetting = 'open' | 'closed'

/**
 * Thrust setting for A-10C takeoff
 */
export type A10ThrustSetting = 'MAX' | '3_BELOW_PTFS'

/**
 * Runway condition types for A-10C (3 conditions)
 */
export type A10RunwayCondition = 'dry' | 'wet' | 'icy'

/**
 * Runway Condition Reading (RCR) values for A-10C
 */
export type A10RCR = 23 | 12 | 5

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Parameters for A-10C speed calculations
 */
export type A10SpeedParams = {
  /** Gross weight in pounds */
  grossWeight: number
}

/**
 * Configuration for A-10C speed calculations
 */
export type A10SpeedConfig = {
  /** Flap setting (0° or 7°) */
  flapSetting: A10FlapSetting
  /** Speed brake configuration */
  speedBrake: A10SpeedBrakeSetting
  /** Runway condition */
  runwayCondition: A10RunwayCondition
}

/**
 * Parameters for A-10C takeoff distance calculations
 */
export type A10TakeoffParams = {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Celsius */
  temperatureC: number
  /** Pressure altitude in feet */
  pressureAltitude: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Runway slope in percent (positive = uphill, negative = downhill) */
  runwaySlope?: number
}

/**
 * Configuration for A-10C takeoff distance calculations
 */
export type A10TakeoffConfig = {
  /** Flap setting (0° or 7°) */
  flapSetting: A10FlapSetting
  /** Thrust setting (MAX or 3% Below PTFS) */
  thrustSetting: A10ThrustSetting
}

/**
 * Configuration for A-10C critical field length calculations
 */
export type A10CriticalFieldConfig = {
  /** Thrust setting (MAX or 3% Below PTFS) */
  thrustSetting: A10ThrustSetting
  /** Runway Condition Reading */
  rcr: A10RCR
}

// ============================================================================
// RCR Mapping
// ============================================================================

/**
 * Map A-10 runway condition to RCR value
 */
export function a10RunwayConditionToRCR(condition: A10RunwayCondition): A10RCR {
  const rcrMap: Record<A10RunwayCondition, A10RCR> = {
    dry: 23,
    wet: 12,
    icy: 5,
  }
  return rcrMap[condition]
}
