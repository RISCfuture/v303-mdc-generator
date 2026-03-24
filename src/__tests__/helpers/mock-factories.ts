/**
 * Mock factory functions for creating test data
 *
 * These factories provide sensible defaults and allow selective overrides
 * to reduce boilerplate in tests.
 */

import type {
  Mission,
  Waypoint,
  CrewMember,
  LoadoutStation,
  ECMCMDSProfiles,
  CMDSProgram,
  MissionDetails,
  PackageMember,
  SupportAsset,
} from '@/types'
import type { Airfield, Position, Runway, TACAN, ILS, AirfieldRadio } from '@/types/airfield'
import type { Ref, ComputedRef } from 'vue'

/**
 * Creates a mock Waypoint with sensible defaults
 *
 * @example
 * const waypoint = createMockWaypoint({ name: 'IP', sequence: 3 })
 */
export function createMockWaypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    id: 'wp-1',
    sequence: 1,
    name: 'IP',
    type: 'IP',
    latitude: 42.0,
    longitude: 42.0,
    altitude: 15000,
    speed: 350,
    timeOnTarget: '',
    ...overrides,
  }
}

/**
 * Creates a mock Mission with all required fields populated
 *
 * @example
 * const mission = createMockMission({ airframe: 'A-10C_2', squadron: 'v303' })
 */
export function createMockMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'test-mission',
    name: 'Test Mission',
    squadron: 'v93',
    theater: 'Caucasus',
    date: '2024-01-15',
    type: 'CAS',
    airframe: 'F-16C_50',
    callsign: 'VIPER 1',
    missionNumber: '001',
    weather: '',
    bullseye: {
      latitude: 42.0,
      longitude: 42.0,
    },
    departureRecovery: {
      departureAirportId: 'Kutaisi',
      departureRunwayName: '08',
      departureRunwayHeading: 80,
      departureFieldElevation: 148,
    },
    told: {
      grossWeight: 32000,
      fuelWeight: 8000,
      rotationSpeed: 160,
      refusalSpeed: 140,
    },
    fuel: {
      takeoff: 7163,
      joker: 3000,
      bingo: 2000,
    },
    waypoints: [],
    crew: [],
    packageMembers: [],
    supportAssets: [],
    radios: {},
    loadout: { stores: [] },
    ecmCmds: createMockECMCMDSProfiles(),
    notes: '',
    targets: [],
    details: createMockMissionDetails(),
    radioPresets: [[], []],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock CrewMember with default values
 *
 * @example
 * const crewMember = createMockCrewMember({ position: 'Lead', pilot: 'John Doe' })
 */
export function createMockCrewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    position: 'Lead',
    pilot: 'Test Pilot',
    callsign: 'VIPER',
    own: '1',
    stn: '12345',
    mode3: '1234',
    aaTcn: '5Y',
    intraflight: '251.000',
    laser: '1688',
    tailNumber: '86-0267',
    ...overrides,
  }
}

/**
 * Creates a mock ECMCMDSProfiles object
 */
export function createMockECMCMDSProfiles(
  overrides: Partial<ECMCMDSProfiles> = {},
): ECMCMDSProfiles {
  return {
    cmdsPrograms: [createMockCMDSProgram()],
    chaffBingo: 10,
    flareBingo: 10,
    chaffTotal: 120,
    flareTotal: 60,
    ...overrides,
  }
}

/**
 * Creates a mock CMDSProgram
 */
export function createMockCMDSProgram(overrides: Partial<CMDSProgram> = {}): CMDSProgram {
  return {
    number: 1,
    flareBurstQty: 1,
    flareBurstInterval: 0.02,
    flareSalvoQty: 2,
    flareSalvoInterval: 1.0,
    chaffBurstQty: 1,
    chaffBurstInterval: 0.02,
    chaffSalvoQty: 2,
    chaffSalvoInterval: 1.0,
    ...overrides,
  }
}

/**
 * Creates a mock MissionDetails object
 */
export function createMockMissionDetails(overrides: Partial<MissionDetails> = {}): MissionDetails {
  return {
    remarks: '',
    primaryTarget: undefined,
    secondaryTarget: undefined,
    timeOnTarget: '',
    imageIds: [],
    ...overrides,
  }
}

/**
 * Creates a mock Position
 */
export function createMockPosition(overrides: Partial<Position> = {}): Position {
  return {
    latitude: 42.176667,
    longitude: 42.482778,
    elevation: 148,
    ...overrides,
  }
}

/**
 * Creates a mock Runway
 */
export function createMockRunway(overrides: Partial<Runway> = {}): Runway {
  const defaultILS: ILS = {
    name: 'IKS',
    frequency: 109.5,
    channel: null,
    position: createMockPosition({ latitude: 42.16, longitude: 42.47 }),
  }

  return {
    name: '08',
    heading: 80,
    oppositeHeading: 260,
    ils: defaultILS,
    ...overrides,
  }
}

/**
 * Creates a mock TACAN
 */
export function createMockTACAN(overrides: Partial<TACAN> = {}): TACAN {
  return {
    callsign: 'KTS',
    channel: 67,
    frequency: 1150,
    ...overrides,
  }
}

/**
 * Creates a mock AirfieldRadio
 */
export function createMockAirfieldRadio(overrides: Partial<AirfieldRadio> = {}): AirfieldRadio {
  return {
    roles: ['ground', 'tower', 'approach'],
    callsign: 'Kutaisi',
    frequencies: [
      { band: 'UHF', modulation: 'AM', frequency: 251.0 },
      { band: 'VHF_HI', modulation: 'AM', frequency: 131.4 },
    ],
    ...overrides,
  }
}

/**
 * Creates a mock Airfield with all required fields
 *
 * @example
 * const airfield = createMockAirfield({ name: 'Batumi' })
 */
export function createMockAirfield(overrides: Partial<Airfield> = {}): Airfield {
  return {
    name: 'Kutaisi',
    position: createMockPosition(),
    tacan: createMockTACAN(),
    runways: [createMockRunway(), createMockRunway({ name: '26', heading: 260 })],
    radio: createMockAirfieldRadio(),
    ...overrides,
  }
}

/**
 * Creates an array of mock Airfields for testing
 * Returns two airfields by default: Kutaisi and Batumi
 *
 * @example
 * const airfields = createMockAirfields()
 */
export function createMockAirfields(): Airfield[] {
  return [
    createMockAirfield({
      name: 'Kutaisi',
      position: createMockPosition({
        latitude: 42.176667,
        longitude: 42.482778,
        elevation: 148,
      }),
      runways: [
        createMockRunway({ name: '08', heading: 80 }),
        createMockRunway({ name: '26', heading: 260 }),
      ],
    }),
    createMockAirfield({
      name: 'Batumi',
      position: createMockPosition({
        latitude: 41.610278,
        longitude: 41.599722,
        elevation: 33,
      }),
      tacan: createMockTACAN({ callsign: 'BTM', channel: 16, frequency: 1163 }),
      runways: [
        createMockRunway({ name: '13', heading: 130 }),
        createMockRunway({ name: '31', heading: 310 }),
      ],
      radio: createMockAirfieldRadio({
        callsign: 'Batumi',
        frequencies: [{ band: 'UHF', modulation: 'AM', frequency: 131.0 }],
      }),
    }),
  ]
}

/**
 * Creates a mock PackageMember
 */
export function createMockPackageMember(overrides: Partial<PackageMember> = {}): PackageMember {
  return {
    callsign: 'HAWK 1',
    aircraft: 'F-16C_50',
    time: '1530z',
    comms: '251.0',
    stn: 12345,
    aaTacan: '5Y',
    task: 'CAP',
    ...overrides,
  }
}

/**
 * Creates a mock SupportAsset
 */
export function createMockSupportAsset(overrides: Partial<SupportAsset> = {}): SupportAsset {
  return {
    callsign: 'SHELL 1',
    role: 'TANKER',
    frequency: '305.5',
    preset: 10,
    aaTacan: '12Y',
    location: 'Point Alpha',
    altitude: 20000,
    ...overrides,
  }
}

/**
 * Creates a mock LoadoutStation
 */
export function createMockLoadoutStation(overrides: Partial<LoadoutStation> = {}): LoadoutStation {
  return {
    station: 1,
    item: 'EMPTY',
    quantity: 0,
    ...overrides,
  }
}

/**
 * Creates a mock storage monitor composable return value (for mocking useStorageMonitor)
 */
export async function createMockStorageMonitor(overrides: Record<string, unknown> = {}) {
  const { ref, computed } = await import('vue')

  type StorageStats = {
    totalBytes: number
    remainingBytes: number
    percentUsed: number
    missionCount: number
    averageMissionSize: number
    estimatedMissionsRemaining: number
  }

  // Extract override values with proper types
  const statsOverride = overrides.stats as Ref<StorageStats | null> | undefined
  const shouldShowWarningOverride = overrides.shouldShowWarning as ComputedRef<boolean> | undefined
  const warningLevelOverride = overrides.warningLevel as
    | ComputedRef<'ok' | 'warning' | 'critical' | 'full'>
    | undefined
  const warningMessageOverride = overrides.warningMessage as ComputedRef<string> | undefined
  const percentUsedOverride = overrides.percentUsed as ComputedRef<number> | undefined
  const missionCountOverride = overrides.missionCount as ComputedRef<number> | undefined
  const estimatedRemainingOverride = overrides.estimatedRemaining as ComputedRef<number> | undefined
  const formattedUsageOverride = overrides.formattedUsage as ComputedRef<string> | undefined
  const formattedRemainingOverride = overrides.formattedRemaining as ComputedRef<string> | undefined

  // Create base stats ref
  const statsRef =
    statsOverride ??
    ref({
      totalBytes: 5000000,
      remainingBytes: 2500000,
      percentUsed: 0.5,
      missionCount: 10,
      averageMissionSize: 500000,
      estimatedMissionsRemaining: 5,
    })

  return {
    stats: statsRef,
    status: ref(null),
    isLoading: ref(false),
    shouldShowWarning: shouldShowWarningOverride ?? computed(() => false),
    warningLevel: warningLevelOverride ?? computed(() => 'ok' as const),
    warningMessage: warningMessageOverride ?? computed(() => ''),
    percentUsed: percentUsedOverride ?? computed(() => statsRef.value?.percentUsed ?? 0.5),
    missionCount: missionCountOverride ?? computed(() => statsRef.value?.missionCount ?? 10),
    estimatedRemaining:
      estimatedRemainingOverride ?? computed(() => statsRef.value?.estimatedMissionsRemaining ?? 5),
    formattedUsage: formattedUsageOverride ?? computed(() => '5.0 MB'),
    formattedRemaining: formattedRemainingOverride ?? computed(() => '2.5 MB'),
    refresh: () => Promise.resolve(),
  }
}
