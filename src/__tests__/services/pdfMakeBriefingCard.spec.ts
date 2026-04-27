import { describe, it, expect } from 'vitest'
import type { Mission } from '@/types'
import { generateTargetTable } from '@/services/pdfGenerator/pdfMakeBriefingCard'

// Minimal Mission fixture — generateTargetTable only inspects mission.details
function makeMission(overrides: Partial<Mission['details']> = {}): Mission {
  return {
    id: 'test',
    name: 'Test Mission',
    callsign: 'VIPER1',
    date: '2024-01-15',
    missionNumber: 'M001',
    type: 'STRIKE',
    squadron: 'v93',
    theater: 'PersianGulf',
    crew: [],
    packageMembers: [],
    supportAssets: [],
    waypoints: [],
    loadout: [],
    ecmCmds: { cmdsPrograms: [], chaffBingo: 0, flareBingo: 0 },
    radioPresets: [],
    departureRecovery: {
      departureProcedure: '',
      recoveryProcedure: '',
    },
    told: {},
    fuel: {},
    details: overrides,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  } as Mission
}

type CellLike = { text?: string }
type TableShape = { table: { body: CellLike[][] } }

// Body layout produced by generateTargetTable:
//   row 0: Target / Tasking header (colSpan 4)
//   row 1: Names           (Primary | <name> | Secondary | <name>)
//   row 2: DMPI            (DMPI    | <dmpi> | DMPI      | <dmpi>)
//   row 3: Coords          (Coords  | <pri>  | Coords    | <sec>)   <-- under test
//   row 4: Attack Hdg      ...
//   row 5: Ingress Alt     ...
const COORDS_ROW = 3
const PRIMARY_COORDS_COL = 1
const SECONDARY_COORDS_COL = 3

describe('generateTargetTable — secondary target coords', () => {
  it('renders formatted secondary coords when latitude/longitude/format are populated', async () => {
    const mission = makeMission({
      primaryTarget: {
        name: 'Primary',
        latitude: 36.2057583,
        longitude: -115.1234567,
        coordinateFormat: 'DDM',
      },
      secondaryTarget: {
        name: 'Secondary',
        latitude: 31.855433333333,
        longitude: 64.2132,
        coordinateFormat: 'DDM',
      },
    })

    const result = (await generateTargetTable(mission)) as TableShape
    const coordsRow = result.table.body[COORDS_ROW] ?? []

    expect(coordsRow[PRIMARY_COORDS_COL]?.text).toBe('N 36° 12.345′, W 115° 07.407′')
    // Bug fix: this used to be hardcoded to '' regardless of input.
    expect(coordsRow[SECONDARY_COORDS_COL]?.text).toBe('N 31° 51.326′, E 064° 12.792′')
  })

  it('honors the secondary target coordinateFormat (DMS)', async () => {
    const mission = makeMission({
      secondaryTarget: {
        name: 'Secondary',
        latitude: 31.855433333333,
        longitude: 64.2132,
        coordinateFormat: 'DMS',
      },
    })

    const result = (await generateTargetTable(mission)) as TableShape
    const secondaryCoords = result.table.body[COORDS_ROW]?.[SECONDARY_COORDS_COL]?.text
    expect(secondaryCoords).toMatch(/^N 31° .* E 064° /)
    expect(secondaryCoords).not.toBe('')
  })

  it('leaves the secondary coords cell blank when lat/lon are missing', async () => {
    const mission = makeMission({
      secondaryTarget: { name: 'Secondary' },
    })

    const result = (await generateTargetTable(mission)) as TableShape
    expect(result.table.body[COORDS_ROW]?.[SECONDARY_COORDS_COL]?.text).toBe('')
  })
})
