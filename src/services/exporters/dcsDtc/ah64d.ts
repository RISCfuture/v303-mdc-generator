// DCS-DTC exporter for AH-64D
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig } from '../helpers'

export interface DCSAH64DMDC {
  Aircraft: 'AH64D'
  Upload: {
    Waypoints: boolean
    ControlMeasures: boolean
    Targets: boolean
    Routes: boolean
    TSD: boolean
    DeleteWaypoints: boolean
    DeleteControlMeasures: boolean
    DeleteTargets: boolean
    Kneeboard: boolean
    LaserCodes: boolean
    Radios: boolean
  }
  WaypointsCapture: {
    NavPointsMode: number
    TgtPointsMode: number
    NavPointsRangeFrom: number
    TgtPointsRangeFrom: number
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
      PointType: 'WP'
      Identifier: 'WP' | 'CC' | 'LZ' | 'PP' | 'RP' | 'SP'
      Free: string
    }>
  }
  ControlMeasures: {
    Waypoints: Array<{
      Sequence: number
      Name: string
      Latitude: string
      Longitude: string
      Elevation: number
      TimeOverSteerpoint: string | null
      Target: boolean
      PointType: 'GC'
      Identifier: string
      Free: string
    }>
  }
  Targets: {
    Waypoints: Array<{
      Sequence: number
      Name: string
      Latitude: string
      Longitude: string
      Elevation: number
      TimeOverSteerpoint: string | null
      Target: boolean
      PointType: 'TG'
      Identifier: 'TG'
      Free: string
    }>
  }
  Routes: {
    Routes: Array<{
      Code: number
      Mode: number
      Waypoints: number[] | null
      IncludeAllWaypoints: boolean
      IncludeAllHazards: boolean
      IncludeAllControlMeasures: boolean
    }>
  }
  TSD: {
    ShowPresentPosition: boolean
    ShowCentered: boolean
    MapType: number
    MapOrientation: number
    MapShowGrid: boolean
    MapElevationColorBand: number
    MapElevationGray: boolean
    NavPhaseShowWptData: boolean
    NavPhaseShowInactiveZones: boolean
    NavPhaseShowObstacles: boolean
    NavPhaseShowOtherStationCursor: boolean
    NavPhaseShowCursorInfo: boolean
    NavPhaseShowHSI: boolean
    NavPhaseShowEndurance: boolean
    NavPhaseShowWind: boolean
    NavPhaseShowControlMeasures: boolean
    NavPhaseShowFriendlyUnits: boolean
    NavPhaseShowEnemyUnits: boolean
    NavPhaseShowTargets: boolean
    AttkPhaseShowCurrentRoute: boolean
    AttkPhaseShowInactiveZones: boolean
    AttkPhaseShowObstacles: boolean
    AttkPhaseShowOtherStationCursor: boolean
    AttkPhaseShowCursorInfo: boolean
    AttkPhaseShowHSI: boolean
    AttkPhaseShowEndurance: boolean
    AttkPhaseShowWind: boolean
    AttkPhaseShowControlMeasures: boolean
    AttkPhaseShowFriendlyUnits: boolean
    AttkPhaseShowEnemyUnits: boolean
    AttkPhaseShowTargets: boolean
    AttkPhaseShowShot: boolean
    ShowASEThreats: boolean
    ShowThreatRings: boolean
  }
  LaserCodes: {
    A: string
    B: string
    C: string
    D: string
    R: string
  }
  Radios: {
    Radio: {
      Presets: Array<{
        Number: number
        Name: string
        Frequencies: string[]
      }>
      SelectedModes: Array<{
        Number: number
        SelectedFrequency: string
        SelectedMode: number
        SelectedPreset: string
      }>
    }
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Map mission waypoint type to AH-64D waypoint identifier
 */
function mapWaypointIdentifier(type: string | undefined): 'WP' | 'CC' | 'LZ' | 'PP' | 'RP' | 'SP' {
  switch (type) {
    case 'TGT':
      return 'CC'
    case 'IP':
      return 'RP'
    case 'LDG':
      return 'LZ'
    default:
      return 'WP'
  }
}

/**
 * Export mission to AH-64D DCS-DTC JSON format
 * @param mission - The mission to export
 * @param crewMemberIndex - Index of the crew member (default: 0)
 * @param template - Optional squadron template to merge with mission data
 */
export function exportAH64DDCSDTC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSAH64DMDC>,
): DCSAH64DMDC {
  // Convert waypoints to AH-64D DCS-DTC format
  const waypoints = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : wp.latitude!
    const longitude = isBlank ? 0 : wp.longitude!
    const elevation = isBlank ? 0 : (wp.elevation ?? 0)

    return {
      Sequence: wp.sequence,
      Name: wp.name,
      Latitude: formatDDM(latitude, 'latitude'),
      Longitude: formatDDM(longitude, 'longitude'),
      Elevation: elevation,
      TimeOverSteerpoint: wp.timeOnTarget || null,
      Target: wp.type === 'TGT',
      PointType: 'WP' as const,
      Identifier: mapWaypointIdentifier(wp.type),
      Free: '',
    }
  })

  // Extract TGT waypoints into Targets with independent 1-based sequencing
  const targets = mission.waypoints
    .filter((wp) => wp.type === 'TGT')
    .map((wp, index) => {
      const latitude = wp.latitude!
      const longitude = wp.longitude!
      const elevation = wp.elevation ?? 0

      return {
        Sequence: index + 1,
        Name: wp.name,
        Latitude: formatDDM(latitude, 'latitude'),
        Longitude: formatDDM(longitude, 'longitude'),
        Elevation: elevation,
        TimeOverSteerpoint: wp.timeOnTarget || null,
        Target: false,
        PointType: 'TG' as const,
        Identifier: 'TG' as const,
        Free: '',
      }
    })

  // Get laser code from selected crew member
  const selectedCrewMember = mission.crew[crewMemberIndex]!
  const laserCode = selectedCrewMember.laser

  // Build radio presets — transposed format
  // Mission stores [radio][preset], AH-64D needs [preset].Frequencies[radio]
  // AH-64D has 5 radios: COM1 (VHF), COM2 (HF), COM3 (UHF), COM4 (FM1), COM5 (FM2)
  const presetCount = Math.max(...mission.radioPresets.map((r) => r?.length ?? 0), 0)
  const radioPresets: DCSAH64DMDC['Radios']['Radio']['Presets'] = []

  for (let p = 0; p < presetCount; p++) {
    const frequencies: string[] = []
    // 5 radios map to slots 0-4
    for (let r = 0; r < 5; r++) {
      const preset = mission.radioPresets[r]?.[p]
      frequencies.push(preset ? truncateFrequency(preset.frequency) : '0.000')
    }
    // Slot 5 (6th) is always unused
    frequencies.push('0.000')

    radioPresets.push({
      Number: p + 1,
      Name: mission.radioPresets[0]?.[p]?.description || '',
      Frequencies: frequencies,
    })
  }

  // Build SelectedModes for each of the 5 radios
  const selectedModes: DCSAH64DMDC['Radios']['Radio']['SelectedModes'] = []
  for (let r = 0; r < 5; r++) {
    const config = getRadioConfig(mission, r)
    selectedModes.push({
      Number: r + 1,
      SelectedFrequency: config.selectedFrequency,
      SelectedMode: config.mode,
      SelectedPreset: config.selectedPreset,
    })
  }

  const hasWaypoints = waypoints.length > 0
  const hasTargets = targets.length > 0
  const hasRadios = presetCount > 0
  const hasLaser = !!laserCode

  // Default TSD settings (sensible combat ops defaults)
  const defaultTSD: DCSAH64DMDC['TSD'] = {
    ShowPresentPosition: true,
    ShowCentered: false,
    MapType: 1,
    MapOrientation: 2,
    MapShowGrid: true,
    MapElevationColorBand: 1,
    MapElevationGray: true,
    NavPhaseShowWptData: false,
    NavPhaseShowInactiveZones: false,
    NavPhaseShowObstacles: true,
    NavPhaseShowOtherStationCursor: true,
    NavPhaseShowCursorInfo: true,
    NavPhaseShowHSI: false,
    NavPhaseShowEndurance: false,
    NavPhaseShowWind: true,
    NavPhaseShowControlMeasures: false,
    NavPhaseShowFriendlyUnits: true,
    NavPhaseShowEnemyUnits: false,
    NavPhaseShowTargets: true,
    AttkPhaseShowCurrentRoute: true,
    AttkPhaseShowInactiveZones: false,
    AttkPhaseShowObstacles: false,
    AttkPhaseShowOtherStationCursor: true,
    AttkPhaseShowCursorInfo: false,
    AttkPhaseShowHSI: true,
    AttkPhaseShowEndurance: false,
    AttkPhaseShowWind: false,
    AttkPhaseShowControlMeasures: false,
    AttkPhaseShowFriendlyUnits: true,
    AttkPhaseShowEnemyUnits: false,
    AttkPhaseShowTargets: false,
    AttkPhaseShowShot: true,
    ShowASEThreats: true,
    ShowThreatRings: true,
  }

  const missionData: DCSAH64DMDC = {
    Aircraft: 'AH64D',
    Upload: {
      Waypoints: hasWaypoints,
      ControlMeasures: false,
      Targets: hasTargets,
      Routes: true,
      TSD: false,
      DeleteWaypoints: false,
      DeleteControlMeasures: false,
      DeleteTargets: false,
      Kneeboard: false,
      LaserCodes: hasLaser,
      Radios: hasRadios,
    },
    WaypointsCapture: {
      NavPointsMode: 0,
      TgtPointsMode: 0,
      NavPointsRangeFrom: 1,
      TgtPointsRangeFrom: 1,
    },
    Waypoints: {
      Waypoints: waypoints,
    },
    ControlMeasures: {
      Waypoints: [],
    },
    Targets: {
      Waypoints: targets,
    },
    Routes: {
      Routes: [
        {
          Code: 0,
          Mode: 1,
          Waypoints: null,
          IncludeAllWaypoints: true,
          IncludeAllHazards: true,
          IncludeAllControlMeasures: true,
        },
      ],
    },
    TSD: defaultTSD,
    LaserCodes: {
      A: laserCode,
      B: '1688',
      C: '1688',
      D: '1688',
      R: laserCode,
    },
    Radios: {
      Radio: {
        Presets: radioPresets,
        SelectedModes: selectedModes,
      },
    },
    Version: 2,
    KneeboardNotes: null,
  }

  if (template) {
    return deepMerge(template as DCSAH64DMDC, missionData)
  }

  return missionData
}
