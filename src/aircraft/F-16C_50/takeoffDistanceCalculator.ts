/**
 * F-16C Takeoff Distance Calculator
 *
 * Calculates takeoff distance for the F-16C with F110-GE-129 engine
 * based on TO GR1F-16CJ-1-1 Supplemental Flight Manual performance charts.
 *
 * Uses polynomial regression equations fitted to digitized chart data:
 * - Figure B2-1: Takeoff Factor (temperature, altitude -> factor)
 * - Figure B2-3: Takeoff Distance (factor + corrections -> distance)
 *
 * All regression equations have R² > 0.98.
 *
 * @module f16TakeoffDistanceCalculator
 */

import { calculateHeadwindComponent as calcHeadwind } from './rotationCalculator'

// Re-export for convenience
export { calcHeadwind as calculateHeadwindComponent }

/**
 * Power setting for takeoff
 */
export type PowerSetting = 'MIL' | 'AB'

/**
 * Input parameters for takeoff distance calculation
 */
export type TakeoffDistanceParams = {
  /** Gross weight in pounds */
  grossWeight: number
  /** Outside air temperature in Fahrenheit */
  temperatureF: number
  /** Pressure altitude in feet */
  pressureAltitude: number
  /** Power setting for takeoff */
  powerSetting: PowerSetting
  /** Center of gravity as percent MAC (default 35%) */
  cgPercent?: number
  /** Drag index (default uses clean aircraft = 7) */
  dragIndex?: number
  /** Runway slope in percent (positive = upslope, negative = downslope) */
  runwaySlope?: number
  /** Headwind component in knots (positive = headwind, negative = tailwind) */
  headwindComponent?: number
  /** Pitch attitude in degrees (default 10, can be 8) */
  pitchAttitude?: number
}

/**
 * Takeoff distance calculation results
 */
export type TakeoffDistanceResult = {
  /** Takeoff factor (intermediate calculation) */
  takeoffFactor: number
  /** Base takeoff distance in feet (before corrections) */
  baseDistance: number
  /** Final takeoff distance in feet (after all corrections) */
  takeoffDistance: number
  /** Applied corrections breakdown */
  corrections: {
    cg: number
    dragIndex: number
    slope: number
    wind: number
    pitch: number
  }
  /** Notes about the calculation */
  notes: string[]
}

// ============================================================================
// Regression coefficients from chart digitization
// ============================================================================

/**
 * Takeoff factor coefficients for MAX AB power
 * Combined model: factor = c0 + c1*temp_F + c2*alt_1000ft + c3*temp_F*alt_1000ft
 * Calibrated to manual sample: 108°F, 2000 ft → factor 1.44
 */
const TAKEOFF_FACTOR_COEFFS = {
  c0: 0.682,
  c1: 0.00388,
  c2: 0.106,
  c3: 0.000594,
}

/**
 * MIL power uses approximately 1.76x the AB factor scale
 * Derived from manual example: MIL factor 2.54 / AB factor 1.44 = 1.76
 */
const MIL_SCALE_FACTOR = 1.76

/**
 * Base takeoff distance coefficients
 * distance_1000ft = c0*factor² + c1*factor + c2
 * R² = 0.9999
 */
const BASE_DISTANCE_COEFFS: [number, number, number] = [
  0.14090909090909043, 1.3689393939393952, 0.24196969696969622,
]

/**
 * Drag index correction coefficients
 * percent_increase = c0*DI² + c1*DI + c2
 * R² = 0.9998
 */
const DRAG_INDEX_COEFFS: [number, number, number] = [
  7.524611341262412e-5, 0.06973673660296678, 0.12298988819101399,
]

/**
 * Wind correction coefficients
 * percent_change = c0*wind² + c1*wind + c2
 * R² = 0.999
 * Note: negative wind = headwind (decreases distance)
 */
const WIND_CORRECTION_COEFFS: [number, number, number] = [
  0.0070562770562770565, 0.5366666666666664, 0.2683982683982684,
]

/**
 * Clean aircraft drag index
 */
const CLEAN_AIRCRAFT_DRAG_INDEX = 7

/**
 * CG correction: 3% distance change per 1% CG from 35% baseline
 */
const CG_BASELINE = 35
const CG_CORRECTION_RATE = 0.03

/**
 * Slope correction: 5% distance change per 1% slope
 */
const SLOPE_CORRECTION_RATE = 0.05

/**
 * Pitch correction: 8 degree pitch increases distance by 18%
 */
const PITCH_8_DEGREE_INCREASE = 0.18

// ============================================================================
// Calculation functions
// ============================================================================

/**
 * Evaluate polynomial with coefficients [a, b, c] as: a*x² + b*x + c
 */
function evalPoly(x: number, coeffs: [number, number, number]): number {
  return coeffs[0] * x * x + coeffs[1] * x + coeffs[2]
}

/**
 * Calculate takeoff factor from temperature and altitude
 *
 * @param temperatureF - Outside air temperature in Fahrenheit
 * @param pressureAltitude - Pressure altitude in feet
 * @param powerSetting - Power setting (MIL or AB)
 * @returns Takeoff factor
 */
export function calculateTakeoffFactor(
  temperatureF: number,
  pressureAltitude: number,
  powerSetting: PowerSetting,
): number {
  const altK = pressureAltitude / 1000

  // Combined model: factor = c0 + c1*temp_F + c2*alt_1000ft + c3*temp_F*alt_1000ft
  const abFactor =
    TAKEOFF_FACTOR_COEFFS.c0 +
    TAKEOFF_FACTOR_COEFFS.c1 * temperatureF +
    TAKEOFF_FACTOR_COEFFS.c2 * altK +
    TAKEOFF_FACTOR_COEFFS.c3 * temperatureF * altK

  // MIL power uses approximately 2x the AB factor
  return powerSetting === 'MIL' ? abFactor * MIL_SCALE_FACTOR : abFactor
}

/**
 * Calculate base takeoff distance from takeoff factor
 *
 * @param takeoffFactor - Calculated takeoff factor
 * @returns Base takeoff distance in feet
 */
export function calculateBaseDistance(takeoffFactor: number): number {
  // Result is in 1000 feet, convert to feet
  return evalPoly(takeoffFactor, BASE_DISTANCE_COEFFS) * 1000
}

/**
 * Calculate drag index correction as a multiplier
 *
 * @param dragIndex - Aircraft drag index
 * @returns Correction multiplier (1.0 = no correction)
 */
export function calculateDragIndexCorrection(dragIndex: number): number {
  // Baseline is 0, so subtract clean aircraft drag index baseline
  // Actually the chart shows baseline as 0, but clean aircraft is 7
  // The correction is the percent increase from drag index 0
  const percentIncrease = evalPoly(dragIndex, DRAG_INDEX_COEFFS)
  return 1 + percentIncrease / 100
}

/**
 * Calculate CG correction as a multiplier
 *
 * @param cgPercent - CG position as percent MAC
 * @returns Correction multiplier (1.0 = no correction at 35% MAC)
 */
export function calculateCGCorrection(cgPercent: number): number {
  // Forward CG increases distance, aft CG decreases distance
  const cgDelta = cgPercent - CG_BASELINE
  return 1 + cgDelta * CG_CORRECTION_RATE
}

/**
 * Calculate slope correction as a multiplier
 *
 * @param slopePercent - Runway slope in percent (positive = upslope)
 * @returns Correction multiplier (1.0 = no correction at 0% slope)
 */
export function calculateSlopeCorrection(slopePercent: number): number {
  // Upslope increases distance, downslope decreases distance
  return 1 + slopePercent * SLOPE_CORRECTION_RATE
}

/**
 * Calculate wind correction as a multiplier
 *
 * @param headwindComponent - Headwind in knots (negative = tailwind)
 * @returns Correction multiplier (1.0 = no correction at 0 wind)
 */
export function calculateWindCorrection(headwindComponent: number): number {
  // Chart uses negative = headwind (decreases distance), positive = tailwind (increases)
  // Our input uses positive = headwind, so negate
  const windForChart = -headwindComponent
  const percentChange = evalPoly(windForChart, WIND_CORRECTION_COEFFS)
  return 1 + percentChange / 100
}

/**
 * Calculate pitch attitude correction as a multiplier
 *
 * @param pitchDegrees - Pitch attitude in degrees (8 or 10)
 * @returns Correction multiplier (1.0 = no correction at 10 degrees)
 */
export function calculatePitchCorrection(pitchDegrees: number): number {
  // 8 degree pitch increases takeoff distance by 18%
  if (pitchDegrees === 8) {
    return 1 + PITCH_8_DEGREE_INCREASE
  }
  return 1.0
}

/**
 * Calculate complete takeoff distance with all corrections
 *
 * @param params - Input parameters
 * @returns Calculation results with breakdown
 */
export function calculateTakeoffDistance(params: TakeoffDistanceParams): TakeoffDistanceResult {
  const {
    temperatureF,
    pressureAltitude,
    powerSetting,
    cgPercent = CG_BASELINE,
    dragIndex = CLEAN_AIRCRAFT_DRAG_INDEX,
    runwaySlope = 0,
    headwindComponent = 0,
    pitchAttitude = 10,
  } = params

  // Calculate takeoff factor
  const takeoffFactor = calculateTakeoffFactor(temperatureF, pressureAltitude, powerSetting)

  // Calculate base distance
  const baseDistance = calculateBaseDistance(takeoffFactor)

  // Calculate individual corrections
  const cgCorrection = calculateCGCorrection(cgPercent)
  const dragIndexCorrection = calculateDragIndexCorrection(dragIndex)
  const slopeCorrection = calculateSlopeCorrection(runwaySlope)
  const windCorrection = calculateWindCorrection(headwindComponent)
  const pitchCorrection = calculatePitchCorrection(pitchAttitude)

  // Apply all corrections
  const takeoffDistance =
    baseDistance *
    cgCorrection *
    dragIndexCorrection *
    slopeCorrection *
    windCorrection *
    pitchCorrection

  // Build notes
  const notes: string[] = []
  notes.push(`Power: ${powerSetting}`)
  notes.push(`Gross weight: ${Math.round(params.grossWeight)} lbs`)
  notes.push(`Temp: ${temperatureF}°F, Alt: ${pressureAltitude} ft`)
  notes.push(`Takeoff factor: ${takeoffFactor.toFixed(2)}`)

  if (cgPercent !== CG_BASELINE) {
    notes.push(
      `CG: ${cgPercent}% MAC (${cgPercent > CG_BASELINE ? '+' : ''}${((cgCorrection - 1) * 100).toFixed(1)}%)`,
    )
  }

  if (dragIndex !== CLEAN_AIRCRAFT_DRAG_INDEX) {
    notes.push(`Drag index: ${dragIndex} (${((dragIndexCorrection - 1) * 100).toFixed(1)}%)`)
  }

  if (runwaySlope !== 0) {
    const slopeType = runwaySlope > 0 ? 'upslope' : 'downslope'
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

  if (pitchAttitude !== 10) {
    notes.push(`Pitch: ${pitchAttitude}° (+${(PITCH_8_DEGREE_INCREASE * 100).toFixed(0)}%)`)
  }

  return {
    takeoffFactor,
    baseDistance: Math.round(baseDistance),
    takeoffDistance: Math.round(takeoffDistance),
    corrections: {
      cg: cgCorrection,
      dragIndex: dragIndexCorrection,
      slope: slopeCorrection,
      wind: windCorrection,
      pitch: pitchCorrection,
    },
    notes,
  }
}

/**
 * Calculate takeoff distance with standard/default conditions
 * Useful for quick calculations with minimal inputs
 *
 * @param grossWeight - Gross weight in pounds
 * @param temperatureF - Temperature in Fahrenheit
 * @param pressureAltitude - Pressure altitude in feet
 * @param powerSetting - Power setting (MIL or AB)
 * @returns Calculation results
 */
export function calculateStandardTakeoffDistance(
  grossWeight: number,
  temperatureF: number,
  pressureAltitude: number,
  powerSetting: PowerSetting,
): TakeoffDistanceResult {
  return calculateTakeoffDistance({
    grossWeight,
    temperatureF,
    pressureAltitude,
    powerSetting,
    cgPercent: CG_BASELINE,
    dragIndex: CLEAN_AIRCRAFT_DRAG_INDEX,
    runwaySlope: 0,
    headwindComponent: 0,
    pitchAttitude: 10,
  })
}

// ============================================================================
// Drag Index Lookup Functions
// ============================================================================

/**
 * Drag index data for known stores
 * Key format matches DCS CLSIDs where possible
 */
const DRAG_INDEX_LOOKUP: Record<string, number> = {
  // Air-to-air missiles
  '{AIM-9L}': 4,
  '{AIM-9M}': 4,
  '{AIM-9P}': 4,
  '{AIM-9P5}': 4,
  '{AIM-9X}': 4,
  '{AIM-120B}': 0,
  '{AIM-120C}': 4,
  '{CATM-9M}': 4,

  // Air-to-ground missiles
  '{AGM_65D}': 13,
  '{AGM_65G}': 13,
  '{AGM_65H}': 13,
  '{AGM_65K}': 13,
  '{AGM_88C}': 10,

  // GP bombs
  '{Mk-82}': 7,
  '{Mk-82AIR}': 11,
  '{Mk-82_Snakeye}': 7,
  '{Mk-84}': 10,
  '{BDU-33}': 1,
  '{BDU-50LD}': 5,
  '{BDU-50HD}': 9,

  // Guided bombs
  '{GBU-10}': 15,
  '{GBU-12}': 5,
  '{GBU-24}': 17,
  '{GBU-24A/B}': 20,
  '{GBU-31}': 12,
  '{GBU-31(V)3/B}': 12,
  '{GBU-38}': 8,

  // Cluster bombs
  '{CBU-87}': 20,
  '{CBU-97}': 18,
  '{CBU-103}': 20,
  '{CBU-105}': 22,

  // Pods
  '{SNIPER-XR}': 3,
  '{AN_AAQ-28_LITENING}': 3,
  '{ALQ_184}': 10,
  '{ALQ_184_Long}': 12,
  '{AN_ASQ_T50_TCTS}': 3,

  // Fuel tanks (full)
  '{DFT-300gal}': 18,
  '{DFT-370gal}': 27,
  '{DFT-600gal}': 20,

  // Rocket pods
  '{LAU_68_MK5}': 9,
  '{LAU_68_M151}': 9,
  '{LAU_131_MK5}': 9,
  '{LAU_131_M151}': 9,
}

/**
 * Category default drag indexes for unknown weapons
 */
const CATEGORY_DEFAULTS: Record<string, number> = {
  'air-to-air': 4,
  'air-to-ground': 10,
  fuel: 20,
  pod: 5,
  rack: 15,
  unknown: 10,
}

/**
 * Get drag index for a store CLSID
 * Falls back to category defaults if not found
 *
 * @param clsid - DCS CLSID for the store
 * @param category - Optional category for fallback
 * @returns Drag index
 */
export function getDragIndex(clsid: string, category?: string): number {
  // Try direct lookup
  if (clsid in DRAG_INDEX_LOOKUP) {
    return DRAG_INDEX_LOOKUP[clsid]
  }

  // Try with braces added/removed
  const withBraces = clsid.startsWith('{') ? clsid : `{${clsid}}`
  const withoutBraces = clsid.replace(/^\{|\}$/gu, '')

  if (withBraces in DRAG_INDEX_LOOKUP) {
    return DRAG_INDEX_LOOKUP[withBraces]
  }
  if (withoutBraces in DRAG_INDEX_LOOKUP) {
    return DRAG_INDEX_LOOKUP[withoutBraces]
  }

  // Try pattern matching for common weapon names
  const upperClsid = clsid.toUpperCase()

  if (upperClsid.includes('AIM-9') || upperClsid.includes('AIM9')) return 4
  if (upperClsid.includes('AIM-120') || upperClsid.includes('AIM120')) return 4
  if (
    upperClsid.includes('AGM-65') ||
    upperClsid.includes('AGM65') ||
    upperClsid.includes('MAVERICK')
  )
    return 13
  if (upperClsid.includes('AGM-88') || upperClsid.includes('AGM88') || upperClsid.includes('HARM'))
    return 10
  if (upperClsid.includes('GBU-10')) return 15
  if (upperClsid.includes('GBU-12')) return 5
  if (upperClsid.includes('GBU-24')) return 17
  if (upperClsid.includes('GBU-31') || upperClsid.includes('GBU-38')) return 10
  if (upperClsid.includes('MK-82') || upperClsid.includes('MK82')) return 7
  if (upperClsid.includes('MK-84') || upperClsid.includes('MK84')) return 10
  if (upperClsid.includes('CBU-')) return 20
  if (upperClsid.includes('LAU-') && (upperClsid.includes('68') || upperClsid.includes('131')))
    return 9
  if (
    upperClsid.includes('SNIPER') ||
    upperClsid.includes('LITENING') ||
    upperClsid.includes('TGP')
  )
    return 3
  if (upperClsid.includes('ALQ') || upperClsid.includes('ECM')) return 10
  if (upperClsid.includes('370') && upperClsid.includes('GAL')) return 27
  if (upperClsid.includes('300') && upperClsid.includes('GAL')) return 18
  if (upperClsid.includes('600') && upperClsid.includes('GAL')) return 20

  // Fall back to category default
  if (category && category in CATEGORY_DEFAULTS) {
    return CATEGORY_DEFAULTS[category]
  }

  // Ultimate fallback
  return CATEGORY_DEFAULTS.unknown
}

/**
 * Calculate total drag index for a loadout
 *
 * @param storeClsids - Array of CLSIDs for stores on aircraft
 * @returns Total drag index
 */
export function calculateTotalDragIndex(
  storeClsids: { clsid: string; category?: string }[],
): number {
  // Start with clean aircraft baseline
  let totalDragIndex = CLEAN_AIRCRAFT_DRAG_INDEX

  for (const store of storeClsids) {
    if (store.clsid && store.clsid !== 'EMPTY') {
      totalDragIndex += getDragIndex(store.clsid, store.category)
    }
  }

  return totalDragIndex
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32
}

// ============================================================================
// Crosswind Limitations
// ============================================================================

/**
 * F-16C crosswind limit at RCR 23 (dry runway) in knots
 */
const F16_CROSSWIND_LIMIT_RCR_23 = 25

/**
 * F-16C crosswind limit at RCR 4 (worst conditions) in knots
 */
const F16_CROSSWIND_LIMIT_RCR_4 = 20

/**
 * Get the F-16C crosswind limit for a given RCR value
 *
 * Crosswind limit varies linearly from 25 knots at RCR 23 to 20 knots at RCR 4
 *
 * @param rcr - Runway Condition Reading (4-23)
 * @returns Maximum crosswind limit in knots
 */
export function getCrosswindLimit(rcr: number): number {
  // Clamp RCR to valid range
  const clampedRCR = Math.max(4, Math.min(23, rcr))

  // Linear interpolation: 20 kt at RCR 4, 25 kt at RCR 23
  return (
    F16_CROSSWIND_LIMIT_RCR_4 +
    ((clampedRCR - 4) * (F16_CROSSWIND_LIMIT_RCR_23 - F16_CROSSWIND_LIMIT_RCR_4)) / (23 - 4)
  )
}

/**
 * Check if crosswind exceeds F-16C limitations
 *
 * @param crosswindComponent - Crosswind component in knots (absolute value used)
 * @param rcr - Runway Condition Reading (4-23)
 * @returns true if crosswind exceeds the limit for the given RCR
 */
export function exceedsCrosswindLimitations(crosswindComponent: number, rcr: number): boolean {
  const limit = getCrosswindLimit(rcr)
  return Math.abs(crosswindComponent) > limit
}
