import { useMessage, useLoadingBar } from 'naive-ui'
import * as Sentry from '@sentry/vue'
import { exportAllImages, importAllImages, validateImagesData } from '@/utils/imageExport'
import { useMissionsStore } from '@/stores/missions'
import { serializeMission } from '@/utils/missionStorage'
import { imageStorage } from '@/services/imageStorage'
import type { SerializedMission } from '@/utils/missionStorage'
import type { StoredImage } from '@/services/imageStorage'
import type { Mission } from '@/types'

const STORAGE_KEY = 'v303-missions'
const STORAGE_VERSION = 2

/**
 * Export file format for full backup
 */
export interface MissionListBackup {
  version: number
  missions: SerializedMission[]
  images: StoredImage[]
  exportedAt: string
}

/**
 * Export file format for single mission
 */
export interface SingleMissionExport {
  version: number
  mission: SerializedMission
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
 * Import data can be either a full backup or a single mission
 */
export type ImportData = MissionListBackup | SingleMissionExport

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
      Sentry.metrics.count('mission.exported', 1, {
        attributes: { type: 'backup' },
      })
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to export missions: ${error}`)
      console.error('Export error:', error)
    }
  }

  /**
   * Export a single mission to a JSON file
   */
  async function exportSingleMission(mission: Mission) {
    loadingBar.start()
    try {
      message.info('Exporting mission...')

      // Serialize the mission
      const serialized = serializeMission(mission)

      // Get images for this mission from IndexedDB
      const images = await imageStorage.getImagesByMission(mission.id)

      // Create export object (single mission, not array)
      const singleExport: SingleMissionExport = {
        version: STORAGE_VERSION,
        mission: serialized,
        images,
        exportedAt: new Date().toISOString(),
      }

      // Create filename using mission name and date
      const missionName = mission.name || 'untitled-mission'
      const sanitizedName = missionName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      const date = new Date().toISOString().split('T')[0]
      const filename = `${sanitizedName}-${date}.json`

      // Download file
      const json = JSON.stringify(singleExport, null, 2)
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
      message.success(`Exported mission "${mission.name || 'Untitled Mission'}"`)
      Sentry.metrics.count('mission.exported', 1, {
        attributes: { type: 'single_backup', squadron: mission.squadron },
      })
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to export mission: ${error}`)
      console.error('Export error:', error)
    }
  }

  /**
   * Parse and validate an imported backup file
   * @param file - The uploaded JSON file
   * @returns ImportPreview for full backup, or SingleMissionExport for single mission
   */
  async function parseImportFile(file: File): Promise<ImportPreview | SingleMissionExport> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const data = JSON.parse(content)

          // Check if it's a single mission (has 'mission' property) or full backup (has 'missions' array)
          if (
            data &&
            typeof data === 'object' &&
            'mission' in data &&
            !Array.isArray(data.missions)
          ) {
            // Single mission import
            if (!validateSingleMissionData(data)) {
              throw new Error('Invalid single mission file format.')
            }
            resolve(data as SingleMissionExport)
          } else {
            // Full backup import
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
          }
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Validate single mission data structure
   */
  function validateSingleMissionData(data: unknown): data is SingleMissionExport {
    if (!data || typeof data !== 'object') {
      return false
    }

    const singleExport = data as Partial<SingleMissionExport>

    // Check required fields
    if (
      typeof singleExport.version !== 'number' ||
      singleExport.version !== STORAGE_VERSION ||
      !singleExport.mission ||
      typeof singleExport.mission !== 'object' ||
      !Array.isArray(singleExport.images)
    ) {
      return false
    }

    // Validate mission (basic check)
    const m = singleExport.mission
    if (typeof m.id !== 'string' || typeof m.n !== 'string') {
      return false
    }

    // Validate images array
    if (!validateImagesData(singleExport.images)) {
      return false
    }

    return true
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
   * Apply a single mission import, appending it to existing missions
   * @param singleExport - The validated single mission export data
   */
  async function applySingleMissionImport(singleExport: SingleMissionExport) {
    loadingBar.start()
    try {
      message.info('Importing mission...')

      // Generate a new ID for the imported mission to avoid conflicts
      const newMissionId = crypto.randomUUID()

      // Update mission ID and update images to reference new mission ID
      const updatedMission = {
        ...singleExport.mission,
        id: newMissionId,
      }

      // Update image references to new mission ID and generate new image IDs
      const updatedImages = singleExport.images.map((img) => ({
        ...img,
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate new ID to avoid conflicts
        missionId: newMissionId,
      }))

      // Import images to IndexedDB (we need to add them without clearing existing)
      // Since imageStorage doesn't have a method to add without clearing,
      // we need to directly add to IndexedDB
      if (updatedImages.length > 0) {
        // Cast to access private method - this is a workaround for the limitation
        interface ImageStorageWithEnsureDb {
          ensureDb(): Promise<IDBDatabase>
        }
        const db = await (imageStorage as unknown as ImageStorageWithEnsureDb)['ensureDb']()

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(['images'], 'readwrite')
          const store = transaction.objectStore('images')

          let completed = 0
          const total = updatedImages.length

          updatedImages.forEach((image) => {
            interface ExtendedImage extends StoredImage {
              purpose?: string
              type?: string
            }
            const extImage = image as ExtendedImage
            const cleanImage = {
              id: image.id,
              data: image.data,
              missionId: image.missionId,
              createdAt: image.createdAt || Date.now(),
              size: image.size || new Blob([image.data]).size,
              purpose: extImage.purpose,
              type: extImage.type,
            }

            const addRequest = store.add(cleanImage)

            addRequest.onsuccess = () => {
              completed++
              if (completed === total) {
                resolve()
              }
            }

            addRequest.onerror = (event) => {
              const error = (event.target as IDBRequest)?.error
              console.error('Failed to import image:', image.id, error)
              reject(
                new Error(
                  `Failed to import image ${image.id}: ${error?.message || 'Unknown error'}`,
                ),
              )
            }
          })
        })
      }

      // Get current missions from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      let storageData = {
        version: STORAGE_VERSION,
        missions: [] as SerializedMission[],
      }

      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.missions)) {
          storageData = parsed
        }
      }

      // Append the new mission
      storageData.missions.push(updatedMission)

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))

      // Reload the missions store from the updated localStorage data
      missionsStore.loadFromStorage()

      loadingBar.finish()
      const missionName = singleExport.mission.n || 'Untitled Mission'
      message.success(`Imported mission "${missionName}"`)
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to import mission: ${error}`)
      console.error('Import error:', error)
      throw error
    }
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
    exportSingleMission,
    parseImportFile,
    applyMissionImport,
    applySingleMissionImport,
  }
}
