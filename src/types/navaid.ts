/**
 * Type of navigation aid.
 * - VOR/DME/VOR_DME/TACAN/VORTAC: Radio navigation beacons
 * - NDB: Non-directional beacon (from DCS HOMER/NAUTICAL_HOMER)
 * - RSBN: Russian navigation system
 * - TOWN: Populated place from DCS towns.lua
 * - WAYPOINT: Tactical waypoint from v303 FG website
 */
export type NavaidType =
  | 'VOR'
  | 'DME'
  | 'VOR_DME'
  | 'TACAN'
  | 'VORTAC'
  | 'NDB'
  | 'RSBN'
  | 'TOWN'
  | 'WAYPOINT'
  | 'AIRFIELD'

export interface Navaid {
  name: string
  type?: NavaidType // Optional for backwards compatibility during migration
  latitude: number // Decimal degrees (e.g., 31.52044167). Positive = N, Negative = S
  longitude: number // Decimal degrees (e.g., 65.87225945). Positive = E, Negative = W
  elevation?: number // Ground elevation in meters MSL (Mean Sea Level)
  mgrs?: string // WIP: MGRS coordinate
}
