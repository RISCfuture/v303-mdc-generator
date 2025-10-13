/**
 * F-16C Rotation and Refusal Speed Calculator
 *
 * Calculates takeoff rotation speed and refusal speed for the F-16C with F110-GE-129 engine
 * based on TO GR1F-16CJ-1-1 Supplemental Flight Manual performance charts (pages 284-293).
 *
 * Uses polynomial regression equations (quadratic) fitted to digitized chart data.
 * This provides better accuracy than linear interpolation for the slightly curved chart lines.
 * All regression equations have R² > 0.999.
 *
 * @module f16RotationCalculator
 */

/**
 * Calculate headwind component from wind direction and speed
 *
 * @param windDirection - Wind direction in magnetic degrees (0-359, direction wind is FROM)
 * @param windSpeed - Wind speed in knots
 * @param runwayHeading - Runway magnetic heading in degrees (0-359)
 * @returns Headwind component in knots (positive = headwind, negative = tailwind)
 */
export function calculateHeadwindComponent(
  windDirection: number,
  windSpeed: number,
  runwayHeading: number,
): number {
  // Calculate angle between wind direction and runway heading
  const angleDiff = windDirection - runwayHeading

  // Convert to radians
  const angleRad = (angleDiff * Math.PI) / 180

  // Headwind component = wind speed * cos(angle)
  // Positive when wind is from ahead, negative when from behind
  return windSpeed * Math.cos(angleRad)
}

/**
 * Calculate crosswind component from wind direction and speed
 *
 * @param windDirection - Wind direction in magnetic degrees (0-359, direction wind is FROM)
 * @param windSpeed - Wind speed in knots
 * @param runwayHeading - Runway magnetic heading in degrees (0-359)
 * @returns Crosswind component in knots (positive = from right, negative = from left)
 */
export function calculateCrosswindComponent(
  windDirection: number,
  windSpeed: number,
  runwayHeading: number,
): number {
  // Calculate angle between wind direction and runway heading
  const angleDiff = windDirection - runwayHeading

  // Convert to radians
  const angleRad = (angleDiff * Math.PI) / 180

  // Crosswind component = wind speed * sin(angle)
  // Positive when wind is from the right, negative when from the left
  return windSpeed * Math.sin(angleRad)
}

/**
 * Runway condition types matching the performance charts
 */
export type RunwayCondition = 'dry' | 'wet' | 'snow' | 'ice'

/**
 * Power setting for takeoff
 */
export type PowerSetting = 'MIL' | 'AB'

/**
 * Input parameters for speed calculations
 */
export interface SpeedCalculationParams {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Celsius (optional, for future expansion) */
  temperature?: number
  /** Pressure altitude in feet (optional, for future expansion) */
  pressureAltitude?: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Runway condition */
  runwayCondition?: RunwayCondition
  /** Runway slope in percent (positive = upslope, negative = downslope) */
  runwaySlope?: number
  /** Power setting for takeoff */
  powerSetting: PowerSetting
  /** Center of gravity as percent MAC (default 35%) */
  cgPercent?: number
  /** Pitch attitude in degrees (default 10, can be 8) */
  pitchAttitude?: number
}

/**
 * Calculation results
 */
export interface SpeedCalculationResult {
  /** Rotation speed in KIAS */
  rotationSpeed: number
  /** Refusal speed in KIAS */
  refusalSpeed: number
  /** Applied corrections and notes */
  notes: string[]
}

/**
 * Evaluate polynomial with coefficients [a, b, c] as: a*x² + b*x + c
 * Coefficients are from polynomial regression fitted to chart data (R² > 0.999)
 */
function evalPoly(x: number, coeffs: [number, number, number]): number {
  return coeffs[0] * x * x + coeffs[1] * x + coeffs[2]
}

// Regression coefficients from chart digitization
// Format: [a, b, c] for equation a*gw² + b*gw + c, where gw is in thousands of lbs

// Takeoff speed: R² = 0.999191
const TAKEOFF_SPEED_COEFFS: [number, number, number] = [
  -0.01761904761904761, 3.278571428571429, 75.54761904761905,
]

// Refusal speed coefficients for different conditions
const REFUSAL_SPEED_COEFFS = {
  nonAB: {
    dry: [-0.02095238095238096, 3.5571428571428565, 41.80952380952382] as [number, number, number],
    wet: [-0.02476190476190477, 4.0857142857142865, 49.76190476190476] as [number, number, number],
    snow: [-0.03523809523809524, 5.071428571428571, 72.38095238095238] as [number, number, number],
    ice: [-0.04238095238095238, 5.721428571428571, 89.5952380952381] as [number, number, number],
  },
  AB: {
    dry: [-0.021428571428571432, 3.307142857142857, 30.357142857142858] as [number, number, number],
    wet: [-0.02476190476190477, 3.685714285714286, 38.76190476190476] as [number, number, number],
    snow: [-0.030476190476190477, 4.528571428571429, 59.333333333333336] as [
      number,
      number,
      number,
    ],
    ice: [-0.03666666666666667, 5.221428571428571, 73.5952380952381] as [number, number, number],
  },
}

/**
 * Calculate takeoff rotation speed
 *
 * Based on Figure B2-2 (page 285) with documented corrections for:
 * - Power setting (MIL vs AB)
 * - CG position
 * - Pitch attitude
 */
export function calculateRotationSpeed(params: SpeedCalculationParams): number {
  const { grossWeight, powerSetting, cgPercent = 35, pitchAttitude = 10 } = params

  // Convert to thousands of lbs for regression equation
  const gwThousands = grossWeight / 1000

  // Calculate base takeoff speed using polynomial regression (at 10 deg pitch, 35% MAC)
  const baseSpeed = evalPoly(gwThousands, TAKEOFF_SPEED_COEFFS)

  // Apply power setting correction
  // MIL: rotate at 10 knots less than computed speed
  // AB: rotate at 15 knots less than computed speed
  const powerCorrection = powerSetting === 'MIL' ? -10 : -15

  // Apply CG correction
  // Add 0.8 KIAS per 1% forward of 35% MAC
  // Subtract 0.8 KIAS per 1% aft of 35% MAC
  const cgCorrection = (cgPercent - 35) * 0.8

  // Apply pitch attitude correction
  // Add 8% for 8 degree pitch attitude (compared to 10 degree baseline)
  const pitchCorrection = pitchAttitude === 8 ? baseSpeed * 0.08 : 0

  const rotationSpeed = baseSpeed + powerCorrection + cgCorrection + pitchCorrection

  return Math.round(rotationSpeed)
}

/**
 * Calculate refusal speed
 *
 * Based on Figures B2-5 (Non-AB) and B2-6 (AB) (pages 288-293) with corrections for:
 * - Runway condition (dry/wet/snow/ice)
 * - Wind component
 * - Runway slope
 */
export function calculateRefusalSpeed(params: SpeedCalculationParams): number {
  const {
    grossWeight,
    powerSetting,
    runwayCondition = 'dry',
    headwindComponent = 0,
    runwaySlope = 0,
  } = params

  // Convert to thousands of lbs for regression equation
  const gwThousands = grossWeight / 1000

  // Select appropriate regression coefficients based on power setting and runway condition
  const coeffs =
    powerSetting === 'MIL'
      ? REFUSAL_SPEED_COEFFS.nonAB[runwayCondition]
      : REFUSAL_SPEED_COEFFS.AB[runwayCondition]

  // Calculate base refusal speed using polynomial regression
  const baseRefusalSpeed = evalPoly(gwThousands, coeffs)

  // Apply wind correction
  // Approximately -1 KIAS per 5 knots headwind, +1 KIAS per 3 knots tailwind
  let windCorrection = 0
  if (headwindComponent > 0) {
    // Headwind decreases refusal speed
    windCorrection = -(headwindComponent / 5)
  } else if (headwindComponent < 0) {
    // Tailwind increases refusal speed
    windCorrection = Math.abs(headwindComponent) / 3
  }

  // Apply slope correction
  // Approximately -4 KIAS per 1% downslope, +4 KIAS per 1% upslope
  const slopeCorrection = runwaySlope * 4

  const refusalSpeed = baseRefusalSpeed + windCorrection + slopeCorrection

  return Math.round(refusalSpeed)
}

/**
 * Calculate both rotation and refusal speeds with detailed notes
 */
export function calculateSpeeds(params: SpeedCalculationParams): SpeedCalculationResult {
  const rotationSpeed = calculateRotationSpeed(params)
  const refusalSpeed = calculateRefusalSpeed(params)

  const notes: string[] = []

  // Add notes about configuration
  notes.push(`Power: ${params.powerSetting}`)
  notes.push(`Gross weight: ${Math.round(params.grossWeight)} lbs`)

  if (params.runwayCondition && params.runwayCondition !== 'dry') {
    notes.push(`Runway: ${params.runwayCondition}`)
  }

  if (params.headwindComponent && params.headwindComponent !== 0) {
    const windType = params.headwindComponent > 0 ? 'headwind' : 'tailwind'
    notes.push(`Wind: ${Math.abs(params.headwindComponent)} kt ${windType}`)
  }

  if (params.runwaySlope && params.runwaySlope !== 0) {
    const slopeType = params.runwaySlope > 0 ? 'upslope' : 'downslope'
    notes.push(`Slope: ${Math.abs(params.runwaySlope)}% ${slopeType}`)
  }

  if (params.cgPercent && params.cgPercent !== 35) {
    notes.push(`CG: ${params.cgPercent}% MAC`)
  }

  if (params.pitchAttitude && params.pitchAttitude !== 10) {
    notes.push(`Pitch: ${params.pitchAttitude}°`)
  }

  return {
    rotationSpeed,
    refusalSpeed,
    notes,
  }
}

/**
 * Calculate speeds using standard/default conditions
 * Useful for generating data cards with baseline assumptions
 */
export function calculateStandardSpeeds(
  grossWeight: number,
  powerSetting: PowerSetting,
): SpeedCalculationResult {
  return calculateSpeeds({
    grossWeight,
    powerSetting,
    runwayCondition: 'dry',
    headwindComponent: 0,
    runwaySlope: 0,
    cgPercent: 35,
    pitchAttitude: 10,
  })
}
