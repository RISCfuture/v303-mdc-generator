// DCS-DTC exporter for AV-8B
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'

export interface DCSAV8BMDC {
  Aircraft: 'AV8B'
  Upload: {
    Waypoints: boolean
  }
  Waypoints: {
    Waypoints: Array<{
      Sequence: number
      Name: string
      Latitude: string
      Longitude: string
      Elevation: number
      TimeOverSteerpoint: string | null
      Target: boolean
    }>
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Export mission to AV-8B DCS-DTC JSON format
 * Simplest DCS-DTC exporter — waypoints only
 */
export function exportAV8BDCSDTC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSAV8BMDC>,
): DCSAV8BMDC {
  // Suppress unused variable warning
  void crewMemberIndex

  const waypoints = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : wp.latitude!
    const longitude = isBlank ? 0 : wp.longitude!
    const elevation = isBlank ? 0 : (wp.elevation ?? 0)

    return {
      Sequence: wp.sequence,
      Name: wp.name!,
      Latitude: formatDDM(latitude, 'latitude'),
      Longitude: formatDDM(longitude, 'longitude'),
      Elevation: elevation,
      TimeOverSteerpoint: wp.timeOnTarget || null,
      Target: wp.type === 'TGT',
    }
  })

  const missionData: DCSAV8BMDC = {
    Aircraft: 'AV8B',
    Upload: {
      Waypoints: waypoints.length > 0,
    },
    Waypoints: {
      Waypoints: waypoints,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSAV8BMDC, missionData)
  }
  return missionData
}
