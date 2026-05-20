/**
 * Squadron data and types
 * Maps squadron IDs to their names and aircraft
 */

import squadronsData from '@/data/json/squadrons.json'

export { type ExportFormat } from '@/data/exportFormats'

/**
 * Procedural role each radio carries in a squadron's SOP. The array is
 * parallel-indexed to the airframe's `radios[]`: `radioRoles[i]` is the role
 * of radio slot `i`. Used by the MDC builder (e.g. ATC band selection) and
 * for future per-radio UI labeling. Strings are open-ended placeholders; the
 * common ones for now are airToGround / airToAir / support.
 */
export type RadioRole = 'airToGround' | 'airToAir' | 'aux' | 'package' | 'support' | 'gci' | 'alo'

export type Squadron = {
  id: string
  name: string
  displayName: string
  aircraft: string // Airframe type (e.g., 'F-16C_50', 'A-10C_2')
  defaultGunAmmo?: {
    training: string
    combat: string
  } // Default gun ammo types for training and combat missions (must match airframe's ammoTypes)
  /** Procedural role per radio slot, parallel-indexed to the airframe's
   *  `radios[]`. e.g. v93's `["airToGround","airToAir"]` means COM 1 carries
   *  A/G traffic and COM 2 carries A/A. Optional - squadrons without an
   *  explicit assignment fall back to slot 0 for any role lookup. */
  radioRoles?: RadioRole[]
}

// Derive Squadron ID type dynamically from squadrons.json
export type SquadronId = keyof typeof squadronsData

// Type-safe squadron database
export const squadronDatabase = squadronsData as Record<SquadronId, Squadron>

/**
 * Get airframe for a squadron
 */
export function getSquadronAirframe(squadronId: SquadronId): string {
  return squadronDatabase[squadronId].aircraft
}

/**
 * Get squadron display name
 */
export function getSquadronDisplayName(squadronId: SquadronId): string {
  return squadronDatabase[squadronId].displayName
}

/**
 * Get squadron options for dropdowns
 */
export function getSquadronOptions() {
  const squadronIds = Object.keys(squadronDatabase) as SquadronId[]
  return squadronIds.map((id) => ({
    label: squadronDatabase[id].displayName,
    value: id,
  }))
}
