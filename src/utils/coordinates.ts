/**
 * Coordinate conversion utilities for converting between decimal degrees (storage format)
 * and Degrees-Minutes-Seconds with symbols (display format).
 */

export type CoordinateType = 'latitude' | 'longitude'

export interface DecimalCoordinate {
  /** Decimal degrees. Positive = N/E, Negative = S/W */
  value: number
}

export interface DMSCoordinate {
  hemisphere: 'N' | 'S' | 'E' | 'W'
  degrees: number
  minutes: number
  seconds: number
}

/**
 * Convert decimal degrees to DMS format
 * @param decimal Decimal degrees (positive = N/E, negative = S/W)
 * @param type 'latitude' or 'longitude' to determine hemisphere
 * @returns DMS coordinate object
 */
export function decimalToDMS(decimal: number, type: CoordinateType): DMSCoordinate {
  const isNegative = decimal < 0
  const absolute = Math.abs(decimal)

  const degrees = Math.floor(absolute)
  const minutesDecimal = (absolute - degrees) * 60
  const minutes = Math.floor(minutesDecimal)
  const seconds = (minutesDecimal - minutes) * 60

  let hemisphere: 'N' | 'S' | 'E' | 'W'
  if (type === 'latitude') {
    hemisphere = isNegative ? 'S' : 'N'
  } else {
    hemisphere = isNegative ? 'W' : 'E'
  }

  return {
    hemisphere,
    degrees,
    minutes,
    seconds,
  }
}

/**
 * Convert DMS to decimal degrees
 * @param dms DMS coordinate object
 * @returns Decimal degrees (positive = N/E, negative = S/W)
 */
export function dmsToDecimal(dms: DMSCoordinate): number {
  const { hemisphere, degrees, minutes, seconds } = dms

  let decimal = degrees + minutes / 60 + seconds / 3600

  // Make negative for S/W hemispheres
  if (hemisphere === 'S' || hemisphere === 'W') {
    decimal = -decimal
  }

  return decimal
}

/**
 * Format DD (Decimal Degrees) as display string: "36.2057583, -115.1234567"
 * Used when user selects DD format in coordinate fields
 */
export function formatDD(lat: number, lon: number): string {
  return `${lat.toFixed(7)}, ${lon.toFixed(7)}`
}

/**
 * Parse DD format string to lat/lon: "36.2057583, -115.1234567"
 * Returns null if invalid format
 */
export function parseDD(input: string): { lat: number; lon: number } | null {
  const match = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null

  const [, latStr, lonStr] = match
  if (!latStr || !lonStr) return null

  const lat = parseFloat(latStr)
  const lon = parseFloat(lonStr)

  if (isNaN(lat) || isNaN(lon)) return null
  if (!isValidDecimal(lat, 'latitude') || !isValidDecimal(lon, 'longitude')) return null

  return { lat, lon }
}

/**
 * Format DDM (Degrees Decimal Minutes) coordinate as display string: "N 36° 12.345′"
 * Note: This is the aviation standard format (no seconds, decimal minutes)
 */
export function formatDDM(dms: DMSCoordinate, type: CoordinateType): string {
  const { hemisphere, degrees, minutes, seconds } = dms

  // Convert seconds back to decimal minutes
  const minutesWithDecimal = minutes + seconds / 60

  // Format with proper padding
  const degreesPadding = type === 'latitude' ? 2 : 3
  const degreesStr = degrees.toString().padStart(degreesPadding, '0')

  // Format minutes with up to 3 decimal places, removing trailing zeros
  const minutesStr = minutesWithDecimal.toFixed(3).replace(/\.?0+$/, '')
  const [minutesInt, minutesDec] = minutesStr.split('.')
  const minutesIntPadded = (minutesInt || '0').padStart(2, '0')
  const minutesFormatted = minutesDec ? `${minutesIntPadded}.${minutesDec}` : minutesIntPadded

  return `${hemisphere} ${degreesStr}° ${minutesFormatted}′`
}

/**
 * Format DMS (Degrees Minutes Seconds) coordinate as display string: "N 36° 12′ 21″"
 * Used when user selects DMS format (with seconds) in coordinate fields
 */
export function formatDMS(dms: DMSCoordinate, type: CoordinateType): string {
  const { hemisphere, degrees, minutes, seconds } = dms

  // Format with proper padding
  const degreesPadding = type === 'latitude' ? 2 : 3
  const degreesStr = degrees.toString().padStart(degreesPadding, '0')
  const minutesStr = minutes.toString().padStart(2, '0')

  // Format seconds with up to 2 decimal places, removing trailing zeros
  const secondsStr = seconds.toFixed(2).replace(/\.?0+$/, '')

  return `${hemisphere} ${degreesStr}° ${minutesStr}′ ${secondsStr}″`
}

/**
 * Parse DDM display string to DMS object: "N 36° 12.345′" → DMSCoordinate
 * Handles Degrees Decimal Minutes format (aviation standard, no seconds)
 * Also handles degrees-only format: "N 36°" → DMSCoordinate with 0 minutes
 */
export function parseDDM(input: string): DMSCoordinate | null {
  // Format: N 36° 12.345′ or N 36° 12′ or N 36° (degrees only)
  const match = input.match(/^([NSEW])\s+(\d+)°(?:\s+(\d+(?:\.\d+)?)′)?$/)
  if (!match) return null

  const [, hemisphere, degreesStr, minutesStr] = match
  if (!hemisphere || !degreesStr) return null

  const degrees = parseInt(degreesStr, 10)
  const minutesWithDecimal = minutesStr ? parseFloat(minutesStr) : 0
  const minutes = Math.floor(minutesWithDecimal)
  const seconds = (minutesWithDecimal - minutes) * 60

  return {
    hemisphere: hemisphere as 'N' | 'S' | 'E' | 'W',
    degrees,
    minutes,
    seconds,
  }
}

/**
 * Parse DMS display string to DMS object: "N 36° 12′ 21″" → DMSCoordinate
 * Handles Degrees Minutes Seconds format (with seconds)
 */
export function parseDMS(input: string): DMSCoordinate | null {
  // Format: N 36° 12′ 21″ or N 36° 12′ 21.5″
  const match = input.match(/^([NSEW])\s+(\d+)°\s+(\d+)′\s+(\d+(?:\.\d+)?)″$/)
  if (!match) return null

  const [, hemisphere, degreesStr, minutesStr, secondsStr] = match
  if (!hemisphere || !degreesStr || !minutesStr || !secondsStr) return null

  const degrees = parseInt(degreesStr, 10)
  const minutes = parseInt(minutesStr, 10)
  const seconds = parseFloat(secondsStr)

  return {
    hemisphere: hemisphere as 'N' | 'S' | 'E' | 'W',
    degrees,
    minutes,
    seconds,
  }
}

/**
 * Convert decimal degrees to DDM display string: "N 36° 12.345′"
 * This is the aviation standard format (degrees + decimal minutes)
 */
export function decimalToDDMString(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
  return formatDDM(dms, type)
}

/**
 * Convert decimal degrees to DMS display string with seconds: "N 36° 12′ 21″"
 * This format includes seconds (true DMS)
 */
export function decimalToTrueDMSString(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
  return formatDMS(dms, type)
}

/**
 * Convert DDM display string to decimal degrees: "N 36° 12.345′" → 36.2057583
 */
export function ddmStringToDecimal(input: string): number | null {
  const dms = parseDDM(input)
  if (!dms) return null
  return dmsToDecimal(dms)
}

/**
 * Convert true DMS display string to decimal degrees: "N 36° 12′ 21″" → 36.2057583
 */
export function trueDmsStringToDecimal(input: string): number | null {
  const dms = parseDMS(input)
  if (!dms) return null
  return dmsToDecimal(dms)
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================
// The following aliases maintain backward compatibility with existing code.
// The old "DMS" functions actually formatted as DDM (decimal minutes, no seconds).

/**
 * @deprecated Use decimalToDDMString instead for clarity
 * Legacy function that formats as DDM (not true DMS)
 */
export function decimalToDMSString(decimal: number, type: CoordinateType): string {
  return decimalToDDMString(decimal, type)
}

/**
 * @deprecated Use ddmStringToDecimal instead for clarity
 * Legacy function that parses DDM format (not true DMS)
 */
export function dmsStringToDecimal(input: string): number | null {
  return ddmStringToDecimal(input)
}

/**
 * Validate decimal coordinate value
 */
export function isValidDecimal(value: number, type: CoordinateType): boolean {
  if (type === 'latitude') {
    return value >= -90 && value <= 90
  } else {
    return value >= -180 && value <= 180
  }
}
