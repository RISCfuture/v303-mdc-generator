<script setup lang="ts">
import { NButton, NCard, NTag, NIcon, NText, NDivider, NSpace } from 'naive-ui'
import { CreateOutline, CopyOutline, TrashOutline, ShareOutline } from '@vicons/ionicons5'
import { getSquadronDisplayName } from '@/data/squadrons'
import { theaterDatabase } from '@/data/theaters'
import { formatDate, formatDateTime } from '@/utils/formatting'
import type { Mission } from '@/types'

interface Props {
  mission: Mission
}

defineProps<Props>()

const emit = defineEmits<{
  edit: []
  duplicate: []
  delete: []
  export: []
}>()
</script>

<template>
  <NCard size="small" class="mission-card">
    <NSpace vertical :size="16">
      <NSpace vertical :size="8">
        <h3>{{ mission.name || 'Untitled Mission' }}</h3>
        <div class="mission-meta">
          <NTag v-if="mission.callsign" type="default" size="small">{{ mission.callsign }}</NTag>
          <NTag v-if="mission.type" type="info" size="small">{{ mission.type }}</NTag>
        </div>
      </NSpace>

      <div class="mission-details">
        <div class="detail-row">
          <span class="label">Squadron:</span>
          <NTag :type="mission.squadron === 'v93' ? 'success' : 'warning'" size="small">
            {{ getSquadronDisplayName(mission.squadron) }}
          </NTag>
        </div>
        <div class="detail-row">
          <span class="label">Theater:</span>
          <span>{{ theaterDatabase[mission.theater]?.displayName || mission.theater }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date:</span>
          <span>{{ formatDate(mission.date) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Updated:</span>
          <NText depth="3" style="font-size: 12px">{{ formatDateTime(mission.updatedAt) }}</NText>
        </div>
      </div>

      <NDivider />

      <div class="mission-actions">
        <NButton size="small" @click="emit('edit')">
          <template #icon
            ><NIcon><CreateOutline /></NIcon
          ></template>
          Edit
        </NButton>
        <NButton size="small" @click="emit('duplicate')">
          <template #icon
            ><NIcon><CopyOutline /></NIcon
          ></template>
          Duplicate
        </NButton>
        <NButton size="small" @click="emit('export')">
          <template #icon
            ><NIcon><ShareOutline /></NIcon
          ></template>
          Export
        </NButton>
        <NButton size="small" type="error" @click="emit('delete')">
          <template #icon
            ><NIcon><TrashOutline /></NIcon
          ></template>
          Delete
        </NButton>
      </div>
    </NSpace>
  </NCard>
</template>

<style scoped>
.mission-card {
  height: 100%;
}

.mission-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.mission-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mission-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.detail-row .label {
  font-weight: 500;
  min-width: 70px;
}

.mission-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Mobile responsive styles */
@media (width <= 768px) {
  .mission-actions {
    flex-direction: column;
  }

  .mission-actions button {
    width: 100%;
  }
}
</style>
