// DCS-DTC exporter for F/A-18C
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, parseTACANOrThrow } from '../helpers'
import {
  DEFAULT_BULLSEYE_WAYPOINT,
  DEFAULT_MIN_AGL_FEET,
  DEFAULT_MIN_MSL_FEET,
  FA18C_ILS_BASE_FREQUENCY_MHZ,
  FA18C_ILS_MAX_CHANNEL,
  FA18C_ILS_MIN_CHANNEL,
  FA18C_ILS_STEP_MHZ,
  TACAN_BAND_DCS_DTC,
} from '../constants'

export type DCSFA18CMDC = {
  Aircraft: 'FA18C'
  Upload: {
    Waypoints: boolean
    CMS: boolean
    Radios: boolean
    Misc: boolean
    Kneeboard: boolean
  }
  Waypoints: {
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
  CMS: {
    Programs: {
      Number: number
      FlareQty: number
      ChaffQty: number
      Interval: number
      Repeat: number
      ToBeUpdated: boolean
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
    BullseyeToBeUpdated: boolean
    BullseyeWP: number
    TACANChannel: number
    TACANBand: number
    TACANToBeUpdated: boolean
    ILSChannel: number
    ILSToBeUpdated: boolean
    LaserSettingsToBeUpdated: boolean
    TGPCode: number
    LSTCode: number
    BaroWarn: number
    BaroToBeUpdated: boolean
    RadarWarn: number
    RadarToBeUpdated: boolean
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Export mission to F/A-18C DCS-DTC JSON format
 */
export function exportFA18CDCSDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<DCSFA18CMDC>,
): DCSFA18CMDC {
  // Convert waypoints
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
  const tacanBand = TACAN_BAND_DCS_DTC[tacan.band]

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

  // F/A-18 dials a 1–20 approach channel (FA18C_ILS_BASE_FREQUENCY_MHZ +
  // n·FA18C_ILS_STEP_MHZ), not a frequency. Out-of-range frequencies map to 0.
  let ilsChannel = 0
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
        const freq = parseFloat(String(recoveryRunway.ils.frequency))
        ilsChannel =
          Math.round((freq - FA18C_ILS_BASE_FREQUENCY_MHZ) / FA18C_ILS_STEP_MHZ) +
          FA18C_ILS_MIN_CHANNEL
        ilsFound = ilsChannel >= FA18C_ILS_MIN_CHANNEL && ilsChannel <= FA18C_ILS_MAX_CHANNEL
        if (!ilsFound) ilsChannel = 0
      }
    }
  }

  const minAgl = mission.told.minAgl ?? DEFAULT_MIN_AGL_FEET
  const minMsl = mission.told.minMsl ?? DEFAULT_MIN_MSL_FEET
  const hasBaroWarnData = mission.told.minMsl !== undefined
  const hasRadarWarnData = mission.told.minAgl !== undefined

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
      // F/A-18 CMS uses a flat qty/interval/repeat model rather than the
      // F-16 burst/salvo split; map burst qty → per-release qty,
      // salvo qty → repeats, salvo interval → seconds between releases.
      Programs: mission.ecmCmds.cmdsPrograms.map((prog) => ({
        Number: prog.number,
        ChaffQty: prog.chaffBurstQty,
        FlareQty: prog.flareBurstQty,
        Interval: prog.chaffSalvoInterval,
        Repeat: prog.chaffSalvoQty,
        ToBeUpdated: true,
      })),
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
      BullseyeToBeUpdated: !!mission.bullseye,
      BullseyeWP: mission.bullseye?.waypointNumber ?? DEFAULT_BULLSEYE_WAYPOINT,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: true,
      ILSChannel: ilsChannel,
      ILSToBeUpdated: ilsFound,
      LaserSettingsToBeUpdated: true,
      TGPCode: laserCode,
      LSTCode: laserCode,
      BaroWarn: minMsl,
      BaroToBeUpdated: hasBaroWarnData,
      RadarWarn: minAgl,
      RadarToBeUpdated: hasRadarWarnData,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSFA18CMDC, missionData)
  }
  return missionData
}
