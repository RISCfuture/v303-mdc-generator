/**
 * Formatting utility functions
 */

/**
 * Format a file size in bytes to a human-readable string with appropriate units
 * Automatically selects the most appropriate unit (B, KB, MB, GB)
 *
 * @param bytes - File size in bytes
 * @param locale - Locale for number formatting (defaults to 'en-US')
 * @returns Formatted file size string (e.g., "1.5 MB", "342 kB", "45 bytes")
 *
 * @example
 * formatFileSize(1024) // "1 kB"
 * formatFileSize(1536000) // "1.5 MB"
 * formatFileSize(500) // "500 bytes"
 */
export function formatFileSize(bytes: number, locale = 'en-US'): string {
  const absBytes = Math.abs(bytes)

  // Bytes (< 1 KB)
  if (absBytes < 1024) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'byte',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(bytes)
  }

  // Kilobytes (< 1 MB)
  if (absBytes < 1024 * 1024) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'kilobyte',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(bytes / 1024)
  }

  // Megabytes (< 1 GB)
  if (absBytes < 1024 * 1024 * 1024) {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'megabyte',
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(bytes / (1024 * 1024))
  }

  // Gigabytes (>= 1 GB)
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'gigabyte',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(bytes / (1024 * 1024 * 1024))
}
