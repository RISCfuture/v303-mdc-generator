import type { AirframeData } from '@/data/airframes'

/**
 * Type of datalink system used by the aircraft
 */
export type DatalinkType = 'link16' | 'sadl' | null

/**
 * Get the datalink type from an aircraft configuration
 */
export function getDatalinkType(aircraft: AirframeData | undefined): DatalinkType {
  if (!aircraft) return null
  return (aircraft.datalinkType ?? null) as DatalinkType
}

/**
 * Get the display label for the datalink type
 */
export function getDatalinkLabel(datalinkType: DatalinkType): string {
  switch (datalinkType) {
    case 'link16':
      return 'Link16'
    case 'sadl':
      return 'SADL'
    default:
      return ''
  }
}

/**
 * Format an STN based on the datalink type
 */
export function formatSTNForDatalink(
  stn: number | null | undefined,
  datalinkType: DatalinkType,
): string {
  if (stn == null || datalinkType === null) return ''

  const stnString = stn.toString()

  switch (datalinkType) {
    case 'sadl':
      // SADL uses 4-digit STNs
      return stnString.padStart(4, '0')
    case 'link16':
    default:
      // Link16 uses 5-digit STNs
      return stnString.padStart(5, '0')
  }
}

/**
 * Generate SADL STN for a crew member based on position
 * SADL increments the second digit: 1134 → 1234 → 1334 → 1434...
 */
export function generateSADLSTN(leadSTN: number, position: number): number {
  if (position === 0) {
    // Lead keeps their original STN
    return leadSTN
  }

  // For other positions, increment the second digit
  // Position 1 (Wing) adds 100, Position 2 (Element Lead) adds 200, etc.
  return leadSTN + position * 100
}

/**
 * Get the STN for a crew member based on datalink type
 * @param pilotSTN The pilot's database STN (used for Link16)
 * @param leadSTN The flight lead's STN (used for SADL calculation)
 * @param position The crew member's position in the flight (0-based)
 * @param datalinkType The type of datalink system
 */
export function getCrewMemberSTN(
  pilotSTN: number | null | undefined,
  leadSTN: number | null | undefined,
  position: number,
  datalinkType: DatalinkType,
): number | null {
  if (datalinkType === null) {
    // No datalink, no STN
    return null
  }

  if (datalinkType === 'sadl') {
    // SADL: Calculate based on lead's STN and position
    if (leadSTN == null) return null
    return generateSADLSTN(leadSTN, position)
  }

  // Link16: Use the pilot's database STN
  return pilotSTN ?? null
}

/**
 * Check if STN editing should be allowed
 */
export function isSTNEditingAllowed(datalinkType: DatalinkType): boolean {
  // Only allow editing for Link16
  // SADL STNs are auto-generated, null means no datalink
  return datalinkType === 'link16'
}

/**
 * Check if STNs should be displayed
 */
export function shouldShowSTN(datalinkType: DatalinkType): boolean {
  return datalinkType !== null
}

/**
 * Get the maximum number of digits for STN based on datalink type
 */
export function getSTNMaxDigits(datalinkType: DatalinkType): number {
  switch (datalinkType) {
    case 'sadl':
      return 4
    case 'link16':
      return 5
    default:
      return 0
  }
}

/**
 * Validate an STN value for a given datalink type
 */
export function isValidSTN(stn: number, datalinkType: DatalinkType): boolean {
  if (datalinkType === null) return false

  const maxDigits = getSTNMaxDigits(datalinkType)
  const maxValue = Math.pow(10, maxDigits) - 1

  return stn >= 0 && stn <= maxValue
}
