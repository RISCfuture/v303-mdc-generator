/**
 * Runway Condition Utilities
 *
 * Shared types and functions for runway condition handling across aircraft calculators.
 *
 * @module runwayConditions
 */

/**
 * Runway Condition Reading (RCR) values
 * Standard values used by military aircraft for performance calculations
 */
export type RCR = 23 | 12 | 5

/**
 * Human-readable runway condition descriptions
 */
export type RunwayCondition = 'dry' | 'wet' | 'icy'

/**
 * Mapping from runway condition to RCR values
 */
const RUNWAY_CONDITION_TO_RCR: Record<RunwayCondition, RCR> = {
  dry: 23,
  wet: 12,
  icy: 5,
}

/**
 * Convert a runway condition description to its corresponding RCR value
 *
 * @param condition - The runway condition ('dry', 'wet', or 'icy')
 * @returns The corresponding RCR value (23, 12, or 5)
 */
export function runwayConditionToRCR(condition: RunwayCondition): RCR {
  return RUNWAY_CONDITION_TO_RCR[condition]
}
