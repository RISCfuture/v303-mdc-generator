<script setup lang="ts">
import { computed, watch } from 'vue'
import { NCard, NForm, NFormItem, NInputNumber, NSelect, NGrid, NGi, NFlex } from 'naive-ui'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { getLoadedAirToGroundWeapons } from '@/data/munitions'
import { FORM } from '@/styles/design-tokens'
import type { Mission, WeaponProfile } from '@/types'

type Props = {
  mission: Mission
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:field': [field: keyof Mission, value: Mission[keyof Mission]]
}>()

/** The F-16C carries exactly two A/G weapon delivery profiles. */
const PROFILE_COUNT = 2 as const

type ReleaseType = 'CCIP' | 'CCRP' | 'DTOS' | 'LADD' | 'MAN'
type Fuze = 'NOSE' | 'TAIL' | 'NSTL'

type FieldKind = 'int' | 'releaseSelect' | 'fuzeSelect' | 'weaponSelect'

type FieldSpec = {
  key: keyof WeaponProfile
  label: string
  kind: FieldKind
  suffix?: string
  hint?: string
  placeholder?: string
}

const ROWS: FieldSpec[][] = [
  [
    { key: 'weapon', label: 'Weapon', kind: 'weaponSelect', placeholder: 'e.g. GBU-12' },
    { key: 'targetSteerpoint', label: 'Target Steerpoint', kind: 'int' },
    { key: 'attackHeading', label: 'Attack Heading', kind: 'int', suffix: '°' },
  ],
  [
    { key: 'releaseType', label: 'Release Mode', kind: 'releaseSelect' },
    { key: 'fuze', label: 'Fuzing', kind: 'fuzeSelect' },
  ],
  [
    { key: 'quantity', label: 'Quantity', kind: 'int' },
    { key: 'spacing', label: 'Spacing', kind: 'int', suffix: 'ft' },
  ],
  [
    {
      key: 'releaseAngle',
      label: 'Release Angle',
      kind: 'int',
      suffix: '°',
      hint: 'Negative for a toss / loft',
    },
    { key: 'releaseHeight', label: 'Release Height', kind: 'int', suffix: 'ft AGL' },
    { key: 'releaseSpeed', label: 'Release Speed', kind: 'int', suffix: 'kt' },
  ],
  [
    { key: 'ballisticBearing', label: 'Target Bearing', kind: 'int', suffix: '°' },
    { key: 'ballisticRange', label: 'Target Range', kind: 'int', suffix: 'ft' },
    { key: 'ballisticElevation', label: 'Target Elevation', kind: 'int', suffix: 'ft MSL' },
  ],
]

const releaseOptions: { label: string; value: ReleaseType }[] = [
  { label: 'CCIP', value: 'CCIP' },
  { label: 'CCRP', value: 'CCRP' },
  { label: 'DTOS', value: 'DTOS' },
  { label: 'LADD', value: 'LADD' },
  { label: 'MAN', value: 'MAN' },
]

const fuzeOptions: { label: string; value: Fuze }[] = [
  { label: 'NOSE', value: 'NOSE' },
  { label: 'TAIL', value: 'TAIL' },
  { label: 'NSTL', value: 'NSTL' },
]

/**
 * Always render exactly PROFILE_COUNT slots with hard-coded labels. Existing
 * stored data shows through; missing slots are presented as empty profiles
 * so the form is never blank.
 */
const profiles = computed<WeaponProfile[]>(() => {
  const existing = props.mission.weaponProfiles ?? []
  return Array.from({ length: PROFILE_COUNT }, (_, i) => ({
    label: `PROFILE ${i + 1}`,
    ...existing[i],
  }))
})

/**
 * Dropdown options for the Weapon field — the air-to-ground munitions actually
 * loaded on this aircraft (deduped). The loadout is the source of truth: the
 * select doesn't accept custom values, and the watcher below clears any
 * previously-stored `weapon` that's no longer on the jet.
 */
const weaponOptions = computed(() => getLoadedAirToGroundWeapons(props.mission.loadout))

/**
 * Keep stored weapon profiles consistent with the current loadout. If the
 * loadout changes (or on initial mount with stale data), drop any
 * `profile.weapon` value that no longer corresponds to a loaded A/G munition.
 * The watcher only emits when something actually needs clearing, so this is
 * a no-op for fresh missions and doesn't loop on its own emits.
 */
watch(
  weaponOptions,
  (options) => {
    const stored = props.mission.weaponProfiles
    if (!stored || stored.length === 0) return
    const allowed = new Set(options.map((o) => o.value))
    const next = stored.map((p) =>
      !p.weapon || allowed.has(p.weapon) ? p : { ...p, weapon: undefined },
    )
    // Reference equality: `.map` only returns a different object for cleared
    // profiles, so a per-element ref check tells us whether anything changed.
    if (next.some((p, i) => p !== stored[i])) {
      emit('update:field', 'weaponProfiles', next)
    }
  },
  { immediate: true },
)

function update(index: number, patch: Partial<WeaponProfile>) {
  // Copy-then-replace at `index` avoids `map`-with-spread (which oxc flags as
  // a per-iteration allocation pattern even when only one slot actually
  // changes).
  const next = profiles.value.slice()
  next[index] = { ...next[index], ...patch }
  emit('update:field', 'weaponProfiles', next)
}

function rowKey(row: FieldSpec[]): string {
  return row.map((f) => f.key).join('-')
}

function numVal(p: WeaponProfile, key: keyof WeaponProfile): number | null {
  const v = p[key]
  return typeof v === 'number' ? v : null
}
</script>

<template>
  <NCard title="Weapon Delivery Profiles">
    <NFlex vertical :size="16">
      <NCard
        v-for="(profile, index) in profiles"
        :key="index"
        size="small"
        :title="`PROFILE ${index + 1}`"
      >
        <NForm label-placement="top" :style="{ maxWidth: FORM.maxWidth }">
          <NGrid
            v-for="row in ROWS"
            :key="rowKey(row)"
            class="wp-multi-field-row"
            :cols="row.length"
            :x-gap="12"
          >
            <NGi v-for="f in row" :key="f.key" class="wp-field-cell">
              <NFormItem :label="f.label" :feedback="f.hint">
                <NSelect
                  v-if="f.kind === 'weaponSelect'"
                  :value="profile.weapon ?? null"
                  @update:value="(v: string | null) => update(index, { weapon: v ?? undefined })"
                  :options="weaponOptions"
                  :placeholder="f.placeholder"
                  size="small"
                  filterable
                  clearable
                />
                <NSelect
                  v-else-if="f.kind === 'releaseSelect'"
                  :value="profile.releaseType ?? null"
                  @update:value="
                    (v: ReleaseType | null) => update(index, { releaseType: v ?? undefined })
                  "
                  :options="releaseOptions"
                  size="small"
                  clearable
                />
                <NSelect
                  v-else-if="f.kind === 'fuzeSelect'"
                  :value="profile.fuze ?? null"
                  @update:value="(v: Fuze | null) => update(index, { fuze: v ?? undefined })"
                  :options="fuzeOptions"
                  size="small"
                  clearable
                />
                <NInputNumber
                  v-else
                  :value="numVal(profile, f.key)"
                  @update:value="(v: number | null) => update(index, { [f.key]: v ?? undefined })"
                  :show-button="false"
                  :format="formatInteger"
                  :parse="parseInteger"
                  size="small"
                >
                  <template v-if="f.suffix" #suffix>{{ f.suffix }}</template>
                </NInputNumber>
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>
      </NCard>
    </NFlex>
  </NCard>
</template>

<style scoped>
/*
 * Mirror the spacing + subgrid alignment used in MissionDropZone: drop Naive's
 * implicit single-line feedback reserve in favor of a uniform trailing margin
 * on every form item (so the gap below an input matches the gap below a hint),
 * and equalize the label / control / hint row tracks across each multi-field
 * row so inputs stay aligned when one label wraps without pushing inputs down
 * when none do.
 */
:deep(.n-form-item) {
  margin-bottom: 24px;
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 0;
}

:deep(.n-form-item-feedback-wrapper:not(:empty)) {
  padding: 4px 0 0 2px;
  line-height: 1.3;
}

.wp-multi-field-row {
  grid-template-rows: auto auto auto;
  margin-bottom: 24px;
}

.wp-multi-field-row .wp-field-cell {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / span 3;
}

.wp-multi-field-row :deep(.n-form-item) {
  display: contents;
  margin-bottom: 0;
}

.wp-multi-field-row :deep(.n-form-item-label) {
  grid-row: 1;
}

.wp-multi-field-row :deep(.n-form-item-blank) {
  grid-row: 2;
}

.wp-multi-field-row :deep(.n-form-item-feedback-wrapper) {
  grid-row: 3;
}
</style>
