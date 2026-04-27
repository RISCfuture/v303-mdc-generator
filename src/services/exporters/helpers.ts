// Shared helpers for MDC exporters
import type { Mission, CCIPReferencePoint } from '@/types'
import { FEET_PER_NAUTICAL_MILE, RADIO_MODE } from './constants'

/**
 * Parse TACAN string (e.g. "10Y" or "73X") into channel and band components.
 * Returns null if the string doesn't match the expected format.
 */
export function parseTACAN(aaTcn: string): { channel: number; band: 'X' | 'Y' } | null {
  const match = /(\d+)([XY])/i.exec(aaTcn)
  if (!match?.[1] || !match[2]) return null
  return { channel: parseInt(match[1]), band: match[2].toUpperCase() as 'X' | 'Y' }
}

/**
 * Parse TACAN or throw if invalid. Use when TACAN is required.
 */
export function parseTACANOrThrow(aaTcn: string): { channel: number; band: 'X' | 'Y' } {
  const result = parseTACAN(aaTcn)
  if (!result) throw new Error(`Invalid TACAN format: ${aaTcn}`)
  return result
}

/**
 * DTC Reference Point structure (VIP, VRP, OA, PUP)
 */
export type DTCReferencePoint = {
  Range: number // feet
  Bearing: number // degrees
  Elevation: number // feet
}

/**
 * Utility type for making all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Format a frequency to 2 decimal places
 * @param freq - Frequency as string or number (e.g., 123.475 becomes "123.48")
 * @returns Frequency string formatted to 2 decimal places
 */
export function truncateFrequency(freq: string | number): string {
  const num = typeof freq === 'string' ? parseFloat(freq) : freq
  return num.toFixed(2)
}

/**
 * Convert CCIP reference point to DTC format
 * Returns null if the reference point is undefined or missing required data
 * @param point - The CCIP reference point to convert
 * @param convertToNM - If true, convert range from feet to nautical miles (for VIP/VRP). If false, keep in feet (for OA/PUP)
 */
export function convertCCIPToDTC(
  point: CCIPReferencePoint | undefined,
  convertToNM = false,
): DTCReferencePoint | null {
  if (point?.bearing === undefined || point.distance === undefined) {
    return null
  }

  const range = convertToNM
    ? Math.round((point.distance / FEET_PER_NAUTICAL_MILE) * 10) / 10
    : point.distance

  return {
    Range: range,
    Bearing: point.bearing, // degrees
    Elevation: point.elevation ?? 0, // feet - default to 0 if not specified
  }
}

/**
 * Build radio configuration from mission radio defaults.
 *
 * Mode values are `RADIO_MODE.FREQUENCY` / `RADIO_MODE.PRESET` (see ./constants),
 * matching DCS-DTC's RadioMode enum (Base/Systems/RadioSystem.cs).
 *
 * @param mission - The mission object containing radio defaults
 * @param radioIndex - Radio index (0 for Radio1, 1 for Radio2, 2 for Radio3 if A-10C)
 */
export function getRadioConfig(
  mission: Mission,
  radioIndex: number,
): {
  mode: number
  selectedFrequency: string
  selectedPreset: string
} {
  // Default frequencies based on radio type and aircraft
  // F-16C: Radio 1 (index 0) = UHF: 225.00-399.975 MHz, Radio 2 (index 1) = VHF: 108.00-155.975 MHz
  // A-10C: Radio 1 (index 0) = VHF AM: 30.00-87.975 MHz, Radio 2 (index 1) = UHF: 225.00-399.975 MHz, Radio 3 (index 2) = VHF FM: 30.00-76.00 MHz
  let defaultFrequency: string
  if (radioIndex === 0) {
    defaultFrequency = '225.00' // F-16 Radio1 (UHF) or could be VHF AM for A-10 (30.00)
  } else if (radioIndex === 1) {
    defaultFrequency = '108.00' // F-16 Radio2 (VHF) or UHF for A-10 (225.00)
  } else {
    defaultFrequency = '30.00' // A-10 Radio3 (VHF FM)
  }

  const radioDefault = mission.radioDefaults?.[radioIndex]

  if (!radioDefault) {
    return {
      mode: RADIO_MODE.PRESET,
      selectedFrequency: defaultFrequency,
      selectedPreset: '1',
    }
  }

  if (radioDefault.mode === 'preset') {
    return {
      mode: RADIO_MODE.PRESET,
      selectedFrequency: defaultFrequency,
      selectedPreset: radioDefault.preset?.toString() ?? '1',
    }
  } else {
    return {
      mode: RADIO_MODE.FREQUENCY,
      selectedFrequency: radioDefault.frequency ?? defaultFrequency,
      selectedPreset: '1',
    }
  }
}

/**
 * Pick the JAFDTC `*DefaultTuning` value for a radio: the preset number when
 * in preset mode, the frequency string otherwise.
 */
export function pickDefaultTuning(config: {
  mode: number
  selectedFrequency: string
  selectedPreset: string
}): string {
  return config.mode === RADIO_MODE.PRESET ? config.selectedPreset : config.selectedFrequency
}
