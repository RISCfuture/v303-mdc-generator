<script setup lang="ts">
import { NButton, NCard, NIcon } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { SPACING } from '@/styles/design-tokens'
import PackageMemberCard from './PackageMemberCard.vue'
import type { PackageMember } from '@/types'
import type { DragAndDropReturn } from '@/utils/useDragAndDrop'

interface Props {
  packageMembers: PackageMember[]
  packageDragDrop: DragAndDropReturn<PackageMember>
}

defineProps<Props>()

const emit = defineEmits<{
  'add-package-member': []
  'remove-package-member': [index: number]
  'update-package-member': [index: number, field: keyof PackageMember, value: unknown]
  'package-drop': [index: number]
  'move-package-up': [index: number]
  'move-package-down': [index: number]
}>()
</script>

<template>
  <NCard title="Package Members">
    <template #header-extra>
      <NButton type="primary" @click="emit('add-package-member')">
        <template #icon
          ><NIcon><AddOutline /></NIcon
        ></template>
        Add Package Member
      </NButton>
    </template>

    <div v-if="packageMembers.length === 0" class="empty-state">No package members added</div>

    <div v-else class="package-list">
      <PackageMemberCard
        v-for="(member, index) in packageMembers"
        :key="index"
        :member="member"
        :index="index"
        :is-first="index === 0"
        :is-last="index === packageMembers.length - 1"
        @update-field="
          (field: keyof PackageMember, value: unknown) =>
            emit('update-package-member', index, field, value)
        "
        @remove="emit('remove-package-member', index)"
        @move-up="emit('move-package-up', index)"
        @move-down="emit('move-package-down', index)"
        @dragstart="packageDragDrop.handleDragStart(index)"
        @dragover="packageDragDrop.handleDragOver"
        @drop="emit('package-drop', index)"
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

.package-list {
  display: grid;
  gap: v-bind('SPACING.md');
}
</style>
