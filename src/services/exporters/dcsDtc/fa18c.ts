// DCS-DTC exporter for F/A-18C
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig } from '../helpers'

export interface DCSFA18CMDC {
  Aircraft: 'FA18C'
  Upload: {
    Waypoints: boolean
    CMS: boolean
    Radios: boolean
    Misc: boolean
    Kneeboard: boolean
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
  CMS: {
    Programs: Array<{
      Number: number
      FlareBurstQty: number
      FlareBurstInterval: number
      FlareSalvoQty: number
      FlareSalvoInterval: number
      ChaffBurstQty: number
      ChaffBurstInterval: number
      ChaffSalvoQty: number
      ChaffSalvoInterval: number
      ToBeUpdated: boolean
    }>
    ChaffBingo: number
    FlareBingo: number
  }
  Radios: {
    Radio1: {
      Presets: Array<{ Number: number; Name: string; Frequency: string }>
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
    Radio2: {
      Presets: Array<{ Number: number; Name: string; Frequency: string }>
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
  } | null
  Misc: {
    Bingo: number
    BingoToBeUpdated: boolean
    BullseyeToBeUpdated: boolean
    BullseyeWP: number
    TACANChannel: number
    TACANBand: number
    TACANToBeUpdated: boolean
    ILSFrequency: number
    ILSCourse: number
    ILSToBeUpdated: boolean
    LaserSettingsToBeUpdated: boolean
    TGPCode: number
    LSTCode: number
    LaserStartTime: number
    BaroWarn: number
    BaroWarnToBeUpdated: boolean
    RadarWarn: number
    RadarWarnToBeUpdated: boolean
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Export mission to F/A-18C DCS-DTC JSON format
 */
export function exportFA18CDCSDTC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSFA18CMDC>,
): DCSFA18CMDC {
  // Convert waypoints
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

  // Get crew member data
  const selectedCrewMember = mission.crew[crewMemberIndex]!
  const laserCode = parseInt(selectedCrewMember.laser)

  // Parse TACAN
  const tacanMatch = selectedCrewMember.aaTcn.match(/(\d+)([XY])/)!
  const tacanChannel = parseInt(tacanMatch[1]!)
  const tacanBand = tacanMatch[2] === 'Y' ? 1 : 0

  // Build radio presets
  const radio1Presets =
    mission.radioPresets[0]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: truncateFrequency(preset.frequency),
    })) || []

  const radio2Presets =
    mission.radioPresets[1]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: truncateFrequency(preset.frequency),
    })) || []

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

  // Altitude warnings from TOLD data
  const minAgl = mission.told?.minAgl ?? 500
  const minMsl = mission.told?.minMsl ?? 5000
  const hasBaroWarnData = mission.told?.minMsl !== undefined
  const hasRadarWarnData = mission.told?.minAgl !== undefined

  const missionData: DCSFA18CMDC = {
    Aircraft: 'FA18C',
    Upload: {
      Waypoints: waypoints.length > 0,
      CMS: true,
      Radios: radio1Presets.length > 0 || radio2Presets.length > 0,
      Misc: true,
      Kneeboard: false,
    },
    Waypoints: {
      Waypoints: waypoints,
    },
    CMS: {
      Programs: mission.ecmCmds.cmdsPrograms.map((prog) => ({
        Number: prog.number,
        FlareBurstQty: prog.flareBurstQty,
        FlareBurstInterval: prog.flareBurstInterval,
        FlareSalvoQty: prog.flareSalvoQty,
        FlareSalvoInterval: prog.flareSalvoInterval,
        ChaffBurstQty: prog.chaffBurstQty,
        ChaffBurstInterval: prog.chaffBurstInterval,
        ChaffSalvoQty: prog.chaffSalvoQty,
        ChaffSalvoInterval: prog.chaffSalvoInterval,
        ToBeUpdated: true,
      })),
      ChaffBingo: mission.ecmCmds.chaffBingo,
      FlareBingo: mission.ecmCmds.flareBingo,
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
      BullseyeToBeUpdated: mission.bullseye ? true : false,
      BullseyeWP: mission.bullseye?.waypointNumber || 25,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: true,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      ILSToBeUpdated: ilsFound,
      LaserSettingsToBeUpdated: true,
      TGPCode: laserCode,
      LSTCode: laserCode,
      LaserStartTime: 8,
      BaroWarn: minMsl,
      BaroWarnToBeUpdated: hasBaroWarnData,
      RadarWarn: minAgl,
      RadarWarnToBeUpdated: hasRadarWarnData,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSFA18CMDC, missionData)
  }
  return missionData
}
