// DCS-DTC exporter for F-16C
import type { Mission } from '@/types'
import { formatDDM } from './coordinates'
import { getCrewMemberLink16Callsign } from '@/utils/callsignHelpers'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DTCReferencePoint, DeepPartial } from '../helpers'
import { truncateFrequency, convertCCIPToDTC, getRadioConfig, parseTACAN } from '../helpers'
import {
  DEFAULT_BULLSEYE_WAYPOINT,
  DEFAULT_ILS_COURSE_DEG,
  DEFAULT_ILS_FREQUENCY_MHZ,
  DEFAULT_MIN_AGL_FEET,
  DEFAULT_MIN_MSL_FEET,
  F16_DATALINK_MODE,
  F16_DATALINK_TEAM_SIZE,
  F16_DCS_DTC_CMS_PROGRAM_COUNT,
  F16_DCS_DTC_FCR_MODE,
  F16_DCS_DTC_MASTER_MODE,
  F16_DCS_DTC_MFD_PAGE,
  LASER_START_TIME_SEC,
  TACAN_BAND_DCS_DTC,
} from '../constants'

export type DCSF16MDC = {
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
    Waypoints: {
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
    }[]
  }
  CMS: {
    Programs?: {
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
    }[]
    ChaffBingo: number
    FlareBingo: number
  }
  Radios: {
    Radio1: {
      Presets: {
        Number: number
        Name: string
        Frequency: string
      }[]
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
    Radio2: {
      Presets: {
        Number: number
        Name: string
        Frequency: string
      }[]
      SelectedFrequency: string
      SelectedPreset: string | null
      EnableGuard: boolean
      Mode: number
    }
  } | null
  MFD: {
    Configurations: {
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
    }[]
  }
  HARM: {
    Tables: {
      TableNumber: number
      ToBeUpdated: boolean
      Emitters: number[]
    }[]
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
  crewMemberIndex = 0,
  template?: DeepPartial<DCSF16MDC>,
): DCSF16MDC {
  // Convert waypoints to DCS format
  const waypoints = mission.waypoints.map((wp) => {
    // For blank steerpoints (all fields null), export as 0°N, 0°E
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : (wp.latitude ?? 0)
    const longitude = isBlank ? 0 : (wp.longitude ?? 0)
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
      Name: wp.name,
      Latitude: formatDDM(latitude, 'latitude'),
      Longitude: formatDDM(longitude, 'longitude'),
      Elevation: elevation,
      TimeOverSteerpoint: wp.timeOnTarget ?? null,
      Target: wp.type === 'TGT',
      UseOA: !!(oa1 ?? oa2),
      OffsetAimpoint1: oa1 ?? zeroPoint,
      OffsetAimpoint2: oa2 ?? zeroPoint,
      UseVIP: useVIP,
      VIPtoTGT: useVIP ? vipToTgt : null,
      VIPtoPUP: useVIP ? (vipToPup ?? zeroPoint) : null,
      UseVRP: useVRP,
      TGTtoVRP: useVRP ? tgtToVrp : null,
      TGTtoPUP: useVRP ? (tgtToPup ?? zeroPoint) : null,
    }
  })

  // Get laser code and other data from selected crew member
  const selectedCrewMember = mission.crew[crewMemberIndex]
  const laserCode = parseInt(selectedCrewMember.laser)

  // Parse TACAN from selected crew member's aaTcn (format: "10Y / 73Y")
  const tacan = parseTACAN(selectedCrewMember.aaTcn)
  const tacanChannel = tacan?.channel ?? 0
  const tacanBand = tacan ? TACAN_BAND_DCS_DTC[tacan.band] : TACAN_BAND_DCS_DTC.X

  // Calculate Link16 callsign (e.g., "BR12" for prefix "BR", flight "1", position 2)
  const ownCallsign = getCrewMemberLink16Callsign(mission, crewMemberIndex)

  // Build datalink members array, padded to the F-16 DLNK team size.
  const members: number[] = []
  const tdoaMembers: boolean[] = []
  for (let i = 0; i < F16_DATALINK_TEAM_SIZE; i++) {
    if (i < mission.crew.length) {
      const crewMember = mission.crew[i]
      const stn = parseInt(crewMember.stn.replace(/\s/g, ''))
      members.push(stn)
      tdoaMembers.push(stn !== 0)
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
    })) ?? []

  const radio2Presets =
    mission.radioPresets[1]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: truncateFrequency(preset.frequency),
    })) ?? []

  // Get radio configurations from comm ladders
  const radio1Config = getRadioConfig(mission, 0) // Radio 1 = UHF
  const radio2Config = getRadioConfig(mission, 1) // Radio 2 = VHF

  // CARA ALOW / MSL Floor from TOLD data, falling back to squadron defaults.
  const minAgl = mission.told.minAgl ?? DEFAULT_MIN_AGL_FEET
  const minMsl = mission.told.minMsl ?? DEFAULT_MIN_MSL_FEET
  const hasCaraAlowData = mission.told.minAgl !== undefined
  const hasMslFloorData = mission.told.minMsl !== undefined

  // ILS data from the recovery runway; defaults to 108.10 / 0° when missing.
  // ILSToBeUpdated is hardcoded false below, so this is informational only.
  let ilsFrequency = DEFAULT_ILS_FREQUENCY_MHZ
  let ilsCourse = DEFAULT_ILS_COURSE_DEG
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
        ilsFrequency = parseFloat(String(recoveryRunway.ils.frequency))
        ilsCourse = recoveryRunway.heading
      }
    }
  }

  // Squadron-default MFD layout per F-16 master mode.
  // FCRAzimuth/FCRBars/FCRRange are the radar's scan width / bar count / NM
  // range when FCRMode is set; null FCRMode disables radar config for that MFD.
  const mfdConfigurations = [
    {
      Mode: F16_DCS_DTC_MASTER_MODE.NAV,
      LeftMFD: {
        SelectedPage: 1,
        Page1: F16_DCS_DTC_MFD_PAGE.FCR,
        Page2: F16_DCS_DTC_MFD_PAGE.BLANK,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: F16_DCS_DTC_FCR_MODE.RWS,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: F16_DCS_DTC_MFD_PAGE.SMS,
        Page2: F16_DCS_DTC_MFD_PAGE.HSD,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: F16_DCS_DTC_MASTER_MODE.AA,
      LeftMFD: {
        SelectedPage: 1,
        Page1: F16_DCS_DTC_MFD_PAGE.FCR,
        Page2: F16_DCS_DTC_MFD_PAGE.TGP,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: F16_DCS_DTC_FCR_MODE.RWS,
        FCRAzimuth: 6,
        FCRBars: 2,
        FCRRange: 80,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: F16_DCS_DTC_MFD_PAGE.SMS,
        Page2: F16_DCS_DTC_MFD_PAGE.HSD,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: F16_DCS_DTC_MASTER_MODE.AG,
      LeftMFD: {
        SelectedPage: 1,
        Page1: F16_DCS_DTC_MFD_PAGE.TGP,
        Page2: F16_DCS_DTC_MFD_PAGE.WPN,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: F16_DCS_DTC_MFD_PAGE.SMS,
        Page2: F16_DCS_DTC_MFD_PAGE.HSD,
        Page3: F16_DCS_DTC_MFD_PAGE.HAD,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: F16_DCS_DTC_MASTER_MODE.DGFT,
      LeftMFD: {
        SelectedPage: 1,
        Page1: F16_DCS_DTC_MFD_PAGE.FCR,
        Page2: F16_DCS_DTC_MFD_PAGE.TGP,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: F16_DCS_DTC_MFD_PAGE.SMS,
        Page2: F16_DCS_DTC_MFD_PAGE.HSD,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: null,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      ToBeUpdated: true,
    },
    {
      Mode: F16_DCS_DTC_MASTER_MODE.MSL,
      LeftMFD: {
        SelectedPage: 1,
        Page1: F16_DCS_DTC_MFD_PAGE.FCR,
        Page2: F16_DCS_DTC_MFD_PAGE.TGP,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
        FCRMode: F16_DCS_DTC_FCR_MODE.RWS,
        FCRAzimuth: 6,
        FCRBars: 4,
        FCRRange: 40,
      },
      RightMFD: {
        SelectedPage: 2,
        Page1: F16_DCS_DTC_MFD_PAGE.SMS,
        Page2: F16_DCS_DTC_MFD_PAGE.HSD,
        Page3: F16_DCS_DTC_MFD_PAGE.BLANK,
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
      // Radios/Datalink default OFF: squadron pulls preset frequencies from
      // the server miz and sets DLNK STNs manually. The user can re-check
      // these in DCS-DTC if they actually want them uploaded.
      Radios: false,
      MFDs: true,
      HARMHTS:
        (mission.harmTables !== undefined && mission.harmTables.length > 0) ||
        mission.htsThreatData !== undefined,
      Datalink: false,
      Misc: true,
      Kneeboard: false,
    },
    WaypointsCapture: null,
    Waypoints: {
      Waypoints: waypoints,
    },
    // Always emit all 6 programs (MAN1-4, PANIC, BYPASS). Upstream
    // CMSSystem.AfterLoadFromJson only resizes 5→6, so a shorter array
    // leaves PROG2-N hidden in the GUI and untouched on upload.
    CMS: {
      Programs: Array.from({ length: F16_DCS_DTC_CMS_PROGRAM_COUNT }, (_, i) => {
        const prog = mission.ecmCmds.cmdsPrograms.find((p) => p.number - 1 === i)
        if (prog) {
          return {
            Number: prog.number,
            FlareBurstQty: prog.flareBurstQty,
            FlareBurstInterval: prog.flareBurstInterval,
            FlareSalvoQty: prog.flareSalvoQty,
            FlareSalvoInterval: prog.flareSalvoInterval,
            ChaffBurstQty: prog.chaffBurstQty,
            ChaffBurstInterval: prog.chaffBurstInterval,
            ChaffSalvoQty: prog.chaffSalvoQty,
            ChaffSalvoInterval: prog.chaffSalvoInterval,
            ToBeUpdated: true,
          }
        }
        return {
          Number: i + 1,
          FlareBurstQty: 0,
          FlareBurstInterval: 0,
          FlareSalvoQty: 0,
          FlareSalvoInterval: 0,
          ChaffBurstQty: 0,
          ChaffBurstInterval: 0,
          ChaffSalvoQty: 0,
          ChaffSalvoInterval: 0,
          ToBeUpdated: false,
        }
      }),
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
            DatalinkMode: F16_DATALINK_MODE.TNDL,
          }
        : null,
    Misc: {
      Bingo: mission.fuel.bingo,
      BingoToBeUpdated: true,
      BullseyeToBeUpdated: Boolean(mission.bullseye),
      BullseyeWP: mission.bullseye?.waypointNumber ?? DEFAULT_BULLSEYE_WAYPOINT,
      CARAALOW: minAgl,
      CARAALOWToBeUpdated: hasCaraAlowData,
      MSLFloor: minMsl,
      MSLFloorToBeUpdated: hasMslFloorData,
      // Laser/TACAN/ILS default OFF: squadron either sets these in the miz
      // or doesn't want DCS-DTC overwriting jet state. The user can re-check
      // any of these in DCS-DTC's Misc page if they want them uploaded.
      LaserSettingsToBeUpdated: false,
      TGPCode: laserCode,
      LSTCode: laserCode,
      LaserStartTime: LASER_START_TIME_SEC,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: false,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
      ILSToBeUpdated: false,
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
