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
  } catch (_error) {
    // Silently handle invalid coordinates
    return ''
  }
}

/**
 * Convert MGRS string to decimal degrees
 * @param mgrsString MGRS string (spaced or compact format)
 * @returns {lat, lon} in decimal degrees, or null if invalid
 */
export function mgrsToLatLon(mgrsString: string): { lat: number; lon: number } | null {
  try {
    // Remove spaces and normalize input
    const compact = mgrsString.replace(/\s+/g, '').toUpperCase()

    if (!compact || compact.length < 5) return null

    // Use mgrs.inverse to convert to [lon, lat] array
    const coords = mgrs.inverse(compact)

    if (!coords || coords.length < 2) return null

    const [lon, lat] = coords

    // Validate the results
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
      return null
    }

    // Validate lat/lon ranges
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null
    }

    return { lat, lon }
  } catch (_error) {
    // Silently handle invalid MGRS input (common during user typing)
    return null
  }
}

/**
 * Parse and validate MGRS string
 * @param input MGRS string (spaced or compact format)
 * @returns Normalized compact MGRS string, or null if invalid
 */
export function parseMGRS(input: string): string | null {
  try {
    // Remove spaces and normalize
    const compact = input.replace(/\s+/g, '').toUpperCase()

    // Basic format validation
    // MGRS format: [1-2 digits][letter][2 letters][0-10 digits for coordinates]
    const match = compact.match(/^(\d{1,2}[A-Z][A-Z]{2})(\d{0,10})$/)
    if (!match) return null

    // Try to convert to lat/lon and back to validate it's a real MGRS coordinate
    const coords = mgrs.inverse(compact)
    if (!coords || coords.length < 2) return null

    return compact
  } catch (_error) {
    return null
  }
}

/**
 * Detect precision level from MGRS coordinate string
 * @param mgrsString MGRS string (spaced or compact format)
 * @returns Precision level (0-5), or null if invalid
 * Precision levels:
 * - 0: 100km (no easting/northing digits)
 * - 1: 10km (1 digit each)
 * - 2: 1km (2 digits each)
 * - 3: 100m (3 digits each)
 * - 4: 10m (4 digits each)
 * - 5: 1m (5 digits each)
 */
export function detectMGRSPrecision(mgrsString: string): number | null {
  const parsed = parseMGRS(mgrsString)
  if (!parsed) return null

  // Extract the coordinate portion (after grid zone and 100km square)
  const gridZoneMatch = parsed.match(/^(\d{1,2}[A-Z])/)
  if (!gridZoneMatch || !gridZoneMatch[1]) return null

  const gridZone = gridZoneMatch[1]
  const rest = parsed.substring(gridZone.length)

  if (rest.length < 2) return null

  const coordinates = rest.substring(2) // Skip 100km square (2 letters)

  // Precision is half the length of coordinate digits
  // (easting and northing each have the same number of digits)
  const precision = coordinates.length / 2

  return precision >= 0 && precision <= 5 ? precision : null
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
