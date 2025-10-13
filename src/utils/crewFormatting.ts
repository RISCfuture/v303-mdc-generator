/**
 * Display formatting utilities for crew data
 * Ensures STN, Mode 3, and Laser codes are displayed in their proper formats
 */

/**
 * Format STN as 5-digit decimal number
 * @param stn - STN value (decimal integer)
 * @returns 5-digit string (e.g., "03600")
 */
export function formatSTN(stn: number | null): string {
  return stn !== null ? stn.toString().padStart(5, '0') : ''
}

/**
 * Parse STN from string input
 * @param value - STN string value
 * @returns Parsed number or null if invalid
 */
export function parseSTN(value: string | number): number | null {
  if (typeof value === 'number') return value
  if (!value || value === '') return null

  const parsed = parseInt(value.toString().trim(), 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Format Mode 3 as 4-digit octal number
 * @param mode3 - Mode 3 value (stored as decimal, represents octal)
 * @returns 4-digit octal string (e.g., "1101")
 */
export function formatMode3(mode3: number | null): string {
  return mode3 !== null ? mode3.toString(8).padStart(4, '0') : ''
}

/**
 * Format Laser code as 4-digit octal with +1 to each digit
 * Laser codes use digits 1-8 instead of 0-7
 * @param laserCode - Laser code value (stored as octal decimal, e.g., 1687)
 * @returns 4-digit laser code string (e.g., "1688" becomes "2788")
 */
export function formatLaserCode(laserCode: number | null): string {
  if (laserCode === null) return ''

  // Convert to octal string
  const octalStr = laserCode.toString(8).padStart(4, '0')

  // Add 1 to each digit (0->1, 1->2, ..., 7->8)
  const result = octalStr
    .split('')
    .map((digit) => (parseInt(digit, 10) + 1).toString())
    .join('')

  return result
}
