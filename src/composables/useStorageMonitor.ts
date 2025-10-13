/**
 * Storage monitoring composable
 * Provides reactive storage status and warnings
 */

import { ref, computed, onMounted } from 'vue'
import {
  getStorageStatus,
  calculateStorageStats,
  type StorageStatus,
  type StorageStats,
  formatBytes,
} from '@/utils/storageAnalysis'

export function useStorageMonitor() {
  const stats = ref<StorageStats | null>(null)
  const status = ref<StorageStatus | null>(null)
  const isLoading = ref(true)

  // Computed properties for easy access
  const shouldShowWarning = computed(() => status.value?.shouldWarn ?? false)
  const warningLevel = computed(() => status.value?.level ?? 'ok')
  const warningMessage = computed(() => status.value?.message ?? '')
  const percentUsed = computed(() => stats.value?.percentUsed ?? 0)
  const missionCount = computed(() => stats.value?.missionCount ?? 0)
  const estimatedRemaining = computed(() => stats.value?.estimatedMissionsRemaining ?? 0)

  // Format helpers
  const formattedUsage = computed(() => {
    if (!stats.value) return '0 Bytes'
    return formatBytes(stats.value.totalBytes)
  })

  const formattedRemaining = computed(() => {
    if (!stats.value) return '0 Bytes'
    return formatBytes(stats.value.remainingBytes)
  })

  /**
   * Refresh storage statistics
   */
  async function refresh() {
    isLoading.value = true
    try {
      const [newStats, newStatus] = await Promise.all([calculateStorageStats(), getStorageStatus()])
      stats.value = newStats
      status.value = newStatus
    } catch (error) {
      console.error('Failed to refresh storage stats:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Auto-refresh on mount
  onMounted(() => {
    refresh()
  })

  return {
    // State
    stats,
    status,
    isLoading,

    // Computed
    shouldShowWarning,
    warningLevel,
    warningMessage,
    percentUsed,
    missionCount,
    estimatedRemaining,
    formattedUsage,
    formattedRemaining,

    // Methods
    refresh,
  }
}
