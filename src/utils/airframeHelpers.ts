// Centralized utility functions for airframe-specific data lookups
// This module provides type-safe access to airframe data without hard-coding aircraft types

import type { Airframe } from '@/types'
import type { AirfieldRadio, BandFrequencies, RadioBand, RadioFacility } from '@/types/airfield'
import type { RadioRole, Squadron } from '@/data/squadrons'
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

/** Aviation band boundaries in MHz. The HF/VHF-FM boundary at exactly 30 MHz
 *  is shared (HF tops at 30, VHF-FM starts at 30); 88->108 and 174->225 are
 *  clear guard gaps with no real DCS radio crossing them, so band assignment
 *  is unambiguous in practice. */
const BAND_RANGES: Record<RadioBand, readonly [number, number]> = {
  hf: [2, 30],
  vhfFm: [30, 88],
  vhfAm: [108, 174],
  uhf: [225, 400],
}

/** Preferred ATC band order. Western military doctrine: UHF primary,
 *  VHF-AM secondary (civil tower), FM and HF tertiary. */
const BAND_PREFERENCE: readonly RadioBand[] = ['uhf', 'vhfAm', 'vhfFm', 'hf']

/**
 * Derive the bands a radio can tune from its frequency window.
 * Returns bands in the canonical preference order (UHF first). Returns []
 * for incomplete data (no min/max) or radios outside aviation bands
 * (intercom / ADF / NDB).
 *
 * Uses strict-inequality on both ends so a radio touching a band only at the
 * shared boundary point (most notably the 30 MHz HF/VHF-FM border) does not
 * spuriously classify into the adjacent band: a radio with `min=30` (typical
 * VHF-FM lower bound) is VHF-FM only, not HF.
 */
export function deriveRadioBands(radio: { min?: number | null; max?: number | null }): RadioBand[] {
  const { min, max } = radio
  if (min == null || max == null) return []
  return BAND_PREFERENCE.filter((band) => {
    const [lo, hi] = BAND_RANGES[band]
    return min < hi && max > lo
  })
}

/**
 * Pick the ATC frequency a given squadron's airframe would tune for a
 * facility at the named airfield. Walks: squadron.radioRoles -> first slot
 * matching `role` (defaults to slot 0) -> that radio's supported bands ->
 * the airfield's matrix for `facility` -> first band the radio can tune.
 * Returns `undefined` when nothing matches.
 */
export function atcFrequency(args: {
  airfield: { radio: AirfieldRadio | null }
  squadron: Squadron
  airframe: Airframe
  facility: RadioFacility
  /** Which squadron radio role drives band selection. Default: airToGround. */
  role?: RadioRole
}): number | undefined {
  const { airfield, squadron, airframe, facility, role = 'airToGround' } = args
  const radio = airfield.radio
  const facilityFreqs: BandFrequencies | undefined = radio?.frequencies[facility]
  if (!facilityFreqs) return undefined

  const airframeData = getAirframeData(airframe)
  const radios = airframeData?.radios ?? []
  if (radios.length === 0) return undefined

  // First slot whose squadron role matches; fall back to slot 0 if the role
  // isn't assigned in this squadron's radioRoles (or radioRoles is missing).
  const roles = squadron.radioRoles ?? []
  const slotIndex = roles.indexOf(role)
  const radioSlot = radios[slotIndex >= 0 ? slotIndex : 0]

  const supported = new Set(deriveRadioBands(radioSlot))
  for (const band of BAND_PREFERENCE) {
    if (supported.has(band)) {
      const freq = facilityFreqs[band]
      if (freq != null) return freq
    }
  }
  return undefined
}
