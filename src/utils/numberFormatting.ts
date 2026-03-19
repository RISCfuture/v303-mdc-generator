/**
 * Number formatting utilities using Intl.NumberFormat for locale-aware display
 */

// Get user's locale or fallback to 'en-US'
const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'

/**
 * Create a locale-aware number formatter
 */
function createNumberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(userLocale, options)
}

/**
 * Create a locale-aware number parser
 * Extracts group and decimal separators from the locale
 */
function createNumberParser() {
  const formatter = createNumberFormatter({ useGrouping: true })
  const parts = formatter.formatToParts(1111.1)

  const groupSeparator = parts.find((part) => part.type === 'group')?.value ?? ','
  const decimalSeparator = parts.find((part) => part.type === 'decimal')?.value ?? '.'

  return {
    parse: (value: string | number): number | null => {
      if (typeof value === 'number') return value
      if (!value || value === '') return null

      const strValue = value.trim()

      // If the decimal separator is '.', remove ',' as group separator
      // If the decimal separator is ',', remove '.' as group separator
      let normalized: string
      if (decimalSeparator === '.') {
        // en-US style: 1,234.56 -> 1234.56
        normalized = strValue.replace(/,/g, '')
      } else {
        // de-DE style: 1.234,56 -> 1234.56
        normalized = strValue.replace(/\./g, '').replace(/,/g, '.')
      }

      const parsed = parseFloat(normalized)
      return isNaN(parsed) ? null : parsed
    },
    groupSeparator,
    decimalSeparator,
  }
}

/**
 * Format function for integer values (no decimals)
 * Used for: elevation, altitude, speed, weight, fuel
 */
export function formatInteger(value: number | null): string {
  if (value === null) return ''
  const formatter = createNumberFormatter({
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  })
  return formatter.format(value)
}

/**
 * Parse function for integer values
 * Used for: elevation, altitude, speed, weight, fuel
 */
export function parseInteger(value: string): number | null {
  const parser = createNumberParser()
  const parsed = parser.parse(value)
  return parsed !== null ? Math.round(parsed) : null
}

/**
 * Format function for decimal values
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatDecimal(value: number | null, decimals = 2): string {
  if (value === null) return ''
  const formatter = createNumberFormatter({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  })
  return formatter.format(value)
}

/**
 * Parse function for decimal values
 */
export function parseDecimal(value: string): number | null {
  const parser = createNumberParser()
  return parser.parse(value)
}
