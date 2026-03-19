/**
 * Unified coordinate formatting utility
 *
 * This module provides a single interface for formatting coordinates
 * in any of the supported formats: DD, DDM, DMS, or MGRS
 */

import type { CoordinateFormat } from '@/types'
import {
  formatDD,
  parseDD,
  decimalToDDMString,
  ddmStringToDecimal,
  decimalToTrueDMSString,
  trueDmsStringToDecimal,
} from './coordinates'
import { latLonToMGRS, mgrsToLatLon } from './mgrs'

/**
 * Format a coordinate pair (lat/lon) according to the specified format
 *
 * @param lat Latitude in decimal degrees
 * @param lon Longitude in decimal degrees
 * @param format The format to use for display
 * @param mgrsPrecision Precision level for MGRS (0-5, default 5 = 1m)
 * @returns Formatted coordinate string
 *
 * Format examples:
 * - DD: "36.2057583, -115.1234567"
 * - DDM: "N 36° 12.345′, W 115° 07.407′"
 * - DMS: "N 36° 12′ 21″, W 115° 07′ 24″"
 * - MGRS: "11S PA 44000 84000"
 */
export function formatCoordinate(
  lat: number | null,
  lon: number | null,
  format: CoordinateFormat = 'DDM',
  mgrsPrecision = 5,
): string {
  // Handle null/undefined coordinates
  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
    return ''
  }

  switch (format) {
    case 'DD':
      return formatDD(lat, lon)

    case 'DDM':
      // Format each component separately and combine with comma
      return `${decimalToDDMString(lat, 'latitude')}, ${decimalToDDMString(lon, 'longitude')}`

    case 'DMS':
      // Format each component separately and combine with comma
      return `${decimalToTrueDMSString(lat, 'latitude')}, ${decimalToTrueDMSString(lon, 'longitude')}`

    case 'MGRS':
      return latLonToMGRS(lat, lon, mgrsPrecision)

    default:
      // Fallback to DDM (aviation standard)
      return `${decimalToDDMString(lat, 'latitude')}, ${decimalToDDMString(lon, 'longitude')}`
  }
}

/**
 * Parse a coordinate string in any supported format and convert to decimal degrees
 *
 * @param input Coordinate string in any format
 * @param format The format of the input string
 * @returns {lat, lon} in decimal degrees, or null if invalid
 *
 * Supported input formats:
 * - DD: "36.2057583, -115.1234567"
 * - DDM: "N 36° 12.345′, W 115° 07.407′"
 * - DMS: "N 36° 12′ 21″, W 115° 07′ 24″"
 * - MGRS: "11S PA 44000 84000" or "11SPA4400084000"
 */
export function parseCoordinate(
  input: string,
  format: CoordinateFormat,
): { lat: number; lon: number } | null {
  if (!input.trim()) return null

  switch (format) {
    case 'DD':
      return parseDD(input)

    case 'DDM': {
      // Split by comma and parse each component
      const parts = input.split(',').map((s) => s.trim())
      if (parts.length !== 2 || !parts[0] || !parts[1]) return null
      const lat = ddmStringToDecimal(parts[0])
      const lon = ddmStringToDecimal(parts[1])
      if (lat === null || lon === null) return null
      return { lat, lon }
    }

    case 'DMS': {
      // Split by comma and parse each component
      const parts = input.split(',').map((s) => s.trim())
      if (parts.length !== 2 || !parts[0] || !parts[1]) return null
      const lat = trueDmsStringToDecimal(parts[0])
      const lon = trueDmsStringToDecimal(parts[1])
      if (lat === null || lon === null) return null
      return { lat, lon }
    }

    case 'MGRS':
      return mgrsToLatLon(input)

    default:
      return null
  }
}

/**
 * Convert a coordinate from one format to another
 *
 * @param input Coordinate string in source format
 * @param fromFormat The format of the input
 * @param toFormat The format to convert to
 * @param mgrsPrecision Precision for MGRS output (0-5, default 5)
 * @returns Converted coordinate string, or empty string if invalid
 * @internal - Only exported for testing
 */
export function convertCoordinate(
  input: string,
  fromFormat: CoordinateFormat,
  toFormat: CoordinateFormat,
  mgrsPrecision = 5,
): string {
  // Parse input to decimal degrees
  const coords = parseCoordinate(input, fromFormat)
  if (!coords) return ''

  // Format to target format
  return formatCoordinate(coords.lat, coords.lon, toFormat, mgrsPrecision)
}
