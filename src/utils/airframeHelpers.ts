// Centralized utility functions for airframe-specific data lookups
// This module provides type-safe access to airframe data without hard-coding aircraft types

import type { Airframe } from '@/types'
import { airframeDatabase } from '@/data/airframes'
import type { AirframeData } from '@/data/airframes'

/**
 * Get complete airframe data for a given aircraft
 * @param airframe - The aircraft identifier
 * @returns The airframe performance and configuration data
 */
export function getAirframeData(airframe: Airframe): AirframeData | undefined {
  return airframeDatabase[airframe]
}

/**
 * Check if an airframe is a helicopter (rotary-wing aircraft)
 * @param airframe - The aircraft identifier
 * @returns True if the airframe is a helicopter
 */
export function isHelicopter(airframe: Airframe): boolean {
  const data = getAirframeData(airframe)
  return data?.isHelicopter ?? false
}

/**
 * Whether the airframe is an F-16 variant. F-16s carry the A/G weapon
 * delivery profiles, mission timing, and airbase-nav capabilities.
 * @param airframe - The aircraft identifier
 */
export function isF16(airframe: string): boolean {
  return airframe.startsWith('F-16')
}

/**
 * Whether the airframe is a C-130 variant. C-130s carry the airdrop
 * (drop zone / CARP) and two-crew (pilot + copilot) capabilities.
 * @param airframe - The aircraft identifier
 */
export function isC130(airframe: string): boolean {
  return airframe.startsWith('C-130')
}

/**
 * Get the number of radios for an aircraft
 * @param airframe - The aircraft identifier
 * @returns The number of radios
 * @throws Error if airframe data or radio configuration is incomplete
 */
export function getRadioCount(airframe: Airframe): number {
  const data = getAirframeData(airframe)
  if (!data?.radios || data.radios.length === 0) {
    throw new Error(`Incomplete aircraft data: ${airframe} has no radio configuration`)
  }
  return data.radios.length
}
