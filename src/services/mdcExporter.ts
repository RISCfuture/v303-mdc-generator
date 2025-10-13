// JSON MDC Exporter for DCS
// Generates MDC files compatible with the DCS MDC loader
import type { Mission } from '@/types'
import { formatF16LatLon, formatA10LatLon } from '@/utils/coordinates'
import { getMissionAirframe } from '@/utils/missionHelpers'

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
      OffsetAimpoint1: null
      OffsetAimpoint2: null
      UseVIP: boolean
      VIPtoTGT: null
      VIPtoPUP: null
      UseVRP: boolean
      TGTtoVRP: null
      TGTtoPUP: null
    }>
  }
  CMS: {
    Programs: Array<{
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
  HARM: null
  HTS: null
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

export interface JAFDTCA10MDC {
  DSMS: {
    LaserCode: string
    ProfileOrder: null
  }
  Misc: {
    TACANMode: string
    TACANBand: string
    TACANChannel: string
    IFFMasterMode: string
    IFFMode3Code: string
    IFFMode4On: string
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
  }
  TGP: {
    LaserCode: string
    LSS: string
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
 * Export mission to DCS F-16C JSON MDC format
 */
export function exportF16MDC(mission: Mission): DCSF16MDC {
  // Convert waypoints to DCS format
  const waypoints = mission.waypoints.map((wp) => ({
    Sequence: wp.sequence,
    Name: wp.name || `STPT ${wp.sequence}`,
    Latitude: wp.latitude !== null ? formatF16LatLon(wp.latitude, 'latitude') : "N 00°00.000'",
    Longitude: wp.longitude !== null ? formatF16LatLon(wp.longitude, 'longitude') : "E 000°00.000'",
    Elevation: wp.elevation || 0,
    TimeOverSteerpoint: wp.timeOnTarget || null,
    Target: wp.type === 'TGT',
    UseOA: false,
    OffsetAimpoint1: null,
    OffsetAimpoint2: null,
    UseVIP: false,
    VIPtoTGT: null,
    VIPtoPUP: null,
    UseVRP: false,
    TGTtoVRP: null,
    TGTtoPUP: null,
  }))

  // Get laser code from flight lead
  const flightLead = mission.crew[0]
  const laserCode = flightLead ? parseInt(flightLead.laser) : 1688

  // Parse TACAN from flight lead's aaTcn (format: "10Y / 73Y")
  let tacanChannel = 10
  let tacanBand = 1 // 1 = Y
  if (flightLead?.aaTcn) {
    const match = flightLead.aaTcn.match(/(\d+)([XY])/)
    if (match && match[1] && match[2]) {
      tacanChannel = parseInt(match[1])
      tacanBand = match[2] === 'Y' ? 1 : 0
    }
  }

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
      Frequency: preset.frequency,
    })) || []

  const radio2Presets =
    mission.radioPresets[1]?.map((preset) => ({
      Number: preset.number,
      Name: preset.description,
      Frequency: preset.frequency,
    })) || []

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

  return {
    Aircraft: 'F16C',
    Upload: {
      Waypoints: true,
      CMS: true,
      Radios: radio1Presets.length > 0 || radio2Presets.length > 0,
      MFDs: true,
      HARMHTS: false,
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
      })),
      ChaffBingo: mission.ecmCmds.chaffBingo,
      FlareBingo: mission.ecmCmds.flareBingo,
    },
    Radios:
      radio1Presets.length > 0 || radio2Presets.length > 0
        ? {
            Radio1: {
              Presets: radio1Presets,
              SelectedFrequency: '',
              SelectedPreset: '1',
              EnableGuard: false,
              Mode: 1, // Preset mode
            },
            Radio2: {
              Presets: radio2Presets,
              SelectedFrequency: '',
              SelectedPreset: '1',
              EnableGuard: false,
              Mode: 1, // Preset mode
            },
          }
        : null,
    MFD: {
      Configurations: mfdConfigurations,
    },
    HARM: null,
    HTS: null,
    Datalink:
      mission.crew.length > 0
        ? {
            EnableOwnCallsign: true,
            OwnCallsign: mission.flightCallsignOverride || 'FLT',
            FlightLead: true,
            EnableMembers: true,
            OwnshipIndex: 1,
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
      CARAALOW: 500,
      CARAALOWToBeUpdated: false,
      MSLFloor: 5000,
      MSLFloorToBeUpdated: false,
      LaserSettingsToBeUpdated: false,
      TGPCode: laserCode,
      LSTCode: laserCode,
      LaserStartTime: 8,
      TACANChannel: tacanChannel,
      TACANBand: tacanBand,
      TACANToBeUpdated: true,
      ILSFrequency: 108.1,
      ILSCourse: 0,
      ILSToBeUpdated: false,
    },
    Version: 2,
    KneeboardNotes: null,
  }
}

/**
 * Export mission to A-10C JAFDTC JSON format
 */
export function exportA10MDC(mission: Mission): JAFDTCA10MDC {
  // Get flight lead data
  const flightLead = mission.crew[0]
  const laserCode = flightLead ? flightLead.laser.replace(/\s/g, '') : '1688'
  const mode3Code = flightLead ? flightLead.mode3.replace(/\s/g, '') : '1200'

  // Parse TACAN from flight lead's aaTcn (format: "10Y / 73Y")
  let tacanChannel = '10'
  let tacanBand = '1' // 1 = Y
  if (flightLead?.aaTcn) {
    const match = flightLead.aaTcn.match(/(\d+)([XY])/)
    if (match && match[1] && match[2]) {
      tacanChannel = match[1]
      tacanBand = match[2] === 'Y' ? '1' : '0'
    }
  }

  // Convert waypoints to JAFDTC format
  const waypoints = mission.waypoints.map((wp) => ({
    Alt: wp.altitude?.toString() || '0',
    Number: wp.sequence,
    Name: wp.name || `STPT ${wp.sequence}`,
    Lat: wp.latitude !== null ? formatA10LatLon(wp.latitude) : '0.00000000',
    Lon: wp.longitude !== null ? formatA10LatLon(wp.longitude) : '0.00000000',
  }))

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

  return {
    DSMS: {
      LaserCode: laserCode,
      ProfileOrder: null,
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
      IsPresetMode: [true, true, true],
      DefaultSetting: ['1', '1', '1'],
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
}

/**
 * Download JSON MDC file
 */
export function downloadMDC(mission: Mission) {
  let json: string
  let filename: string

  const airframe = getMissionAirframe(mission)

  switch (airframe) {
    case 'F-16C_50': {
      const mdc = exportF16MDC(mission)
      json = JSON.stringify(mdc, null, 2)
      filename = `${mission.name || 'mission'}_F16_DTC.json`
      break
    }
    case 'A-10C_2': {
      const mdc = exportA10MDC(mission)
      json = JSON.stringify(mdc, null, 2)
      filename = `${mission.name || 'mission'}_A10_JAFDTC.json`
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

/**
 * Validate MDC export against JSON schema
 * Note: This is a placeholder for future implementation with a JSON schema validator library
 * For now, TypeScript type checking provides compile-time validation
 */
export function validateMDCExport(_mdc: DCSF16MDC | JAFDTCA10MDC, _airframe: string): boolean {
  // Type checking is done at compile time via TypeScript
  // Runtime validation could be added here with a library like Ajv
  // For now, we trust the TypeScript types and export functions
  return true
}
