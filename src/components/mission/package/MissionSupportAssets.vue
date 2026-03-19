<script setup lang="ts">
import { NButton, NCard, NIcon } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { SPACING } from '@/styles/design-tokens'
import SupportAssetCard from './SupportAssetCard.vue'
import type { SupportAsset } from '@/types'
import type { DragAndDropReturn } from '@/utils/useDragAndDrop'

type Props = {
  supportAssets: SupportAsset[]
  supportAssetDragDrop: DragAndDropReturn<SupportAsset>
}

defineProps<Props>()

const emit = defineEmits<{
  'add-support-asset': []
  'remove-support-asset': [index: number]
  'update-support-asset': [
    index: number,
    field: keyof SupportAsset,
    value: SupportAsset[keyof SupportAsset],
  ]
  'support-asset-drop': [index: number]
  'move-support-asset-up': [index: number]
  'move-support-asset-down': [index: number]
}>()
</script>

<template>
  <NCard title="Support Assets">
    <template #header-extra>
      <NButton type="primary" @click="emit('add-support-asset')">
        <template #icon
          ><NIcon><AddOutline /></NIcon
        ></template>
        Add Support Asset
      </NButton>
    </template>

    <div v-if="supportAssets.length === 0" class="empty-state">No support assets added</div>

    <div v-else class="asset-list">
      <SupportAssetCard
        v-for="(asset, index) in supportAssets"
        :key="index"
        :asset="asset"
        :index="index"
        :is-first="index === 0"
        :is-last="index === supportAssets.length - 1"
        @update-field="
          (field: keyof SupportAsset, value: SupportAsset[keyof SupportAsset]) =>
            emit('update-support-asset', index, field, value)
        "
        @remove="emit('remove-support-asset', index)"
        @move-up="emit('move-support-asset-up', index)"
        @move-down="emit('move-support-asset-down', index)"
        @dragstart="supportAssetDragDrop.handleDragStart(index)"
        @dragover="supportAssetDragDrop.handleDragOver"
        @drop="emit('support-asset-drop', index)"
      />
    </div>
  </NCard>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: v-bind('SPACING["4xl"]') v-bind('SPACING.xl');
  color: #999;
}

.asset-list {
  display: grid;
  gap: v-bind('SPACING.md');
}
</style>
