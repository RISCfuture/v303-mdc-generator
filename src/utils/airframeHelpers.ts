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
