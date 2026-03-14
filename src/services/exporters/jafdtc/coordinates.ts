// JAFDTC coordinate formatting (decimal degrees)

/**
 * Format decimal degrees for JAFDTC export
 * Format: "31.52045000" (8 decimal places as string)
 * Used by all JAFDTC airframe exports
 */
export function formatDecimalDegrees(decimal: number): string {
  return decimal.toFixed(8)
}
