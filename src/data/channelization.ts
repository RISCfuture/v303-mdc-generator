// Aircraft radio channelization database for all theaters
// Dynamically loaded from nested JSON files - organized by theater/airframe
// To add channelization: create theater/airframe.json in ./json/channelization/

import type { RadioPreset, Theater, Airframe } from '@/types'

export interface RadioChannelization {
  presets: RadioPreset[]
}

export interface AircraftChannelization {
  radios: RadioChannelization[]
}

// Dynamically import all channelization JSON files using Vite's nested glob import
// Pattern: ./json/channelization/{theater}/{airframe}.json
const channelizationModules = import.meta.glob<AircraftChannelization>(
  './json/channelization/*/*.json',
  {
    eager: true,
    import: 'default',
  },
)

// Build channelization database from dynamically imported JSON files
// Structure: channelizationDatabase[theater][airframe] = { radios: [...] }
const channelizationDatabase: Record<
  string,
  Record<string, AircraftChannelization>
> = Object.entries(channelizationModules).reduce(
  (acc, [path, config]) => {
    // Extract theater and airframe from path:
    // "./json/channelization/Afghanistan/A-10C_2.json" -> ["Afghanistan", "A-10C_2"]
    const pathParts = path.split('/')
    const theater = pathParts[pathParts.length - 2] // Second to last part
    const airframeWithExt = pathParts[pathParts.length - 1] // Last part
    const airframe = airframeWithExt?.replace('.json', '') || '' // Remove .json extension

    if (theater && airframe) {
      if (!acc[theater]) {
        acc[theater] = {}
      }
      acc[theater][airframe] = config
    }
    return acc
  },
  {} as Record<string, Record<string, AircraftChannelization>>,
)

/**
 * Get default radio presets for a specific aircraft and radio in a theater
 */
export function getDefaultRadioPresets(
  theater: Theater,
  airframe: Airframe,
  radioIndex: number,
): RadioPreset[] {
  const aircraftChannelization = channelizationDatabase[theater]?.[airframe]

  if (!aircraftChannelization || !aircraftChannelization.radios[radioIndex]) {
    return []
  }

  return aircraftChannelization.radios[radioIndex].presets
}

/**
 * Get all channelization data for a specific theater and airframe
 */
export function getChannelization(
  theater: Theater,
  airframe: Airframe,
): AircraftChannelization | null {
  return channelizationDatabase[theater]?.[airframe] || null
}

/**
 * Get all available theaters with channelization data
 */
export function getAvailableTheatersWithChannelization(): string[] {
  return Object.keys(channelizationDatabase).sort()
}

/**
 * Get all available airframes for a specific theater
 */
export function getAvailableAirframesForTheater(theater: string): string[] {
  return Object.keys(channelizationDatabase[theater] || {}).sort()
}
