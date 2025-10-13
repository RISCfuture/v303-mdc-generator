import { formatInteger } from '@/utils/numberFormatting'

/**
 * Composable for CCIP (Continuously Computed Impact Point) calculations.
 * Provides formatting utilities for distance and elevation conversions.
 */
export function useCCIPCalculations() {
  /**
   * Format distance in feet with nautical miles conversion
   * @param feet - Distance in feet
   * @returns Formatted string showing approximate distance in nautical miles
   */
  function formatDistanceWithNM(feet: number | null | undefined): string {
    if (!feet) return ''
    const nm = (feet / 6076).toFixed(1)
    return `${nm} NM`
  }

  /**
   * Format elevation offset with MSL (Mean Sea Level) altitude
   * @param elevationOffset - Elevation offset in feet (relative to target steerpoint)
   * @param targetSteerpointAltitude - Target steerpoint altitude in feet MSL
   * @returns Formatted string showing MSL altitude
   */
  function formatElevationWithMSL(
    elevationOffset: number | null | undefined,
    targetSteerpointAltitude: number | null,
  ): string {
    if (elevationOffset === null || elevationOffset === undefined || !targetSteerpointAltitude)
      return ''
    const msl = targetSteerpointAltitude + elevationOffset
    return `MSL: ${formatInteger(msl)} ft`
  }

  return {
    formatDistanceWithNM,
    formatElevationWithMSL,
  }
}
