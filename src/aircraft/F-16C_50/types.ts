/**
 * F-16C Performance Calculator Types
 *
 * Type definitions specific to the F-16C Block 50 with F110-GE-129 engine.
 *
 * @module aircraft/f16c/types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Power setting for F-16C takeoff
 */
export type F16PowerSetting = 'MIL' | 'AB'

/**
 * Runway condition types for F-16C (4 conditions)
 */
export type F16RunwayCondition = 'dry' | 'wet' | 'snow' | 'ice'

/**
 * Pitch attitude options for F-16C takeoff
 */
export type F16PitchAttitude = 8 | 10

/**
 * Approach type for recovery
 */
export type F16ApproachType = 'VFR' | 'IFR'

/**
 * Altitude profile for mission
 */
export type F16AltitudeProfile = 'medium' | 'low'

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Parameters for F-16C speed calculations
 */
export type F16SpeedParams = {
  /** Gross weight in pounds */
  grossWeight: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Runway slope in percent (positive = upslope, negative = downslope) */
  runwaySlope?: number
}

/**
 * Configuration for F-16C speed calculations
 */
export type F16SpeedConfig = {
  /** Power setting (MIL or AB) */
  powerSetting: F16PowerSetting
  /** Runway condition */
  runwayCondition: F16RunwayCondition
  /** Center of gravity as percent MAC (default 35%) */
  cgPercent: number
  /** Pitch attitude in degrees (default 10) */
  pitchAttitude: F16PitchAttitude
}

/**
 * Parameters for F-16C takeoff distance calculations
 */
export type F16TakeoffParams = {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Celsius */
  temperatureC: number
  /** Pressure altitude in feet */
  pressureAltitude: number
  /** Drag index (default uses clean aircraft = 7) */
  dragIndex?: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Runway slope in percent (positive = upslope, negative = downslope) */
  runwaySlope?: number
}

/**
 * Configuration for F-16C takeoff distance calculations
 */
export type F16TakeoffConfig = {
  /** Power setting (MIL or AB) */
  powerSetting: F16PowerSetting
  /** Center of gravity as percent MAC (default 35%) */
  cgPercent: number
  /** Pitch attitude in degrees (default 10) */
  pitchAttitude: F16PitchAttitude
}

/**
 * Configuration for F-16C bingo fuel calculations
 */
export type F16BingoConfig = {
  /** Whether aerial refueling is expected */
  aarExpected: boolean
  /** Approach type for recovery (VFR or IFR) */
  approachType: F16ApproachType
  /** Mission altitude profile (medium or low) */
  altitudeProfile: F16AltitudeProfile
}

// ============================================================================
// RCR Mapping
// ============================================================================

/**
 * Map F-16 runway condition to RCR value
 */
export function f16RunwayConditionToRCR(condition: F16RunwayCondition): number {
  const rcrMap: Record<F16RunwayCondition, number> = {
    dry: 23,
    wet: 12,
    snow: 8,
    ice: 4,
  }
  return rcrMap[condition]
}
