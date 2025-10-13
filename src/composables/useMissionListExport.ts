import { useMessage, useLoadingBar } from 'naive-ui'
import { exportAllImages, importAllImages, validateImagesData } from '@/utils/imageExport'
import { useMissionsStore } from '@/stores/missions'
import type { SerializedMission } from '@/utils/missionStorage'
import type { StoredImage } from '@/services/imageStorage'

const STORAGE_KEY = 'v303-missions'
const STORAGE_VERSION = 2

/**
 * Export file format
 */
export interface MissionListBackup {
  version: number
  missions: SerializedMission[]
  images: StoredImage[]
  exportedAt: string
}

/**
 * Parsed import result with metadata for confirmation
 */
export interface ImportPreview {
  missionCount: number
  imageCount: number
  totalSize: number
  exportedAt: string
  data: MissionListBackup
}

/**
 * Composable for exporting and importing the complete mission list
 */
export function useMissionListExport() {
  const message = useMessage()
  const loadingBar = useLoadingBar()
  const missionsStore = useMissionsStore()

  /**
   * Export all missions and images to a JSON file
   */
  async function exportMissionList() {
    loadingBar.start()
    try {
      message.info('Exporting missions...')

      // Get missions from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        message.warning('No missions to export')
        loadingBar.finish()
        return
      }

      const parsed = JSON.parse(stored)

      // Validate storage format
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('version' in parsed) ||
        parsed.version !== STORAGE_VERSION ||
        !Array.isArray(parsed.missions)
      ) {
        throw new Error('Invalid storage format')
      }

      // Get all images from IndexedDB
      const images = await exportAllImages()

      // Create backup object
      const backup: MissionListBackup = {
        version: STORAGE_VERSION,
        missions: parsed.missions,
        images,
        exportedAt: new Date().toISOString(),
      }

      // Create filename with timestamp
      const date = new Date().toISOString().split('T')[0]
      const filename = `v303-missions-backup-${date}.json`

      // Download file
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      loadingBar.finish()
      message.success(
        `Exported ${parsed.missions.length} mission${parsed.missions.length !== 1 ? 's' : ''} and ${images.length} image${images.length !== 1 ? 's' : ''}`,
      )
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to export missions: ${error}`)
      console.error('Export error:', error)
    }
  }

  /**
   * Parse and validate an imported backup file
   * @param file - The uploaded JSON file
   * @returns ImportPreview with metadata and parsed data
   */
  async function parseImportFile(file: File): Promise<ImportPreview> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const data = JSON.parse(content)

          // Validate backup structure
          if (!validateBackupData(data)) {
            throw new Error(
              'Invalid backup file format. Please ensure you are importing a valid mission backup file.',
            )
          }

          // Calculate total size
          const totalSize = new Blob([content]).size

          const preview: ImportPreview = {
            missionCount: data.missions.length,
            imageCount: data.images.length,
            totalSize,
            exportedAt: data.exportedAt || 'Unknown',
            data,
          }

          resolve(preview)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Validate backup data structure
   */
  function validateBackupData(data: unknown): data is MissionListBackup {
    if (!data || typeof data !== 'object') {
      return false
    }

    const backup = data as Partial<MissionListBackup>

    // Check required fields
    if (
      typeof backup.version !== 'number' ||
      backup.version !== STORAGE_VERSION ||
      !Array.isArray(backup.missions) ||
      !Array.isArray(backup.images)
    ) {
      return false
    }

    // Validate missions array (basic check)
    if (
      !backup.missions.every(
        (m) =>
          typeof m === 'object' &&
          m !== null &&
          typeof m.id === 'string' &&
          typeof m.n === 'string',
      )
    ) {
      return false
    }

    // Validate images array
    if (!validateImagesData(backup.images)) {
      return false
    }

    return true
  }

  /**
   * Apply the imported backup, replacing all existing missions and images
   * @param backup - The validated backup data
   */
  async function applyMissionImport(backup: MissionListBackup) {
    loadingBar.start()
    try {
      message.info('Importing missions...')

      // Import images to IndexedDB
      await importAllImages(backup.images)

      // Replace localStorage with imported missions
      const storageData = {
        version: backup.version,
        missions: backup.missions,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))

      // Reload the missions store from the new localStorage data
      missionsStore.loadFromStorage()

      loadingBar.finish()
      message.success(
        `Imported ${backup.missions.length} mission${backup.missions.length !== 1 ? 's' : ''} and ${backup.images.length} image${backup.images.length !== 1 ? 's' : ''}`,
      )
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to import missions: ${error}`)
      console.error('Import error:', error)
      throw error
    }
  }

  return {
    exportMissionList,
    parseImportFile,
    applyMissionImport,
  }
}
