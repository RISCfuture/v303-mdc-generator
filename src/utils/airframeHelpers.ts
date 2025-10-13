// Centralized utility functions for airframe-specific data lookups
// This module provides type-safe access to airframe data without hard-coding aircraft types

import type { Airframe } from '@/types'
import { airframeDatabase } from '@/data/airframes'
import type { AirframeData } from '@/data/airframes'
import squadronsData from '@/data/json/squadrons.json'

/**
 * Get complete airframe data for a given aircraft
 * @param airframe - The aircraft identifier
 * @returns The airframe performance and configuration data
 */
export function getAirframeData(airframe: Airframe): AirframeData | undefined {
  return airframeDatabase[airframe]
}

/**
 * Get the squadron that flies a specific aircraft type
 * @param airframe - The aircraft identifier
 * @returns The squadron ID, or undefined if not found
 */
function getSquadronForAirframe(airframe: Airframe): string | undefined {
  return Object.keys(squadronsData).find(
    (id) => squadronsData[id as keyof typeof squadronsData].aircraft === airframe,
  )
}

/**
 * Get the squadron display name for an aircraft
 * @param airframe - The aircraft identifier
 * @returns The squadron display name, or undefined if not found
 */
export function getSquadronDisplayName(airframe: Airframe): string | undefined {
  const squadronId = getSquadronForAirframe(airframe)
  if (!squadronId) return undefined
  return squadronsData[squadronId as keyof typeof squadronsData]?.displayName
}

/**
 * Get the number of radios for an aircraft
 * @param airframe - The aircraft identifier
 * @returns The number of radios
 * @throws Error if airframe data or radio configuration is incomplete
 */
export function getRadioCount(airframe: Airframe): number {
  const data = getAirframeData(airframe)
  if (!data || !data.radios || data.radios.length === 0) {
    throw new Error(`Incomplete aircraft data: ${airframe} has no radio configuration`)
  }
  return data.radios.length
}
