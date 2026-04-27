// DCS-DTC exporter for AH-64D
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { deepMerge } from '@/utils/deepMerge'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig } from '../helpers'
import {
  AH64D_DEFAULT_LASER_CODE,
  AH64D_RADIO_COUNT,
  DCS_DTC_STEERPOINT_CAPTURE_MODE,
} from '../constants'

// AH-64D DCS-DTC enums (source: the-paid-actor/dcs-dtc, AH64D/Systems/{TSDSystem,RouteSystem}.cs)

const MAP_TYPE = {
  CHART: 0,
  ELEVATION: 1,
  SATELLITE: 2,
  STICK: 3,
} as const

const MAP_ORIENTATION = {
  HEADING_UP: 0,
  TRACK_UP: 1,
  NORTH_UP: 2,
} as const

const COLOR_BAND = {
  NONE: 0,
  AIRCRAFT: 1,
  ELEVATION: 2,
} as const

const ROUTE_MODE = {
  USE_ALL: 1,
  USE_RANGE: 2,
  USE_SPECIFIC: 3,
} as const

const ROUTE_CODE = {
  ALPHA: 0,
  BRAVO: 1,
  DELTA: 2,
  ECHO: 3,
  HOTEL: 4,
  INDIA: 5,
  LIMA: 6,
  OSCAR: 7,
  ROMEO: 8,
  TANGO: 9,
} as const

export type DCSAH64DMDC = {
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
    Waypoints: {
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
    }[]
  }
  ControlMeasures: {
    Waypoints: {
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
    }[]
  }
  Targets: {
    Waypoints: {
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
    }[]
  }
  Routes: {
    Routes: {
      Code: number
      Mode: number
      Waypoints: number[] | null
      IncludeAllWaypoints: boolean
      IncludeAllHazards: boolean
      IncludeAllControlMeasures: boolean
    }[]
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
      Presets: {
        Number: number
        Name: string
        Frequencies: string[]
      }[]
      SelectedModes: {
        Number: number
        SelectedFrequency: string
        SelectedMode: number
        SelectedPreset: string
      }[]
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
  crewMemberIndex = 0,
  template?: DeepPartial<DCSAH64DMDC>,
): DCSAH64DMDC {
  // Convert waypoints to AH-64D DCS-DTC format
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
      PointType: 'WP' as const,
      Identifier: mapWaypointIdentifier(wp.type),
      Free: '',
    }
  })

  // Extract TGT waypoints into Targets with independent 1-based sequencing
  const targets = mission.waypoints
    .filter((wp) => wp.type === 'TGT')
    .map((wp, index) => {
      const latitude = wp.latitude ?? 0
      const longitude = wp.longitude ?? 0
      const elevation = wp.elevation ?? 0

      return {
        Sequence: index + 1,
        Name: wp.name,
        Latitude: formatDDM(latitude, 'latitude'),
        Longitude: formatDDM(longitude, 'longitude'),
        Elevation: elevation,
        TimeOverSteerpoint: wp.timeOnTarget ?? null,
        Target: false,
        PointType: 'TG' as const,
        Identifier: 'TG' as const,
        Free: '',
      }
    })

  // Get laser code from selected crew member
  const selectedCrewMember = mission.crew[crewMemberIndex]
  const laserCode = selectedCrewMember.laser

  // Mission stores [radio][preset]; AH-64D wants [preset].Frequencies[radio]
  // for AH64D_RADIO_COUNT radios plus an unused 6th slot ('0.000').
  const presetCount = Math.max(...mission.radioPresets.map((r) => r.length), 0)
  const radioPresets: DCSAH64DMDC['Radios']['Radio']['Presets'] = []

  for (let p = 0; p < presetCount; p++) {
    const frequencies: string[] = []
    for (let r = 0; r < AH64D_RADIO_COUNT; r++) {
      const preset = mission.radioPresets[r][p]
      frequencies.push(truncateFrequency(preset.frequency))
    }
    frequencies.push('0.000') // unused 6th slot

    radioPresets.push({
      Number: p + 1,
      Name: mission.radioPresets[0]?.[p]?.description ?? '',
      Frequencies: frequencies,
    })
  }

  const selectedModes: DCSAH64DMDC['Radios']['Radio']['SelectedModes'] = []
  for (let r = 0; r < AH64D_RADIO_COUNT; r++) {
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

  // Squadron-default TSD settings for combat ops.
  const defaultTSD: DCSAH64DMDC['TSD'] = {
    ShowPresentPosition: true,
    ShowCentered: false,
    MapType: MAP_TYPE.ELEVATION,
    MapOrientation: MAP_ORIENTATION.NORTH_UP,
    MapShowGrid: true,
    MapElevationColorBand: COLOR_BAND.AIRCRAFT,
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
      NavPointsMode: DCS_DTC_STEERPOINT_CAPTURE_MODE.ADD_TO_END_OF_LIST,
      TgtPointsMode: DCS_DTC_STEERPOINT_CAPTURE_MODE.ADD_TO_END_OF_LIST,
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
          Code: ROUTE_CODE.ALPHA,
          Mode: ROUTE_MODE.USE_ALL,
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
      B: AH64D_DEFAULT_LASER_CODE,
      C: AH64D_DEFAULT_LASER_CODE,
      D: AH64D_DEFAULT_LASER_CODE,
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
