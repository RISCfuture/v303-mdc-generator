// Formatting utility functions for PDF generation
import type { Mission } from '@/types'
import { getAirfieldsForTheater } from '@/data/airfields'
import { formatNumber as formatNumberWithLocale } from '@/utils/formatting'

/**
 * Get effective flight callsign from mission
 */
export function getEffectiveFlightCallsign(mission: Mission): string {
  return mission.flightCallsignOverride || ''
}

/**
 * Get effective Link16 prefix from mission
 */
export function getEffectiveLink16Prefix(mission: Mission): string {
  return mission.link16PrefixOverride || ''
}

/**
 * Extract flight number from flight callsign
 * Returns the trailing digit (1-9) if present, otherwise "1"
 * Examples: "BUSTER9" -> "9", "FALCON" -> "1", "VIPER2" -> "2"
 */
export function getFlightNumber(callsign: string): string {
  if (!callsign) return '1'

  const match = callsign.match(/(\d)$/)
  return match && match[1] ? match[1] : '1'
}

/**
 * Format latitude/longitude coordinates to DMM format (Degrees and Decimal Minutes)
 * Example: N 35° 03.000' E 012° 04.001'
 */
export function formatLatLonToDMM(latitude: number, longitude: number): string {
  const latDeg = Math.floor(Math.abs(latitude))
  const latMin = ((Math.abs(latitude) - latDeg) * 60).toFixed(3)
  const latDir = latitude >= 0 ? 'N' : 'S'

  const lonDeg = Math.floor(Math.abs(longitude))
  const lonMin = ((Math.abs(longitude) - lonDeg) * 60).toFixed(3)
  const lonDir = longitude >= 0 ? 'E' : 'W'

  // Pad degrees with leading zeros: latitude 2 digits, longitude 3 digits
  const latDegStr = latDeg.toString().padStart(2, '0')
  const lonDegStr = lonDeg.toString().padStart(3, '0')

  return `${latDir} ${latDegStr}° ${latMin}' ${lonDir} ${lonDegStr}° ${lonMin}'`
}

/**
 * @deprecated Use formatLatLonToDMM instead
 */
export const formatLatLonToDMS = formatLatLonToDMM

/**
 * Format bullseye coordinates as lat/lon DMM (Degrees and Decimal Minutes)
 */
export function formatBullseye(
  latitude: number | undefined,
  longitude: number | undefined,
): string {
  if (
    latitude === undefined ||
    longitude === null ||
    latitude === null ||
    longitude === undefined
  ) {
    return ''
  }

  return formatLatLonToDMM(latitude, longitude)
}

/**
 * Get radio label (COMM 1, COMM 2, etc.)
 */
export function getRadioLabel(radioIndex: number): string {
  return radioIndex === 0 ? 'COMM 1' : radioIndex === 1 ? 'COMM 2' : `COMM ${radioIndex + 1}`
}

/**
 * Get position label for flight member
 */
export function getPositionLabel(index: number): string {
  if (index === 0) return 'LEAD'
  if (index === 1) return 'WING'
  if (index === 2) return 'EL LEAD'
  if (index === 3) return 'EL WING'
  return `POSITION ${index + 1}`
}

/**
 * Format current date for footer
 */
export function formatFooterDate(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Format time string to Zulu time (HHMMz)
 * Accepts formats: "HH:MM", "HHMM", "HHMMz"
 * Returns: "HHMMz"
 */
export function formatZuluTime(timeString: string): string {
  // Remove existing 'z' or 'Z' suffix if present
  const cleaned = timeString.trim().replace(/[zZ]$/i, '')

  // Try HH:MM format
  const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const hours = colonMatch[1].padStart(2, '0')
    const minutes = colonMatch[2]
    return `${hours}${minutes}z`
  }

  // Try HHMM format
  const noColonMatch = cleaned.match(/^(\d{2})(\d{2})$/)
  if (noColonMatch) {
    return `${cleaned}z`
  }

  // Return as-is with z suffix if format not recognized
  return `${cleaned}z`
}

/**
 * Get airport name from airport ID and theater
 * Returns the airport name if found, otherwise returns the airport ID
 */
export function getAirportName(airportId: string, theater: string): string {
  if (!airportId || airportId.trim() === '') {
    return ''
  }

  const airfields = getAirfieldsForTheater(theater)
  const airfield = airfields.find((af) => af.name === airportId)

  return airfield ? airfield.name : airportId
}

/**
 * Format a number with locale-appropriate thousands separators
 * Use for altitudes, elevations, and other large numbers
 * Do NOT use for frequencies, channels, STN, Mode 3, laser codes
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return ''
  }
  return formatNumberWithLocale(value)
}
