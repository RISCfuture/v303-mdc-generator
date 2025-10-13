import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useMissionListExport } from '@/composables/useMissionListExport'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment } from '@/__tests__/helpers'
import type { SerializedMission } from '@/utils/missionStorage'
import type { StoredImage } from '@/services/imageStorage'

// Mock the image export utilities
vi.mock('@/utils/imageExport', () => ({
  exportAllImages: vi.fn(),
  importAllImages: vi.fn(),
  validateImagesData: vi.fn(),
}))

// Mock naive-ui
const mockMessage = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}

const mockLoadingBar = {
  start: vi.fn(),
  finish: vi.fn(),
  error: vi.fn(),
}

vi.mock('naive-ui', () => ({
  useMessage: () => mockMessage,
  useLoadingBar: () => mockLoadingBar,
}))

describe('useMissionListExport', () => {
  setupTestEnvironment({ pinia: true, localStorage: true })

  let imageExportModule: typeof import('@/utils/imageExport')

  beforeEach(async () => {
    imageExportModule = await import('@/utils/imageExport')
    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(imageExportModule.exportAllImages).mockResolvedValue([])
    vi.mocked(imageExportModule.importAllImages).mockResolvedValue()
    vi.mocked(imageExportModule.validateImagesData).mockReturnValue(true)

    // Mock document methods for file download
    document.body.appendChild = vi.fn()
    document.body.removeChild = vi.fn()
    URL.createObjectURL = vi.fn(() => 'mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('exportMissionList', () => {
    it('should export missions and images successfully', async () => {
      const missionsStore = useMissionsStore()

      // Create test missions in the store
      missionsStore.createMission('v93', 'Caucasus')
      missionsStore.createMission('v303', 'Caucasus')

      const mockImages: StoredImage[] = [
        {
          id: 'img-1',
          data: 'data:image/png;base64,mock',
          missionId: 'mission-1',
          createdAt: Date.now(),
          size: 1024,
        },
      ]

      vi.mocked(imageExportModule.exportAllImages).mockResolvedValue(mockImages)

      const { exportMissionList } = useMissionListExport()
      await exportMissionList()

      expect(mockLoadingBar.start).toHaveBeenCalled()
      expect(mockMessage.info).toHaveBeenCalledWith('Exporting missions...')
      expect(imageExportModule.exportAllImages).toHaveBeenCalled()
      expect(mockLoadingBar.finish).toHaveBeenCalled()
      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('2 missions'))
      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('1 image'))
    })

    it('should show warning when no missions exist', async () => {
      const { exportMissionList } = useMissionListExport()
      await exportMissionList()

      expect(mockMessage.warning).toHaveBeenCalledWith('No missions to export')
      expect(mockLoadingBar.finish).toHaveBeenCalled()
    })

    it('should handle export errors', async () => {
      const missionsStore = useMissionsStore()
      missionsStore.createMission('v93', 'Caucasus')

      vi.mocked(imageExportModule.exportAllImages).mockRejectedValue(new Error('Export failed'))

      const { exportMissionList } = useMissionListExport()
      await exportMissionList()

      expect(mockLoadingBar.error).toHaveBeenCalled()
      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export missions'),
      )
    })

    it('should create download link with correct filename', async () => {
      const missionsStore = useMissionsStore()
      missionsStore.createMission('v93', 'Caucasus')

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as HTMLAnchorElement)

      const { exportMissionList } = useMissionListExport()
      await exportMissionList()

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockLink.download).toMatch(/^v303-missions-backup-\d{4}-\d{2}-\d{2}\.json$/)
      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  describe('parseImportFile', () => {
    it('should successfully parse a valid backup file', async () => {
      const mockBackupData = {
        version: 2,
        missions: [
          {
            id: 'test-mission-1',
            n: 'Test Mission',
            cs: 'VIPER 1',
            d: '2024-01-15',
            t: 'CAS',
            sq: 'v93',
            th: 'Caucasus',
            cr: ['Pilot 1'],
            wp: [],
            ld: [],
            dr: {},
          },
        ] as SerializedMission[],
        images: [],
        exportedAt: '2024-01-15T12:00:00Z',
      }

      const mockFile = new File([JSON.stringify(mockBackupData)], 'test-backup.json', {
        type: 'application/json',
      })

      const { parseImportFile } = useMissionListExport()
      const preview = await parseImportFile(mockFile)

      expect(preview.missionCount).toBe(1)
      expect(preview.imageCount).toBe(0)
      expect(preview.exportedAt).toBe('2024-01-15T12:00:00Z')
      expect(preview.data).toEqual(mockBackupData)
    })

    it('should reject invalid JSON', async () => {
      const mockFile = new File(['invalid json{{{'], 'test-backup.json', {
        type: 'application/json',
      })

      const { parseImportFile } = useMissionListExport()

      await expect(parseImportFile(mockFile)).rejects.toThrow()
    })

    it('should reject invalid backup structure', async () => {
      const invalidData = {
        version: 1, // Wrong version
        missions: [],
      }

      const mockFile = new File([JSON.stringify(invalidData)], 'test-backup.json', {
        type: 'application/json',
      })

      const { parseImportFile } = useMissionListExport()

      await expect(parseImportFile(mockFile)).rejects.toThrow('Invalid backup file format')
    })

    it('should reject backup with invalid missions', async () => {
      const invalidData = {
        version: 2,
        missions: [{ invalid: 'data' }], // Missing required fields
        images: [],
      }

      const mockFile = new File([JSON.stringify(invalidData)], 'test-backup.json', {
        type: 'application/json',
      })

      vi.mocked(imageExportModule.validateImagesData).mockReturnValue(false)

      const { parseImportFile } = useMissionListExport()

      await expect(parseImportFile(mockFile)).rejects.toThrow()
    })
  })

  describe('applyMissionImport', () => {
    it('should import missions and images successfully', async () => {
      const mockBackupData = {
        version: 2,
        missions: [
          {
            id: 'imported-mission',
            n: 'Imported Mission',
            cs: 'VIPER 2',
            d: '2024-01-16',
            t: 'SEAD',
            sq: 'v93',
            th: 'Caucasus',
            cr: [], // Empty crew to avoid crew database issues
            wp: [],
            ld: [],
            dr: {},
          },
        ] as SerializedMission[],
        images: [
          {
            id: 'img-2',
            data: 'data:image/png;base64,imported',
            missionId: 'imported-mission',
            createdAt: Date.now(),
            size: 2048,
          },
        ],
        exportedAt: '2024-01-16T12:00:00Z',
      }

      const missionsStore = useMissionsStore()
      // Create a mission that should be replaced
      missionsStore.createMission('v303', 'Caucasus')
      expect(missionsStore.missions.length).toBe(1)

      const { applyMissionImport } = useMissionListExport()
      await applyMissionImport(mockBackupData)

      expect(mockLoadingBar.start).toHaveBeenCalled()
      expect(mockMessage.info).toHaveBeenCalledWith('Importing missions...')
      expect(imageExportModule.importAllImages).toHaveBeenCalledWith(mockBackupData.images)
      expect(mockLoadingBar.finish).toHaveBeenCalled()
      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('1 mission'))
      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('1 image'))

      // Verify localStorage was updated
      const stored = localStorage.getItem('v303-missions')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.version).toBe(2)
      expect(parsed.missions).toHaveLength(1)
      expect(parsed.missions[0].id).toBe('imported-mission')

      // Note: Store reloading is tested in integration/e2e tests
      // Unit tests focus on the import logic itself
    })

    it('should handle import errors', async () => {
      const mockBackupData = {
        version: 2,
        missions: [],
        images: [],
        exportedAt: '2024-01-16T12:00:00Z',
      }

      vi.mocked(imageExportModule.importAllImages).mockRejectedValue(new Error('Import failed'))

      const { applyMissionImport } = useMissionListExport()

      await expect(applyMissionImport(mockBackupData)).rejects.toThrow()

      expect(mockLoadingBar.error).toHaveBeenCalled()
      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to import missions'),
      )
    })

    it('should handle plural vs singular in success message', async () => {
      const mockBackupData = {
        version: 2,
        missions: [
          {
            id: 'mission-1',
            n: 'Mission 1',
            cs: 'VIPER 1',
            d: '2024-01-16',
            t: 'CAS',
            sq: 'v93',
            th: 'Caucasus',
            cr: [],
            wp: [],
            ld: [],
            dr: {},
          },
          {
            id: 'mission-2',
            n: 'Mission 2',
            cs: 'VIPER 2',
            d: '2024-01-16',
            t: 'SEAD',
            sq: 'v93',
            th: 'Caucasus',
            cr: [],
            wp: [],
            ld: [],
            dr: {},
          },
        ] as SerializedMission[],
        images: [
          {
            id: 'img-1',
            data: 'data:image/png;base64,test1',
            missionId: 'mission-1',
            createdAt: Date.now(),
            size: 1024,
          },
          {
            id: 'img-2',
            data: 'data:image/png;base64,test2',
            missionId: 'mission-2',
            createdAt: Date.now(),
            size: 2048,
          },
        ],
        exportedAt: '2024-01-16T12:00:00Z',
      }

      const { applyMissionImport } = useMissionListExport()
      await applyMissionImport(mockBackupData)

      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('2 missions'))
      expect(mockMessage.success).toHaveBeenCalledWith(expect.stringContaining('2 images'))
    })
  })
})
