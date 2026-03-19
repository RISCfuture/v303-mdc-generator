// JAFDTC exporter for F/A-18C
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig } from '../helpers'

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
    IsCOMM1MonitorGuard: boolean
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
      Chaff: { BQ: string; BI: string; SQ: string; SI: string }
      Flare: { BQ: string; BI: string; SQ: string; SI: string }
    }[]
    BingoChaff: string
    BingoFlare: string
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

  // Build CMS programs
  const cmdsPrograms = mission.ecmCmds.cmdsPrograms.map((prog) => ({
    Number: prog.number - 1, // JAFDTC uses 0-based indexing
    Chaff: {
      BQ: prog.chaffBurstQty.toString(),
      BI: prog.chaffBurstInterval.toFixed(3),
      SQ: prog.chaffSalvoQty.toString(),
      SI: prog.chaffSalvoInterval.toFixed(2),
    },
    Flare: {
      BQ: prog.flareBurstQty.toString(),
      BI: prog.flareBurstInterval.toFixed(3),
      SQ: prog.flareSalvoQty.toString(),
      SI: prog.flareSalvoInterval.toFixed(2),
    },
  }))

  const uid = crypto.randomUUID()
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')

  const missionData: JAFDTCFA18CMDC = {
    WYPT: {
      Points: waypoints,
    },
    Radio: {
      IsCOMM1MonitorGuard: true,
      COMM1DefaultTuning: radio1Config.selectedFrequency,
      COMM2DefaultTuning:
        radio2Config.mode === 1 ? radio2Config.selectedPreset : radio2Config.selectedFrequency,
      IsDefault: false,
      Presets: radioPresets,
    },
    CMS: {
      Programs: cmdsPrograms,
      BingoChaff: mission.ecmCmds.chaffBingo.toString(),
      BingoFlare: mission.ecmCmds.flareBingo.toString(),
    },
    Version: 'FA18C-1.0',
    Airframe: 6,
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
