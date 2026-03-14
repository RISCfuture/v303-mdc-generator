// DCS Mission Editor exporter for F-16C
import type { Mission } from '@/types'
import { deepMerge } from '@/utils/deepMerge'
import { latLonToDCS, isTheaterProjectionSupported } from '@/utils/dcsProjection'
import type { DeepPartial } from '../helpers'

/**
 * DCS Mission Editor format for F-16C (.dtc)
 */
export interface DCSMissionEditorDTC {
  data: {
    COMM: {
      COMM1: Record<string, { freq: number; modulation: number }>
      COMM2: Record<string, { freq: number; modulation: number }>
      mirror_COMM1: boolean
      mirror_COMM2: boolean
    }
    ELINT: Record<string, unknown>
    MPD: {
      CMDS: {
        CMDSBingoSettings: {
          BINGO: boolean
          ChaffNum: number
          FDBK: boolean
          FlaresNum: number
          Other1Num: number
          Other2Num: number
          REQCTR: boolean
        }
        CMDSProgramSettings: Record<
          string,
          {
            Chaff: {
              BurstInterval: number
              BurstQuantity: number
              SalvoInterval: number
              SalvoQuantity: number
            }
            Flare: {
              BurstInterval: number
              BurstQuantity: number
              SalvoInterval: number
              SalvoQuantity: number
            }
            Other1: {
              BurstInterval: number
              BurstQuantity: number
              SalvoInterval: number
              SalvoQuantity: number
            }
            Other2: {
              BurstInterval: number
              BurstQuantity: number
              SalvoInterval: number
              SalvoQuantity: number
            }
          }
        >
        CMDSPrograms?: Record<string, unknown>
      }
      mirror_NAV_PTS: boolean
      NAV_PTS: Array<{
        alt: number
        altitudeType: number
        FIX_Time: boolean
        id: string
        idOA1: string
        idOA1_Line: string
        idOA2: string
        idOA2_Line: string
        isOAP_1: boolean
        isOAP_2: boolean
        isTOSEnabled: boolean
        note: string
        number: number
        OAP_1_Alt: number
        OAP_1_Bearing: number
        OAP_1_DeltaX: number
        OAP_1_DeltaY: number
        OAP_1_Range: number
        OAP_1_X: number
        OAP_1_Y: number
        OAP_2_Alt: number
        OAP_2_Bearing: number
        OAP_2_DeltaX: number
        OAP_2_DeltaY: number
        OAP_2_Range: number
        OAP_2_X: number
        OAP_2_Y: number
        R1: boolean
        R2: boolean
        R3: boolean
        routeAltitude: number
        speed: number
        TOS: number
        type: string
        velocityType: number
        x: number
        y: number
      }>
      terrain: string
    }
    name: string
    terrain: string
    type: string
  }
  name: string
  type: string
}

/**
 * Convert a TOS string like "12:34:56" to total seconds from midnight
 */
function tosToSeconds(tos: string | undefined): number {
  if (!tos) return -1
  const parts = tos.match(/^(\d{1,2}):(\d{2}):?(\d{2})?/)
  if (!parts) return -1
  const hours = parseInt(parts[1]!)
  const minutes = parseInt(parts[2]!)
  const seconds = parseInt(parts[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Map waypoint type to DCS Mission Editor type string
 */
function mapWaypointType(type?: string): string {
  switch (type) {
    case 'IP':
      return 'IP'
    case 'TGT':
      return 'TGT'
    default:
      return 'STPT'
  }
}

/**
 * Export mission to F-16C DCS Mission Editor (.dtc) format
 */
export function exportF16DCSME(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSMissionEditorDTC>,
): DCSMissionEditorDTC {
  if (!isTheaterProjectionSupported(mission.theater)) {
    throw new Error(`DCS ME export not supported for theater: ${mission.theater}`)
  }

  // Suppress unused variable warning
  void crewMemberIndex

  // Build COMM channels from radio presets
  const comm1: Record<string, { freq: number; modulation: number }> = {}
  mission.radioPresets[0]?.forEach((preset) => {
    comm1[`Channel_${preset.number}`] = {
      freq: parseFloat(preset.frequency),
      modulation: 1, // AM
    }
  })

  const comm2: Record<string, { freq: number; modulation: number }> = {}
  mission.radioPresets[1]?.forEach((preset) => {
    comm2[`Channel_${preset.number}`] = {
      freq: parseFloat(preset.frequency),
      modulation: 1, // AM
    }
  })

  // Build NAV_PTS from waypoints
  const navPts = mission.waypoints.map((wp) => {
    const isBlank =
      wp.latitude === null && wp.longitude === null && wp.altitude === null && !wp.speed
    const latitude = isBlank ? 0 : wp.latitude!
    const longitude = isBlank ? 0 : wp.longitude!
    const elevation = isBlank ? 0 : (wp.elevation ?? 0)
    const altitude = isBlank ? 0 : (wp.altitude ?? 0)

    const dcsCoords = latLonToDCS(latitude, longitude, mission.theater) || { x: 0, y: 0 }
    const tos = tosToSeconds(wp.timeOnTarget)
    const stptType = mapWaypointType(wp.type)
    const seq = wp.sequence

    // OAP data
    const ccip = wp.ccip
    const hasOA1 = !!(ccip?.oa1?.bearing !== undefined && ccip?.oa1?.distance !== undefined)
    const hasOA2 = !!(ccip?.oa2?.bearing !== undefined && ccip?.oa2?.distance !== undefined)

    // For OAP, calculate DCS x,y and deltas
    let oa1X = 0,
      oa1Y = 0,
      oa1DeltaX = 0,
      oa1DeltaY = 0,
      oa1Range = 0,
      oa1Bearing = 0,
      oa1Alt = 0
    let oa2X = 0,
      oa2Y = 0,
      oa2DeltaX = 0,
      oa2DeltaY = 0,
      oa2Range = 0,
      oa2Bearing = 0,
      oa2Alt = 0

    if (hasOA1 && ccip?.oa1) {
      // Calculate OA point position from bearing/distance relative to steerpoint
      const bearingRad = ((ccip.oa1.bearing ?? 0) * Math.PI) / 180
      const distMeters = (ccip.oa1.distance ?? 0) * 0.3048 // feet to meters
      oa1DeltaX = distMeters * Math.cos(bearingRad)
      oa1DeltaY = distMeters * Math.sin(bearingRad)
      oa1X = dcsCoords.x + oa1DeltaX
      oa1Y = dcsCoords.y + oa1DeltaY
      oa1Range = distMeters
      oa1Bearing = (ccip.oa1.bearing ?? 0) * (Math.PI / 180) // radians
      oa1Alt = elevation + (ccip.oa1.elevation ?? 0)
    }
    if (hasOA2 && ccip?.oa2) {
      const bearingRad = ((ccip.oa2.bearing ?? 0) * Math.PI) / 180
      const distMeters = (ccip.oa2.distance ?? 0) * 0.3048
      oa2DeltaX = distMeters * Math.cos(bearingRad)
      oa2DeltaY = distMeters * Math.sin(bearingRad)
      oa2X = dcsCoords.x + oa2DeltaX
      oa2Y = dcsCoords.y + oa2DeltaY
      oa2Range = distMeters
      oa2Bearing = (ccip.oa2.bearing ?? 0) * (Math.PI / 180)
      oa2Alt = elevation + (ccip.oa2.elevation ?? 0)
    }

    return {
      alt: elevation,
      altitudeType: 1,
      FIX_Time: tos >= 0,
      id: `STPT${seq}`,
      idOA1: `OA1${seq}`,
      idOA1_Line: `OA1${seq}Line`,
      idOA2: `OA2${seq}`,
      idOA2_Line: `OA2${seq}Line`,
      isOAP_1: hasOA1,
      isOAP_2: hasOA2,
      isTOSEnabled: tos >= 0,
      note: wp.name ?? '',
      number: seq,
      OAP_1_Alt: oa1Alt,
      OAP_1_Bearing: oa1Bearing,
      OAP_1_DeltaX: oa1DeltaX,
      OAP_1_DeltaY: oa1DeltaY,
      OAP_1_Range: oa1Range,
      OAP_1_X: oa1X,
      OAP_1_Y: oa1Y,
      OAP_2_Alt: oa2Alt,
      OAP_2_Bearing: oa2Bearing,
      OAP_2_DeltaX: oa2DeltaX,
      OAP_2_DeltaY: oa2DeltaY,
      OAP_2_Range: oa2Range,
      OAP_2_X: oa2X,
      OAP_2_Y: oa2Y,
      R1: false,
      R2: false,
      R3: false,
      routeAltitude: altitude,
      speed: wp.speed ?? 0,
      TOS: tos,
      type: stptType,
      velocityType: 3,
      x: dcsCoords.x,
      y: dcsCoords.y,
    }
  })

  // Build CMDS from ecmCmds
  const cmdsPrograms: Record<string, unknown> = {}
  const zeroCM = {
    BurstInterval: 0.02,
    BurstQuantity: 0,
    SalvoInterval: 0.5,
    SalvoQuantity: 0,
  }
  const programNames = ['MAN1', 'MAN2', 'MAN3', 'MAN4', 'MAN5', 'MAN6']
  for (const prog of mission.ecmCmds.cmdsPrograms) {
    const progName = programNames[prog.number - 1] || `MAN${prog.number}`
    cmdsPrograms[progName] = {
      Chaff: {
        BurstInterval: prog.chaffBurstInterval,
        BurstQuantity: prog.chaffBurstQty,
        SalvoInterval: prog.chaffSalvoInterval,
        SalvoQuantity: prog.chaffSalvoQty,
      },
      Flare: {
        BurstInterval: prog.flareBurstInterval,
        BurstQuantity: prog.flareBurstQty,
        SalvoInterval: prog.flareSalvoInterval,
        SalvoQuantity: prog.flareSalvoQty,
      },
      Other1: zeroCM,
      Other2: zeroCM,
    }
  }

  const missionData: DCSMissionEditorDTC = {
    data: {
      COMM: {
        COMM1: comm1,
        COMM2: comm2,
        mirror_COMM1: false,
        mirror_COMM2: false,
      },
      ELINT: {},
      MPD: {
        CMDS: {
          CMDSBingoSettings: {
            BINGO: true,
            ChaffNum: mission.ecmCmds.chaffBingo,
            FDBK: true,
            FlaresNum: mission.ecmCmds.flareBingo,
            Other1Num: 1,
            Other2Num: 1,
            REQCTR: false,
          },
          CMDSProgramSettings:
            cmdsPrograms as DCSMissionEditorDTC['data']['MPD']['CMDS']['CMDSProgramSettings'],
        },
        mirror_NAV_PTS: false,
        NAV_PTS: navPts,
        terrain: mission.theater,
      },
      name: mission.name,
      terrain: mission.theater,
      type: 'F-16C_50',
    },
    name: mission.name,
    type: 'F-16C_50',
  }

  if (template) {
    return deepMerge(template as DCSMissionEditorDTC, missionData)
  }
  return missionData
}
