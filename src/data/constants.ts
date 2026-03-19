// Mission type constants (used for autocomplete suggestions)
import { airframeDatabase } from '@/data/airframes'

export const MISSION_TYPES = [
  'BAI',
  'CAP',
  'CAS',
  'DCA',
  'DEAD/AI',
  'ESCORT',
  'INTERCEPT',
  'OCA',
  'OTHER',
  'RECCE',
  'SEAD',
  'STRIKE',
  'SWEEP',
  'TRAINING',
] as const

// Steerpoint type constants (used for autocomplete suggestions)
export const STEERPOINT_TYPES = [
  'CP',
  'EP',
  'FAF',
  'IAF',
  'IP',
  'LDG',
  'NAV',
  'PARK',
  'PRE-IP',
  'PUSH',
  'TGT',
  'TRN',
] as const

// Airframe station counts - dynamically derived from airframe data
// Calculated from the number of stations in each airframe's JSON file
export const STATION_COUNTS: Record<string, number> = Object.entries(airframeDatabase).reduce<
  Record<string, number>
>((acc, [key, data]) => {
  if (data) {
    acc[key] = data.stations.length
  }
  return acc
}, {})

export function getCrewPositionLabel(index: number): string {
  if (index === 0) return 'LEAD'
  if (index === 1) return 'WING'
  if (index === 2) return 'ELEMENT LEAD'
  if (index === 3) return 'ELEMENT WING'
  if (index === 4) return '-5'
  if (index === 5) return '-6'
  if (index === 6) return '-7'
  if (index === 7) return '-8'
  return `POSITION ${index + 1}`
}

export function getCrewPositionShort(index: number): string {
  if (index === 0) return '-1'
  if (index === 1) return '-2'
  if (index === 2) return '-3'
  if (index === 3) return '-4'
  return `-${index + 1}`
}
