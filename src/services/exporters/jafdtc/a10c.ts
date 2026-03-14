// JAFDTC exporter for A-10C
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { getRadioConfig } from '../helpers'

export interface JAFDTCA10MDC {
  DSMS: {
    LaserCode: string
    ProfileOrder?: null | number[]
    MunitionSettings?: Record<string, unknown>
  }
  HMCS?: Record<string, unknown>
  IFFCC?: Record<string, unknown>
  Misc: {
    TACANMode: string
    TACANBand: string
    TACANChannel: string
    IFFMasterMode: string
    IFFMode3Code: string
    IFFMode4On: string
    MSLFloor: string
    AGLFloor: string
    [key: string]: unknown
  }
  Radio: {
    IsPresetMode: boolean[]
    DefaultSetting: string[]
    IsDefault: boolean
    Presets: Array<
      Array<{
        Preset: number
        Frequency: string
        Modulation: string
        Description: string
      }>
    >
    [key: string]: unknown
  }
  TAD: {
    OwnID: string
    Callsign: string
    [key: string]: unknown
  }
  TGP: {
    LaserCode: string
    LSS: string
    [key: string]: unknown
  }
  WYPT: {
    Points: Array<{
      Alt: string
      Number: number
      Name: string
      Lat: string
      Lon: string
    }>
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
 * Export mission to A-10C JAFDTC JSON format
 * @param mission - The mission to export
 * @param crewMemberIndex - Index of the crew member (default: 0)
 * @param template - Optional squadron template to merge with mission data
 */
export function exportA10MDC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<JAFDTCA10MDC>,
): JAFDTCA10MDC {
  // Get selected crew member data
  const selectedCrewMember = mission.crew[crewMemberIndex]!
  const laserCode = selectedCrewMember.laser.replace(/\s/g, '')
  const mode3Code = selectedCrewMember.mode3.replace(/\s/g, '')

  // Parse TACAN from selected crew member's aaTcn (format: "10Y / 73Y")
  const tacanMatch = selectedCrewMember.aaTcn.match(/(\d+)([XY])/)!
  const tacanChannel = tacanMatch[1]!
  const tacanBand = tacanMatch[2] === 'Y' ? '1' : '0'

  // Convert waypoints to JAFDTC format
  const waypoints = mission.waypoints.map((wp) => {
    // For blank steerpoints (all fields null), export as 0°N, 0°E
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : wp.latitude!
    const longitude = isBlank ? 0 : wp.longitude!
    const altitude = isBlank ? 0 : wp.altitude!

    return {
      Alt: altitude.toString(),
      Number: wp.sequence,
      Name: wp.name!,
      Lat: formatDecimalDegrees(latitude),
      Lon: formatDecimalDegrees(longitude),
    }
  })

  // Build radio presets for 3 radios (VHF AM, UHF, VHF FM)
  const radioPresets: Array<
    Array<{ Preset: number; Frequency: string; Modulation: string; Description: string }>
  > = []

  // Radio 1 (VHF AM) - Modulation "0" = FM
  radioPresets.push(
    mission.radioPresets[0]?.map((preset) => ({
      Preset: preset.number,
      Frequency: preset.frequency,
      Modulation: '0',
      Description: preset.description,
    })) || [],
  )

  // Radio 2 (UHF) - No modulation field
  radioPresets.push(
    mission.radioPresets[1]?.map((preset) => ({
      Preset: preset.number,
      Frequency: preset.frequency,
      Modulation: '',
      Description: preset.description,
    })) || [],
  )

  // Radio 3 (VHF FM) - No modulation field
  radioPresets.push(
    mission.radioPresets[2]?.map((preset) => ({
      Preset: preset.number,
      Frequency: preset.frequency,
      Modulation: '',
      Description: preset.description,
    })) || [],
  )

  // Generate UUID v4
  const uid = crypto.randomUUID()

  // Generate filename and name from mission.name (dasherize and underscore)
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
  const name = mission.name

  // Get radio configurations from comm ladders for all 3 radios
  const radio1Config = getRadioConfig(mission, 0) // Radio 1 = VHF AM
  const radio2Config = getRadioConfig(mission, 1) // Radio 2 = UHF
  const radio3Config = getRadioConfig(mission, 2) // Radio 3 = VHF FM

  // Build IsPresetMode and DefaultSetting arrays based on comm ladder state
  const isPresetMode = [
    radio1Config.mode === 1, // true if preset mode, false if frequency mode
    radio2Config.mode === 1,
    radio3Config.mode === 1,
  ]

  const defaultSetting = [
    radio1Config.mode === 1 ? radio1Config.selectedPreset : radio1Config.selectedFrequency,
    radio2Config.mode === 1 ? radio2Config.selectedPreset : radio2Config.selectedFrequency,
    radio3Config.mode === 1 ? radio3Config.selectedPreset : radio3Config.selectedFrequency,
  ]

  const missionData: JAFDTCA10MDC = {
    DSMS: {
      LaserCode: laserCode,
    },
    Misc: {
      TACANMode: '4', // A/A TR
      TACANBand: tacanBand,
      TACANChannel: tacanChannel,
      IFFMasterMode: '1', // STBY
      IFFMode3Code: mode3Code,
      IFFMode4On: 'True',
      MSLFloor: (mission.told?.minMsl ?? 0).toString(),
      AGLFloor: (mission.told?.minAgl ?? 500).toString(),
    },
    TAD: {
      OwnID: selectedCrewMember.own,
      // A-10C CDU callsign is exactly 4 characters; truncate/pad to fit
      Callsign: (mission.flightCallsignOverride || mission.callsign).slice(0, 4).padEnd(4, ' '),
    },
    Radio: {
      IsPresetMode: isPresetMode,
      DefaultSetting: defaultSetting,
      IsDefault: false,
      Presets: radioPresets,
    },
    TGP: {
      LaserCode: laserCode,
      LSS: laserCode,
    },
    WYPT: {
      Points: waypoints,
    },
    Version: 'A10C-1.0',
    Airframe: 1,
    UID: uid,
    Filename: filename,
    LinkedSysMap: {},
    LastSystemEdited: 0,
    IsFavorite: false,
    Name: name,
  }

  // If template provided, merge template with mission data (mission data overwrites template)
  if (template) {
    return deepMerge(template as JAFDTCA10MDC, missionData)
  }

  return missionData
}
