// Airfield databases for all theaters
// Dynamically loaded from JSON files - add new theaters by adding JSON files!

import type { Airfield } from '@/types/airfield'

// Dynamically import all airfield JSON files using Vite's glob import
// This automatically discovers all theater airfield files - no manual imports needed!
const airfieldModules = import.meta.glob<Airfield[]>('./json/airfields/*.json', {
  eager: true,
  import: 'default',
})

// Build airfield database from dynamically imported JSON files
// The keys are derived from the filename (without extension)
// e.g., "./json/airfields/Caucasus.json" -> "Caucasus"
const airfieldsDatabase: Record<string, Airfield[]> = Object.entries(airfieldModules).reduce<
  Record<string, Airfield[]>
>((acc, [path, airfields]) => {
  // Extract theater name from path: "./json/airfields/Caucasus.json" -> "Caucasus"
  const theaterName = path.split('/').pop()?.replace('.json', '') ?? ''
  if (theaterName) {
    acc[theaterName] = airfields
  }
  return acc
}, {})

/**
 * Get airfields for a specific theater
 * @param theater - Theater name (e.g., "Caucasus", "Syria", "Nevada")
 * @returns Array of airfields for the theater, or empty array if not found
 */
export function getAirfieldsForTheater(theater: string): Airfield[] {
  return airfieldsDatabase[theater] ?? []
}

/**
 * Get all available theater names with airfield data
 * @returns Array of theater names
 * @internal - Only exported for testing
 */
export function getAvailableTheaters(): string[] {
  return Object.keys(airfieldsDatabase).sort()
}
