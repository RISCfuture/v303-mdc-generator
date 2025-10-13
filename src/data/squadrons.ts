/**
 * Squadron data and types
 * Maps squadron IDs to their names and aircraft
 */

import squadronsData from '@/data/json/squadrons.json'

export interface Squadron {
  id: string
  name: string
  displayName: string
  aircraft: string // Airframe type (e.g., 'F-16C_50', 'A-10C_2')
}

// Derive Squadron ID type dynamically from squadrons.json
export type SquadronId = keyof typeof squadronsData

// Type-safe squadron database
export const squadronDatabase: Record<SquadronId, Squadron> = squadronsData

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
 * Get full squadron name
 */
export function getSquadronName(squadronId: SquadronId): string {
  return squadronDatabase[squadronId].name
}

/**
 * Get all squadron IDs
 */
export function getAllSquadronIds(): SquadronId[] {
  return Object.keys(squadronDatabase) as SquadronId[]
}

/**
 * Get squadron options for dropdowns
 */
export function getSquadronOptions() {
  return getAllSquadronIds().map((id) => ({
    label: squadronDatabase[id].displayName,
    value: id,
  }))
}
