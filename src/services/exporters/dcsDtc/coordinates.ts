// DCS-DTC coordinate formatting (DDM format)
import { decimalToDMS, type CoordinateType } from '@/utils/coordinates'

/**
 * Format decimal degrees for DCS-DTC export (DDM format)
 * Format: "N 12°34.567'" (no space after degree symbol, uses prime character)
 * Used by all DCS-DTC airframe exports
 */
export function formatDDM(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
  const { hemisphere, degrees, minutes, seconds } = dms

  // Convert seconds back to decimal minutes (DDM format)
  const minutesWithDecimal = minutes + seconds / 60

  // Format with proper padding
  const degreesPadding = type === 'latitude' ? 2 : 3
  const degreesStr = degrees.toString().padStart(degreesPadding, '0')

  // Format minutes with exactly 3 decimal places (DCS-DTC always pads to 3)
  const minutesStr = minutesWithDecimal.toFixed(3)
  const [minutesInt, minutesDec] = minutesStr.split('.')
  const minutesIntPadded = (minutesInt || '0').padStart(2, '0')

  return `${hemisphere} ${degreesStr}°${minutesIntPadded}.${minutesDec}'`
}
