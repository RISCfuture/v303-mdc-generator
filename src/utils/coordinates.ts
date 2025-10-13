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
 * Format DMS coordinate as display string: "N 36° 12.345′"
 * Note: We use minutes with decimal places (no seconds) for aviation standard
 */
export function formatDMS(dms: DMSCoordinate, type: CoordinateType): string {
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
 * Parse DMS display string to DMS object: "N 36° 12.345′" → DMSCoordinate
 */
export function parseDMS(input: string): DMSCoordinate | null {
  // Format: N 36° 12.345′ or N 36° 12′
  const match = input.match(/^([NSEW])\s+(\d+)°\s+(\d+(?:\.\d+)?)′$/)
  if (!match) return null

  const [, hemisphere, degreesStr, minutesStr] = match
  if (!hemisphere || !degreesStr || !minutesStr) return null

  const degrees = parseInt(degreesStr, 10)
  const minutesWithDecimal = parseFloat(minutesStr)
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
 * Convert decimal degrees to display string
 */
export function decimalToDMSString(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
  return formatDMS(dms, type)
}

/**
 * Convert display string to decimal degrees
 */
export function dmsStringToDecimal(input: string): number | null {
  const dms = parseDMS(input)
  if (!dms) return null
  return dmsToDecimal(dms)
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

/**
 * Validate DMS coordinate
 */
export function isValidDMS(dms: DMSCoordinate, type: CoordinateType): boolean {
  const { hemisphere, degrees, minutes, seconds } = dms

  // Check hemisphere
  const validHemispheres = type === 'latitude' ? ['N', 'S'] : ['E', 'W']
  if (!validHemispheres.includes(hemisphere)) return false

  // Check degrees
  const maxDegrees = type === 'latitude' ? 90 : 180
  if (degrees < 0 || degrees > maxDegrees) return false

  // Check minutes and seconds
  if (minutes < 0 || minutes >= 60) return false
  if (seconds < 0 || seconds >= 60) return false

  return true
}

/**
 * Format decimal degrees for F-16C DCS-DTC export
 * Format: "N 12°34.567'" (no space after degree symbol, uses prime character)
 */
export function formatF16LatLon(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
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

  return `${hemisphere} ${degreesStr}°${minutesFormatted}'`
}

/**
 * Format decimal degrees for A-10C JAFDTC export
 * Format: "31.52045000" (8 decimal places as string)
 */
export function formatA10LatLon(decimal: number): string {
  return decimal.toFixed(8)
}
