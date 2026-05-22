// JAFDTC exporter for F/A-18C
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, pickDefaultTuning } from '../helpers'
import { FA18C_JAFDTC_CMS_PROGRAM_COUNT, JAFDTC_AIRFRAME } from '../constants'

export type JAFDTCFA18CMDC = {
  WYPT: {
    Points: {
      Alt: string
      Number: number
      Name: string
      Lat: string
      Lon: string
    }[]
  }
  Radio: {
    COMM1DefaultTuning: string
    COMM2DefaultTuning: string
    IsDefault: boolean
    Presets: {
      Preset: number
      Frequency: string
      Modulation: string
      Description: string
    }[][]
  }
  CMS: {
    Programs: {
      Number: number
      ChaffQ: string
      FlareQ: string
      SQ: string
      SI: string
    }[]
  }
  Version: string
  Airframe: number
  UID: string
  Filename: string
  LinkedSysMap: Record<string, unknown>
  LastSystemEdited: number
  IsFavorite: boolean
  Name: string
}

/**
 * Export mission to F/A-18C JAFDTC (.jafdtc) format
 */
export function exportFA18CJAFDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<JAFDTCFA18CMDC>,
): JAFDTCFA18CMDC {
  // Suppress unused variable warning
  void crewMemberIndex

  // Convert waypoints
  const waypoints = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : (wp.latitude ?? 0)
    const longitude = isBlank ? 0 : (wp.longitude ?? 0)
    const altitude = isBlank ? 0 : (wp.altitude ?? 0)

    return {
      Alt: altitude.toString(),
      Number: wp.sequence,
      Name: wp.name,
      Lat: formatDecimalDegrees(latitude),
      Lon: formatDecimalDegrees(longitude),
    }
  })

  // Build radio presets (2 radios)
  const radioPresets: {
    Preset: number
    Frequency: string
    Modulation: string
    Description: string
  }[][] = []

  // Radio 1 (COMM1)
  radioPresets.push(
    mission.radioPresets[0].map((preset) => ({
      Preset: preset.number,
      Frequency: truncateFrequency(preset.frequency),
      Modulation: '',
      Description: preset.description,
    })),
  )

  // Radio 2 (COMM2)
  radioPresets.push(
    mission.radioPresets[1].map((preset) => ({
      Preset: preset.number,
      Frequency: truncateFrequency(preset.frequency),
      Modulation: '',
      Description: preset.description,
    })),
  )

  const radio1Config = getRadioConfig(mission, 0)
  const radio2Config = getRadioConfig(mission, 1)

  // FA18C_JAFDTC_CMS_PROGRAM_COUNT entries: PROG1-5 (0-based) with flat string
  // fields. SQ/SI are shared between chaff and flare on the Hornet, so we use
  // the chaff salvo values.
  const cmdsPrograms = Array.from({ length: FA18C_JAFDTC_CMS_PROGRAM_COUNT }, (_, i) => {
    const prog = mission.ecmCmds.cmdsPrograms.find((p) => p.number - 1 === i)
    if (prog) {
      return {
        Number: i,
        ChaffQ: prog.chaffBurstQty.toString(),
        FlareQ: prog.flareBurstQty.toString(),
        SQ: prog.chaffSalvoQty.toString(),
        SI: prog.chaffSalvoInterval.toFixed(2),
      }
    }
    return { Number: i, ChaffQ: '', FlareQ: '', SQ: '', SI: '' }
  })

  const uid = crypto.randomUUID()
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/gu, '_')
    .replace(/[^a-z0-9_-]/gu, '')

  const missionData: JAFDTCFA18CMDC = {
    WYPT: {
      Points: waypoints,
    },
    Radio: {
      COMM1DefaultTuning: radio1Config.selectedFrequency,
      COMM2DefaultTuning: pickDefaultTuning(radio2Config),
      IsDefault: false,
      Presets: radioPresets,
    },
    CMS: {
      Programs: cmdsPrograms,
    },
    Version: 'FA18C-1.0',
    Airframe: JAFDTC_AIRFRAME.FA18C,
    UID: uid,
    Filename: filename,
    LinkedSysMap: {},
    LastSystemEdited: 0,
    IsFavorite: false,
    Name: mission.name,
  }

  if (template) {
    return deepMerge(template as JAFDTCFA18CMDC, missionData)
  }
  return missionData
}
