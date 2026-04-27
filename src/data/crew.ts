// Crew database. Source of truth: v303 FG Network/Radio/Laser Standards
// Google Sheet — https://docs.google.com/spreadsheets/d/1sFs9AAEHIKj-DZ0Yyy-6nqSdPD8b8mxoXSeQZDxs3I0/preview#gid=232335311
// (embedded in forum thread 2055). Refresh all three squadron arrays in
// src/data/json/crew.json from the sheet's "DATALINK AND OTHER ASSIGNMENTS"
// tab on each update; remove pilots that aren't on the sheet; for impossible
// octal Mode 3 codes (digits 8 or 9) store `mode3: null` and flag in the PR.
import crewDataJson from '@/data/json/crew.json'

export type PilotData = {
  pilot: string
  callsign: string[] // Array of callsign options
  link16Prefix: string // Link16 prefix (2-letter code, e.g., "FN", "BR")
  stn: number // STN is an integer (always 5 digits)
  mode3?: number | null // Mode 3 is an octal integer (0000 to 7777 in octal). Null/undefined if N/A.
  freq: string
  aaTacan: number // TACAN channel (1-63), band is always Y, reciprocal is +63
  laserCode?: number | null // Laser code is octal with digits 1-8 (1111 to 1688 in octal). Null/undefined if N/A.
  tailNumber?: string // Aircraft tail number (e.g., "86-0267")
}

// Extensible crew data structure - squadron IDs are dynamic
type CrewDataJson = Record<string, PilotData[]>

const crewData = crewDataJson as CrewDataJson

// Export crew data organized by squadron
// To add a new squadron: just add it to crew.json and squadrons.json
export const crewBySquadron: Record<string, PilotData[]> = crewData

// Flatten the crew database into a single array
export const crewDatabase: PilotData[] = Object.values(crewData).flat()
