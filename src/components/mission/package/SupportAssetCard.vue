<script setup lang="ts">
import { NButton, NCard, NIcon } from 'naive-ui'
import {
  TrashOutline,
  ReorderThreeOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5'
import { SPACING } from '@/styles/design-tokens'
import SupportAssetFields from './SupportAssetFields.vue'
import type { SupportAsset } from '@/types'

type Props = {
  asset: SupportAsset
  index: number
  isFirst: boolean
  isLast: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof SupportAsset, value: SupportAsset[keyof SupportAsset]]
  remove: []
  'move-up': []
  'move-down': []
  dragstart: []
  dragover: [event: DragEvent]
  drop: []
}>()
</script>

<template>
  <div
    class="asset-item"
    draggable="true"
    @dragstart="emit('dragstart')"
    @dragover="emit('dragover', $event)"
    @drop="emit('drop')"
  >
    <NCard size="small">
      <div class="asset-row">
        <div class="drag-handle">
          <NIcon size="20"><ReorderThreeOutline /></NIcon>
        </div>
        <div class="mobile-controls">
          <NButton size="tiny" quaternary circle @click="emit('move-up')" :disabled="isFirst">
            <template #icon
              ><NIcon><ArrowUpOutline /></NIcon
            ></template>
          </NButton>
          <NButton size="tiny" quaternary circle @click="emit('move-down')" :disabled="isLast">
            <template #icon
              ><NIcon><ArrowDownOutline /></NIcon
            ></template>
          </NButton>
        </div>
        <SupportAssetFields
          :asset="asset"
          @update-field="
            (field: keyof SupportAsset, value: SupportAsset[keyof SupportAsset]) =>
              emit('update-field', field, value)
          "
        />
        <NButton size="small" @click="emit('remove')" type="error">
          <template #icon
            ><NIcon><TrashOutline /></NIcon
          ></template>
        </NButton>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.asset-item {
  cursor: move;
  transition: opacity 0.2s;
}

.asset-item:active {
  opacity: 0.5;
}

.asset-row {
  display: grid;
  grid-template-columns: v-bind('SPACING["2xl"]') 1fr auto;
  align-items: center;
  gap: v-bind('SPACING.md');
}

.drag-handle {
  display: grid;
  place-items: center;
  cursor: grab;
  align-self: center;
}

.drag-handle:active {
  cursor: grabbing;
}

.mobile-controls {
  display: none;
  gap: v-bind('SPACING.xs');
}

/* Mobile responsive styles */

/* Note: 768px matches BREAKPOINT.mobile from design-tokens.ts */
@media (width <= 768px) {
  .asset-row {
    display: flex;
    flex-direction: column;
    gap: v-bind('SPACING.md');
  }

  .drag-handle {
    display: none;
  }

  .mobile-controls {
    display: flex;
    justify-content: center;
  }
}
</style>
