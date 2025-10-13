import theatersData from '@/data/json/theaters.json'
import { airframeDatabase } from '@/data/airframes'
import { type SquadronId } from '@/data/squadrons'

// Derive Airframe type dynamically from airframeDatabase
// To add a new airframe: add a JSON file in src/data/json/airframes/ and import it in src/data/airframes.ts
export type Airframe = keyof typeof airframeDatabase

// Derive Theater type dynamically from theaters.json
// To add a new theater: just add it to theaters.json
export type Theater = keyof typeof theatersData

// Squadron type (derived from squadrons.json)
export type Squadron = SquadronId

// Coordinate display format
export type CoordinateFormat = 'DMS' | 'DD' | 'DDM' | 'MGRS'

export interface Waypoint {
  sequence: number
  name: string
  latitude: number | null // Decimal degrees (e.g., 36.2057583). Positive = N, Negative = S. Required for valid waypoint.
  longitude: number | null // Decimal degrees (e.g., 65.8476583). Positive = E, Negative = W. Required for valid waypoint.
  coordinateFormat?: CoordinateFormat // Display format for this coordinate (defaults to DDM)
  elevation?: number // feet MSL (ground elevation)
  altitude: number | null // planned altitude in feet MSL. Required for valid waypoint.
  speed?: number // indicated airspeed in knots
  timeOnTarget?: string // Time on target (HH:MM:SS or HHMMz)
  type?: string // e.g., "PARK", "IAF", "IP", "TGT", "EP", "FAF", "LDG"
  ccip?: CCIPData // CCIP delivery data (only used for TGT type steerpoints)
}

export interface CrewMember {
  position: string // "LEAD", "WING", "EL LEAD", "EL WING"
  pilot: string
  callsign: string
  own: string // Own ship number
  stn: string
  mode3: string
  aaTcn: string
  intraflight: string
  laser: string
  tailNumber?: string // Aircraft tail number (e.g., "86-0267")
}

export interface LoadoutStation {
  station: number | string // 1-9 for F-16C, or "5L", "5R" for special stations
  item: string
  quantity?: number
}

export interface CMDSProgram {
  number: number
  flareBurstQty: number
  flareBurstInterval: number
  flareSalvoQty: number
  flareSalvoInterval: number
  chaffBurstQty: number
  chaffBurstInterval: number
  chaffSalvoQty: number
  chaffSalvoInterval: number
}

export interface ECMCMDSProfiles {
  cmdsPrograms: CMDSProgram[]
  chaffBingo: number
  flareBingo: number
  chaffTotal?: number
  flareTotal?: number
}

export interface RadioPreset {
  number: number
  frequency: string
  description: string
}

export interface Radio {
  name: string
  description: string
  presetCount: number
  min: number | null // Minimum frequency in MHz (null if not available)
  max: number | null // Maximum frequency in MHz (null if not available)
  step: number // Frequency step size in MHz (0.025 for airband, 1 for others)
}

export interface F16CalculatorParams {
  windDirection?: number // magnetic degrees (0-359)
  windSpeed?: number // knots
  temperature?: number // °C
  runwayCondition: 'dry' | 'wet' | 'snow' | 'ice'
  powerSetting: 'MIL' | 'AB'
  cgPercent?: number // 20-35%
  pitchAttitude?: number // degrees
  runwaySlope?: number // percent
}

export interface A10CalculatorParams {
  windDirection?: number // magnetic degrees (0-359)
  windSpeed?: number // knots
  temperature?: number // °C
  runwayCondition: 'dry' | 'wet' | 'icy'
  flapSetting: 0 | 7 // degrees
  speedBrake: 'open' | 'closed' // open = extended, closed = retracted
}

export interface F16BingoCalculatorParams {
  aarExpected: boolean // Whether aerial refueling is expected
  approachType: 'VFR' | 'IFR' // Approach type for recovery
  altitudeProfile: 'medium' | 'low' // Mission altitude profile
}

export interface DepartureRecoveryData {
  departureProcedure?: string // Departure procedure (e.g., "Unrestricted Climb")
  departureAirportId?: string // Departure airport identifier
  departureRunwayName?: string // Departure runway name
  departureRunwayHeading?: number // magnetic degrees (0-359), stored for reference
  departureFieldElevation?: number // feet MSL
  recoveryProcedure?: string // Recovery procedure (e.g., "TAC Recovery")
  recoveryAirportId?: string // Recovery airport identifier
  recoveryRunwayName?: string // Recovery runway name
  recoveryRunwayHeading?: number // magnetic degrees (0-359), stored for reference
  recoveryFieldElevation?: number // feet MSL (if different from departure)
  alternateAirportId?: string // Alternate airport identifier
}

export interface TOLDData {
  grossWeight?: number
  rotation?: number // knots
  refusal?: number // knots
  minAgl?: number
  minMsl?: number
  calculatorParams?: F16CalculatorParams | A10CalculatorParams
  // WIP: Rotation/refusal calculations need complete munitions database
}

export interface FuelData {
  takeoff: number // pounds
  joker: number // pounds
  bingo: number // pounds
  bingoCalculatorParams?: F16BingoCalculatorParams
}

export interface Bullseye {
  latitude: number | null // Decimal degrees
  longitude: number | null // Decimal degrees
  coordinateFormat?: CoordinateFormat // Display format for this coordinate (defaults to DDM)
  waypointNumber?: number
  description?: string
}

export interface PackageMember {
  callsign: string
  aircraft: Airframe
  time: string // Time in Zulu format (e.g., "1530z")
  comms: string // VHF frequency (e.g., "251.0")
  stn: number | null
  aaTacan: string // Format like "5Y"
  task: string
}

export interface SupportAsset {
  callsign: string
  role: string // Common roles: 'TANKER', 'JSTARS', 'AWACS', but allows custom values
  frequency: string // UHF frequency (e.g., "305.5")
  preset: number | null
  aaTacan: string // Format like "5Y"
  location: string
  altitude: number | null // feet
}

export interface CCIPReferencePoint {
  bearing?: number // degrees (0.1 precision)
  distance?: number // feet
  elevation?: number // feet (can be negative, offset from target altitude)
}

export interface CCIPData {
  referencePointType?: 'VIP' | 'VRP' | 'None' // determines which reference point to use
  vip?: CCIPReferencePoint // Visual Initial Point
  vrp?: CCIPReferencePoint // Visual Reference Point
  oa1?: CCIPReferencePoint // Offset Aimpoint 1
  oa2?: CCIPReferencePoint // Offset Aimpoint 2
  pup?: CCIPReferencePoint // Pull-up Point
}

export interface HARMTable {
  tableNumber: number // 1-3
  emitters: number[] // Array of emitter codes (e.g., [110, 104, 103, 115, 107])
}

export interface HTSThreatData {
  manualTableEnabled: boolean // Whether manual threat table is enabled
  manualEmitters: number[] // Array of manually entered emitter codes
  enabledClasses: boolean[] // 11-element array of threat class enable flags
}

export interface TargetData {
  name?: string
  dmpi?: string
  latitude?: number | null // Decimal degrees
  longitude?: number | null // Decimal degrees
  coordinateFormat?: CoordinateFormat // Display format for this coordinate (defaults to DDM)
  elevation?: number
  attackHeading?: number // degrees (integer)
  ingressAltitude?: number // feet (integer)
  remarks?: string // Markdown formatted text
  imageIds?: string[] // Image IDs referenced in remarks
}

export interface MissionDetails {
  remarks?: string // Markdown formatted text
  primaryTarget?: TargetData
  secondaryTarget?: TargetData
  timeOnTarget?: string
  imageIds?: string[] // Image IDs referenced in remarks field
}

export interface Mission {
  id: string
  name: string
  callsign: string
  flightCallsignOverride?: string // Override for flight callsign (e.g., "BUSTER"). If empty, uses flight lead's callsign
  link16PrefixOverride?: string // Override for Link16 prefix (e.g., "BR"). If empty, uses flight lead's link16Prefix
  date: string
  missionNumber: string
  type: string // e.g., "DEAD/AI", "SEAD", "CAS", "STRIKE"
  squadron: Squadron // Squadron determines the airframe
  theater: Theater

  // Flight composition
  crew: CrewMember[]

  // Package and Support
  packageMembers: PackageMember[]
  supportAssets: SupportAsset[]

  // Navigation
  waypoints: Waypoint[]
  bullseye?: Bullseye

  // Loadout
  loadout: LoadoutStation[]
  gunAmmoType?: string // Aircraft-level ammunition preset (e.g., "CM - Combat Mix", "HEI - High Explosive Incendiary")

  // Countermeasures and ECM
  ecmCmds: ECMCMDSProfiles
  cmdsProfile?: string // CMDS profile (e.g., "PRGM 1" for F-16, "PRGM A" for A-10)
  ecmPrograms?: string[] // ECM programs (e.g., ["1", "2", "3"] for F-16, ["AIR", "SAM1"] for A-10)
  htsThreatTables?: string[] // HTS threat tables (e.g., ["CLASS 1", "CLASS 2"] for F-16) - DEPRECATED: use harmTables and htsThreatData
  harmTables?: HARMTable[] // F-16C HARM threat tables (1-3 tables)
  htsThreatData?: HTSThreatData // F-16C HTS manual threat configuration

  // Radios - N-sized array where each element is an array of presets for that radio
  // Index corresponds to radio number (0 = COM1, 1 = COM2, 2 = COM3, etc.)
  // Number of radios is determined by airframe configuration
  radioPresets: RadioPreset[][]
  commLadders?: number[][] // Per-radio comm ladder sequences (e.g., [[1, 2, 3, 4, 12], [1, 2, 3]])

  // Departure and Recovery
  departureRecovery: DepartureRecoveryData

  // Performance
  told: TOLDData
  fuel: FuelData

  // Weather
  weather?: string

  // Mission details
  details: MissionDetails

  // Metadata
  createdAt: string
  updatedAt: string
}
