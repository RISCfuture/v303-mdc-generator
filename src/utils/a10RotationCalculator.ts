/**
 * A-10C Rotation and Refusal Speed Calculator
 *
 * Calculates takeoff rotation speed and refusal speed for the A-10C
 * based on TO 1A-10A-1 Flight Manual performance charts (pages 437, 446).
 *
 * Uses polynomial regression equations (quadratic) fitted to digitized chart data.
 * This provides better accuracy than linear interpolation for the slightly curved chart lines.
 * All regression equations have R² > 0.999.
 *
 * @module a10RotationCalculator
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
 * Flap setting for takeoff
 */
export type FlapSetting = 0 | 7

/**
 * Speed brake configuration
 */
export type SpeedBrakeSetting = 'open' | 'closed'

/**
 * Runway condition type (approximated by RCR value)
 */
export type A10RunwayCondition = 'dry' | 'wet' | 'icy'

/**
 * Input parameters for speed calculations
 */
export interface A10SpeedCalculationParams {
  /** Gross weight in pounds */
  grossWeight: number
  /** Flap setting (0° or 7°) */
  flapSetting?: FlapSetting
  /** Speed brake configuration */
  speedBrakes?: SpeedBrakeSetting
  /** Runway condition */
  runwayCondition?: A10RunwayCondition
}

/**
 * Calculation results
 */
export interface A10SpeedCalculationResult {
  /** Rotation speed in KIAS */
  rotationSpeed: number
  /** Refusal speed in KIAS */
  refusalSpeed: number
  /** Applied corrections and notes */
  notes: string[]
}

/**
 * Evaluate polynomial with coefficients [a, b, c] as: a*x² + b*x + c
 */
function evalPoly(x: number, coeffs: [number, number, number]): number {
  return coeffs[0] * x * x + coeffs[1] * x + coeffs[2]
}

/**
 * Linear interpolation between two values
 */
function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
}

// Rotation speed regression coefficients (R² > 0.9997)
// Format: [a, b, c] for equation a*gw² + b*gw + c, where gw is in thousands of lbs
const ROTATION_SPEED_COEFFS = {
  flaps0: [-0.00227778208579489, 1.991139917531865, 59.88846766540069] as [number, number, number],
  flaps7: [-0.005928793855341546, 2.308479485550139, 56.07904953506883] as [number, number, number],
}

// Refusal speed regression coefficients (R² > 0.996)
// These are functions of RCR for different gross weights
// We'll use these to calculate refusal speed, then interpolate between weights
const REFUSAL_SPEED_COEFFS = {
  gw30: [0.09703993546422594, -5.822582973153588, 177.53709027494932] as [number, number, number],
  gw35: [0.09633176870990379, -6.025244876088941, 188.63819763817] as [number, number, number],
  gw40: [0.09633176870990394, -6.0252448760889425, 195.63819763817003] as [number, number, number],
  gw45: [0.09633176870990372, -6.0252448760889346, 200.6381976381699] as [number, number, number],
}

/**
 * Map runway condition to RCR value
 */
function getRcrForCondition(condition: A10RunwayCondition): number {
  switch (condition) {
    case 'dry':
      return 23 // Dry runway
    case 'wet':
      return 12 // Wet runway
    case 'icy':
      return 4 // Icy runway
  }
}

/**
 * Calculate takeoff rotation speed
 *
 * Based on Figure A2-2 (page 437) with flap setting correction
 */
export function calculateRotationSpeed(params: A10SpeedCalculationParams): number {
  const { grossWeight, flapSetting = 0 } = params

  // Convert to thousands of lbs for regression equation
  const gwThousands = grossWeight / 1000

  // Select appropriate coefficients based on flap setting
  const coeffs = flapSetting === 7 ? ROTATION_SPEED_COEFFS.flaps7 : ROTATION_SPEED_COEFFS.flaps0

  // Calculate rotation speed using polynomial regression
  const rotationSpeed = evalPoly(gwThousands, coeffs)

  return Math.round(rotationSpeed)
}

/**
 * Calculate refusal speed
 *
 * Based on Figure A2-11 (page 446) with corrections for:
 * - Runway condition (RCR)
 * - Speed brake configuration
 *
 * Uses 2D interpolation: polynomial in RCR for each weight, linear between weights
 */
export function calculateRefusalSpeed(params: A10SpeedCalculationParams): number {
  const { grossWeight, runwayCondition = 'dry', speedBrakes = 'open' } = params

  // Convert to thousands of lbs
  const gwThousands = grossWeight / 1000

  // Get RCR for the runway condition
  const rcr = getRcrForCondition(runwayCondition)

  // Determine which two weight tables bracket our weight
  let lowerGw = 30
  let upperGw = 45

  if (gwThousands >= 30 && gwThousands <= 35) {
    lowerGw = 30
    upperGw = 35
  } else if (gwThousands > 35 && gwThousands <= 40) {
    lowerGw = 35
    upperGw = 40
  } else if (gwThousands > 40 && gwThousands <= 45) {
    lowerGw = 40
    upperGw = 45
  } else if (gwThousands < 30) {
    lowerGw = 30
    upperGw = 35
  } else {
    // gwThousands > 45
    lowerGw = 40
    upperGw = 45
  }

  // Get coefficients for lower and upper weights
  const lowerCoeffs = REFUSAL_SPEED_COEFFS[`gw${lowerGw}` as keyof typeof REFUSAL_SPEED_COEFFS]
  const upperCoeffs = REFUSAL_SPEED_COEFFS[`gw${upperGw}` as keyof typeof REFUSAL_SPEED_COEFFS]

  // Calculate refusal speed at each weight using polynomial in RCR
  const speedAtLowerGw = evalPoly(rcr, lowerCoeffs)
  const speedAtUpperGw = evalPoly(rcr, upperCoeffs)

  // Interpolate between weights
  const baseRefusalSpeed = lerp(gwThousands, lowerGw, upperGw, speedAtLowerGw, speedAtUpperGw)

  // Apply speed brake correction
  // Chart note: "With speed brakes closed, dry runway: decrease speed by 6%"
  // Chart note: "With speed brakes closed, wet runway: decrease speed by 3%"
  let correction = 0
  if (speedBrakes === 'closed') {
    if (runwayCondition === 'dry') {
      correction = -0.06 // Decrease by 6%
    } else if (runwayCondition === 'wet') {
      correction = -0.03 // Decrease by 3%
    }
    // No documented correction for icy conditions with speed brakes closed
  }

  const refusalSpeed = baseRefusalSpeed * (1 + correction)

  return Math.round(refusalSpeed)
}

/**
 * Calculate both rotation and refusal speeds with detailed notes
 */
export function calculateSpeeds(params: A10SpeedCalculationParams): A10SpeedCalculationResult {
  const rotationSpeed = calculateRotationSpeed(params)
  const refusalSpeed = calculateRefusalSpeed(params)

  const notes: string[] = []

  // Add notes about configuration
  notes.push(`Gross weight: ${Math.round(params.grossWeight)} lbs`)

  const flapSetting = params.flapSetting ?? 0
  notes.push(`Flaps: ${flapSetting}°`)

  const speedBrakes = params.speedBrakes ?? 'open'
  if (speedBrakes === 'closed') {
    notes.push('Speed brakes: closed')
  }

  const runwayCondition = params.runwayCondition ?? 'dry'
  if (runwayCondition !== 'dry') {
    notes.push(`Runway: ${runwayCondition}`)
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
  flapSetting: FlapSetting = 0,
): A10SpeedCalculationResult {
  return calculateSpeeds({
    grossWeight,
    flapSetting,
    speedBrakes: 'open',
    runwayCondition: 'dry',
  })
}
