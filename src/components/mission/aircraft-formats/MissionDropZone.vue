<script setup lang="ts">
import { NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NGrid, NGi, NDivider } from 'naive-ui'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import { parseTOT } from '@/composables/useWaypointCalculations'
import { FORM } from '@/styles/design-tokens'
import type { Mission, DropZoneData, CoordinateFormat } from '@/types'

type Props = {
  mission: Mission
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:field': [field: keyof Mission, value: Mission[keyof Mission]]
}>()

type FieldKind = 'text' | 'time' | 'coordFormat' | 'float' | 'int'

type FieldSpec = {
  key: keyof DropZoneData
  label: string
  kind: FieldKind
  suffix?: string
  hint?: string
  placeholder?: string
}

// Each entry in `rows` is one form row; closely-related fields share a row,
// everything else is its own (vertical) row.
type Section = {
  title: string
  rows: FieldSpec[][]
}

const SECTIONS: Section[] = [
  {
    title: 'Drop Zone',
    rows: [
      [{ key: 'dzName', label: 'Drop Zone Name', kind: 'text' }],
      [
        { key: 'piLatitude', label: 'Point of Impact Latitude', kind: 'float', suffix: '°' },
        { key: 'piLongitude', label: 'Point of Impact Longitude', kind: 'float', suffix: '°' },
        { key: 'piCoordinateFormat', label: 'Coordinate Format', kind: 'coordFormat' },
        { key: 'dzElevation', label: 'Drop Zone Elevation', kind: 'int', suffix: 'ft' },
      ],
      [
        {
          key: 'runInCourse',
          label: 'Run-In Course',
          kind: 'int',
          suffix: '°',
          hint: 'Inbound heading flown to the point of impact',
        },
        {
          key: 'tot',
          label: 'Time Over Target',
          kind: 'time',
          placeholder: 'HHMM',
        },
      ],
    ],
  },
  {
    title: 'Load',
    rows: [
      [
        {
          key: 'loadType',
          label: 'Load Type',
          kind: 'text',
          hint: 'e.g. CDS — Container Delivery System',
        },
        { key: 'dropPayload', label: 'Drop Payload', kind: 'text' },
      ],
      [{ key: 'fuselageStation', label: 'Fuselage Station', kind: 'text' }],
      [
        { key: 'stage', label: 'Stage', kind: 'text' },
        {
          key: 'releaseSystem',
          label: 'Release System',
          kind: 'text',
          hint: 'e.g. CRS — Combat Release System',
        },
        { key: 'chuteCount', label: 'Chute Count', kind: 'int' },
      ],
    ],
  },
  {
    title: 'CARP — Computed Air Release Point',
    rows: [
      [
        {
          key: 'carpLeTe',
          label: 'CARP LE-TE',
          kind: 'int',
          suffix: 'ft',
          hint: 'Leading edge to trailing edge',
        },
        {
          key: 'carpLePi',
          label: 'CARP LE-PI',
          kind: 'int',
          suffix: 'ft',
          hint: 'Leading edge to point of impact',
        },
      ],
      [
        {
          key: 'carpSd',
          label: 'SD Distance',
          kind: 'int',
          suffix: 'ft',
          hint: 'Stopping distance',
        },
        {
          key: 'carpTp',
          label: 'TP Distance',
          kind: 'int',
          suffix: 'ft',
          hint: 'Transition point',
        },
      ],
      [
        { key: 'obstructionElevation', label: 'Obstruction Elevation', kind: 'int', suffix: 'ft' },
        { key: 'requiredClearanceHeight', label: 'Required Clearance Height', kind: 'int', suffix: 'ft' },
        { key: 'minDropHeight', label: 'Minimum Drop Height', kind: 'int', suffix: 'ft' },
      ],
    ],
  },
  {
    title: 'Winds & Temperature',
    rows: [
      [
        {
          key: 'altWind',
          label: 'Altitude Wind / Velocity',
          kind: 'text',
          placeholder: 'DDD/SS',
          hint: 'Direction/speed at drop altitude',
        },
        { key: 'altTemp', label: 'Altitude Temperature', kind: 'int', suffix: '°C' },
      ],
      [
        {
          key: 'surfaceWind',
          label: 'Surface Wind / Velocity',
          kind: 'text',
          placeholder: 'DDD/SS',
          hint: 'Direction/speed at the surface',
        },
        { key: 'surfaceTemp', label: 'Surface Temperature', kind: 'int', suffix: '°C' },
      ],
    ],
  },
]

const coordFormatOptions: { label: string; value: CoordinateFormat }[] = [
  { label: 'DDM', value: 'DDM' },
  { label: 'DMS', value: 'DMS' },
  { label: 'DD', value: 'DD' },
  { label: 'MGRS', value: 'MGRS' },
]

function rowKey(row: FieldSpec[]): string {
  return row.map((f) => f.key).join('-')
}

function strVal(key: keyof DropZoneData): string {
  const v = props.mission.dropZone?.[key]
  return typeof v === 'string' ? v : ''
}

function numVal(key: keyof DropZoneData): number | null {
  const v = props.mission.dropZone?.[key]
  return typeof v === 'number' ? v : null
}

// Match the steerpoint TOT field: highlight unparseable values inline.
function totStatus(key: keyof DropZoneData): 'error' | undefined {
  const v = strVal(key)
  return v && parseTOT(v) === null ? 'error' : undefined
}

function update(patch: Partial<DropZoneData>) {
  const next: DropZoneData = { ...props.mission.dropZone, ...patch }
  emit('update:field', 'dropZone', next)
}
</script>

<template>
  <NCard title="Drop Zone / CARP">
    <NForm label-placement="top" :style="{ maxWidth: FORM.maxWidth }">
      <template v-for="section in SECTIONS" :key="section.title">
        <NDivider title-placement="left">{{ section.title }}</NDivider>
        <NGrid
          v-for="row in section.rows"
          :key="rowKey(row)"
          :class="{ 'dz-multi-field-row': row.length > 1 }"
          :cols="row.length"
          :x-gap="12"
        >
          <NGi v-for="f in row" :key="f.key" class="dz-field-cell">
            <NFormItem :label="f.label" :feedback="f.hint">
              <NInput
                v-if="f.kind === 'text'"
                :value="strVal(f.key)"
                @update:value="(v: string) => update({ [f.key]: v })"
                :placeholder="f.placeholder"
                size="small"
                autocorrect="off"
              />
              <NInput
                v-else-if="f.kind === 'time'"
                :value="strVal(f.key)"
                @update:value="(v: string) => update({ [f.key]: v })"
                :placeholder="f.placeholder"
                :status="totStatus(f.key)"
                size="small"
                autocorrect="off"
              >
                <template #suffix>Z</template>
              </NInput>
              <NSelect
                v-else-if="f.kind === 'coordFormat'"
                :value="mission.dropZone?.piCoordinateFormat ?? 'DDM'"
                @update:value="(v: CoordinateFormat) => update({ piCoordinateFormat: v })"
                :options="coordFormatOptions"
                size="small"
              />
              <NInputNumber
                v-else-if="f.kind === 'float'"
                :value="numVal(f.key)"
                @update:value="(v: number | null) => update({ [f.key]: v })"
                :show-button="false"
                size="small"
              >
                <template v-if="f.suffix" #suffix>{{ f.suffix }}</template>
              </NInputNumber>
              <NInputNumber
                v-else
                :value="numVal(f.key)"
                @update:value="(v: number | null) => update({ [f.key]: v ?? undefined })"
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
      </template>
    </NForm>
  </NCard>
</template>

<style scoped>
/*
 * Naive UI gives a field with no hint an empty, single-line (24px) feedback
 * slot — that reserved slot is the entire gap below the input. A field WITH a
 * hint fills that slot with text, leaving almost nothing below it, so hint
 * fields look cramped next to non-hint ones. Drop the implicit feedback
 * reserve and instead apply a uniform margin below every form item, so the
 * space AFTER the content (input or hint) is identical with or without a hint.
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

/*
 * In a multi-field row, Naive sizes each NFormItem's label area to its OWN
 * content, so a label that wraps to two lines pushes only its own input down
 * and the row's inputs no longer line up — yet a fixed reservation would push
 * every input down even when nothing wraps. Use a subgrid: dissolve the
 * NFormItem box so its label / control / hint become items of the NGi cell,
 * and have each cell adopt three shared row tracks from the row grid. Each
 * track then sizes to the tallest cell in that row, so inputs always align
 * while the label track stays only as tall as the row actually needs.
 */
.dz-multi-field-row {
  grid-template-rows: auto auto auto;
  margin-bottom: 24px;
}

.dz-multi-field-row .dz-field-cell {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / span 3;
}

.dz-multi-field-row :deep(.n-form-item) {
  display: contents;
  margin-bottom: 0;
}

.dz-multi-field-row :deep(.n-form-item-label) {
  grid-row: 1;
}

.dz-multi-field-row :deep(.n-form-item-blank) {
  grid-row: 2;
}

.dz-multi-field-row :deep(.n-form-item-feedback-wrapper) {
  grid-row: 3;
}
</style>
