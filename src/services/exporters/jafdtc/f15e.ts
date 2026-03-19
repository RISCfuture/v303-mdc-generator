// JAFDTC exporter for F-15E
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, parseTACAN } from '../helpers'

export type JAFDTCF15EMDC = {
  STPT: {
    Points: {
      Alt: string
      Number: number
      Name: string
      Lat: string
      Lon: string
      IsTarget: boolean
      Route: string
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
  UFC: {
    TACANChannel: string
    TACANBand: string
    TACANMode: string
    ILSFrequency: string
    ILSCourse: string
    LowAltWarn: string
  }
  Misc: {
    Bingo: string
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
 * Export mission to F-15E JAFDTC (.jafdtc) format
 */
export function exportF15EJAFDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<JAFDTCF15EMDC>,
): JAFDTCF15EMDC {
  // Get crew member data
  const selectedCrewMember = mission.crew[crewMemberIndex]

  // Parse TACAN
  const tacan = parseTACAN(selectedCrewMember.aaTcn)
  const tacanChannel = String(tacan?.channel ?? '')
  const tacanBand = tacan?.band === 'X' ? 'X' : '' // JAFDTC: empty = Y, "X" = X

  // Convert waypoints (Route A)
  const stptPoints = mission.waypoints.map((wp) => {
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
      IsTarget: wp.type === 'TGT',
      Route: 'A',
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

  // Get ILS data from recovery runway
  let ilsFrequency = '108.10'
  let ilsCourse = '0'
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
        ilsFrequency = parseFloat(String(recoveryRunway.ils.frequency)).toFixed(2)
        ilsCourse = recoveryRunway.heading.toString()
      }
    }
  }

  const minAgl = mission.told.minAgl ?? 500

  const uid = crypto.randomUUID()
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')

  const missionData: JAFDTCF15EMDC = {
    STPT: {
      Points: stptPoints,
    },
    Radio: {
      IsCOMM1MonitorGuard: true,
      COMM1DefaultTuning: radio1Config.selectedFrequency,
      COMM2DefaultTuning:
        radio2Config.mode === 1 ? radio2Config.selectedPreset : radio2Config.selectedFrequency,
      IsDefault: false,
      Presets: radioPresets,
    },
    UFC: {
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANMode: '1',
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      LowAltWarn: minAgl.toString(),
    },
    Misc: {
      Bingo: mission.fuel.bingo.toString(),
    },
    Version: 'F15E-1.0',
    Airframe: 4,
    UID: uid,
    Filename: filename,
    LinkedSysMap: {},
    LastSystemEdited: 0,
    IsFavorite: false,
    Name: mission.name,
  }

  if (template) {
    return deepMerge(template as JAFDTCF15EMDC, missionData)
  }
  return missionData
}
