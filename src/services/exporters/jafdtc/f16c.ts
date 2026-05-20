// JAFDTC exporter for F-16C
import type { Mission } from '@/types'
import { formatDecimalDegrees } from './coordinates'
import { getCrewMemberLink16Callsign } from '@/utils/callsignHelpers'
import { deepMerge } from '@/utils/deepMerge'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { DeepPartial } from '../helpers'
import { truncateFrequency, getRadioConfig, parseTACAN, pickDefaultTuning } from '../helpers'
import {
  DEFAULT_BULLSEYE_WAYPOINT,
  DEFAULT_ILS_FREQUENCY_MHZ,
  DEFAULT_MIN_AGL_FEET,
  DEFAULT_MIN_MSL_FEET,
  F16_DATALINK_TEAM_SIZE,
  F16_JAFDTC_CMDS_PROGRAM_COUNT,
  F16_JAFDTC_MISSION_SLOT_COUNT,
  FEET_PER_NAUTICAL_MILE,
  JAFDTC_AIRFRAME,
  JAFDTC_VXP_TYPE,
  LASER_START_TIME_SEC,
  TACAN_BAND_JAFDTC_AIRCRAFT,
  TACAN_MODE_JAFDTC_F16,
} from '../constants'

/**
 * JAFDTC format for F-16C
 */
export type JAFDTCF16MDC = {
  CMDS: {
    Programs: {
      Number: number
      Chaff: { BQ: string; BI: string; SQ: string; SI: string }
      Flare: { BQ: string; BI: string; SQ: string; SI: string }
    }[]
    BingoChaff: string
    BingoFlare: string
  }
  DLNK: {
    Ownship: string
    TeamMembers: {
      TDOA: boolean
      TNDL: string
      DriverUID: string
    }[]
    IsLinkedMission: boolean
    IsOwnshipLead: boolean
    OwnshipCallsign: string
    OwnshipFENumber: string
    IsFillEmptyTNDL: boolean
    FillEmptyTNDL: string
  } | null
  HARM: {
    Tables: {
      Number: number
      Table: { Code: string }[]
    }[]
  } | null
  HTS: {
    MANTable: { Code: string }[]
    EnabledThreats: boolean[]
  } | null
  MFD: {
    ModeConfigs: {
      LeftMFD: { OSB14: string; OSB13: string; OSB12: string; SelectedOSB: string }
      RightMFD: { OSB14: string; OSB13: string; OSB12: string; SelectedOSB: string }
    }[]
  }
  Misc: {
    Bingo: string
    BullseyeWP: string
    BullseyeMode: string
    ALOWCARAALOW: string
    ALOWMSLFloor: string
    LaserTGPCode: string
    LaserLSTCode: string
    LaserStartTime: string
    TACANChannel: string
    TACANBand: string
    TACANMode: string
    ILSFrequency: string
    ILSCourse: string
    HMCSBlankHUD?: string
    HMCSBlankCockpit?: string
    HMCSDisplayRWR?: string
    HMCSDeclutterLvl?: string
    HMCSIntensity?: string
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
  SMS?: Record<string, unknown>
  STPT: {
    Points: {
      OAP: { Type: number; Range: string; Brng: string; Elev: string }[]
      VxP: { Type: number; Range: string; Brng: string; Elev: string }[]
      Alt: string
      TOS: string
      Number: number
      Name: string
      Lat: string
      Lon: string
    }[]
  }
  DTE: Record<string, unknown>
  Kboard: Record<string, unknown>
  Mission: {
    Name: string
    Callsign: string
    Ships: number
    Tasking: string
    PilotUIDs: (string | null)[]
    Loadouts: (string | null)[]
    Threats: unknown[]
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
 * Summarize loadout as a compact string (e.g., "2xGBU-12 1xAIM-9X")
 */
function summarizeLoadout(
  loadout: { station: number | string; item: string; quantity?: number }[],
): string {
  const counts = new Map<string, number>()
  for (const s of loadout) {
    if (!s.item || s.item === 'EMPTY') continue
    counts.set(s.item, (counts.get(s.item) ?? 0) + (s.quantity ?? 1))
  }
  return Array.from(counts.entries())
    .map(([item, qty]) => `${qty}x${item}`)
    .join(' ')
}

/**
 * Export mission to F-16C JAFDTC (.jafdtc) format
 */
export function exportF16JAFDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<JAFDTCF16MDC>,
): JAFDTCF16MDC {
  const selectedCrewMember = mission.crew[crewMemberIndex]
  const laserCode = selectedCrewMember.laser.replace(/\s/g, '')

  // Parse TACAN
  const tacan = parseTACAN(selectedCrewMember.aaTcn)
  const tacanChannel = String(tacan?.channel ?? 0)
  const tacanBand = tacan ? TACAN_BAND_JAFDTC_AIRCRAFT[tacan.band] : TACAN_BAND_JAFDTC_AIRCRAFT.Y

  // F16_JAFDTC_CMDS_PROGRAM_COUNT entries: MAN1-4, PANIC, BYPASS.
  const defaultCmdsEntry = {
    BQ: '1',
    BI: '0.020',
    SQ: '1',
    SI: '0.50',
  }
  const cmdsPrograms = Array.from({ length: F16_JAFDTC_CMDS_PROGRAM_COUNT }, (_, i) => {
    const prog = mission.ecmCmds.cmdsPrograms.find((p) => p.number - 1 === i)
    if (prog) {
      return {
        Number: i,
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
      }
    }
    return {
      Number: i,
      Chaff: { ...defaultCmdsEntry },
      Flare: { ...defaultCmdsEntry },
    }
  })

  // Build datalink
  const ownCallsign = getCrewMemberLink16Callsign(mission, crewMemberIndex)
  // Extract 2-letter prefix and FE number from callsign like "VR11" -> prefix "VR", FE "11"
  const callsignPrefix = mission.link16PrefixOverride ?? ''
  const feNumber = ownCallsign.slice(callsignPrefix.length)

  let dlnk: JAFDTCF16MDC['DLNK'] = null
  if (mission.crew.length > 0) {
    const teamMembers = []
    for (let i = 0; i < F16_DATALINK_TEAM_SIZE; i++) {
      if (i < mission.crew.length) {
        const crew = mission.crew[i]
        const stn = crew.stn.replace(/\s/g, '')
        teamMembers.push({
          TDOA: stn !== '' && stn !== '0',
          TNDL: stn,
          DriverUID: '',
        })
      } else {
        teamMembers.push({ TDOA: false, TNDL: '', DriverUID: '' })
      }
    }
    dlnk = {
      Ownship: (crewMemberIndex + 1).toString(),
      TeamMembers: teamMembers,
      IsLinkedMission: false,
      IsOwnshipLead: crewMemberIndex === 0,
      OwnshipCallsign: callsignPrefix,
      OwnshipFENumber: feNumber,
      IsFillEmptyTNDL: false,
      FillEmptyTNDL: '',
    }
  }

  // Build HARM tables
  let harm: JAFDTCF16MDC['HARM'] = null
  if (mission.harmTables && mission.harmTables.length > 0) {
    harm = {
      Tables: mission.harmTables.map((table) => ({
        Number: table.tableNumber - 1, // JAFDTC uses 0-based
        Table: table.emitters.map((code) => ({ Code: code.toString() })),
      })),
    }
  }

  // Build HTS
  let hts: JAFDTCF16MDC['HTS'] = null
  if (mission.htsThreatData) {
    hts = {
      MANTable: mission.htsThreatData.manualEmitters.map((code) => ({ Code: code.toString() })),
      EnabledThreats: mission.htsThreatData.enabledClasses,
    }
  }

  // Build steerpoints
  const stptPoints = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : (wp.latitude ?? 0)
    const longitude = isBlank ? 0 : (wp.longitude ?? 0)
    const altitude = isBlank ? 0 : (wp.altitude ?? 0)

    const ccip = wp.ccip
    // Build OAP array (2 entries)
    const oap = [
      ccip?.oa1
        ? {
            Type: JAFDTC_VXP_TYPE.OAP,
            Range: (ccip.oa1.distance ?? 0).toString(),
            Brng: (ccip.oa1.bearing ?? 0).toFixed(1),
            Elev: (ccip.oa1.elevation ?? 0).toString(),
          }
        : { Type: JAFDTC_VXP_TYPE.NONE, Range: '', Brng: '', Elev: '' },
      ccip?.oa2
        ? {
            Type: JAFDTC_VXP_TYPE.OAP,
            Range: (ccip.oa2.distance ?? 0).toString(),
            Brng: (ccip.oa2.bearing ?? 0).toFixed(1),
            Elev: (ccip.oa2.elevation ?? 0).toString(),
          }
        : { Type: JAFDTC_VXP_TYPE.NONE, Range: '', Brng: '', Elev: '' },
    ]

    // VxP array: VIP→TGT/PUP or TGT→VRP/PUP, depending on reference type.
    const refType = ccip?.referencePointType
    const vxpTypeByRef: Record<string, number> = {
      VIP: JAFDTC_VXP_TYPE.VIP,
      VRP: JAFDTC_VXP_TYPE.VRP,
    }
    const vxpType = (refType && vxpTypeByRef[refType]) ?? JAFDTC_VXP_TYPE.NONE
    const mainRef = refType === 'VIP' ? ccip?.vip : refType === 'VRP' ? ccip?.vrp : undefined
    const vxp = [
      mainRef
        ? {
            Type: vxpType,
            Range:
              refType === 'VIP'
                ? (
                    Math.round(((mainRef.distance ?? 0) / FEET_PER_NAUTICAL_MILE) * 10) / 10
                  ).toFixed(1)
                : (mainRef.distance ?? 0).toString(),
            Brng: (mainRef.bearing ?? 0).toFixed(1),
            Elev: (mainRef.elevation ?? 0).toString(),
          }
        : { Type: JAFDTC_VXP_TYPE.NONE, Range: '', Brng: '', Elev: '' },
      ccip?.pup
        ? {
            Type: vxpType,
            Range:
              refType === 'VIP'
                ? (
                    Math.round(((ccip.pup.distance ?? 0) / FEET_PER_NAUTICAL_MILE) * 10) / 10
                  ).toFixed(1)
                : (ccip.pup.distance ?? 0).toString(),
            Brng: (ccip.pup.bearing ?? 0).toFixed(1),
            Elev: (ccip.pup.elevation ?? 0).toString(),
          }
        : { Type: JAFDTC_VXP_TYPE.NONE, Range: '', Brng: '', Elev: '' },
    ]

    return {
      OAP: oap,
      VxP: vxp,
      Alt: altitude.toString(),
      TOS: wp.timeOnTarget ?? '',
      Number: wp.sequence,
      Name: wp.name,
      Lat: formatDecimalDegrees(latitude),
      Lon: formatDecimalDegrees(longitude),
    }
  })

  // Build radio presets (2 radios for F-16C)
  const radioPresets: {
    Preset: number
    Frequency: string
    Modulation: string
    Description: string
  }[][] = []

  // Radio 1 (UHF COM1)
  radioPresets.push(
    mission.radioPresets[0]?.map((preset) => ({
      Preset: preset.number,
      Frequency: truncateFrequency(preset.frequency),
      Modulation: '',
      Description: preset.description,
    })) ?? [],
  )

  // Radio 2 (VHF COM2)
  radioPresets.push(
    mission.radioPresets[1]?.map((preset) => ({
      Preset: preset.number,
      Frequency: truncateFrequency(preset.frequency),
      Modulation: '',
      Description: preset.description,
    })) ?? [],
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
  const minMsl = mission.told.minMsl ?? DEFAULT_MIN_MSL_FEET

  const uid = crypto.randomUUID()
  const filename = mission.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')

  const missionData: JAFDTCF16MDC = {
    CMDS: {
      Programs: cmdsPrograms,
      BingoChaff: (mission.ecmCmds.chaffBingo ?? 10).toString(),
      BingoFlare: (mission.ecmCmds.flareBingo ?? 10).toString(),
    },
    DLNK: dlnk,
    HARM: harm,
    HTS: hts,
    MFD: {
      ModeConfigs: [
        {
          LeftMFD: { OSB14: '2', OSB13: '', OSB12: '', SelectedOSB: '14' },
          RightMFD: { OSB14: '6', OSB13: '5', OSB12: '', SelectedOSB: '13' },
        },
        {
          LeftMFD: { OSB14: '2', OSB13: '8', OSB12: '', SelectedOSB: '14' },
          RightMFD: { OSB14: '6', OSB13: '5', OSB12: '', SelectedOSB: '13' },
        },
        {
          LeftMFD: { OSB14: '8', OSB13: '9', OSB12: '', SelectedOSB: '14' },
          RightMFD: { OSB14: '6', OSB13: '5', OSB12: '4', SelectedOSB: '13' },
        },
        {
          LeftMFD: { OSB14: '2', OSB13: '8', OSB12: '', SelectedOSB: '14' },
          RightMFD: { OSB14: '6', OSB13: '5', OSB12: '', SelectedOSB: '13' },
        },
        {
          LeftMFD: { OSB14: '2', OSB13: '8', OSB12: '', SelectedOSB: '14' },
          RightMFD: { OSB14: '6', OSB13: '5', OSB12: '', SelectedOSB: '13' },
        },
      ],
    },
    Misc: {
      Bingo: mission.fuel.bingo.toString(),
      BullseyeWP: (mission.bullseye?.waypointNumber ?? DEFAULT_BULLSEYE_WAYPOINT).toString(),
      BullseyeMode: mission.bullseye ? 'True' : 'False',
      ALOWCARAALOW: minAgl.toString(),
      ALOWMSLFloor: minMsl.toString(),
      LaserTGPCode: laserCode,
      LaserLSTCode: laserCode,
      LaserStartTime: LASER_START_TIME_SEC.toString(),
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANMode: TACAN_MODE_JAFDTC_F16.TR,
      ILSFrequency: ilsFrequency,
      ILSCourse: ilsCourse,
    },
    Radio: {
      IsCOMM1MonitorGuard: true,
      COMM1DefaultTuning: pickDefaultTuning(radio1Config),
      COMM2DefaultTuning: pickDefaultTuning(radio2Config),
      IsDefault: false,
      Presets: radioPresets,
    },
    STPT: {
      Points: stptPoints,
    },
    DTE: {
      Template: '',
      OutputPath: '',
      MergedSystemTags: [],
      EnableRebuild: 'False',
      EnableLoad: 'False',
    },
    Kboard: {
      Template: '',
      OutputPath: '',
      KneeboardTags: [],
      EnableRebuild: 'False',
      EnableNight: 'False',
      EnableSVG: 'False',
    },
    Mission: {
      Name: mission.name,
      Callsign: mission.flightCallsignOverride ?? mission.callsign,
      Ships: mission.crew.length,
      Tasking: mission.type,
      PilotUIDs: Array.from({ length: F16_JAFDTC_MISSION_SLOT_COUNT }, () => null),
      Loadouts: (() => {
        const summary = summarizeLoadout(mission.loadout)
        return Array.from({ length: F16_JAFDTC_MISSION_SLOT_COUNT }, (_, i) =>
          i < mission.crew.length ? summary : null,
        )
      })(),
      Threats: [],
    },
    Version: 'F16C-1.1',
    Airframe: JAFDTC_AIRFRAME.F16C,
    UID: uid,
    Filename: filename,
    LinkedSysMap: {},
    LastSystemEdited: 0,
    IsFavorite: false,
    Name: mission.name,
  }

  if (template) {
    return deepMerge(template as JAFDTCF16MDC, missionData)
  }
  return missionData
}
