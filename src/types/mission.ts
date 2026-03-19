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

export type Waypoint = {
  sequence: number
  name: string
  latitude: number | null // Decimal degrees (e.g., 36.2057583). Positive = N, Negative = S. Null for blank steerpoints.
  longitude: number | null // Decimal degrees (e.g., 65.8476583). Positive = E, Negative = W. Null for blank steerpoints.
  coordinateFormat?: CoordinateFormat // Display format for this coordinate (defaults to DDM)
  elevation?: number // feet MSL (ground elevation)
  altitude: number | null // planned altitude in feet MSL. Null for blank steerpoints.
  speed: number | null // indicated airspeed in knots. Null for blank steerpoints.
  timeOnTarget?: string // Time on target (HH:MM:SS or HHMMz)
  type?: string // e.g., "PARK", "IAF", "IP", "TGT", "EP", "FAF", "LDG"
  ccip?: CCIPData // CCIP delivery data (only used for TGT type steerpoints)
}

export type CrewMember = {
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

export type LoadoutStation = {
  station: number | string // 1-9 for F-16C, or "5L", "5R" for special stations
  item: string
  quantity?: number
}

export type CMDSProgram = {
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

export type ECMCMDSProfiles = {
  cmdsPrograms: CMDSProgram[]
  chaffBingo: number
  flareBingo: number
  chaffTotal?: number
  flareTotal?: number
}

export type RadioPreset = {
  number: number
  frequency: string
  description: string
}

export type RadioDefault = {
  mode: 'preset' | 'manual'
  preset?: number // When mode='preset', which preset number (1-N)
  frequency?: string // When mode='manual', the frequency value
}

export type Radio = {
  name: string
  description: string
  presetCount: number
  min: number | null // Minimum frequency in MHz (null if not available)
  max: number | null // Maximum frequency in MHz (null if not available)
  step: number // Frequency step size in MHz (0.025 for airband, 1 for others)
}

export type F16CalculatorParams = {
  windDirection?: number // magnetic degrees (0-359)
  windSpeed?: number // knots
  temperature?: number // °C
  runwayCondition: 'dry' | 'wet' | 'snow' | 'ice'
  powerSetting: 'MIL' | 'AB'
  cgPercent?: number // 20-35%
  pitchAttitude?: number // degrees
  runwaySlope?: number // percent
}

export type A10CalculatorParams = {
  windDirection?: number // magnetic degrees (0-359)
  windSpeed?: number // knots
  temperature?: number // °C
  runwayCondition: 'dry' | 'wet' | 'icy'
  flapSetting: 0 | 7 // degrees
  speedBrake: 'open' | 'closed' // open = extended, closed = retracted
  thrustSetting?: 'MAX' | '3_BELOW_PTFS' // thrust setting for takeoff distance calc
  runwaySlope?: number // percent (positive = uphill)
}

export type F16BingoCalculatorParams = {
  aarExpected: boolean // Whether aerial refueling is expected
  approachType: 'VFR' | 'IFR' // Approach type for recovery
  altitudeProfile: 'medium' | 'low' // Mission altitude profile
}

export type DepartureRecoveryData = {
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

export type TOLDData = {
  grossWeight?: number
  rotation?: number // knots
  refusal?: number // knots
  minAgl?: number
  minMsl?: number
  calculatorParams?: F16CalculatorParams | A10CalculatorParams
  // WIP: Rotation/refusal calculations need complete munitions database
}

export type FuelData = {
  takeoff: number // pounds
  joker: number // pounds
  bingo: number // pounds
  fuelLoadPercentage?: number // Percentage of max fuel (0-100), defaults to 100
  bingoCalculatorParams?: F16BingoCalculatorParams
}

export type Bullseye = {
  latitude: number | null // Decimal degrees
  longitude: number | null // Decimal degrees
  coordinateFormat?: CoordinateFormat // Display format for this coordinate (defaults to DDM)
  waypointNumber?: number
  description?: string
}

export type PackageMember = {
  callsign: string
  aircraft: Airframe
  time: string // Time in Zulu format (e.g., "1530z")
  comms: string // VHF frequency (e.g., "251.0")
  stn: number | null
  aaTacan: string // Format like "5Y"
  task: string
}

export type SupportAsset = {
  callsign: string
  role: string // Common roles: 'TANKER', 'JSTARS', 'AWACS', but allows custom values
  frequency: string // UHF frequency (e.g., "305.5")
  preset: number | null
  aaTacan: string // Format like "5Y"
  location: string
  altitude: number | null // feet
}

export type CCIPReferencePoint = {
  bearing?: number // degrees (0.1 precision)
  distance?: number // feet
  elevation?: number // feet (can be negative, offset from target altitude)
}

export type CCIPData = {
  referencePointType?: 'VIP' | 'VRP' | 'None' // determines which reference point to use
  vip?: CCIPReferencePoint // Visual Initial Point
  vrp?: CCIPReferencePoint // Visual Reference Point
  oa1?: CCIPReferencePoint // Offset Aimpoint 1
  oa2?: CCIPReferencePoint // Offset Aimpoint 2
  pup?: CCIPReferencePoint // Pull-up Point
}

export type HARMTable = {
  tableNumber: number // 1-3
  emitters: number[] // Array of emitter codes (e.g., [110, 104, 103, 115, 107])
}

export type HTSThreatData = {
  manualTableEnabled: boolean // Whether manual threat table is enabled
  manualEmitters: number[] // Array of manually entered emitter codes
  enabledClasses: boolean[] // 11-element array of threat class enable flags
}

export type TargetData = {
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

export type MissionDetails = {
  remarks?: string // Markdown formatted text
  primaryTarget?: TargetData
  secondaryTarget?: TargetData
  timeOnTarget?: string
  imageIds?: string[] // Image IDs referenced in remarks field
}

export type Mission = {
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
  ecmProgram?: string // ECM program (e.g., "XMIT 1" for F-16, "AIR" for A-10)
  htsThreatTables?: string[] // HTS threat tables (e.g., ["CLASS 1", "CLASS 2"] for F-16) - DEPRECATED: use harmTables and htsThreatData
  harmTables?: HARMTable[] // F-16C HARM threat tables (1-3 tables)
  htsThreatData?: HTSThreatData // F-16C HTS manual threat configuration

  // Radios - N-sized array where each element is an array of presets for that radio
  // Index corresponds to radio number (0 = COM1, 1 = COM2, 2 = COM3, etc.)
  // Number of radios is determined by airframe configuration
  radioPresets: RadioPreset[][]
  commLadders?: string[] // Per-radio comm ladder text (freeform, one string per radio)
  radioDefaults?: RadioDefault[] // Per-radio default settings for MDC export (mode + preset/frequency)

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
