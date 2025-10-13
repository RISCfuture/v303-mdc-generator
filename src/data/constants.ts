// Mission type constants
import missionTypesJson from '@/data/json/missionTypes.json'
import { airframeDatabase } from '@/data/airframes'

export const MISSION_TYPES = missionTypesJson.missionTypes as readonly string[]

export type MissionType = (typeof MISSION_TYPES)[number]

// Airframe station counts - dynamically derived from airframe data
// Calculated from the number of stations in each airframe's JSON file
export const STATION_COUNTS: Record<string, number> = Object.entries(airframeDatabase).reduce(
  (acc, [key, data]) => {
    acc[key] = data.stations.length
    return acc
  },
  {} as Record<string, number>,
)

export function getCrewPositionLabel(index: number): string {
  if (index === 0) return 'LEAD'
  if (index === 1) return 'WING'
  if (index === 2) return 'ELEMENT LEAD'
  if (index === 3) return 'ELEMENT WING'
  return `POSITION ${index + 1}`
}

export function getCrewPositionShort(index: number): string {
  if (index === 0) return '-1'
  if (index === 1) return '-2'
  if (index === 2) return '-3'
  if (index === 3) return '-4'
  return `-${index + 1}`
}
