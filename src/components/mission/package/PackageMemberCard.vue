<script setup lang="ts">
import { NButton, NCard, NIcon } from 'naive-ui'
import {
  TrashOutline,
  ReorderThreeOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5'
import { SPACING } from '@/styles/design-tokens'
import PackageMemberFields from './PackageMemberFields.vue'
import type { PackageMember } from '@/types'

interface Props {
  member: PackageMember
  index: number
  isFirst: boolean
  isLast: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof PackageMember, value: unknown]
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
    class="package-item"
    draggable="true"
    @dragstart="emit('dragstart')"
    @dragover="emit('dragover', $event)"
    @drop="emit('drop')"
  >
    <NCard size="small">
      <div class="package-row">
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
        <PackageMemberFields
          :member="member"
          @update-field="
            (field: keyof PackageMember, value: unknown) => emit('update-field', field, value)
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
.package-item {
  cursor: move;
  transition: opacity 0.2s;
}

.package-item:active {
  opacity: 0.5;
}

.package-row {
  display: flex;
  align-items: center;
  gap: v-bind('SPACING.md');
}

.drag-handle {
  display: grid;
  place-items: center;
  cursor: grab;
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
  .package-row {
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
