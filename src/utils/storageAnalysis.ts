/**
 * Storage analysis utilities
 * Monitors localStorage usage and provides warnings when approaching limits
 */

import { serializeMission } from './missionStorage'
import type { Mission } from '@/types'
import { imageStorage } from '@/services/imageStorage'

const STORAGE_KEY = 'v303-missions'

/**
 * Browser localStorage limits (in bytes)
 * Most browsers provide 5-10MB, but we use conservative estimate
 */
export const STORAGE_LIMITS = {
  TYPICAL_LIMIT: 5 * 1024 * 1024, // 5MB - typical minimum across browsers
  CONSERVATIVE_LIMIT: 4.5 * 1024 * 1024, // 4.5MB - safe limit to avoid hitting ceiling
  WARNING_THRESHOLD: 0.8, // Warn at 80% capacity
  CRITICAL_THRESHOLD: 0.9, // Critical warning at 90% capacity
}

export interface StorageStats {
  totalBytes: number
  missionCount: number
  averageMissionSize: number
  percentUsed: number
  remainingBytes: number
  estimatedMissionsRemaining: number
  quotaAvailable?: number // Actual quota if available from browser API
  imageStorageBytes?: number // Size of IndexedDB image storage
  imageCount?: number // Number of images in IndexedDB
  totalStorageBytes?: number // Combined localStorage + IndexedDB
}

export interface StorageStatus {
  stats: StorageStats
  level: 'ok' | 'warning' | 'critical' | 'full'
  message: string
  shouldWarn: boolean
}

/**
 * Get the size in bytes of a string (UTF-16)
 */
function getStringByteSize(str: string): number {
  // JavaScript strings are UTF-16, each character is 2 bytes
  return new Blob([str]).size
}

/**
 * Get current storage quota using StorageManager API if available
 */
async function getStorageQuota(): Promise<number | undefined> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      return estimate.quota
    } catch (e) {
      console.warn('Failed to get storage quota:', e)
    }
  }
  return undefined
}

/**
 * Calculate storage statistics for missions
 */
export async function calculateStorageStats(): Promise<StorageStats> {
  const stored = localStorage.getItem(STORAGE_KEY)
  const totalBytes = stored ? getStringByteSize(stored) : 0

  let missionCount = 0
  let averageMissionSize = 0

  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed && Array.isArray(parsed.missions)) {
        missionCount = parsed.missions.length
        if (missionCount > 0) {
          averageMissionSize = totalBytes / missionCount
        }
      }
    } catch (e) {
      console.error('Failed to parse storage data:', e)
    }
  }

  // Get IndexedDB image storage size
  let imageStorageBytes = 0
  let imageCount = 0
  try {
    imageStorageBytes = await imageStorage.getStorageSize()
    const images = await imageStorage.getAllImages()
    imageCount = images.length
  } catch (e) {
    console.warn('Failed to get image storage stats:', e)
  }

  // Try to get actual quota from browser
  const quotaAvailable = await getStorageQuota()
  const effectiveLimit = quotaAvailable || STORAGE_LIMITS.CONSERVATIVE_LIMIT

  const totalStorageBytes = totalBytes + imageStorageBytes
  const percentUsed = totalStorageBytes / effectiveLimit
  const remainingBytes = Math.max(0, effectiveLimit - totalStorageBytes)
  const estimatedMissionsRemaining =
    averageMissionSize > 0 ? Math.floor(remainingBytes / averageMissionSize) : 0

  return {
    totalBytes,
    missionCount,
    averageMissionSize: Math.round(averageMissionSize),
    percentUsed,
    remainingBytes,
    estimatedMissionsRemaining,
    quotaAvailable,
    imageStorageBytes,
    imageCount,
    totalStorageBytes,
  }
}

/**
 * Get storage status with warning level
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const stats = await calculateStorageStats()
  const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })

  let level: StorageStatus['level'] = 'ok'
  let message = `Using ${percentFormatter.format(stats.percentUsed)} of available storage`
  let shouldWarn = false

  if (stats.percentUsed >= 1.0) {
    level = 'full'
    message = `Storage is full! Please delete some missions to free up space.`
    shouldWarn = true
  } else if (stats.percentUsed >= STORAGE_LIMITS.CRITICAL_THRESHOLD) {
    level = 'critical'
    message = `Storage is ${percentFormatter.format(stats.percentUsed)} full. Please delete some missions soon.`
    shouldWarn = true
  } else if (stats.percentUsed >= STORAGE_LIMITS.WARNING_THRESHOLD) {
    level = 'warning'
    message = `Storage is ${percentFormatter.format(stats.percentUsed)} full. Consider deleting old missions.`
    shouldWarn = true
  }

  return {
    stats,
    level,
    message,
    shouldWarn,
  }
}

/**
 * Estimate the size of a mission if it were to be stored
 * @internal - Only exported for testing
 */
export function estimateMissionSize(mission: Mission): number {
  const serialized = serializeMission(mission)
  const json = JSON.stringify(serialized)
  return getStringByteSize(json)
}

/**
 * Format bytes for human-readable display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
