// MGRS coordinate conversion utilities
import * as mgrs from 'mgrs'

/**
 * Convert decimal degrees to MGRS format
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees
 * @param precision Number of digits (0-5, default 5 = 1m precision)
 * @returns MGRS string in spaced format (e.g., "38S MB 44000 84000")
 */
export function latLonToMGRS(lat: number, lon: number, precision: number = 5): string {
  try {
    // Validate inputs
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
      return ''
    }

    // Convert to MGRS (returns compact format like "38SMB4400084000")
    const compact = mgrs.forward([lon, lat], precision)

    // Format with spaces: "38S MB 44000 84000"
    return formatMGRSWithSpaces(compact)
  } catch (error) {
    console.error('Error converting to MGRS:', error)
    return ''
  }
}

/**
 * Format compact MGRS string with spaces
 * @param compact Compact MGRS string (e.g., "38SMB4400084000")
 * @returns Spaced MGRS string (e.g., "38S MB 44000 84000")
 */
export function formatMGRSWithSpaces(compact: string): string {
  if (!compact || compact.length < 5) return compact

  // MGRS format: [Grid Zone][100km Square][Easting][Northing]
  // Example: 38SMB4400084000
  // Grid Zone: 38S (2-3 chars)
  // 100km Square: MB (2 chars)
  // Easting: 44000 (variable length)
  // Northing: 84000 (variable length)

  // Find where the 100km square identifier ends (first 2 letters after grid zone)
  const gridZoneMatch = compact.match(/^(\d{1,2}[A-Z])/)
  if (!gridZoneMatch || !gridZoneMatch[1]) return compact

  const gridZone = gridZoneMatch[1]
  const rest = compact.substring(gridZone.length)

  if (rest.length < 2) return compact

  const hundredKmSquare = rest.substring(0, 2)
  const coordinates = rest.substring(2)

  // Split coordinates into easting and northing (equal length)
  const halfLength = Math.floor(coordinates.length / 2)
  const easting = coordinates.substring(0, halfLength)
  const northing = coordinates.substring(halfLength)

  // Format with spaces
  if (easting && northing) {
    return `${gridZone} ${hundredKmSquare} ${easting} ${northing}`
  } else if (hundredKmSquare) {
    return `${gridZone} ${hundredKmSquare}`
  } else {
    return gridZone
  }
}

/**
 * Parse DMS (Degrees Minutes Seconds) format to decimal degrees
 * Supports formats like:
 * - "N 33°30.346'" (DMS with decimal minutes)
 * - "N 33°30'20.76\"" (DMS with seconds)
 * - "33.5061" (decimal degrees)
 *
 * @param dms DMS string
 * @returns Decimal degrees or null if invalid
 */
export function parseDMS(dms: string): number | null {
  if (!dms) return null

  // Try parsing as decimal first
  const decimal = parseFloat(dms)
  if (!isNaN(decimal)) return decimal

  // Clean up the input
  const cleaned = dms.trim().toUpperCase()

  // Check for hemisphere
  const isNegative = cleaned.includes('S') || cleaned.includes('W')

  // Extract numbers
  // Pattern: degrees (°) minutes (') seconds (")
  const degPattern = /(\d+)[°º]?\s*(\d+(?:\.\d+)?)[''′]?\s*(\d+(?:\.\d+)?)?[""″]?/
  const match = cleaned.match(degPattern)

  if (!match) return null

  const degrees = parseFloat(match[1] || '0')
  const minutes = parseFloat(match[2] || '0')
  const seconds = parseFloat(match[3] || '0')

  // Convert to decimal degrees
  let result = degrees + minutes / 60 + seconds / 3600

  // Apply hemisphere
  if (isNegative) result = -result

  return result
}

/**
 * Convert DMS string to MGRS
 * @param latDMS Latitude in DMS format
 * @param lonDMS Longitude in DMS format
 * @param precision MGRS precision (default 5)
 * @returns MGRS string or empty string if invalid
 */
export function dmsToMGRS(latDMS: string, lonDMS: string, precision: number = 5): string {
  const lat = parseDMS(latDMS)
  const lon = parseDMS(lonDMS)

  if (lat === null || lon === null) return ''

  return latLonToMGRS(lat, lon, precision)
}

/**
 * Validate MGRS coordinate string
 * @param mgrsString MGRS coordinate string
 * @returns true if valid MGRS format
 */
export function isValidMGRS(mgrsString: string): boolean {
  if (!mgrsString) return false

  try {
    // Try to convert to lat/lon - if it works, it's valid
    const coords = mgrs.toPoint(mgrsString.replace(/\s/g, ''))
    return Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])
  } catch {
    return false
  }
}

/**
 * Get MGRS precision level description
 * @param precision Precision level (0-5)
 * @returns Human-readable description
 */
export function getMGRSPrecisionDescription(precision: number): string {
  const descriptions: Record<number, string> = {
    0: '100km',
    1: '10km',
    2: '1km',
    3: '100m',
    4: '10m',
    5: '1m',
  }
  return descriptions[precision] || '1m'
}
