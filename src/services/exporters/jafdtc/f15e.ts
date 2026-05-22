// JAFDTC exporter for F-15E
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, parseTACAN, pickDefaultTuning } from '../helpers'
import {
  DEFAULT_ILS_FREQUENCY_MHZ,
  DEFAULT_MIN_AGL_FEET,
  JAFDTC_AIRFRAME,
  TACAN_BAND_JAFDTC_AIRCRAFT,
  TACAN_MODE_JAFDTC_F15E,
} from '../constants'

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
    IsCOMM2MonitorGuard: boolean
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
  const tacanBand = tacan ? TACAN_BAND_JAFDTC_AIRCRAFT[tacan.band] : TACAN_BAND_JAFDTC_AIRCRAFT.Y

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

  let ilsFrequency = DEFAULT_ILS_FREQUENCY_MHZ.toFixed(2)
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

  const minAgl = mission.told.minAgl ?? DEFAULT_MIN_AGL_FEET

  const uid = crypto.randomUUID()
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/gu, '_')
    .replace(/[^a-z0-9_-]/gu, '')

  const missionData: JAFDTCF15EMDC = {
    STPT: {
      Points: stptPoints,
    },
    Radio: {
      IsCOMM1MonitorGuard: true,
      IsCOMM2MonitorGuard: false,
      COMM1DefaultTuning: radio1Config.selectedFrequency,
      COMM2DefaultTuning: pickDefaultTuning(radio2Config),
      IsDefault: false,
      Presets: radioPresets,
    },
    UFC: {
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANMode: TACAN_MODE_JAFDTC_F15E.TR,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      LowAltWarn: minAgl.toString(),
    },
    Misc: {
      Bingo: mission.fuel.bingo.toString(),
    },
    Version: 'F15E-1.0',
    Airframe: JAFDTC_AIRFRAME.F15E,
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
