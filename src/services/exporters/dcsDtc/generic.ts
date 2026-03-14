// DCS-DTC generic exporter for simple airframes (A-10C, C-130J, CH-47F)
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig } from '../helpers'

/**
 * DCS-DTC format for simple airframes (A-10C, C-130J, CH-47F)
 * Simpler than F-16C DCS-DTC — no MFD/HARM/HTS/Datalink/CMS sections
 */
export interface DCSGenericMDC {
  Aircraft: string
  Upload: { Waypoints: boolean; Radios: boolean }
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
  Radios: {
    Radio1: {
      Presets: Array<{ Number: number; Name: string | null; Frequency: string }>
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
    Radio2: {
      Presets: Array<{ Number: number; Name: string | null; Frequency: string }> | null
      SelectedFrequency: string | null
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
  } | null
  WaypointsCapture: {
    NavPointsMode: number
    TgtPointsMode: number
    NavPointsRangeFrom: number
    TgtPointsRangeFrom: number
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Export mission to generic DCS-DTC format (used by A-10C, C-130J, CH-47F)
 */
export function exportGenericDCSDTC(
  mission: Mission,
  crewMemberIndex: number,
  aircraftId: string,
  template?: DeepPartial<DCSGenericMDC>,
): DCSGenericMDC {
  // Convert waypoints to DCS-DTC format (DDM coordinates like F-16C)
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

  // Build radio presets for first 2 radios
  const radio1Presets =
    mission.radioPresets[0]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description || null,
      Frequency: truncateFrequency(preset.frequency),
    })) || []

  const radio2Presets =
    mission.radioPresets[1]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description || null,
      Frequency: truncateFrequency(preset.frequency),
    })) || null

  const radio1Config = getRadioConfig(mission, 0)
  const radio2Config = getRadioConfig(mission, 1)

  // Suppress unused variable warning — crewMemberIndex reserved for future per-crew export
  void crewMemberIndex

  const missionData: DCSGenericMDC = {
    Aircraft: aircraftId,
    Upload: {
      Waypoints: waypoints.length > 0,
      Radios: radio1Presets.length > 0 || (radio2Presets !== null && radio2Presets.length > 0),
    },
    Waypoints: {
      Waypoints: waypoints,
    },
    Radios:
      radio1Presets.length > 0 || (radio2Presets !== null && radio2Presets.length > 0)
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
    WaypointsCapture: {
      NavPointsMode: 0,
      TgtPointsMode: 0,
      NavPointsRangeFrom: 1,
      TgtPointsRangeFrom: 1,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSGenericMDC, missionData)
  }
  return missionData
}
