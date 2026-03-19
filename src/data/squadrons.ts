/**
 * Squadron data and types
 * Maps squadron IDs to their names and aircraft
 */

import squadronsData from '@/data/json/squadrons.json'

export { type ExportFormat } from '@/data/exportFormats'

export type Squadron = {
  id: string
  name: string
  displayName: string
  aircraft: string // Airframe type (e.g., 'F-16C_50', 'A-10C_2')
  defaultGunAmmo?: {
    training: string
    combat: string
  } // Default gun ammo types for training and combat missions (must match airframe's ammoTypes)
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
