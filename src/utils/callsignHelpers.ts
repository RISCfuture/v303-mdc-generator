import type { Mission } from '@/types'

/**
 * Extract flight number from flight callsign
 * Returns the trailing digit (1-9) if present, otherwise "1"
 * @example
 * getFlightNumber("VENOM1") => "1"
 * getFlightNumber("VIPER") => "1"
 * getFlightNumber("HAWG2") => "2"
 */
export function getFlightNumber(flightCallsign: string): string {
  if (!flightCallsign) return '1'
  const match = flightCallsign.match(/(\d)$/)
  return match && match[1] ? match[1] : '1'
}

/**
 * Generate Link16 callsign for a specific crew member
 * Format: Link16Prefix + FlightNumber + CrewPosition
 * @example
 * getCrewMemberLink16Callsign(mission, 0) => "BR11" (for BASHER1 flight, position 1)
 * getCrewMemberLink16Callsign(mission, 1) => "BR12" (for BASHER1 flight, position 2)
 */
export function getCrewMemberLink16Callsign(mission: Mission, crewMemberIndex: number): string {
  const link16Prefix = mission.link16PrefixOverride!
  const flightCallsign = mission.flightCallsignOverride!
  const flightNumber = getFlightNumber(flightCallsign)
  return `${link16Prefix}${flightNumber}${crewMemberIndex + 1}`
}
