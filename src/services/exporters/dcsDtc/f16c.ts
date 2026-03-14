// DCS-DTC exporter for F-16C
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { getCrewMemberLink16Callsign } from '@/utils/callsignHelpers'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DTCReferencePoint, DeepPartial } from '../helpers'
import { truncateFrequency, convertCCIPToDTC, getRadioConfig } from '../helpers'

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
      Latitude: formatDDM(latitude, 'latitude'),
      Longitude: formatDDM(longitude, 'longitude'),
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
        ilsFrequency = parseFloat(String(recoveryRunway.ils.frequency))
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
      Programs: mission.ecmCmds.cmdsPrograms.map((prog) => ({
        Number: prog.number - 1,
        FlareBurstQty: prog.flareBurstQty,
        FlareBurstInterval: prog.flareBurstInterval,
        FlareSalvoQty: prog.flareSalvoQty,
        FlareSalvoInterval: prog.flareSalvoInterval,
        ChaffBurstQty: prog.chaffBurstQty,
        ChaffBurstInterval: prog.chaffBurstInterval,
        ChaffSalvoQty: prog.chaffSalvoQty,
        ChaffSalvoInterval: prog.chaffSalvoInterval,
        ToBeUpdated: true,
      })),
      ChaffBingo: mission.ecmCmds.chaffBingo ?? 10,
      FlareBingo: mission.ecmCmds.flareBingo ?? 10,
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
