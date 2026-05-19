/**
 * Characterization tests for the per-squadron MDC PDF composition.
 *
 * These lock the assembled pdfMake docDefinition for every squadron across a
 * minimal (page 1 only) and a full (page 2 + notes) mission. They are written
 * against the pre-refactor generator and MUST stay green (no `-u`) through the
 * per-squadron-format refactor — any diff is a behavior regression.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import pdfMake from 'pdfmake/build/pdfmake'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment } from '@/__tests__/helpers'
import {
  createMockCrewMember,
  createMockPackageMember,
  createMockSupportAsset,
  createMockWaypoint,
} from '@/__tests__/helpers'
import { SQUADRON_LOGOS } from '@/services/pdfGenerator/squadronAssets'
import { generatePdfMakeBriefingCard } from '@/services/pdfGenerator/pdfMakeBriefingCard'
import type { Mission, Squadron } from '@/types'

const SQUADRONS: Squadron[] = ['v93', 'v303', 'v757']

// Map each base64 logo to a stable token so snapshots stay readable and asset
// bytes don't add noise, while logo *identity per squadron* stays observable.
const LOGO_TOKENS: Record<string, string> = {}
for (const [key, value] of Object.entries(SQUADRON_LOGOS)) {
  LOGO_TOKENS[value] = `<LOGO:${key}>`
}

function normalize<T>(node: T): T {
  return JSON.parse(
    JSON.stringify(node, (_k, v) => {
      if (typeof v === 'string') {
        if (LOGO_TOKENS[v]) return LOGO_TOKENS[v]
        if (v.startsWith('data:image')) return '<IMG>'
      }
      return v
    }),
  )
}

let captured: Record<string, unknown> | undefined

function makeMission(squadron: Squadron, full: boolean): Mission {
  const store = useMissionsStore()
  const mission = store.createMission(squadron, 'Caucasus')
  mission.name = 'Characterization Mission'
  mission.callsign = 'VIPER'
  mission.missionNumber = '001'
  mission.type = 'CAS'
  mission.crew = [
    createMockCrewMember({ position: 'LEAD', pilot: 'Alpha' }),
    createMockCrewMember({ position: 'WING', pilot: 'Bravo', own: '2' }),
  ]
  if (full) {
    mission.waypoints = [
      createMockWaypoint({ sequence: 1, name: 'DEP', type: 'PARK' }),
      createMockWaypoint({ sequence: 2, name: 'IP', type: 'IP' }),
      createMockWaypoint({ sequence: 3, name: 'TGT', type: 'TGT' }),
    ]
    mission.packageMembers = [createMockPackageMember()]
    mission.supportAssets = [createMockSupportAsset()]
    mission.details = {
      remarks: 'Characterization remarks line one.\n\nLine two.',
      primaryTarget: {
        name: 'Primary',
        dmpi: 'DMPI-1',
        latitude: 42.1,
        longitude: 42.2,
        coordinateFormat: 'DDM',
        attackHeading: 270,
        ingressAltitude: 15000,
      },
    }
  }
  return mission
}

describe('pdfMakeBriefingCard — per-squadron composition characterization', () => {
  setupTestEnvironment({ pinia: true, localStorage: true })

  beforeEach(() => {
    captured = undefined
    vi.spyOn(pdfMake, 'createPdf').mockImplementation((dd: unknown) => {
      captured = dd as Record<string, unknown>
      return { download: vi.fn() } as unknown as ReturnType<typeof pdfMake.createPdf>
    })
  })

  for (const squadron of SQUADRONS) {
    for (const full of [false, true]) {
      const label = full ? 'full (page 2 + notes)' : 'minimal (page 1 only)'

      it(`${squadron} — ${label} docDefinition is stable`, async () => {
        await generatePdfMakeBriefingCard(makeMission(squadron, full))
        expect(captured).toBeDefined()
        const dd = captured!

        expect(normalize(dd.content)).toMatchSnapshot('content')
        expect({
          pageSize: dd.pageSize,
          pageMargins: dd.pageMargins,
          defaultStyle: dd.defaultStyle,
        }).toMatchSnapshot('docMeta')

        // Footer is a function — snapshot its rendered output.
        const footer = dd.footer as (p: number, c: number) => unknown
        expect(footer(2, 5)).toMatchSnapshot('footer')
      })
    }
  }

  it('structural invariants per squadron', async () => {
    for (const squadron of SQUADRONS) {
      // minimal: page 1 + the static definitions page (one page break)
      await generatePdfMakeBriefingCard(makeMission(squadron, false))
      const minimal = JSON.stringify(captured!.content)
      expect(minimal.match(/"pageBreak":"after"/g) ?? []).toHaveLength(1)

      // full: page 2 + notes + definitions => multiple page breaks
      await generatePdfMakeBriefingCard(makeMission(squadron, true))
      const fullStr = JSON.stringify(captured!.content)
      const breaks = (fullStr.match(/"pageBreak":"after"/g) ?? []).length
      expect(breaks).toBeGreaterThanOrEqual(2)

      // header background hex: v303 red, v93/v757 blue
      const expectedHex = squadron === 'v303' ? '#d20920' : '#0f8df2'
      expect(fullStr).toContain(`"fillColor":"${expectedHex}"`)
    }

    // footer object shape is the current page-number footer
    const footer = captured!.footer as (p: number, c: number) => unknown
    expect(footer(2, 5)).toEqual({
      text: 'Page 2 of 5',
      alignment: 'center',
      fontSize: expect.any(Number),
      margin: [0, 0, 0, 20],
    })
  })
})
