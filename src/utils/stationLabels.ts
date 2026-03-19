// Station label mapping utilities
// Maps internal DCS station numbers to user-facing display labels

import type { Airframe } from '@/types'
import { getAirframeData } from './airframeHelpers'

/**
 * Get the station label for a given aircraft and station number
 * Reads the label from the airframe JSON data
 */
export function getShortStationLabel(airframe: Airframe, stationNumber: number): string {
  const airframeData = getAirframeData(airframe)
  if (!airframeData?.stations) {
    return stationNumber.toString()
  }

  const station = airframeData.stations.find((s) => s.station === stationNumber)
  return station?.name ?? stationNumber.toString()
}
