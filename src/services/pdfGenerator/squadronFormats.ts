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
  | 'missionTiming'
  | 'airbaseNav'
  | 'weaponProfiles'
  | 'dropZone'
  | 'definitions'

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

// --- Section-entry shortcuts -------------------------------------------------

function S(section: SectionId, when?: (ctx: CompositionContext) => boolean): SectionEntry {
  return when ? { kind: 'section', section, when } : { kind: 'section', section }
}

const TWO_COLUMN_BLOCK: SectionEntry = {
  kind: 'columns',
  columnGap: 2,
  columns: [
    {
      width: '*',
      stack: [S('radios'), S('presets')],
    },
    {
      width: '*',
      stack: [S('weatherBullseye'), S('loadout')],
    },
  ],
}

const hasWeaponProfiles = (m: Mission): boolean => (m.weaponProfiles?.length ?? 0) > 0
const hasDropZone = (m: Mission): boolean =>
  m.dropZone != null && Object.values(m.dropZone).some((v) => v != null && v !== '')

/** Notes self-gates (returns [] when no remarks) and bakes its own page break. */
const NOTES_PAGE: PageSpec = { pageBreakBefore: false, entries: [S('notes')] }
/** Static definitions reference, kept from the source MDC formats. */
const DEFINITIONS_PAGE: PageSpec = { pageBreakBefore: true, entries: [S('definitions')] }

// --- Per-squadron page composition ------------------------------------------

/** v303 FS (A-10C) — closest to the legacy layout, plus definitions. */
function v303Pages(): PageSpec[] {
  return [
    {
      pageBreakBefore: false,
      entries: [
        S('header'),
        S('missionInfo'),
        S('flight'),
        TWO_COLUMN_BLOCK,
        S('told'),
        S('departureRecovery'),
        S('flightPlan'),
      ],
    },
    {
      pageBreakBefore: true,
      when: (c) => c.hasPage2Content,
      entries: [
        S('header'),
        S('target', (c) => c.hasTarget),
        S('delivery'),
        S('package', (c) => c.hasPackage),
        S('supportAssets', (c) => c.hasSupportAssets),
      ],
    },
    NOTES_PAGE,
    DEFINITIONS_PAGE,
  ]
}

/** v93 FS (F-16C) — airbase nav + mission timing, weapon profiles on page 2. */
function v93Pages(): PageSpec[] {
  return [
    {
      pageBreakBefore: false,
      entries: [
        S('header'),
        S('missionInfo'),
        S('airbaseNav'),
        S('flight'),
        TWO_COLUMN_BLOCK,
        S('missionTiming'),
        S('told'),
        S('flightPlan'),
      ],
    },
    {
      pageBreakBefore: true,
      when: (c) => c.hasPage2Content || hasWeaponProfiles(c.mission),
      entries: [
        S('header'),
        S('target', (c) => c.hasTarget),
        // CCIP tables left, compact weapon delivery profiles right. Gated so
        // an empty pair doesn't emit an empty columns node (which would be a
        // page-2 layout diff for missions with no profiles and no CCIP data).
        {
          kind: 'columns',
          columnGap: 2,
          when: (c) => c.hasDeliveryTables || hasWeaponProfiles(c.mission),
          columns: [
            { width: '*', stack: [S('delivery')] },
            { width: '*', stack: [S('weaponProfiles')] },
          ],
        },
        S('package', (c) => c.hasPackage),
        S('supportAssets', (c) => c.hasSupportAssets),
      ],
    },
    NOTES_PAGE,
    DEFINITIONS_PAGE,
  ]
}

/** v757 AS (C-130J) — two-crew flight + drop zone / CARP on page 2. */
function v757Pages(): PageSpec[] {
  return [
    {
      pageBreakBefore: false,
      entries: [
        S('header'),
        S('missionInfo'),
        S('flight'),
        TWO_COLUMN_BLOCK,
        S('told'),
        S('departureRecovery'),
        S('flightPlan'),
      ],
    },
    {
      pageBreakBefore: true,
      when: (c) => c.hasPage2Content || hasDropZone(c.mission),
      entries: [
        S('header'),
        S('dropZone'),
        S('target', (c) => c.hasTarget),
        S('delivery'),
        S('package', (c) => c.hasPackage),
        S('supportAssets', (c) => c.hasSupportAssets),
      ],
    },
    NOTES_PAGE,
    DEFINITIONS_PAGE,
  ]
}

const v93Format: SquadronFormat = {
  id: 'v93',
  theme: {
    headerBackground: COLORS.v93Blue,
    accent: COLORS.v93Blue,
    headerTitleTemplate: 'v93 FS Mission Datacard - {name}',
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v93FS', group: 'v303FG' },
  pages: v93Pages(),
}

const v303Format: SquadronFormat = {
  id: 'v303',
  theme: {
    headerBackground: COLORS.v303Red,
    accent: COLORS.v303Red,
    headerTitleTemplate: 'v303 FS Mission Data Card - {name}',
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v303FS', group: 'v303FG' },
  pages: v303Pages(),
}

const v757Format: SquadronFormat = {
  id: 'v757',
  theme: {
    // v757 AS uses a blue header per the new format. No dedicated v757 logo
    // asset yet — reuse the group/v303FS placeholder (follow-up).
    headerBackground: COLORS.v93Blue,
    accent: COLORS.v93Blue,
    headerTitleTemplate: 'v757 AS Mission Data Card - {name}',
    footerTemplate: null,
  },
  logos: { left: 'v303FG', right: 'v303FS', group: 'v303FG' },
  pages: v757Pages(),
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
