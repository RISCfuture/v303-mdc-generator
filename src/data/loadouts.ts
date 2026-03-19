// Prefab loadouts database - dynamically loaded for all aircraft
import type { LoadoutStation, Airframe } from '@/types'
import loadoutsDataJson from '@/data/json/loadouts.json'

export type PrefabLoadout = {
  name: string
  description: string
  stations: LoadoutStation[]
}

// Type-safe loadouts database keyed by airframe
const loadoutsDatabase: Record<string, PrefabLoadout[] | undefined> = loadoutsDataJson

/**
 * Get loadouts for a specific airframe
 * @param airframe - The aircraft identifier
 * @returns Array of prefab loadouts for the airframe
 */
export function getLoadoutsForAirframe(airframe: Airframe): PrefabLoadout[] {
  return loadoutsDatabase[airframe] ?? []
}
