<script setup lang="ts">
import { NAutoComplete, NInput, NInputNumber } from 'naive-ui'
import { FONT_SIZE, SPACING } from '@/styles/design-tokens'
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

interface Props {
  asset: SupportAsset
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof SupportAsset, value: unknown]
}>()

// Role options - common presets that users can select or override
const roleOptions = ['AAR', 'JSTARS', 'AWACS']
</script>

<template>
  <div class="asset-fields">
    <div class="field">
      <label>Callsign</label>
      <NInput
        :value="asset.callsign"
        @update:value="(v: string) => emit('update-field', 'callsign', v)"
        size="small"
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
      />
    </div>
    <div class="field field-small">
      <label>Freq</label>
      <NInput
        :value="asset.frequency"
        @update:value="(v: string) => emit('update-field', 'frequency', v)"
        placeholder="305.5"
        size="small"
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
        @update:value="(v: number | null) => emit('update-field', 'altitude', v ?? 0)"
        :show-button="false"
        :format="formatInteger"
        :parse="parseInteger"
        placeholder="0"
        size="small"
      >
        <template #suffix>ft</template>
      </NInputNumber>
    </div>
  </div>
</template>

<style scoped>
.asset-fields {
  display: flex;
  flex-wrap: wrap;
  gap: v-bind('SPACING.sm');
  width: 100%;
  align-items: end;
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

/* Mobile responsive styles */
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
