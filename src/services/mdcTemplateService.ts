import type { DCSF16MDC, JAFDTCA10MDC, DeepPartial } from './mdcExporter'
import v93Template from '@/data/json/dtc/v93.json'
import v303Template from '@/data/json/dtc/v303.json'

/**
 * Load squadron-specific DTC template
 * Templates contain non-mission-specific settings that are standard for each squadron
 *
 * @param squadronId - The squadron ID ('v93' or 'v303')
 * @returns Template data to be merged with mission export
 * @throws Error if squadron ID is invalid
 */
export function loadTemplateForSquadron(
  squadronId: string,
): DeepPartial<DCSF16MDC> | DeepPartial<JAFDTCA10MDC> {
  switch (squadronId) {
    case 'v93':
      return v93Template as DeepPartial<DCSF16MDC>
    case 'v303':
      return v303Template as DeepPartial<JAFDTCA10MDC>
    default:
      throw new Error(`Unknown squadron ID: ${squadronId}`)
  }
}
