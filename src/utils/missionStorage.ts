/**
 * Mission storage format
 * Stores only references to crew data and essential mission information
 * This significantly reduces localStorage usage by not duplicating static data
 */

import type {
  Mission,
  CrewMember,
  Waypoint,
  RadioPreset,
  CMDSProgram,
  ECMCMDSProfiles,
  Theater,
  Squadron,
  F16CalculatorParams,
  A10CalculatorParams,
} from '@/types'
import { getMissionAirframe } from '@/utils/missionHelpers'
import { crewDatabase } from '@/data/crew'
import { getDefaultRadioPresets } from '@/data/channelization'
import { formatSTN, formatMode3, formatLaserCode } from '@/utils/crewFormatting'
import { STATION_COUNTS } from '@/data/constants'
import { getRadioCount } from '@/utils/airframeHelpers'
import { getSquadronAirframe } from '@/data/squadrons'

/**
 * Serialized waypoint - stores all user-editable fields
 * Must store all coordinates since waypoints can be custom or edited
 */
interface SerializedWaypoint {
  seq: number
  name: string
  lat: number | null // Can be null during editing, required non-null for export
  lon: number | null // Can be null during editing, required non-null for export
  alt: number | null // Can be null during editing, required non-null for export
  elev?: number
  spd?: number
  tot?: string
  type?: string
  ccip?: {
    // CCIP data (for TGT steerpoints)
    rpt?: 'VIP' | 'VRP' // referencePointType
    vip?: { b?: number; d?: number; e?: number } // bearing, distance, elevation
    vrp?: { b?: number; d?: number; e?: number }
    oa1?: { b?: number; d?: number; e?: number }
    oa2?: { b?: number; d?: number; e?: number }
    pup?: { b?: number; d?: number; e?: number }
  }
}

/**
 * Serialized mission format for storage
 * Only stores essential, non-derivable data
 */
export interface SerializedMission {
  id: string
  n: string // name
  cs: string // callsign (required for export)
  fco?: string // flightCallsignOverride
  l16?: string // link16PrefixOverride (optional, but recommended for export)
  d: string // date
  mn?: string // missionNumber
  t: string // type (required for export)
  sq: string // squadron (replaces airframe)
  th: string // theater

  // Flight - only pilot names
  cr: string[] // crew pilot names in order

  // Navigation - serialized waypoints
  wp: SerializedWaypoint[]
  be?: { lat: number | null; lon: number | null; wpn?: number; desc?: string } // bullseye

  // Loadout - only non-empty stations
  ld: Array<[number | string, string]> // [station, item]

  // CMDS - only if different from defaults
  cmds?: {
    prg?: CMDSProgram[] // Only if modified
    cb?: number // chaffBingo (only if not 10)
    fb?: number // flareBingo (only if not 10)
    ct?: number // chaffTotal
    ft?: number // flareTotal
  }

  // Radios - individual properties per radio (only if different from theater defaults)
  c1?: RadioPreset[] // COM1 presets
  c2?: RadioPreset[] // COM2 presets
  c3?: RadioPreset[] // COM3 presets (A-10C only)

  // Departure/Recovery - required for export
  dr: {
    depProc?: string // departureProcedure
    depApt?: string // departureAirportId
    depRwy?: string // departureRunwayName
    depRwyHdg?: number // departureRunwayHeading
    depFldElev?: number // departureFieldElevation
    recProc?: string // recoveryProcedure
    recApt?: string // recoveryAirportId
    recRwy?: string // recoveryRunwayName
    recRwyHdg?: number // recoveryRunwayHeading
    recFldElev?: number // recoveryFieldElevation
    altApt?: string // alternateAirportId
  }

  // TOLD - required for export
  tld: {
    rot?: number // Required for export
    ref?: number // Required for export
    minAgl?: number
    minMsl?: number
    cp?: object // calculatorParams (F16CalculatorParams | A10CalculatorParams)
  }

  // Fuel - all editable, so store all values
  f: {
    to: number // takeoff
    j: number // joker
    b: number // bingo
  }

  // Weather
  wx?: string

  // Gun ammo type
  gt?: string // gunAmmoType

  // CMDS/ECM
  cmdsp?: string // cmdsProfile
  ecmp: string[] // ecmPrograms - required, defaults to empty array
  htsp: string[] // htsThreatTables - required, defaults to empty array

  // Comm ladder - required, defaults to empty array
  cl: number[][] // commLadders

  // Package and Support - required, defaults to empty arrays
  pm: Array<{
    // packageMembers
    callsign: string
    aircraft: string
    time: string
    comms: string
    stn: number | null
    aaTacan: string
    task: string
  }>
  sa: Array<{
    // supportAssets
    callsign: string
    role: string
    frequency: string
    preset: number | null
    aaTacan: string
    location: string
    altitude: number
  }>

  // Details - required for export (at least remarks)
  det: {
    rem?: string // remarks (required for export)
    imgIds?: string[] // image IDs referenced in remarks
    pt?: {
      // primaryTarget
      n?: string
      d?: string
      lat?: number | null
      lon?: number | null
      elev?: number
      ah?: number // attackHeading
      ia?: number // ingressAltitude
      rem?: string
      imgIds?: string[] // image IDs referenced in target remarks
    }
    st?: {
      // secondaryTarget
      n?: string
      d?: string
      lat?: number | null
      lon?: number | null
      elev?: number
      ah?: number // attackHeading
      ia?: number // ingressAltitude
      rem?: string
      imgIds?: string[] // image IDs referenced in target remarks
    }
    tot?: string
  }

  // Metadata
  ca: string // createdAt
  ua: string // updatedAt

  // Image IDs - required, defaults to empty array
  imgIds: string[] // Top-level image IDs for the mission
}

/**
 * Check if radio presets match theater defaults
 */
function presetsMatchDefaults(presets: RadioPreset[], defaults: RadioPreset[]): boolean {
  if (presets.length !== defaults.length) return false
  return presets.every((p, i) => {
    const d = defaults[i]
    return (
      d && p.number === d.number && p.frequency === d.frequency && p.description === d.description
    )
  })
}

/**
 * Serialize mission for storage
 */
export function serializeMission(mission: Mission): SerializedMission {
  const serialized: SerializedMission = {
    id: mission.id,
    n: mission.name,
    cs: mission.callsign, // Required for export
    d: mission.date,
    t: mission.type, // Required for export
    sq: mission.squadron,
    th: mission.theater,
    l16: mission.link16PrefixOverride, // Required for export

    // Crew - only pilot names
    cr: mission.crew.map((c) => c.pilot),

    // Waypoints - store all user-editable fields (including null values)
    wp: mission.waypoints.map((wp) => {
      const waypoint: SerializedWaypoint = {
        seq: wp.sequence,
        name: wp.name,
        lat: wp.latitude,
        lon: wp.longitude,
        alt: wp.altitude,
      }

      // Optional fields
      if (wp.elevation !== undefined) waypoint.elev = wp.elevation
      if (wp.speed !== undefined) waypoint.spd = wp.speed
      if (wp.timeOnTarget) waypoint.tot = wp.timeOnTarget
      if (wp.type) waypoint.type = wp.type

      // CCIP data (for TGT steerpoints)
      if (wp.ccip) {
        waypoint.ccip = {}
        if (wp.ccip.referencePointType) waypoint.ccip.rpt = wp.ccip.referencePointType
        if (wp.ccip.vip)
          waypoint.ccip.vip = {
            b: wp.ccip.vip.bearing,
            d: wp.ccip.vip.distance,
            e: wp.ccip.vip.elevation,
          }
        if (wp.ccip.vrp)
          waypoint.ccip.vrp = {
            b: wp.ccip.vrp.bearing,
            d: wp.ccip.vrp.distance,
            e: wp.ccip.vrp.elevation,
          }
        if (wp.ccip.oa1)
          waypoint.ccip.oa1 = {
            b: wp.ccip.oa1.bearing,
            d: wp.ccip.oa1.distance,
            e: wp.ccip.oa1.elevation,
          }
        if (wp.ccip.oa2)
          waypoint.ccip.oa2 = {
            b: wp.ccip.oa2.bearing,
            d: wp.ccip.oa2.distance,
            e: wp.ccip.oa2.elevation,
          }
        if (wp.ccip.pup)
          waypoint.ccip.pup = {
            b: wp.ccip.pup.bearing,
            d: wp.ccip.pup.distance,
            e: wp.ccip.pup.elevation,
          }
      }

      return waypoint
    }),

    // Loadout - only non-empty stations
    ld: mission.loadout.filter((s) => s.item !== 'EMPTY').map((s) => [s.station, s.item]),

    // Departure/Recovery - required for export
    // Use placeholder values for schema validation when fields are undefined
    dr: {
      depProc: mission.departureRecovery?.departureProcedure,
      depApt: mission.departureRecovery?.departureAirportId,
      depRwy: mission.departureRecovery?.departureRunwayName,
      depRwyHdg: mission.departureRecovery?.departureRunwayHeading,
      depFldElev: mission.departureRecovery?.departureFieldElevation,
      recProc: mission.departureRecovery?.recoveryProcedure,
      recApt: mission.departureRecovery?.recoveryAirportId,
      recRwy: mission.departureRecovery?.recoveryRunwayName,
      recRwyHdg: mission.departureRecovery?.recoveryRunwayHeading,
      recFldElev: mission.departureRecovery?.recoveryFieldElevation,
      altApt: mission.departureRecovery?.alternateAirportId,
    },

    // TOLD - required for export
    // Use placeholder values for schema validation when fields are undefined
    tld: {
      rot: mission.told.rotation ?? 0,
      ref: mission.told.refusal ?? 0,
      minAgl: mission.told.minAgl,
      minMsl: mission.told.minMsl,
      cp: mission.told.calculatorParams,
    },

    // Fuel - store all values since they're user-editable
    f: {
      to: mission.fuel.takeoff,
      j: mission.fuel.joker,
      b: mission.fuel.bingo,
    },

    // Details - required for export (at least remarks)
    det: {
      rem: mission.details.remarks,
      tot: mission.details.timeOnTarget,
      imgIds: mission.details.imageIds || [], // Required field, defaults to empty array
    },

    // Metadata
    ca: mission.createdAt,
    ua: mission.updatedAt,

    // Required array fields - will be set below, initialized here for type safety
    ecmp: [],
    htsp: [],
    cl: [],
    pm: [],
    sa: [],
    imgIds: [],
  }

  // Optional override fields
  if (mission.flightCallsignOverride) serialized.fco = mission.flightCallsignOverride
  if (mission.missionNumber) serialized.mn = mission.missionNumber
  if (mission.bullseye) {
    serialized.be = {
      lat: mission.bullseye.latitude,
      lon: mission.bullseye.longitude,
      wpn: mission.bullseye.waypointNumber,
      desc: mission.bullseye.description,
    }
  }

  // CMDS - only if non-default
  if (mission.ecmCmds) {
    const hasNonDefaultCmds =
      mission.ecmCmds.chaffBingo !== 10 ||
      mission.ecmCmds.flareBingo !== 10 ||
      mission.ecmCmds.chaffTotal !== undefined ||
      mission.ecmCmds.flareTotal !== undefined ||
      mission.ecmCmds.cmdsPrograms.length !== 1

    if (hasNonDefaultCmds) {
      serialized.cmds = {}
      if (mission.ecmCmds.chaffBingo !== 10) serialized.cmds.cb = mission.ecmCmds.chaffBingo
      if (mission.ecmCmds.flareBingo !== 10) serialized.cmds.fb = mission.ecmCmds.flareBingo
      if (mission.ecmCmds.chaffTotal !== undefined) serialized.cmds.ct = mission.ecmCmds.chaffTotal
      if (mission.ecmCmds.flareTotal !== undefined) serialized.cmds.ft = mission.ecmCmds.flareTotal
      if (mission.ecmCmds.cmdsPrograms.length !== 1)
        serialized.cmds.prg = mission.ecmCmds.cmdsPrograms
    }
  }

  // Radio presets - only if different from defaults
  if (mission.radioPresets && mission.radioPresets.length > 0) {
    try {
      const airframe = getMissionAirframe(mission)
      mission.radioPresets.forEach((presets, radioIndex) => {
        const defaults = getDefaultRadioPresets(mission.theater, airframe, radioIndex)
        if (!presetsMatchDefaults(presets, defaults)) {
          // Store as c1, c2, c3 properties
          if (radioIndex === 0) serialized.c1 = presets
          else if (radioIndex === 1) serialized.c2 = presets
          else if (radioIndex === 2) serialized.c3 = presets
        }
      })
    } catch (_e) {
      // If getMissionAirframe fails (invalid squadron), skip radio preset comparison
      // and store all presets
      mission.radioPresets.forEach((presets, radioIndex) => {
        if (presets && presets.length > 0) {
          if (radioIndex === 0) serialized.c1 = presets
          else if (radioIndex === 1) serialized.c2 = presets
          else if (radioIndex === 2) serialized.c3 = presets
        }
      })
    }
  }

  // Weather (optional)
  if (mission.weather) {
    serialized.wx = mission.weather
  }

  // Gun ammo type (optional)
  if (mission.gunAmmoType) {
    serialized.gt = mission.gunAmmoType
  }

  // CMDS/ECM (optional)
  if (mission.cmdsProfile) {
    serialized.cmdsp = mission.cmdsProfile
  }
  // ECM programs - required field, defaults to empty array
  serialized.ecmp = mission.ecmPrograms && mission.ecmPrograms.length > 0 ? mission.ecmPrograms : []
  // HTS threat tables - required field, defaults to empty array
  serialized.htsp =
    mission.htsThreatTables && mission.htsThreatTables.length > 0 ? mission.htsThreatTables : []

  // Comm ladder - required field, defaults to empty array
  serialized.cl = mission.commLadders && mission.commLadders.length > 0 ? mission.commLadders : []

  // Package members - required field, defaults to empty array
  serialized.pm =
    mission.packageMembers && mission.packageMembers.length > 0
      ? mission.packageMembers.map((pm) => ({
          callsign: pm.callsign,
          aircraft: pm.aircraft,
          time: pm.time,
          comms: pm.comms,
          stn: pm.stn,
          aaTacan: pm.aaTacan,
          task: pm.task,
        }))
      : []

  // Support assets - required field, defaults to empty array
  serialized.sa =
    mission.supportAssets && mission.supportAssets.length > 0
      ? mission.supportAssets.map((sa) => ({
          callsign: sa.callsign,
          role: sa.role,
          frequency: sa.frequency,
          preset: sa.preset,
          aaTacan: sa.aaTacan,
          location: sa.location,
          altitude: sa.altitude,
        }))
      : []

  // Target details (optional)
  if (mission.details.primaryTarget) {
    if (!serialized.det) serialized.det = {}
    serialized.det.pt = {}
    const pt = mission.details.primaryTarget
    if (pt.name) serialized.det.pt.n = pt.name
    if (pt.dmpi) serialized.det.pt.d = pt.dmpi
    if (pt.latitude !== undefined) serialized.det.pt.lat = pt.latitude
    if (pt.longitude !== undefined) serialized.det.pt.lon = pt.longitude
    if (pt.elevation) serialized.det.pt.elev = pt.elevation
    if (pt.attackHeading !== undefined) serialized.det.pt.ah = pt.attackHeading
    if (pt.ingressAltitude !== undefined) serialized.det.pt.ia = pt.ingressAltitude
    if (pt.remarks) serialized.det.pt.rem = pt.remarks
    if (pt.imageIds) serialized.det.pt.imgIds = pt.imageIds
  }

  if (mission.details.secondaryTarget) {
    if (!serialized.det) serialized.det = {}
    serialized.det.st = {}
    const st = mission.details.secondaryTarget
    if (st.name) serialized.det.st.n = st.name
    if (st.dmpi) serialized.det.st.d = st.dmpi
    if (st.latitude !== undefined) serialized.det.st.lat = st.latitude
    if (st.longitude !== undefined) serialized.det.st.lon = st.longitude
    if (st.elevation) serialized.det.st.elev = st.elevation
    if (st.attackHeading !== undefined) serialized.det.st.ah = st.attackHeading
    if (st.ingressAltitude !== undefined) serialized.det.st.ia = st.ingressAltitude
    if (st.remarks) serialized.det.st.rem = st.remarks
    if (st.imageIds) serialized.det.st.imgIds = st.imageIds
  }

  return serialized
}

/**
 * Deserialize mission from storage format back to full format
 */
export function deserializeMission(serialized: SerializedMission): Mission {
  const theater = serialized.th as Theater

  // Reconstruct crew from database
  const crew: CrewMember[] = serialized.cr.map((pilotName, index) => {
    const pilot = crewDatabase.find((p) => p.pilot === pilotName)

    if (!pilot) {
      // Fallback if pilot not found in database
      console.warn(`Pilot ${pilotName} not found in crew database`)
      return {
        position: index === 0 ? 'LEAD' : index === 1 ? 'WING' : `${index + 1}`,
        pilot: pilotName,
        callsign: '',
        own: (index + 1).toString(),
        stn: '',
        mode3: '',
        aaTcn: '',
        intraflight: '',
        laser: '',
      }
    }

    const positionLabels = ['LEAD', 'WING', 'EL LEAD', 'EL WING']
    return {
      position: positionLabels[index] || `${index + 1}`,
      pilot: pilot.pilot,
      callsign: pilot.link16Prefix,
      own: (index + 1).toString(),
      stn: formatSTN(pilot.stn),
      mode3: formatMode3(pilot.mode3),
      aaTcn: `${pilot.aaTacan}Y`, // Store only the pilot's own TACAN
      intraflight: pilot.freq,
      laser: formatLaserCode(pilot.laserCode),
      tailNumber: pilot.tailNumber,
    }
  })

  // Reconstruct waypoints
  const waypoints: Waypoint[] = serialized.wp.map((swp) => {
    const waypoint: Waypoint = {
      sequence: swp.seq,
      name: swp.name,
      latitude: swp.lat ?? null,
      longitude: swp.lon ?? null,
      elevation: swp.elev,
      altitude: swp.alt ?? null,
      speed: swp.spd,
      timeOnTarget: swp.tot,
      type: swp.type,
    }

    // CCIP data
    if (swp.ccip) {
      waypoint.ccip = {
        referencePointType: swp.ccip.rpt,
        vip: swp.ccip.vip
          ? {
              bearing: swp.ccip.vip.b,
              distance: swp.ccip.vip.d,
              elevation: swp.ccip.vip.e,
            }
          : undefined,
        vrp: swp.ccip.vrp
          ? {
              bearing: swp.ccip.vrp.b,
              distance: swp.ccip.vrp.d,
              elevation: swp.ccip.vrp.e,
            }
          : undefined,
        oa1: swp.ccip.oa1
          ? {
              bearing: swp.ccip.oa1.b,
              distance: swp.ccip.oa1.d,
              elevation: swp.ccip.oa1.e,
            }
          : undefined,
        oa2: swp.ccip.oa2
          ? {
              bearing: swp.ccip.oa2.b,
              distance: swp.ccip.oa2.d,
              elevation: swp.ccip.oa2.e,
            }
          : undefined,
        pup: swp.ccip.pup
          ? {
              bearing: swp.ccip.pup.b,
              distance: swp.ccip.pup.d,
              elevation: swp.ccip.pup.e,
            }
          : undefined,
      }
    }

    return waypoint
  })

  // Reconstruct loadout
  const loadoutMap = new Map(serialized.ld)
  const squadron = serialized.sq as Squadron
  const airframe = getSquadronAirframe(squadron)
  const stationCount = STATION_COUNTS[airframe] ?? 9
  const loadout = Array.from({ length: stationCount }, (_, i) => ({
    station: i + 1,
    item: loadoutMap.get(i + 1) || 'EMPTY',
  }))

  // Reconstruct CMDS
  const ecmCmds: ECMCMDSProfiles = {
    cmdsPrograms: serialized.cmds?.prg || [
      {
        number: 1,
        flareBurstQty: 6,
        flareBurstInterval: 0.075,
        flareSalvoQty: 1,
        flareSalvoInterval: 0.5,
        chaffBurstQty: 3,
        chaffBurstInterval: 0.3,
        chaffSalvoQty: 1,
        chaffSalvoInterval: 0.75,
      },
    ],
    chaffBingo: serialized.cmds?.cb ?? 10,
    flareBingo: serialized.cmds?.fb ?? 10,
    chaffTotal: serialized.cmds?.ct,
    flareTotal: serialized.cmds?.ft,
  }

  const mission: Mission = {
    id: serialized.id,
    name: serialized.n,
    callsign: serialized.cs || '',
    flightCallsignOverride: serialized.fco || '',
    link16PrefixOverride: serialized.l16 || '',
    date: serialized.d,
    missionNumber: serialized.mn || '',
    type: serialized.t || '',
    squadron: serialized.sq as Squadron,
    theater: serialized.th as Theater,
    crew,
    waypoints,
    bullseye: serialized.be
      ? {
          latitude: serialized.be.lat,
          longitude: serialized.be.lon,
          waypointNumber: serialized.be.wpn,
          description: serialized.be.desc,
        }
      : undefined,
    loadout,
    gunAmmoType: serialized.gt,
    cmdsProfile: serialized.cmdsp,
    ecmPrograms: serialized.ecmp,
    htsThreatTables: serialized.htsp,
    ecmCmds,
    commLadders: serialized.cl,
    packageMembers: serialized.pm || [],
    supportAssets: serialized.sa || [],
    radioPresets: (() => {
      // Determine number of radios for this airframe
      const radioCount = getRadioCount(airframe)

      // Build radio presets array
      const radios: RadioPreset[][] = []
      for (let i = 0; i < radioCount; i++) {
        // Use stored radio presets if available, otherwise use defaults
        if (i === 0) {
          radios[0] = serialized.c1 || getDefaultRadioPresets(theater, airframe, 0)
        } else if (i === 1) {
          radios[1] = serialized.c2 || getDefaultRadioPresets(theater, airframe, 1)
        } else if (i === 2) {
          radios[2] = serialized.c3 || getDefaultRadioPresets(theater, airframe, 2)
        } else {
          // Fallback for any additional radios
          radios[i] = getDefaultRadioPresets(theater, airframe, i)
        }
      }
      return radios
    })(),
    departureRecovery: {
      departureProcedure: serialized.dr?.depProc,
      departureAirportId: serialized.dr?.depApt,
      departureRunwayName: serialized.dr?.depRwy,
      departureRunwayHeading: serialized.dr?.depRwyHdg,
      departureFieldElevation: serialized.dr?.depFldElev,
      recoveryProcedure: serialized.dr?.recProc,
      recoveryAirportId: serialized.dr?.recApt,
      recoveryRunwayName: serialized.dr?.recRwy,
      recoveryRunwayHeading: serialized.dr?.recRwyHdg,
      recoveryFieldElevation: serialized.dr?.recFldElev,
      alternateAirportId: serialized.dr?.altApt,
    },
    told: {
      rotation: serialized.tld?.rot,
      refusal: serialized.tld?.ref,
      minAgl: serialized.tld?.minAgl,
      minMsl: serialized.tld?.minMsl,
      calculatorParams: serialized.tld?.cp as F16CalculatorParams | A10CalculatorParams | undefined,
    },
    fuel: {
      takeoff: serialized.f.to,
      joker: serialized.f.j,
      bingo: serialized.f.b,
    },
    weather: serialized.wx || '',
    details: {
      remarks: serialized.det?.rem,
      timeOnTarget: serialized.det?.tot,
      imageIds: serialized.det?.imgIds,
      primaryTarget: serialized.det?.pt
        ? {
            name: serialized.det.pt.n,
            dmpi: serialized.det.pt.d,
            latitude: serialized.det.pt.lat,
            longitude: serialized.det.pt.lon,
            elevation: serialized.det.pt.elev,
            attackHeading: serialized.det.pt.ah,
            ingressAltitude: serialized.det.pt.ia,
            remarks: serialized.det.pt.rem,
            imageIds: serialized.det.pt.imgIds,
          }
        : undefined,
      secondaryTarget: serialized.det?.st
        ? {
            name: serialized.det.st.n,
            dmpi: serialized.det.st.d,
            latitude: serialized.det.st.lat,
            longitude: serialized.det.st.lon,
            elevation: serialized.det.st.elev,
            attackHeading: serialized.det.st.ah,
            ingressAltitude: serialized.det.st.ia,
            remarks: serialized.det.st.rem,
            imageIds: serialized.det.st.imgIds,
          }
        : undefined,
    },
    createdAt: serialized.ca,
    updatedAt: serialized.ua,
  }

  return mission
}
