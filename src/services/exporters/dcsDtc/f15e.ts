// DCS-DTC exporter for F-15E
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, parseTACANOrThrow } from '../helpers'

export type DCSF15EMDC = {
  Aircraft: 'F15E'
  Upload: {
    RouteA: boolean
    Radios: boolean
    Misc: boolean
    Kneeboard: boolean
  }
  RouteA: {
    Waypoints: {
      Sequence: number
      Name: string
      Latitude: string
      Longitude: string
      Elevation: number
      TimeOverSteerpoint: string | null
      Target: boolean
    }[]
  }
  Radios: {
    Radio1: {
      Presets: { Number: number; Name: string; Frequency: string }[]
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
    Radio2: {
      Presets: { Number: number; Name: string; Frequency: string }[]
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
  } | null
  Misc: {
    Bingo: number
    BingoToBeUpdated: boolean
    TACANChannel: number
    TACANBand: number
    TACANToBeUpdated: boolean
    ILSFrequency: number
    ILSCourse: number
    ILSToBeUpdated: boolean
    CARAALOW: number
    CARAALOWToBeUpdated: boolean
    LaserSettingsToBeUpdated: boolean
    TGPCode: number
    LSTCode: number
    LaserStartTime: number
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Export mission to F-15E DCS-DTC JSON format
 */
export function exportF15EDCSDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<DCSF15EMDC>,
): DCSF15EMDC {
  // Convert waypoints (RouteA)
  const waypoints = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : (wp.latitude ?? 0)
    const longitude = isBlank ? 0 : (wp.longitude ?? 0)
    const elevation = isBlank ? 0 : (wp.elevation ?? 0)

    return {
      Sequence: wp.sequence,
      Name: wp.name,
      Latitude: formatDDM(latitude, 'latitude'),
      Longitude: formatDDM(longitude, 'longitude'),
      Elevation: elevation,
      TimeOverSteerpoint: wp.timeOnTarget ?? null,
      Target: wp.type === 'TGT',
    }
  })

  // Get crew member data
  const selectedCrewMember = mission.crew[crewMemberIndex]
  const laserCode = parseInt(selectedCrewMember.laser)

  // Parse TACAN
  const tacan = parseTACANOrThrow(selectedCrewMember.aaTcn)
  const tacanChannel = tacan.channel
  const tacanBand = tacan.band === 'Y' ? 1 : 0

  // Build radio presets
  const radio1Presets =
    mission.radioPresets[0]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: truncateFrequency(preset.frequency),
    })) ?? []

  const radio2Presets =
    mission.radioPresets[1]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: truncateFrequency(preset.frequency),
    })) ?? []

  const radio1Config = getRadioConfig(mission, 0)
  const radio2Config = getRadioConfig(mission, 1)

  // Get ILS data from recovery runway
  let ilsFrequency = 108.1
  let ilsCourse = 0
  let ilsFound = false
  if (mission.departureRecovery.recoveryAirportId && mission.departureRecovery.recoveryRunwayName) {
    const airfields = getAirfieldsForTheater(mission.theater)
    const recoveryAirport = airfields.find(
      (af) => af.name === mission.departureRecovery.recoveryAirportId,
    )
    if (recoveryAirport) {
      const recoveryRunway = recoveryAirport.runways.find(
        (rw) => rw.name === mission.departureRecovery.recoveryRunwayName,
      )
      if (recoveryRunway?.ils) {
        ilsFrequency = parseFloat(String(recoveryRunway.ils.frequency))
        ilsCourse = recoveryRunway.heading
        ilsFound = true
      }
    }
  }

  // CARA ALOW from TOLD data
  const minAgl = mission.told.minAgl ?? 500
  const hasCaraAlowData = mission.told.minAgl !== undefined

  const missionData: DCSF15EMDC = {
    Aircraft: 'F15E',
    Upload: {
      RouteA: waypoints.length > 0,
      Radios: radio1Presets.length > 0 || radio2Presets.length > 0,
      Misc: true,
      Kneeboard: false,
    },
    RouteA: {
      Waypoints: waypoints,
    },
    Radios:
      radio1Presets.length > 0 || radio2Presets.length > 0
        ? {
            Radio1: {
              Presets: radio1Presets,
              SelectedFrequency: radio1Config.selectedFrequency,
              SelectedPreset: radio1Config.selectedPreset,
              EnableGuard: false,
              Mode: radio1Config.mode,
            },
            Radio2: {
              Presets: radio2Presets,
              SelectedFrequency: radio2Config.selectedFrequency,
              SelectedPreset: radio2Config.selectedPreset,
              EnableGuard: false,
              Mode: radio2Config.mode,
            },
          }
        : null,
    Misc: {
      Bingo: mission.fuel.bingo,
      BingoToBeUpdated: true,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: true,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      ILSToBeUpdated: ilsFound,
      CARAALOW: minAgl,
      CARAALOWToBeUpdated: hasCaraAlowData,
      LaserSettingsToBeUpdated: true,
      TGPCode: laserCode,
      LSTCode: laserCode,
      LaserStartTime: 8,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSF15EMDC, missionData)
  }
  return missionData
}
