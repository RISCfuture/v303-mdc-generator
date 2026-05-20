// @vitest-environment node
/**
 * Sample-PDF generator (manual tool, not part of the regular suite).
 *
 * Builds a fully-populated mission for each squadron and writes the rendered
 * MDC PDFs to ./out so the new per-squadron formats can be visually validated.
 *
 *   yarn generate:samples   ->  out/sample-mdc-<squadron>.pdf
 *
 * Runs in the `node` environment: under jsdom a Node Buffer is not
 * `instanceof` jsdom's Uint8Array, which makes pdfkit reject every embedded
 * font ("Not a supported font format"). In the node environment the realm
 * matches and pdfmake's Node server printer renders correctly.
 *
 * Skipped during `yarn test:unit` (guarded by the GEN_SAMPLES env var) so it
 * never writes files or slows down CI.
 */
import { describe, it, expect } from 'vitest'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment } from '@/__tests__/helpers'
import {
  createMockCrewMember,
  createMockPackageMember,
  createMockSupportAsset,
} from '@/__tests__/helpers'
import { getSquadronAirframe } from '@/data/squadrons'
import { buildDocDefinition } from '@/services/pdfGenerator/pdfMakeBriefingCard'
import loadoutsData from '@/data/json/loadouts.json'
import type { Mission, Squadron, Waypoint, RadioPreset } from '@/types'

const SQUADRONS: Squadron[] = ['v93', 'v303', 'v757']

const prefabLoadouts = loadoutsData as Record<
  string,
  { stations: { station: number | string; item: string }[] }[]
>

function wp(
  sequence: number,
  name: string,
  type: string,
  lat: number,
  lon: number,
  extra: Partial<Waypoint> = {},
): Waypoint {
  return {
    sequence,
    name,
    type,
    latitude: lat,
    longitude: lon,
    altitude: 20000,
    speed: 350,
    timeOnTarget: '',
    coordinateFormat: 'DDM',
    ...extra,
  }
}

function radioPresets(count: number): RadioPreset[][] {
  const labels = ['GROUND', 'TOWER', 'DEPARTURE', 'TACTICAL', 'AWACS', 'TANKER', 'GUARD']
  return Array.from({ length: Math.max(count, 1) }, (_, r) =>
    labels.map((desc, i) => ({
      number: i + 1,
      frequency: `${250 + r * 10 + i}.${i}00`,
      description: desc,
    })),
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any -- pdfmake Node server has no types; CJS require avoids ESM interop mangling the binary font map */
// CJS require keeps the base64 font map intact (ESM interop corrupts it).
const cjs = createRequire(import.meta.url)
const fontMap: Record<string, string> = cjs('pdfmake/build/vfs_fonts')
const server: any = cjs('pdfmake')

// pdfmake's Node Printer embeds fonts read from its virtual file system as
// Buffers; register the bundled Roboto TTFs there and map by filename.
const FONT_FILES = {
  normal: 'Roboto-Regular.ttf',
  bold: 'Roboto-Medium.ttf',
  italics: 'Roboto-Italic.ttf',
  bolditalics: 'Roboto-MediumItalic.ttf',
} as const
for (const filename of Object.values(FONT_FILES)) {
  server.virtualfs.writeFileSync(filename, Buffer.from(fontMap[filename] ?? '', 'base64'))
}
server.addFonts({ Roboto: { ...FONT_FILES } })
server.setUrlAccessPolicy(() => false)

async function renderPdf(mission: Mission, file: string): Promise<void> {
  const dd = await buildDocDefinition(mission)
  await server.createPdf(dd).write(file)
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function fullyPopulate(squadron: Squadron): Mission {
  const store = useMissionsStore()
  const m = store.createMission(squadron, 'Caucasus')
  const airframe = getSquadronAirframe(squadron)
  m.name = `${squadron.toUpperCase()} Sample Mission`
  m.callsign = 'VENOM'
  m.flightCallsignOverride = 'VENOM'
  m.link16PrefixOverride = 'VN'
  m.missionNumber = '93FS12726'
  m.type = 'CAS'
  m.weather = '24007KT 9999 FEW250 28/12 Q1013'

  m.crew = [
    createMockCrewMember({
      position: 'LEAD',
      pilot: 'Alpha "Viper" Jones',
      callsign: 'VN1',
      own: '1',
      stn: '00101',
      mode3: '5101',
      aaTcn: '37Y',
      laser: '1511',
      tailNumber: '90-0833',
      copilot: 'Echo "Spear" Lee',
      copilotCallsign: 'VN1B',
    }),
    createMockCrewMember({
      position: 'WING',
      pilot: 'Bravo "Hawk" Diaz',
      callsign: 'VN2',
      own: '2',
      stn: '00102',
      mode3: '5102',
      aaTcn: '100Y',
      laser: '1512',
      tailNumber: '90-0841',
      copilot: 'Foxtrot "Mule" Ng',
      copilotCallsign: 'VN2B',
    }),
    createMockCrewMember({
      position: 'EL LEAD',
      pilot: 'Charlie "Ace" Park',
      callsign: 'VN3',
      own: '3',
      stn: '00103',
      mode3: '5103',
      aaTcn: '38Y',
      laser: '1513',
      tailNumber: '90-0850',
      copilot: 'Golf "Bolt" Roy',
      copilotCallsign: 'VN3B',
    }),
    createMockCrewMember({
      position: 'EL WING',
      pilot: 'Delta "Nomad" Cole',
      callsign: 'VN4',
      own: '4',
      stn: '00104',
      mode3: '5104',
      aaTcn: '101Y',
      laser: '1514',
      tailNumber: '90-0863',
      copilot: 'Hotel "Tex" Vo',
      copilotCallsign: 'VN4B',
    }),
  ]

  // Loadout: use the airframe's first prefab if available (real CLSIDs render
  // to proper short names); C-130 has no weapon prefab so leave as-is.
  const prefab = prefabLoadouts[airframe]?.[0]
  if (prefab) {
    m.loadout = prefab.stations.map((s) => ({ station: s.station, item: s.item }))
  }
  m.gunAmmoType = m.gunAmmoType ?? 'CM - Combat Mix'
  m.cmdsProfile = 'PRGM 1'
  m.ecmProgram = 'XMIT 1'

  m.radioPresets = radioPresets(m.radioPresets.length)
  m.commLadders = m.radioPresets.map((_, i) => `R${i + 1}: 1 GND - 2 TWR - 3 DEP - 4 TAC - 5 AWACS`)

  m.bullseye = {
    latitude: 42.5,
    longitude: 42.0,
    coordinateFormat: 'DDM',
    description: 'BULLSEYE',
  }

  m.told = {
    grossWeight: 42000,
    rotation: 158,
    refusal: 142,
    minAgl: 500,
    minMsl: 7000,
  }
  m.fuel = { takeoff: 12000, joker: 4500, bingo: 3000, fuelLoadPercentage: 100 }

  m.departureRecovery = {
    departureProcedure: 'Unrestricted climb to FL230',
    departureAirportId: m.departureRecovery.departureAirportId ?? 'Kutaisi',
    departureRunwayName: '08',
    departureRunwayHeading: 80,
    departureFieldElevation: 148,
    recoveryProcedure: 'TACAN recovery RWY 08',
    recoveryAirportId: m.departureRecovery.recoveryAirportId ?? 'Kutaisi',
    recoveryRunwayName: '08',
    recoveryRunwayHeading: 80,
    recoveryFieldElevation: 148,
    alternateAirportId: 'Senaki-Kolkhi',
  }

  const ccip = {
    referencePointType: 'VRP' as const,
    vrp: { bearing: 270, distance: 12000, elevation: 500 },
    oa1: { bearing: 285, distance: 8000, elevation: 300 },
    oa2: { bearing: 255, distance: 9000, elevation: 350 },
    pup: { bearing: 270, distance: 4000, elevation: 1500 },
  }
  m.waypoints = [
    wp(1, 'PARKING', 'PARK', 42.176, 42.482, { altitude: 145, speed: 0, timeOnTarget: '1220z' }),
    wp(2, 'GUDAUTA', 'TRN', 43.107, 40.581, { altitude: 18000, speed: 420, timeOnTarget: '1235z' }),
    wp(3, 'IP', 'IP', 42.65, 41.62, { altitude: 15000, speed: 450, timeOnTarget: '1248z' }),
    wp(4, 'TGT', 'TGT', 42.51, 41.55, { altitude: 12000, speed: 480, timeOnTarget: '1300z', ccip }),
    wp(5, 'EGRESS', 'TRN', 42.9, 41.9, { altitude: 16000, speed: 450, timeOnTarget: '1312z' }),
    wp(6, 'FAF', 'FAF', 42.25, 42.4, { altitude: 3000, speed: 250, timeOnTarget: '1330z' }),
    wp(7, 'KUTAISI', 'LDG', 42.176, 42.482, { altitude: 148, speed: 0, timeOnTarget: '1335z' }),
  ]

  m.packageMembers = [
    createMockPackageMember({ callsign: 'VENOM', task: 'CAS' }),
    createMockPackageMember({
      callsign: 'HOG 1',
      aircraft: 'A-10C_2',
      task: 'CAS',
      stn: 23001,
      aaTacan: '52Y',
      time: '1255z',
      comms: '252.0',
    }),
    createMockPackageMember({
      callsign: 'CHIEF 1',
      aircraft: 'F-16C_50',
      task: 'SEAD',
      stn: 24001,
      aaTacan: '53Y',
      time: '1250z',
      comms: '253.0',
    }),
  ]
  m.supportAssets = [
    createMockSupportAsset({
      callsign: 'SHELL 71',
      role: 'TANKER',
      assetKind: 'TANKER',
      frequency: '305.5',
      uhf: '251.0',
      preset: 12,
      aaTacan: '5Y',
      location: 'AR TRACK ALPHA',
      altitude: 22000,
      notes: 'AR window 1300-1330',
    }),
    createMockSupportAsset({
      callsign: 'MAGIC 1',
      role: 'AWACS',
      assetKind: 'AWACS',
      frequency: '276.0',
      uhf: '276.0',
      preset: 13,
      aaTacan: '6Y',
      location: 'ORBIT BRAVO',
      altitude: 30000,
      notes: 'GCI/AEW',
    }),
    createMockSupportAsset({
      callsign: 'REAPER 1',
      role: 'ISR',
      assetKind: 'ISR',
      frequency: '288.0',
      uhf: '288.0',
      preset: 14,
      aaTacan: '7Y',
      location: 'AO CHARLIE',
      altitude: 25000,
      notes: 'FMV downlink',
    }),
  ]
  m.details = {
    remarks:
      '## Threats\n\nSA-6 and SA-8 reported vicinity target. MANPADS likely.\n\n## Comms plan\n\n- Check in with MAGIC 1 on push\n- AR with SHELL 71 pre-strike\n\n## Abort criteria\n\nWeather below 3000-5; comms-out RTB.',
    primaryTarget: {
      name: 'SA-6 Battery',
      dmpi: 'TEL #2',
      latitude: 42.51,
      longitude: 41.55,
      coordinateFormat: 'DDM',
      elevation: 1200,
      attackHeading: 270,
      ingressAltitude: 18000,
      remarks: 'Strike TEL then radar.',
    },
    secondaryTarget: {
      name: 'C2 Bunker',
      dmpi: 'NE entrance',
      latitude: 42.49,
      longitude: 41.6,
      coordinateFormat: 'DDM',
      elevation: 1150,
      attackHeading: 300,
      ingressAltitude: 18000,
      remarks: 'Time permitting.',
    },
    timeOnTarget: '1300z',
  }
  m.weaponProfiles = [
    {
      label: 'PROFILE 1',
      weapon: 'GBU-12',
      fuze: 'NOSE',
      releaseType: 'CCIP',
      spacing: 175,
      releaseAngle: 45,
      quantity: 2,
      ballisticBearing: 90,
      ballisticRange: 12000,
      releaseSpeed: 450,
      releaseHeight: 4000,
      attackHeading: 270,
      targetSteerpoint: 3,
    },
    { label: 'PROFILE 2', weapon: 'CBU-103', releaseType: 'CCRP', spacing: 100 },
  ]
  m.missionTiming = {
    step: '1200',
    taxi: '1210',
    takeoff: '1220',
    push: '1245',
    vulTot: '1300',
    rtb: '1330',
  }
  // DEP/APR/DIVERT nav rows are derived in the PDF builder from
  // departureRecovery.{departure,recovery,alternate}AirportId + the theater
  // airfield database (set in the `departureRecovery` block above) — no
  // separate stored airbaseNav field.
  m.dropZone = {
    dzName: 'DZ ALPHA',
    piLatitude: 42.35,
    piLongitude: 42.51,
    piCoordinateFormat: 'DDM',
    tot: '1300',
    runInCourse: 270,
    carpLeTe: 1200,
    carpLePi: 600,
    loadType: 'CDS',
    fuselageStation: '737',
    stage: '1',
    releaseSystem: 'CRS',
    chuteCount: 4,
    dropPayload: '4x A-22',
    altWind: '270/15',
    altTemp: 12,
    surfaceWind: '260/08',
    surfaceTemp: 18,
    requiredClearanceHeight: 250,
    obstructionElevation: 410,
    minDropHeight: 600,
    dzElevation: 380,
  }
  return m
}

describe.skipIf(!process.env.GEN_SAMPLES)('generate sample MDC PDFs', () => {
  setupTestEnvironment({ pinia: true, localStorage: true })

  it('writes ./out/sample-mdc-<squadron>.pdf for each squadron', async () => {
    const outDir = resolve(process.cwd(), 'out')
    mkdirSync(outDir, { recursive: true })
    for (const squadron of SQUADRONS) {
      const file = resolve(outDir, `sample-mdc-${squadron}.pdf`)
      await renderPdf(fullyPopulate(squadron), file)
      const head = readFileSync(file).subarray(0, 5).toString('latin1')
      expect(head).toBe('%PDF-')
      console.log(`wrote ${file}`)
    }
  }, 60000)
})
