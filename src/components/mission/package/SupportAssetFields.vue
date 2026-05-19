<script setup lang="ts">
import { NAutoComplete, NInput, NInputNumber, NSelect, NFlex } from 'naive-ui'
import { FONT_SIZE } from '@/styles/design-tokens'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import type { SupportAsset } from '@/types'

// Simple formatter for preset numbers (no thousand separators)
function formatPreset(value: number | null): string {
  return value !== null ? value.toString() : ''
}

function parsePreset(value: string): number | null {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

type Props = {
  asset: SupportAsset
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof SupportAsset, value: SupportAsset[keyof SupportAsset]]
}>()

// Role options - common presets that users can select or override
const roleOptions = ['AAR', 'JSTARS', 'AWACS']

// Structured grouping used by the F-16 support layout (optional)
const assetKindOptions = [
  { label: 'Tanker', value: 'TANKER' },
  { label: 'AWACS', value: 'AWACS' },
  { label: 'ISR', value: 'ISR' },
  { label: 'Other', value: 'OTHER' },
]
</script>

<template>
  <NFlex wrap :size="8" align="end" class="asset-fields">
    <div class="field">
      <label>Callsign</label>
      <NInput
        :value="asset.callsign"
        @update:value="(v: string) => emit('update-field', 'callsign', v)"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-small">
      <label>Role</label>
      <NAutoComplete
        :value="asset.role"
        @update:value="(v: string) => emit('update-field', 'role', v)"
        :options="roleOptions"
        :get-show="() => true"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-small">
      <label>Freq</label>
      <NInput
        :value="asset.frequency"
        @update:value="(v: string) => emit('update-field', 'frequency', v)"
        placeholder="305.5"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-small">
      <label>Preset</label>
      <NInputNumber
        :value="asset.preset"
        @update:value="(v: number | null) => emit('update-field', 'preset', v)"
        :show-button="false"
        :format="formatPreset"
        :parse="parsePreset"
        placeholder=""
        size="small"
      />
    </div>
    <div class="field field-small">
      <label>A/A TACAN</label>
      <NInput
        :value="asset.aaTacan"
        @update:value="(v: string) => emit('update-field', 'aaTacan', v)"
        placeholder="5Y"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-expand">
      <label>Location</label>
      <NInput
        :value="asset.location"
        @update:value="(v: string) => emit('update-field', 'location', v)"
        size="small"
      />
    </div>
    <div class="field field-small">
      <label>Altitude</label>
      <NInputNumber
        :value="asset.altitude"
        @update:value="(v: number | null) => emit('update-field', 'altitude', v)"
        :show-button="false"
        :format="formatInteger"
        :parse="parseInteger"
        placeholder=""
        size="small"
      >
        <template #suffix>ft</template>
      </NInputNumber>
    </div>
    <div class="field field-small">
      <label>Kind</label>
      <NSelect
        :value="asset.assetKind ?? null"
        @update:value="(v: 'TANKER' | 'AWACS' | 'ISR' | 'OTHER') => emit('update-field', 'assetKind', v)"
        :options="assetKindOptions"
        size="small"
        clearable
        placeholder=""
      />
    </div>
    <div class="field field-small">
      <label>UHF</label>
      <NInput
        :value="asset.uhf ?? ''"
        @update:value="(v: string) => emit('update-field', 'uhf', v)"
        size="small"
        autocorrect="off"
      />
    </div>
    <div class="field field-expand">
      <label>Notes</label>
      <NInput
        :value="asset.notes ?? ''"
        @update:value="(v: string) => emit('update-field', 'notes', v)"
        size="small"
        autocorrect="off"
      />
    </div>
  </NFlex>
</template>

<style scoped>
.asset-fields {
  width: 100%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 1 auto;
}

.field label {
  font-size: v-bind('FONT_SIZE.xs');
  font-weight: 500;
  color: #666;
}

.field-small {
  width: 120px;
}

.field-expand {
  flex: 1 1 200px;
}

/* Note: 768px matches BREAKPOINT.mobile from design-tokens.ts */
@media (width <= 768px) {
  .field {
    width: 100% !important;
  }

  .field-small {
    width: 100%;
  }

  .field-expand {
    flex: 1 1 100%;
  }
}
</style>
