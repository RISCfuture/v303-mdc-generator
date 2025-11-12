<template>
  <n-alert
    v-if="shouldShowWarning && !isDismissed"
    :type="alertType"
    :title="alertTitle"
    closable
    @close="handleDismiss"
    class="storage-warning"
  >
    <div class="storage-warning-content">
      <p>{{ warningMessage }}</p>
      <div class="storage-stats">
        <n-space vertical :size="4">
          <div class="stat-row">
            <n-text depth="2">Missions stored:</n-text>
            <n-text strong tag="span" style="font-family: 'SF Mono', Monaco, Consolas, monospace">{{
              formatInteger(missionCount)
            }}</n-text>
          </div>
          <div class="stat-row">
            <n-text depth="2">Storage used:</n-text>
            <n-text strong tag="span" style="font-family: 'SF Mono', Monaco, Consolas, monospace"
              >{{ formattedUsage }} ({{ percentFormatter.format(percentUsed) }})</n-text
            >
          </div>
          <div class="stat-row">
            <n-text depth="2">Estimated capacity:</n-text>
            <n-text strong tag="span" style="font-family: 'SF Mono', Monaco, Consolas, monospace"
              >~{{ formatInteger(estimatedRemaining) }} more missions</n-text
            >
          </div>
        </n-space>
      </div>
      <n-space class="storage-actions" :size="8">
        <n-button size="small" @click="showDetails = !showDetails">
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </n-button>
        <n-button
          v-if="warningLevel === 'critical' || warningLevel === 'full'"
          size="small"
          type="primary"
          @click="$emit('manage-storage')"
        >
          Manage Missions
        </n-button>
      </n-space>
      <n-collapse-transition :show="showDetails">
        <n-space vertical :size="12" class="storage-details">
          <n-divider />
          <n-space vertical :size="4">
            <div class="stat-row">
              <n-text depth="2">Space remaining:</n-text>
              <n-text
                strong
                tag="span"
                style="font-family: 'SF Mono', Monaco, Consolas, monospace"
                >{{ formattedRemaining }}</n-text
              >
            </div>
            <div class="stat-row">
              <n-text depth="2">Average mission size:</n-text>
              <n-text
                strong
                tag="span"
                style="font-family: 'SF Mono', Monaco, Consolas, monospace"
                >{{ formatBytes(stats?.averageMissionSize ?? 0) }}</n-text
              >
            </div>
            <n-text depth="3" tag="p" style="margin: 0; line-height: 1.5">
              <n-text strong>Tip:</n-text> Export missions you want to keep long-term as JSON files,
              then delete them from the app to free up space. You can re-import them later if
              needed.
            </n-text>
          </n-space>
        </n-space>
      </n-collapse-transition>
    </div>
  </n-alert>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NAlert, NSpace, NButton, NCollapseTransition, NDivider, NText } from 'naive-ui'
import { useStorageMonitor } from '@/composables/useStorageMonitor'
import { formatBytes } from '@/utils/storageAnalysis'
import { formatInteger } from '@/utils/numberFormatting'

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

defineEmits<{
  'manage-storage': []
}>()

const {
  stats,
  shouldShowWarning,
  warningLevel,
  warningMessage,
  percentUsed,
  missionCount,
  estimatedRemaining,
  formattedUsage,
  formattedRemaining,
} = useStorageMonitor()

const isDismissed = ref(false)
const showDetails = ref(false)

// Reset dismissal if warning level changes
watch(warningLevel, () => {
  isDismissed.value = false
})

const alertType = computed(() => {
  switch (warningLevel.value) {
    case 'critical':
    case 'full':
      return 'error'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
})

const alertTitle = computed(() => {
  switch (warningLevel.value) {
    case 'full':
      return 'Storage Full'
    case 'critical':
      return 'Storage Almost Full'
    case 'warning':
      return 'Storage Running Low'
    default:
      return 'Storage Notice'
  }
})

function handleDismiss() {
  isDismissed.value = true
}
</script>

<style scoped>
.storage-warning {
  margin-bottom: 16px;
}

.storage-warning-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.storage-warning-content > p {
  margin: 0;
}

.storage-stats {
  background: rgb(0 0 0 / 5%);
  padding: 12px;
  border-radius: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.storage-actions {
  margin-top: 4px;
}
</style>
