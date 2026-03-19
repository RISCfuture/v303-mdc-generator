/**
 * F-16C Bingo Fuel Calculator
 *
 * Calculates bingo fuel for the F-16C based on mission profile, crew size,
 * and flight planning data. Bingo fuel is the minimum fuel required to safely
 * return to base (or alternate) with appropriate reserves.
 *
 * @module f16BingoCalculator
 */

import haversine from 'haversine-distance'

/**
 * Approach type for recovery
 */
export type ApproachType = 'VFR' | 'IFR'

/**
 * Altitude profile for mission
 */
export type AltitudeProfile = 'medium' | 'low'

/**
 * Input parameters for bingo fuel calculation
 */
export type BingoCalculationParams = {
  /** Whether aerial refueling is expected */
  aarExpected: boolean
  /** Approach type for recovery (VFR or IFR) */
  approachType: ApproachType
  /** Mission altitude profile (medium or low) */
  altitudeProfile: AltitudeProfile
  /** Number of pilots in the flight */
  numberOfPilots: number
  /** Recovery airport location (home plate) */
  recoveryLocation: { latitude: number; longitude: number } | null
  /** Target location (first waypoint marked as target) */
  targetLocation: { latitude: number; longitude: number } | null
  /** Alternate airport location (optional) */
  alternateLocation: { latitude: number; longitude: number } | null
}

// Fuel constants (in pounds)
const MIN_FUEL_OVER_HOME_PLATE = 1200
const TANKING_BASE_FUEL = 500
const APPROACH_FUEL_VFR = 400
const APPROACH_FUEL_IFR = 800

// Distance modifiers (pounds per nautical mile)
const ALTITUDE_MODIFIER_MEDIUM = 15
const ALTITUDE_MODIFIER_LOW = 20
const ECONOMY_MODIFIER = 10

/**
 * Calculate distance between two geographic points in nautical miles
 *
 * @param from - Starting location
 * @param to - Ending location
 * @returns Distance in nautical miles, or 0 if either location is null
 */
function calculateDistance(
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number } | null,
): number {
  if (!from || !to) return 0

  // haversine-distance returns meters, convert to nautical miles
  const meters = haversine(from, to)
  return meters / 1852
}

/**
 * Calculate bingo fuel for F-16C
 *
 * @param params - Calculation parameters
 * @returns Calculated bingo fuel in pounds
 */
export function calculateBingoFuel(params: BingoCalculationParams): number {
  const {
    aarExpected,
    approachType,
    altitudeProfile,
    numberOfPilots,
    recoveryLocation,
    targetLocation,
    alternateLocation,
  } = params

  // Determine altitude modifier
  const altitudeModifier =
    altitudeProfile === 'medium' ? ALTITUDE_MODIFIER_MEDIUM : ALTITUDE_MODIFIER_LOW

  // Calculate distance from home plate to target
  const distanceHomeToTarget = calculateDistance(recoveryLocation, targetLocation)

  // AAR Expected formula
  if (aarExpected) {
    const tankingFuel = TANKING_BASE_FUEL + (numberOfPilots - 1)
    const enrouteFuel = altitudeModifier * distanceHomeToTarget
    return Math.round(tankingFuel + enrouteFuel)
  }

  // Non-AAR formula
  const minFuel = MIN_FUEL_OVER_HOME_PLATE
  const approachFuel = approachType === 'VFR' ? APPROACH_FUEL_VFR : APPROACH_FUEL_IFR
  const enrouteFuel = altitudeModifier * distanceHomeToTarget

  // Calculate diversion fuel (0 if no alternate)
  const distanceHomeToAlternate = calculateDistance(recoveryLocation, alternateLocation)
  const diversionFuel = distanceHomeToAlternate * ECONOMY_MODIFIER

  return Math.round(minFuel + approachFuel + enrouteFuel + diversionFuel)
}

/**
 * Calculate bingo fuel with default parameters (useful for auto-calculation)
 *
 * @param numberOfPilots - Number of pilots in the flight
 * @param recoveryLocation - Recovery airport location
 * @param targetLocation - Target location
 * @param alternateLocation - Alternate airport location (optional)
 * @returns Calculated bingo fuel in pounds
 */
export function calculateDefaultBingo(
  numberOfPilots: number,
  recoveryLocation: { latitude: number; longitude: number } | null,
  targetLocation: { latitude: number; longitude: number } | null,
  alternateLocation: { latitude: number; longitude: number } | null = null,
): number {
  return calculateBingoFuel({
    aarExpected: false,
    approachType: 'VFR',
    altitudeProfile: 'medium',
    numberOfPilots,
    recoveryLocation,
    targetLocation,
    alternateLocation,
  })
}
