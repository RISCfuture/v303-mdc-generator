// Navigation aid databases for all theaters
// Dynamically loaded from JSON files - add new theaters by adding JSON files!

import type { Navaid } from '@/types'

// Dynamically import all navaid JSON files using Vite's glob import
// This automatically discovers all theater navaid files - no manual imports needed!
const navaidModules = import.meta.glob<Navaid[]>('./json/navaids/*.json', {
  eager: true,
  import: 'default',
})

// Build navaid database from dynamically imported JSON files
// The keys are derived from the filename (without extension)
// e.g., "./json/navaids/Afghanistan.json" -> "Afghanistan"
const navaidsDatabase: Record<string, Navaid[] | undefined> = Object.entries(navaidModules).reduce<
  Record<string, Navaid[] | undefined>
>((acc, [path, navaids]) => {
  // Extract theater name from path: "./json/navaids/Afghanistan.json" -> "Afghanistan"
  const theaterName = path.split('/').pop()?.replace('.json', '') ?? ''
  if (theaterName) {
    acc[theaterName] = navaids
  }
  return acc
}, {})

/**
 * Get navaids for a specific theater
 * @param theater - Theater name (e.g., "Afghanistan", "Syria", "Nevada")
 * @returns Array of navaids for the theater, or empty array if not found
 */
export function getNavaidsForTheater(theater: string): Navaid[] {
  return navaidsDatabase[theater] ?? []
}
