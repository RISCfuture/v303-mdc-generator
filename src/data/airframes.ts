// Airframe database - dynamically built from JSON files
// To add a new aircraft: just add a JSON file in ./json/airframes/ - no code changes needed!

import type { Radio } from '@/types'

export interface StationData {
  station: number | string
  name: string // Display name for the station (from DCS DisplayName)
  munitions: string[] // Flat list of all munition CLSIDs compatible with this station
}

export interface GunShellData {
  name: string
  displayName: string
}

export interface GunMix {
  sequence: string[] // Array of shell names defining the mix pattern
}

export interface GunData {
  name: string
  capacity: number
  shells: GunShellData[]
  mixes?: GunMix[]
}

export interface AirframeData {
  aircraft: string
  displayName: string
  emptyWeight: number
  maxTakeoffWeight: number
  internalFuel: number
  cmdsCapacity: number
  chaffIncrement: number // Slider step size for chaff
  flareIncrement: number // Slider step size for flare
  defaultChaff: number
  defaultFlare: number
  defaultJoker: number
  defaultBingo: number
  ammoTypes?: string[] // Aircraft-level ammunition presets (e.g., ["CM - Combat Mix", "HEI - High Explosive Incendiary", "TP - Target Practice"])
  cmdsProfiles?: string[] // Available CMDS profiles (e.g., ["PRGM 1", "PRGM 2"] for F-16)
  ecmPrograms?: string[] // Available ECM programs (e.g., ["1", "2", "3"] for F-16, ["AIR", "SAM1"] for A-10)
  htsThreatTables?: string[] // Available HTS threat tables (e.g., ["CLASS 1", "CLASS 2", ...] for F-16)
  radios: Radio[]
  stations: StationData[]
  guns?: GunData[] // Gun systems with capacity and shell types
}

// Dynamically import all airframe JSON files using Vite's glob import
// This automatically discovers all airframe files - no manual imports needed!
const airframeModules = import.meta.glob<AirframeData>('./json/airframes/*.json', {
  eager: true,
  import: 'default',
})

// Build airframe database from dynamically imported JSON files
// The keys are derived from the JSON data itself (aircraft field)
const airframeDataArray: AirframeData[] = Object.values(airframeModules)

// Convert array to Record keyed by aircraft identifier
export const airframeDatabase = airframeDataArray.reduce(
  (acc, data) => {
    acc[data.aircraft] = data
    return acc
  },
  {} as Record<string, AirframeData>,
)

/**
 * Get display name for an airframe
 */
export function getAirframeDisplayName(airframe: string): string {
  return airframeDatabase[airframe]?.displayName ?? airframe
}
