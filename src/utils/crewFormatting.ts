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
 * @param mode3 - Mode 3 value (stored as decimal, represents octal). Null/undefined if N/A.
 * @returns 4-digit octal string (e.g., "1101"), or empty string if N/A
 */
export function formatMode3(mode3: number | null | undefined): string {
  return mode3 != null ? mode3.toString(8).padStart(4, '0') : ''
}

/**
 * Increment a Mode 3 code by 1 in octal, skipping invalid digits (8, 9)
 * @param mode3 - Mode 3 value (stored as decimal, represents octal)
 * @returns Incremented Mode 3 value (decimal)
 * @example
 * incrementMode3(0o1301) // Returns 0o1302 (in decimal: 577 -> 578)
 * incrementMode3(0o1307) // Returns 0o1310 (in decimal: 583 -> 584)
 * incrementMode3(0o1377) // Returns 0o1400 (in decimal: 767 -> 768)
 * incrementMode3(0o7777) // Returns 0o0000 (wraps to 0)
 */
export function incrementMode3(mode3: number): number {
  // Convert to octal string to work with individual digits
  const octalStr = mode3.toString(8).padStart(4, '0')
  const digits = octalStr.split('').map((d) => parseInt(d, 10))

  // Increment from right to left with carry
  let carry = 1
  for (let i = digits.length - 1; i >= 0 && carry > 0; i--) {
    const current = digits[i]
    if (current !== undefined) {
      digits[i] = current + carry
      if (digits[i]! > 7) {
        digits[i] = 0
        carry = 1
      } else {
        carry = 0
      }
    }
  }

  // Convert back to decimal
  const resultOctal = digits.join('')
  return parseInt(resultOctal, 8)
}

/**
 * Format Laser code as 4-digit octal with +1 to each digit
 * Laser codes use digits 1-8 instead of 0-7
 * @param laserCode - Laser code value (stored as octal decimal, e.g., 1687). Null/undefined if N/A.
 * @returns 4-digit laser code string (e.g., "1688" becomes "2788"), or empty string if N/A
 */
export function formatLaserCode(laserCode: number | null | undefined): string {
  if (laserCode == null) return ''

  // Convert to octal string
  const octalStr = laserCode.toString(8).padStart(4, '0')

  // Add 1 to each digit (0->1, 1->2, ..., 7->8)
  const result = octalStr
    .split('')
    .map((digit) => (parseInt(digit, 10) + 1).toString())
    .join('')

  return result
}
