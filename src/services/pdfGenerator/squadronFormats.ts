/**
 * Per-squadron MDC format descriptors.
 *
 * Replaces the previous hardcoded `isV93` logo/color branching with a
 * declarative, per-squadron format: theme (colors/title/footer), logos, and
 * page composition (ordered section list, supporting two-column rows, page
 * breaks and conditional sections).
 *
 * This commit is behavior-preserving: every squadron uses the same shared
 * composition and the current theme values, so generated PDFs are unchanged.
 * A later commit diverges each squadron's `pages`/theme without touching the
 * generator loop.
 *
 * To avoid an import cycle with the generator, sections are referenced here by
 * string id; `pdfMakeBriefingCard.ts` owns the id -> builder map.
 */
import type { Mission } from '@/types'
import type { SquadronId } from '@/data/squadrons'
import { COLORS } from './constants'
import type { SQUADRON_LOGOS } from './squadronAssets'

export type RGB = [number, number, number]
export type LogoKey = keyof typeof SQUADRON_LOGOS

export type SectionId =
  | 'header'
  | 'missionInfo'
  | 'flight'
  | 'radios'
  | 'presets'
  | 'weatherBullseye'
  | 'loadout'
  | 'told'
  | 'departureRecovery'
  | 'flightPlan'
  | 'target'
  | 'delivery'
  | 'package'
  | 'supportAssets'
  | 'notes'

/**
 * Builders may be sync or async and may return a node or an array of nodes;
 * `unknown` covers all of these and the generator normalizes the shape.
 */
export type SectionResult = unknown
export type SectionBuilder = (mission: Mission) => SectionResult

export type SquadronTheme = {
  /** Header banner background + (future) footer accent. */
  headerBackground: RGB
  /** Accent color (reserved for later divergence; unused this commit). */
  accent: RGB
  /** Header banner title; `{name}`/`{date}` are substituted. */
  headerTitleTemplate: string
  /** Page footer text; `{name}`/`{date}` substitutable. `null` keeps the
   *  current page-number-only footer. */
  footerTemplate: string | null
}

export type SquadronLogos = {
  left: LogoKey
  right: LogoKey
  /** Fallback logo where a squadron lacks a dedicated asset. */
  group: LogoKey
}

/**
 * Reserved squadron-procedure presentation overrides (per the field scoping
 * policy: procedure -> squadron). Unused in this behavior-preserving commit;
 * a later commit populates per-squadron variants and the builders consume them.
 */
export type SquadronPresentation = {
  radioRowLabels?: string[]
  missionNumberPlaceholder?: string
  crewPositionLabels?: string[]
  packageColumns?: string[]
  supportColumns?: string[]
}

/** Precomputed predicates so page/section `when` callbacks stay cheap + pure. */
export type CompositionContext = {
  mission: Mission
  hasTarget: boolean
  hasPackage: boolean
  hasSupportAssets: boolean
  hasDeliveryTables: boolean
  hasPage2Content: boolean
}

export type SectionEntry =
  | {
      kind: 'section'
      section: SectionId
      when?: (ctx: CompositionContext) => boolean
    }
  | {
      kind: 'columns'
      columnGap: number
      columns: { width: string | number; stack: SectionEntry[] }[]
      when?: (ctx: CompositionContext) => boolean
    }

export type PageSpec = {
  /** Emit a `{ pageBreak: 'after' }` node before this page's entries. */
  pageBreakBefore: boolean
  /** Page-level gate (e.g. page 2 only if it has any content). */
  when?: (ctx: CompositionContext) => boolean
  entries: SectionEntry[]
}

export type SquadronFormat = {
  id: SquadronId
  theme: SquadronTheme
  logos: SquadronLogos
  presentation?: SquadronPresentation
  pages: PageSpec[]
}

/**
 * Shared page composition used by ALL squadrons in this commit so output is
 * identical to the previous imperative generator. Mirrors the exact prior
 * order (page 1 sections incl. the columnGap:2 two-column block; page 2 gated
 * by page-2 content with per-section gates; notes self-gating).
 */
function sharedPages(): PageSpec[] {
  return [
    {
      pageBreakBefore: false,
      entries: [
        { kind: 'section', section: 'header' },
        { kind: 'section', section: 'missionInfo' },
        { kind: 'section', section: 'flight' },
        {
          kind: 'columns',
          columnGap: 2,
          columns: [
            {
              width: '*',
              stack: [
                { kind: 'section', section: 'radios' },
                { kind: 'section', section: 'presets' },
              ],
            },
            {
              width: '*',
              stack: [
                { kind: 'section', section: 'weatherBullseye' },
                { kind: 'section', section: 'loadout' },
              ],
            },
          ],
        },
        { kind: 'section', section: 'told' },
        { kind: 'section', section: 'departureRecovery' },
        { kind: 'section', section: 'flightPlan' },
      ],
    },
    {
      pageBreakBefore: true,
      when: (c) => c.hasPage2Content,
      entries: [
        { kind: 'section', section: 'header' },
        { kind: 'section', section: 'target', when: (c) => c.hasTarget },
        { kind: 'section', section: 'delivery' },
        { kind: 'section', section: 'package', when: (c) => c.hasPackage },
        { kind: 'section', section: 'supportAssets', when: (c) => c.hasSupportAssets },
      ],
    },
    {
      // Notes self-gates (returns [] when no remarks) and bakes in its own
      // page break + header, so no framework page break here.
      pageBreakBefore: false,
      entries: [{ kind: 'section', section: 'notes' }],
    },
  ]
}

const SHARED_TITLE = 'v303rd FG Mission Data Card - {name}'

const v93Format: SquadronFormat = {
  id: 'v93',
  theme: {
    headerBackground: COLORS.v93Blue,
    accent: COLORS.v93Blue,
    headerTitleTemplate: SHARED_TITLE,
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v93FS', group: 'v303FG' },
  pages: sharedPages(),
}

const v303Format: SquadronFormat = {
  id: 'v303',
  theme: {
    headerBackground: COLORS.v303Red,
    accent: COLORS.v303Red,
    headerTitleTemplate: SHARED_TITLE,
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v303FS', group: 'v303FG' },
  pages: sharedPages(),
}

const v757Format: SquadronFormat = {
  id: 'v757',
  theme: {
    // Behavior-preserving: the prior code used the non-v93 (red) styling and
    // the v303FS right logo for v757. A dedicated v757 asset is a follow-up.
    headerBackground: COLORS.v303Red,
    accent: COLORS.v303Red,
    headerTitleTemplate: SHARED_TITLE,
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v303FS', group: 'v303FG' },
  pages: sharedPages(),
}

const SQUADRON_FORMATS: Partial<Record<SquadronId, SquadronFormat>> = {
  v93: v93Format,
  v303: v303Format,
  v757: v757Format,
}

/** Fallback for any unknown squadron (matches the prior non-v93 styling). */
const DEFAULT_FORMAT: SquadronFormat = v303Format

/** Resolve the active format for a squadron, falling back to the default. */
export function resolveSquadronFormat(squadron: string): SquadronFormat {
  return SQUADRON_FORMATS[squadron as SquadronId] ?? DEFAULT_FORMAT
}
