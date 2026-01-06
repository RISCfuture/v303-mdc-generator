/**
 * A-10C Takeoff Distance Calculator
 *
 * Calculates takeoff distance for the A-10C Thunderbolt II with TF34-GE-100A engines
 * based on TO 1A-10C-1-1 Flight Manual performance charts.
 *
 * Uses polynomial regression equations fitted to digitized chart data:
 * - Takeoff Index (temperature, altitude -> index)
 * - Takeoff Run - Flaps 0° and Flaps 7° (index, weight -> distance)
 * - Critical Field Length (for single-engine failure scenarios)
 *
 * All regression equations have R² > 0.98.
 *
 * @module a10TakeoffDistanceCalculator
 */

/**
 * Runway Condition Reading (RCR) values for A-10C
 * 23 = dry, 12 = wet, 5 = icy
 */
export type RCR = 23 | 12 | 5

/**
 * Flap setting for takeoff
 */
export type FlapSetting = 0 | 7

/**
 * Thrust setting for takeoff
 */
export type ThrustSetting = 'MAX' | '3_BELOW_PTFS'

/**
 * Input parameters for takeoff distance calculation
 */
export interface A10TakeoffDistanceParams {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Celsius */
  temperatureC: number
  /** Pressure altitude in feet */
  pressureAltitude: number
  /** Flap setting (0 or 7 degrees) */
  flapSetting: FlapSetting
  /** Thrust setting (MAX or 3% Below PTFS) */
  thrustSetting?: ThrustSetting
  /** Runway slope in percent (positive = uphill, negative = downhill) */
  runwaySlope?: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
}

/**
 * Input parameters for critical field length calculation
 */
export interface A10CriticalFieldLengthParams {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Celsius */
  temperatureC: number
  /** Pressure altitude in feet */
  pressureAltitude: number
  /** Thrust setting (MAX or 3% Below PTFS) */
  thrustSetting?: ThrustSetting
  /** Runway slope in percent (positive = uphill, negative = downhill) */
  runwaySlope?: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Runway Condition Reading (23=dry, 12=wet, 5=icy) */
  rcr?: RCR
}

/**
 * Takeoff distance calculation results
 */
export interface A10TakeoffDistanceResult {
  /** Takeoff index (intermediate calculation) */
  takeoffIndex: number
  /** Base takeoff distance in feet (before corrections) */
  baseDistance: number
  /** Final takeoff distance in feet (after all corrections) */
  takeoffDistance: number
  /** Applied corrections breakdown */
  corrections: {
    wind: number
    slope: number
  }
  /** Notes about the calculation */
  notes: string[]
}

/**
 * Critical field length calculation results
 */
export interface A10CriticalFieldLengthResult {
  /** Takeoff index (intermediate calculation) */
  takeoffIndex: number
  /** Base critical field length in feet (before corrections) */
  baseLength: number
  /** Final critical field length in feet (after all corrections) */
  criticalFieldLength: number
  /** Applied corrections breakdown */
  corrections: {
    wind: number
    slope: number
    rcr: number
  }
  /** Notes about the calculation */
  notes: string[]
}

// ============================================================================
// Regression coefficients from chart digitization
// ============================================================================

/**
 * Takeoff index coefficients for MAX thrust
 * Combined model: index = c0 + c1*temp_C + c2*alt_1000ft + c3*temp_C*alt_1000ft
 * R² = 0.990
 */
const TAKEOFF_INDEX_COEFFS = {
  c0: 4.5236,
  c1: 0.0405,
  c2: 0.5966,
  c3: 0.00621,
}

/**
 * 3% Below PTFS offset (higher index = worse performance)
 */
const BELOW_PTFS_OFFSET = 0.4

/**
 * Takeoff distance coefficients for Flaps 0°
 * distance_1000ft = c0 + c1*index + c2*index² + c3*weight_1000lb + c4*weight_1000lb² + c5*index*weight_1000lb
 * R² = 0.998
 */
const FLAPS_0_DISTANCE_COEFFS: [number, number, number, number, number, number] = [
  8.127, -2.0924, 0.121, -0.3253, 0.0025, 0.0589,
]

/**
 * Takeoff distance coefficients for Flaps 7°
 * distance_1000ft = c0 + c1*index + c2*index² + c3*weight_1000lb + c4*weight_1000lb² + c5*index*weight_1000lb
 * R² = 0.999
 */
const FLAPS_7_DISTANCE_COEFFS: [number, number, number, number, number, number] = [
  7.547, -1.9531, 0.1123, -0.2943, 0.0022, 0.0536,
]

/**
 * Critical field length coefficients
 * cfl_1000ft = c0 + c1*index + c2*index² + c3*weight_1000lb + c4*weight_1000lb² + c5*index*weight_1000lb
 * R² = 0.999
 */
const CFL_DISTANCE_COEFFS: [number, number, number, number, number, number] = [
  5.8199, -1.6117, 0.115, -0.1841, 0.001386, 0.043,
]

/**
 * Wind correction coefficients
 * percent_change = c0*wind² + c1*wind + c2
 * Note: positive wind = tailwind (increases distance)
 * R² = 0.998
 */
const WIND_CORRECTION_COEFFS: [number, number, number] = [0.0045, 0.67, 0.554]

/**
 * Slope correction coefficients
 * percent_change = c0*slope + c1
 * R² = 0.998
 */
const SLOPE_CORRECTION_COEFFS: [number, number] = [7.107, 0.714]

/**
 * RCR correction factors
 */
const RCR_CORRECTIONS: Record<RCR, number> = {
  23: 1.0, // Dry
  12: 1.2, // Wet
  5: 1.5, // Icy
}

/**
 * A-10C weight limits
 */
const MIN_GROSS_WEIGHT = 20000
const MAX_GROSS_WEIGHT = 50000

/**
 * Takeoff index limits (from chart)
 */
const MIN_TAKEOFF_INDEX = 4.0
const MAX_TAKEOFF_INDEX = 11.0

// ============================================================================
// Calculation functions
// ============================================================================

/**
 * Evaluate quadratic polynomial: a*x² + b*x + c
 */
function evalQuadratic(x: number, coeffs: [number, number, number]): number {
  return coeffs[0] * x * x + coeffs[1] * x + coeffs[2]
}

/**
 * Evaluate linear polynomial: a*x + b
 */
function evalLinear(x: number, coeffs: [number, number]): number {
  return coeffs[0] * x + coeffs[1]
}

/**
 * Evaluate surface model: c0 + c1*x + c2*x² + c3*y + c4*y² + c5*x*y
 */
function evalSurface(
  x: number,
  y: number,
  coeffs: [number, number, number, number, number, number],
): number {
  return (
    coeffs[0] +
    coeffs[1] * x +
    coeffs[2] * x * x +
    coeffs[3] * y +
    coeffs[4] * y * y +
    coeffs[5] * x * y
  )
}

/**
 * Calculate takeoff index from temperature and altitude
 *
 * @param temperatureC - Outside air temperature in Celsius
 * @param pressureAltitude - Pressure altitude in feet
 * @param thrustSetting - Thrust setting (MAX or 3% Below PTFS)
 * @returns Takeoff index
 */
export function calculateTakeoffIndex(
  temperatureC: number,
  pressureAltitude: number,
  thrustSetting: ThrustSetting = 'MAX',
): number {
  const altK = pressureAltitude / 1000

  // Combined model: index = c0 + c1*temp_C + c2*alt_1000ft + c3*temp_C*alt_1000ft
  let index =
    TAKEOFF_INDEX_COEFFS.c0 +
    TAKEOFF_INDEX_COEFFS.c1 * temperatureC +
    TAKEOFF_INDEX_COEFFS.c2 * altK +
    TAKEOFF_INDEX_COEFFS.c3 * temperatureC * altK

  // Add offset for 3% Below PTFS
  if (thrustSetting === '3_BELOW_PTFS') {
    index += BELOW_PTFS_OFFSET
  }

  // Clamp to chart limits
  return Math.max(MIN_TAKEOFF_INDEX, Math.min(MAX_TAKEOFF_INDEX, index))
}

/**
 * Calculate base takeoff distance from takeoff index and gross weight
 *
 * @param takeoffIndex - Calculated takeoff index
 * @param grossWeight - Gross weight in pounds
 * @param flapSetting - Flap setting (0 or 7 degrees)
 * @returns Base takeoff distance in feet
 */
export function calculateBaseDistance(
  takeoffIndex: number,
  grossWeight: number,
  flapSetting: FlapSetting,
): number {
  const weightK = grossWeight / 1000
  const coeffs = flapSetting === 0 ? FLAPS_0_DISTANCE_COEFFS : FLAPS_7_DISTANCE_COEFFS

  // Result is in 1000 feet, convert to feet
  const distance1000ft = evalSurface(takeoffIndex, weightK, coeffs)

  return Math.max(0, distance1000ft * 1000)
}

/**
 * Calculate base critical field length from takeoff index and gross weight
 *
 * @param takeoffIndex - Calculated takeoff index
 * @param grossWeight - Gross weight in pounds
 * @returns Base critical field length in feet
 */
export function calculateBaseCriticalFieldLength(
  takeoffIndex: number,
  grossWeight: number,
): number {
  const weightK = grossWeight / 1000

  // Result is in 1000 feet, convert to feet
  const length1000ft = evalSurface(takeoffIndex, weightK, CFL_DISTANCE_COEFFS)

  return Math.max(0, length1000ft * 1000)
}

/**
 * Calculate wind correction as a multiplier
 *
 * @param headwindComponent - Headwind in knots (negative = tailwind)
 * @returns Correction multiplier (1.0 = no correction)
 */
export function calculateWindCorrection(headwindComponent: number): number {
  // Chart uses positive = tailwind (increases distance)
  // Our input uses positive = headwind, so negate
  const windForChart = -headwindComponent
  const percentChange = evalQuadratic(windForChart, WIND_CORRECTION_COEFFS)
  return 1 + percentChange / 100
}

/**
 * Calculate slope correction as a multiplier
 *
 * @param slopePercent - Runway slope in percent (positive = uphill)
 * @returns Correction multiplier (1.0 = no correction at 0% slope)
 */
export function calculateSlopeCorrection(slopePercent: number): number {
  const percentChange = evalLinear(slopePercent, SLOPE_CORRECTION_COEFFS)
  return 1 + percentChange / 100
}

/**
 * Calculate RCR correction as a multiplier
 *
 * @param rcr - Runway Condition Reading
 * @returns Correction multiplier (1.0 = dry runway)
 */
export function calculateRCRCorrection(rcr: RCR): number {
  return RCR_CORRECTIONS[rcr]
}

/**
 * Calculate complete takeoff distance with all corrections
 *
 * @param params - Input parameters
 * @returns Calculation results with breakdown
 */
export function calculateTakeoffDistance(
  params: A10TakeoffDistanceParams,
): A10TakeoffDistanceResult {
  const {
    grossWeight,
    temperatureC,
    pressureAltitude,
    flapSetting,
    thrustSetting = 'MAX',
    runwaySlope = 0,
    headwindComponent = 0,
  } = params

  // Validate weight
  const clampedWeight = Math.max(MIN_GROSS_WEIGHT, Math.min(MAX_GROSS_WEIGHT, grossWeight))

  // Calculate takeoff index
  const takeoffIndex = calculateTakeoffIndex(temperatureC, pressureAltitude, thrustSetting)

  // Calculate base distance
  const baseDistance = calculateBaseDistance(takeoffIndex, clampedWeight, flapSetting)

  // Calculate individual corrections
  const windCorrection = calculateWindCorrection(headwindComponent)
  const slopeCorrection = calculateSlopeCorrection(runwaySlope)

  // Apply all corrections
  const takeoffDistance = baseDistance * windCorrection * slopeCorrection

  // Build notes
  const notes: string[] = []
  notes.push(`Flaps: ${flapSetting}°`)
  notes.push(`Thrust: ${thrustSetting === 'MAX' ? 'Maximum' : '3% Below PTFS'}`)
  notes.push(`Gross weight: ${Math.round(grossWeight).toLocaleString()} lbs`)
  notes.push(`Temp: ${temperatureC}°C, Alt: ${pressureAltitude.toLocaleString()} ft`)
  notes.push(`Takeoff index: ${takeoffIndex.toFixed(2)}`)

  if (grossWeight !== clampedWeight) {
    notes.push(
      `Weight clamped to ${clampedWeight.toLocaleString()} lbs (chart limits: ${MIN_GROSS_WEIGHT.toLocaleString()}-${MAX_GROSS_WEIGHT.toLocaleString()})`,
    )
  }

  if (runwaySlope !== 0) {
    const slopeType = runwaySlope > 0 ? 'uphill' : 'downhill'
    notes.push(
      `Slope: ${Math.abs(runwaySlope)}% ${slopeType} (${((slopeCorrection - 1) * 100).toFixed(1)}%)`,
    )
  }

  if (headwindComponent !== 0) {
    const windType = headwindComponent > 0 ? 'headwind' : 'tailwind'
    notes.push(
      `Wind: ${Math.abs(headwindComponent)} kt ${windType} (${((windCorrection - 1) * 100).toFixed(1)}%)`,
    )
  }

  return {
    takeoffIndex,
    baseDistance: Math.round(baseDistance),
    takeoffDistance: Math.round(takeoffDistance),
    corrections: {
      wind: windCorrection,
      slope: slopeCorrection,
    },
    notes,
  }
}

/**
 * Calculate critical field length with all corrections
 *
 * @param params - Input parameters
 * @returns Calculation results with breakdown
 */
export function calculateCriticalFieldLength(
  params: A10CriticalFieldLengthParams,
): A10CriticalFieldLengthResult {
  const {
    grossWeight,
    temperatureC,
    pressureAltitude,
    thrustSetting = 'MAX',
    runwaySlope = 0,
    headwindComponent = 0,
    rcr = 23,
  } = params

  // Validate weight (CFL chart starts at 30k lbs)
  const minCFLWeight = 30000
  const clampedWeight = Math.max(minCFLWeight, Math.min(MAX_GROSS_WEIGHT, grossWeight))

  // Calculate takeoff index
  const takeoffIndex = calculateTakeoffIndex(temperatureC, pressureAltitude, thrustSetting)

  // Calculate base critical field length
  const baseLength = calculateBaseCriticalFieldLength(takeoffIndex, clampedWeight)

  // Calculate individual corrections
  const windCorrection = calculateWindCorrection(headwindComponent)
  const slopeCorrection = calculateSlopeCorrection(runwaySlope)
  const rcrCorrection = calculateRCRCorrection(rcr)

  // Apply all corrections
  const criticalFieldLength = baseLength * windCorrection * slopeCorrection * rcrCorrection

  // Build notes
  const notes: string[] = []
  notes.push(`Thrust: ${thrustSetting === 'MAX' ? 'Maximum' : '3% Below PTFS'}`)
  notes.push(`Gross weight: ${Math.round(grossWeight).toLocaleString()} lbs`)
  notes.push(`Temp: ${temperatureC}°C, Alt: ${pressureAltitude.toLocaleString()} ft`)
  notes.push(`Takeoff index: ${takeoffIndex.toFixed(2)}`)

  if (grossWeight !== clampedWeight) {
    notes.push(
      `Weight clamped to ${clampedWeight.toLocaleString()} lbs (chart limits: ${minCFLWeight.toLocaleString()}-${MAX_GROSS_WEIGHT.toLocaleString()})`,
    )
  }

  notes.push(`RCR: ${rcr} (${rcr === 23 ? 'dry' : rcr === 12 ? 'wet' : 'icy'})`)
  if (rcr !== 23) {
    notes.push(`RCR correction: +${((rcrCorrection - 1) * 100).toFixed(0)}%`)
  }

  if (runwaySlope !== 0) {
    const slopeType = runwaySlope > 0 ? 'uphill' : 'downhill'
    notes.push(
      `Slope: ${Math.abs(runwaySlope)}% ${slopeType} (${((slopeCorrection - 1) * 100).toFixed(1)}%)`,
    )
  }

  if (headwindComponent !== 0) {
    const windType = headwindComponent > 0 ? 'headwind' : 'tailwind'
    notes.push(
      `Wind: ${Math.abs(headwindComponent)} kt ${windType} (${((windCorrection - 1) * 100).toFixed(1)}%)`,
    )
  }

  return {
    takeoffIndex,
    baseLength: Math.round(baseLength),
    criticalFieldLength: Math.round(criticalFieldLength),
    corrections: {
      wind: windCorrection,
      slope: slopeCorrection,
      rcr: rcrCorrection,
    },
    notes,
  }
}

/**
 * Calculate takeoff distance with standard/default conditions
 * Useful for quick calculations with minimal inputs
 *
 * @param grossWeight - Gross weight in pounds
 * @param temperatureC - Temperature in Celsius
 * @param pressureAltitude - Pressure altitude in feet
 * @param flapSetting - Flap setting (0 or 7 degrees)
 * @returns Calculation results
 */
export function calculateStandardTakeoffDistance(
  grossWeight: number,
  temperatureC: number,
  pressureAltitude: number,
  flapSetting: FlapSetting,
): A10TakeoffDistanceResult {
  return calculateTakeoffDistance({
    grossWeight,
    temperatureC,
    pressureAltitude,
    flapSetting,
    thrustSetting: 'MAX',
    runwaySlope: 0,
    headwindComponent: 0,
  })
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9
}

/**
 * Calculate headwind component from wind speed and angle
 *
 * @param windSpeed - Wind speed in knots
 * @param windAngle - Wind direction in degrees (from)
 * @param runwayHeading - Runway heading in degrees
 * @returns Headwind component in knots (positive = headwind, negative = tailwind)
 */
export function calculateHeadwindComponent(
  windSpeed: number,
  windAngle: number,
  runwayHeading: number,
): number {
  // Wind "from" direction - when wind is FROM the same direction as runway heading,
  // it's a headwind (aircraft taking off INTO the wind)
  // Normalize angle difference to -180 to +180
  const angleDiff = ((windAngle - runwayHeading + 540) % 360) - 180
  const angleRad = (angleDiff * Math.PI) / 180

  // Headwind component (positive = headwind)
  return windSpeed * Math.cos(angleRad)
}

/**
 * Get recommended flap setting based on conditions
 *
 * @param grossWeight - Gross weight in pounds
 * @param temperatureC - Temperature in Celsius
 * @param pressureAltitude - Pressure altitude in feet
 * @returns Recommended flap setting with reasoning
 */
export function getRecommendedFlapSetting(
  grossWeight: number,
  temperatureC: number,
  pressureAltitude: number,
): { flapSetting: FlapSetting; reason: string } {
  // Flaps 7° generally recommended for:
  // - High gross weights
  // - Hot temperatures
  // - High altitude

  const isHighWeight = grossWeight > 42000
  const isHot = temperatureC > 30
  const isHighAltitude = pressureAltitude > 4000

  if (isHighWeight || isHot || isHighAltitude) {
    const reasons: string[] = []
    if (isHighWeight) reasons.push('high weight')
    if (isHot) reasons.push('hot temperature')
    if (isHighAltitude) reasons.push('high altitude')
    return {
      flapSetting: 7,
      reason: `Flaps 7° recommended for ${reasons.join(', ')}`,
    }
  }

  return {
    flapSetting: 0,
    reason: 'Flaps 0° suitable for current conditions',
  }
}

// ============================================================================
// Crosswind Limitations
// ============================================================================

/**
 * A-10C maximum crosswind limit in knots
 * This is a constant value regardless of runway condition
 */
const A10_CROSSWIND_LIMIT = 35

/**
 * Check if crosswind exceeds A-10C limitations
 *
 * @param crosswindComponent - Crosswind component in knots (absolute value used)
 * @returns true if crosswind exceeds the 35 knot limit
 */
export function exceedsCrosswindLimitations(crosswindComponent: number): boolean {
  return Math.abs(crosswindComponent) > A10_CROSSWIND_LIMIT
}
