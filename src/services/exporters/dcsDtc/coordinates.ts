// DCS-DTC coordinate formatting (DDM format)
import { decimalToDMS, type CoordinateType } from '@/utils/coordinates'

/**
 * Format decimal degrees for DCS-DTC export (DDM format).
 *
 * Output format: `N 12°34.567’` — uses U+2019 RIGHT SINGLE QUOTATION MARK
 * for the minutes mark, NOT the ASCII apostrophe U+0027. Upstream DCS-DTC
 * uploaders for F-16 / F-15E / FA18 strip only U+2019; an ASCII apostrophe
 * survives the strip and crashes `Uploader.Digits` looking up a key `D'`.
 */
export function formatDDM(decimal: number, type: CoordinateType): string {
  const dms = decimalToDMS(decimal, type)
  const { hemisphere, degrees, minutes, seconds } = dms

  const minutesWithDecimal = minutes + seconds / 60

  const degreesPadding = type === 'latitude' ? 2 : 3
  const degreesStr = degrees.toString().padStart(degreesPadding, '0')

  const minutesStr = minutesWithDecimal.toFixed(3)
  const [minutesInt, minutesDec] = minutesStr.split('.')
  const minutesIntPadded = (minutesInt || '0').padStart(2, '0')

  return `${hemisphere} ${degreesStr}°${minutesIntPadded}.${minutesDec}’`
}
