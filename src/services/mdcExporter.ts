// JSON MDC Exporter for DCS
// Generates MDC files compatible with the DCS MDC loader
import type { Mission, CCIPReferencePoint } from '@/types'
import { formatF16LatLon, formatA10LatLon } from '@/utils/coordinates'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { getCrewMemberLink16Callsign } from '@/utils/callsignHelpers'
import { deepMerge } from '@/utils/deepMerge'
import { loadTemplateForSquadron } from './mdcTemplateService'
import { getAirfieldsForTheater } from '@/data/airfields'

/**
 * DTC Reference Point structure (VIP, VRP, OA, PUP)
 */
interface DTCReferencePoint {
  Range: number // feet
  Bearing: number // degrees
  Elevation: number // feet
}

export interface DCSF16MDC {
  Aircraft: 'F16C'
  Upload: {
    Waypoints: boolean
    CMS: boolean
    Radios: boolean
    MFDs: boolean
    HARMHTS: boolean
    Datalink: boolean
    Misc: boolean
    Kneeboard: boolean
  }
  WaypointsCapture: null
  Waypoints: {
    Waypoints: Array<{
      Sequence: number
      Name: string
      Latitude: string
      Longitude: string
      Elevation: number
      TimeOverSteerpoint: string | null
      Target: boolean
      UseOA: boolean
      OffsetAimpoint1: DTCReferencePoint
      OffsetAimpoint2: DTCReferencePoint
      UseVIP: boolean
      VIPtoTGT: DTCReferencePoint | null
      VIPtoPUP: DTCReferencePoint | null
      UseVRP: boolean
      TGTtoVRP: DTCReferencePoint | null
      TGTtoPUP: DTCReferencePoint | null
    }>
  }
  CMS: {
    Programs?: Array<{
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
      Presets: Array<{
        Number: number
        Name: string
        Frequency: string
      }>
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
    Radio2: {
      Presets: Array<{
        Number: number
        Name: string
        Frequency: string
      }>
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
  } | null
  MFD: {
    Configurations: Array<{
      Mode: number
      LeftMFD: {
        SelectedPage: number
        Page1: number
        Page2: number
        Page3: number
        FCRMode: number | null
        FCRAzimuth: number
        FCRBars: number
        FCRRange: number
      }
      RightMFD: {
        SelectedPage: number
        Page1: number
        Page2: number
        Page3: number
        FCRMode: number | null
        FCRAzimuth: number
        FCRBars: number
        FCRRange: number
      }
      ToBeUpdated: boolean
    }>
  }
  HARM: {
    Tables: Array<{
      TableNumber: number
      ToBeUpdated: boolean
      Emitters: number[]
    }>
  } | null
  HTS: {
    ManualTableEnabled: boolean
    ManualEmitters: number[]
    ManualEmittersToBeUpdated: boolean
    EnabledClasses: boolean[]
    ManualTableEnabledToBeUpdated: boolean
  } | null
  Datalink: {
    EnableOwnCallsign: boolean
    OwnCallsign: string
    FlightLead: boolean
    EnableMembers: boolean
    OwnshipIndex: number
    Members: number[]
    TDOAMembers: boolean[]
    DatalinkMode: number
  } | null
  Misc: {
    Bingo: number
    BingoToBeUpdated: boolean
    BullseyeToBeUpdated: boolean
    BullseyeWP: number
    CARAALOW: number
    CARAALOWToBeUpdated: boolean
    MSLFloor: number
    MSLFloorToBeUpdated: boolean
    LaserSettingsToBeUpdated: boolean
    TGPCode: number
    LSTCode: number
    LaserStartTime: number
    TACANChannel: number
    TACANBand: number
    TACANToBeUpdated: boolean
    ILSFrequency: number
    ILSCourse: number
    ILSToBeUpdated: boolean
  }
  Version: number
  KneeboardNotes: null
}

/**
 * Utility type for making all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

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
  TAD?: Record<string, unknown>
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
 * Format a frequency to 2 decimal places
 * @param freq - Frequency as string or number (e.g., 123.475 becomes "123.48")
 * @returns Frequency string formatted to 2 decimal places
 */
function truncateFrequency(freq: string | number): string {
  const num = typeof freq === 'string' ? parseFloat(freq) : freq
  return num.toFixed(2)
}

/**
 * Convert CCIP reference point to DTC format
 * Returns null if the reference point is undefined or missing required data
 * @param point - The CCIP reference point to convert
 * @param convertToNM - If true, convert range from feet to nautical miles (for VIP/VRP). If false, keep in feet (for OA/PUP)
 */
function convertCCIPToDTC(
  point: CCIPReferencePoint | undefined,
  convertToNM: boolean = false,
): DTCReferencePoint | null {
  if (!point || point.bearing === undefined || point.distance === undefined) {
    return null
  }

  // Convert range: if NM, divide by 6076.12 and round to 0.1; otherwise keep in feet
  const range = convertToNM
    ? Math.round((point.distance / 6076.12) * 10) / 10 // Round to 0.1 NM
    : point.distance // Keep in feet

  return {
    Range: range,
    Bearing: point.bearing, // degrees
    Elevation: point.elevation ?? 0, // feet - default to 0 if not specified
  }
}

/**
 * Build radio configuration from mission radio defaults
 * @param mission - The mission object containing radio defaults
 * @param radioIndex - Radio index (0 for Radio1, 1 for Radio2, 2 for Radio3 if A-10C)
 * @returns Radio mode (1=Preset, 2=Manual), selected frequency, and selected preset
 */
function getRadioConfig(
  mission: Mission,
  radioIndex: number,
): {
  mode: number
  selectedFrequency: string
  selectedPreset: string
} {
  // Default frequencies based on radio type and aircraft
  // F-16C: Radio 1 (index 0) = UHF: 225.00-399.975 MHz, Radio 2 (index 1) = VHF: 108.00-155.975 MHz
  // A-10C: Radio 1 (index 0) = VHF AM: 30.00-87.975 MHz, Radio 2 (index 1) = UHF: 225.00-399.975 MHz, Radio 3 (index 2) = VHF FM: 30.00-76.00 MHz
  let defaultFrequency: string
  if (radioIndex === 0) {
    defaultFrequency = '225.00' // F-16 Radio1 (UHF) or could be VHF AM for A-10 (30.00)
  } else if (radioIndex === 1) {
    defaultFrequency = '108.00' // F-16 Radio2 (VHF) or UHF for A-10 (225.00)
  } else {
    defaultFrequency = '30.00' // A-10 Radio3 (VHF FM)
  }

  const radioDefault = mission.radioDefaults?.[radioIndex]

  if (!radioDefault) {
    // No radio default - default to preset mode with preset 1
    return {
      mode: 1, // Preset mode
      selectedFrequency: defaultFrequency,
      selectedPreset: '1',
    }
  }

  if (radioDefault.mode === 'preset') {
    return {
      mode: 1, // Preset mode
      selectedFrequency: defaultFrequency,
      selectedPreset: radioDefault.preset?.toString() || '1',
    }
  } else {
    // Manual mode
    return {
      mode: 2, // Manual/Frequency mode
      selectedFrequency: radioDefault.frequency || defaultFrequency,
      selectedPreset: '1',
    }
  }
}

/**
 * Export mission to DCS F-16C JSON MDC format
 * @param mission - The mission to export
 * @param crewMemberIndex - Index of the crew member (default: 0)
 * @param template - Optional squadron template to merge with mission data
 */
export function exportF16MDC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSF16MDC>,
): DCSF16MDC {
  // Convert waypoints to DCS format
  const waypoints = mission.waypoints.map((wp) => {
    // For blank steerpoints (all fields null), export as 0°N, 0°E
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : wp.latitude!
    const longitude = isBlank ? 0 : wp.longitude!
    const elevation = isBlank ? 0 : (wp.elevation ?? 0)

    const ccip = wp.ccip
    const refPointType = ccip?.referencePointType ?? 'None'
    const isVIP = refPointType === 'VIP'

    // Convert CCIP reference points to DTC format
    // VIP→X uses NM, TGT→X and OA use feet
    const oa1 = convertCCIPToDTC(ccip?.oa1, false)
    const oa2 = convertCCIPToDTC(ccip?.oa2, false)
    const vipToTgt = convertCCIPToDTC(ccip?.vip, true) // VIPtoTGT in NM
    const vipToPup = convertCCIPToDTC(ccip?.pup, true) // VIPtoPUP in NM
    const tgtToVrp = convertCCIPToDTC(ccip?.vrp, false) // TGTtoVRP in feet
    const tgtToPup = convertCCIPToDTC(ccip?.pup, false) // TGTtoPUP in feet

    // Determine which mode is active and ensure both reference point and PUP default to zeros if not provided
    const zeroPoint: DTCReferencePoint = { Range: 0.0, Bearing: 0.0, Elevation: 0.0 }
    const useVIP = isVIP && !!vipToTgt
    const useVRP = !isVIP && !!tgtToVrp

    return {
      Sequence: wp.sequence,
      Name: wp.name!,
      Latitude: formatF16LatLon(latitude, 'latitude'),
      Longitude: formatF16LatLon(longitude, 'longitude'),
      Elevation: elevation,
      TimeOverSteerpoint: wp.timeOnTarget || null,
      Target: wp.type === 'TGT',
      UseOA: !!(oa1 || oa2),
      OffsetAimpoint1: oa1 || zeroPoint,
      OffsetAimpoint2: oa2 || zeroPoint,
      UseVIP: useVIP,
      VIPtoTGT: useVIP ? vipToTgt || zeroPoint : null,
      VIPtoPUP: useVIP ? vipToPup || zeroPoint : null,
      UseVRP: useVRP,
      TGTtoVRP: useVRP ? tgtToVrp || zeroPoint : null,
      TGTtoPUP: useVRP ? tgtToPup || zeroPoint : null,
    }
  })

  // Get laser code and other data from selected crew member
  const selectedCrewMember = mission.crew[crewMemberIndex]!
  const laserCode = parseInt(selectedCrewMember.laser)

  // Parse TACAN from selected crew member's aaTcn (format: "10Y / 73Y")
  const tacanMatch = selectedCrewMember.aaTcn.match(/(\d+)([XY])/)!
  const tacanChannel = parseInt(tacanMatch[1]!)
  const tacanBand = tacanMatch[2] === 'Y' ? 1 : 0

  // Calculate Link16 callsign (e.g., "BR12" for prefix "BR", flight "1", position 2)
  const ownCallsign = getCrewMemberLink16Callsign(mission, crewMemberIndex)

  // Build datalink members array (up to 8 crew members)
  const members: number[] = []
  const tdoaMembers: boolean[] = []
  for (let i = 0; i < 8; i++) {
    if (i < mission.crew.length) {
      const crewMember = mission.crew[i]
      if (crewMember) {
        const stn = parseInt(crewMember.stn.replace(/\s/g, ''))
        members.push(stn)
        tdoaMembers.push(stn !== 0)
      } else {
        members.push(0)
        tdoaMembers.push(false)
      }
    } else {
      members.push(0)
      tdoaMembers.push(false)
    }
  }

  // Build radio presets for Radio1 and Radio2
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

  // Get radio configurations from comm ladders
  const radio1Config = getRadioConfig(mission, 0) // Radio 1 = UHF
  const radio2Config = getRadioConfig(mission, 1) // Radio 2 = VHF

  // Calculate MSL Floor and CARA ALOW from TOLD data (defaults to 500/5000 if not specified)
  const minAgl = mission.told?.minAgl ?? 500
  const minMsl = mission.told?.minMsl ?? 5000
  const hasCaraAlowData = mission.told?.minAgl !== undefined
  const hasMslFloorData = mission.told?.minMsl !== undefined

  // Get ILS data from recovery runway (defaults to 108.1 MHz / 0 degrees if not found)
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
      if (recoveryRunway && recoveryRunway.ils) {
        ilsFrequency = recoveryRunway.ils.frequency
        ilsCourse = recoveryRunway.heading
        ilsFound = true
      }
    }
  }

  // Default MFD configurations (can be expanded later)
  const mfdConfigurations = [
    {
      Mode: 1,
      LeftMFD: {
        SelectedPage: 1,
        Page1: 2,
        Page2: 1,
        Page3: 1,
        FCRMode: 1,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: 4,
        Page2: 3,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: 2,
      LeftMFD: {
        SelectedPage: 1,
        Page1: 2,
        Page2: 5,
        Page3: 1,
        FCRMode: 1,
        FCRAzimuth: 6,
        FCRBars: 2,
        FCRRange: 80,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: 4,
        Page2: 3,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: 3,
      LeftMFD: {
        SelectedPage: 1,
        Page1: 5,
        Page2: 6,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: 4,
        Page2: 3,
        Page3: 7,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: 4,
      LeftMFD: {
        SelectedPage: 1,
        Page1: 2,
        Page2: 5,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: 4,
        Page2: 3,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: 5,
      LeftMFD: {
        SelectedPage: 1,
        Page1: 2,
        Page2: 5,
        Page3: 1,
        FCRMode: 1,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: 4,
        Page2: 3,
        Page3: 1,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
  ]

  const missionData: DCSF16MDC = {
    Aircraft: 'F16C',
    Upload: {
      Waypoints: true,
      CMS: true,
      Radios: radio1Presets.length > 0 || radio2Presets.length > 0,
      MFDs: true,
      HARMHTS:
        (mission.harmTables && mission.harmTables.length > 0) ||
        mission.htsThreatData !== undefined,
      Datalink: mission.crew.length > 0,
      Misc: true,
      Kneeboard: false,
    },
    WaypointsCapture: null,
    Waypoints: {
      Waypoints: waypoints,
    },
    CMS: {
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
    MFD: {
      Configurations: mfdConfigurations,
    },
    HARM:
      mission.harmTables && mission.harmTables.length > 0
        ? {
            Tables: mission.harmTables.map((table) => ({
              TableNumber: table.tableNumber,
              ToBeUpdated: true,
              Emitters: table.emitters,
            })),
          }
        : null,
    HTS: mission.htsThreatData
      ? {
          ManualTableEnabled: mission.htsThreatData.manualTableEnabled,
          ManualEmitters: mission.htsThreatData.manualEmitters,
          ManualEmittersToBeUpdated: false,
          EnabledClasses: mission.htsThreatData.enabledClasses,
          ManualTableEnabledToBeUpdated: false,
        }
      : null,
    Datalink:
      mission.crew.length > 0
        ? {
            EnableOwnCallsign: true,
            OwnCallsign: ownCallsign,
            FlightLead: crewMemberIndex === 0,
            EnableMembers: true,
            OwnshipIndex: crewMemberIndex + 1,
            Members: members,
            TDOAMembers: tdoaMembers,
            DatalinkMode: 1, // TNDL
          }
        : null,
    Misc: {
      Bingo: mission.fuel.bingo,
      BingoToBeUpdated: true,
      BullseyeToBeUpdated: mission.bullseye ? true : false,
      BullseyeWP: mission.bullseye?.waypointNumber || 25,
      CARAALOW: minAgl,
      CARAALOWToBeUpdated: hasCaraAlowData,
      MSLFloor: minMsl,
      MSLFloorToBeUpdated: hasMslFloorData,
      LaserSettingsToBeUpdated: true,
      TGPCode: laserCode,
      LSTCode: laserCode,
      LaserStartTime: 8,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: true,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      ILSToBeUpdated: ilsFound,
    },
    Version: 2,
    KneeboardNotes: null,
  }

  // If template provided, merge template with mission data (mission data overwrites template)
  if (template) {
    return deepMerge(template as DCSF16MDC, missionData)
  }

  return missionData
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
      Lat: formatA10LatLon(latitude),
      Lon: formatA10LatLon(longitude),
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

/**
 * Download JSON MDC file
 */
export function downloadMDC(mission: Mission, crewMemberIndex: number = 0) {
  let json: string
  let filename: string

  const airframe = getMissionAirframe(mission)

  // Get crew member pilot name for filename
  const crewMember = mission.crew[crewMemberIndex]!
  const pilotSuffix = `_${crewMember.pilot.replace(/\s+/g, '_')}`

  // Load squadron template (with error handling for unknown squadrons)
  let template: DeepPartial<DCSF16MDC> | DeepPartial<JAFDTCA10MDC> | undefined
  try {
    template = loadTemplateForSquadron(mission.squadron)
  } catch (error) {
    // If template loading fails (e.g., unknown squadron), continue without template
    console.warn(
      `Failed to load template for squadron ${mission.squadron}, continuing without template:`,
      error,
    )
    template = undefined
  }

  switch (airframe) {
    case 'F-16C_50': {
      const mdc = exportF16MDC(mission, crewMemberIndex, template as DeepPartial<DCSF16MDC>)
      json = JSON.stringify(mdc, null, 2)
      filename = `${mission.name}${pilotSuffix}.jafdtc`
      break
    }
    case 'A-10C_2': {
      const mdc = exportA10MDC(mission, crewMemberIndex, template as DeepPartial<JAFDTCA10MDC>)
      json = JSON.stringify(mdc, null, 2)
      filename = `${mission.name}${pilotSuffix}.jafdtc`
      break
    }
    default:
      throw new Error(`MDC export not supported for airframe: ${airframe}`)
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
