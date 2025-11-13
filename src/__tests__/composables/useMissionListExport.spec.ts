import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useMissionListExport } from '@/composables/useMissionListExport'
import { useMissionsStore } from '@/stores/missions'
import { setupTestEnvironment } from '@/__tests__/helpers'
import type { SerializedMission } from '@/utils/missionStorage'
import type { StoredImage } from '@/services/imageStorage'
import type { Mission } from '@/types'

// Mock the image export utilities
vi.mock('@/utils/imageExport', () => ({
  exportAllImages: vi.fn(),
  importAllImages: vi.fn(),
  validateImagesData: vi.fn(),
}))

// Mock the imageStorage service
vi.mock('@/services/imageStorage', () => ({
  imageStorage: {
    getImagesByMission: vi.fn(),
    saveImage: vi.fn(),
  },
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

  describe('exportSingleMission', () => {
    it('should export a single mission with its images', async () => {
      const mockMission: Mission = {
        id: 'test-mission-id',
        name: 'Test Mission',
        callsign: 'VIPER 1',
        date: '2024-01-15',
        type: 'CAS',
        squadron: 'v93',
        theater: 'Caucasus',
        crew: [],
        waypoints: [],
        loadout: [],
        departureRecovery: {},
        told: {
          rotation: 0,
          refusal: 0,
        },
        fuel: {
          takeoff: 0,
          joker: 0,
          bingo: 0,
        },
        details: {
          remarks: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Mission

      const mockImages: StoredImage[] = [
        {
          id: 'img-1',
          data: 'data:image/png;base64,mock',
          missionId: 'test-mission-id',
          createdAt: Date.now(),
          size: 1024,
        },
      ]

      const { imageStorage } = await import('@/services/imageStorage')
      vi.mocked(imageStorage.getImagesByMission).mockResolvedValue(mockImages)

      const { exportSingleMission } = useMissionListExport()
      await exportSingleMission(mockMission)

      expect(mockLoadingBar.start).toHaveBeenCalled()
      expect(mockMessage.info).toHaveBeenCalledWith('Exporting mission...')
      expect(imageStorage.getImagesByMission).toHaveBeenCalledWith('test-mission-id')
      expect(mockLoadingBar.finish).toHaveBeenCalled()
      expect(mockMessage.success).toHaveBeenCalledWith('Exported mission "Test Mission"')
    })

    it('should handle untitled missions', async () => {
      const mockMission = {
        id: 'test-mission-id',
        name: '',
        squadron: 'v93',
        theater: 'Caucasus',
        crew: [],
        waypoints: [],
        loadout: [],
        departureRecovery: {},
        told: {
          rotation: 0,
          refusal: 0,
        },
        fuel: {
          takeoff: 0,
          joker: 0,
          bingo: 0,
        },
        details: {
          remarks: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Mission

      const { imageStorage } = await import('@/services/imageStorage')
      vi.mocked(imageStorage.getImagesByMission).mockResolvedValue([])

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as HTMLAnchorElement)

      const { exportSingleMission } = useMissionListExport()
      await exportSingleMission(mockMission)

      expect(mockLink.download).toMatch(/^untitled-mission-\d{4}-\d{2}-\d{2}\.json$/)
      expect(mockMessage.success).toHaveBeenCalledWith('Exported mission "Untitled Mission"')
    })

    it('should sanitize mission names for filenames', async () => {
      const mockMission = {
        id: 'test-mission-id',
        name: 'Test/Mission: With Special@Characters!',
        squadron: 'v93',
        theater: 'Caucasus',
        crew: [],
        waypoints: [],
        loadout: [],
        departureRecovery: {},
        told: {
          rotation: 0,
          refusal: 0,
        },
        fuel: {
          takeoff: 0,
          joker: 0,
          bingo: 0,
        },
        details: {
          remarks: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Mission

      const { imageStorage } = await import('@/services/imageStorage')
      vi.mocked(imageStorage.getImagesByMission).mockResolvedValue([])

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as HTMLAnchorElement)

      const { exportSingleMission } = useMissionListExport()
      await exportSingleMission(mockMission)

      expect(mockLink.download).toMatch(
        /^test-mission-with-special-characters--\d{4}-\d{2}-\d{2}\.json$/,
      )
    })

    it('should handle export errors', async () => {
      const mockMission = {
        id: 'test-mission-id',
        name: 'Test Mission',
        squadron: 'v93',
        theater: 'Caucasus',
        crew: [],
        waypoints: [],
        loadout: [],
        departureRecovery: {},
        told: {
          rotation: 0,
          refusal: 0,
        },
        fuel: {
          takeoff: 0,
          joker: 0,
          bingo: 0,
        },
        details: {
          remarks: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Mission

      const { imageStorage } = await import('@/services/imageStorage')
      vi.mocked(imageStorage.getImagesByMission).mockRejectedValue(
        new Error('Failed to get images'),
      )

      const { exportSingleMission } = useMissionListExport()
      await exportSingleMission(mockMission)

      expect(mockLoadingBar.error).toHaveBeenCalled()
      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export mission'),
      )
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

    it('should successfully parse a single mission export', async () => {
      const mockSingleMissionData = {
        version: 2,
        mission: {
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
        images: [],
        exportedAt: '2024-01-15T12:00:00Z',
      }

      const mockFile = new File([JSON.stringify(mockSingleMissionData)], 'test-mission.json', {
        type: 'application/json',
      })

      const { parseImportFile } = useMissionListExport()
      const result = await parseImportFile(mockFile)

      expect('mission' in result).toBe(true)
      if ('mission' in result) {
        expect(result.mission).toEqual(mockSingleMissionData.mission)
        expect(result.images).toEqual([])
        expect(result.exportedAt).toBe('2024-01-15T12:00:00Z')
      }
    })

    it('should reject invalid single mission structure', async () => {
      const invalidData = {
        version: 2,
        mission: { invalid: 'data' }, // Missing required fields
        images: [],
      }

      const mockFile = new File([JSON.stringify(invalidData)], 'test-mission.json', {
        type: 'application/json',
      })

      const { parseImportFile } = useMissionListExport()

      await expect(parseImportFile(mockFile)).rejects.toThrow('Invalid single mission file format')
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

  describe('applySingleMissionImport', () => {
    it('should append a single mission to existing missions', async () => {
      const missionsStore = useMissionsStore()
      // Create an existing mission
      missionsStore.createMission('v303', 'Caucasus')
      expect(missionsStore.missions.length).toBe(1)

      const mockSingleMissionData = {
        version: 2,
        mission: {
          id: 'imported-single',
          n: 'Imported Single Mission',
          cs: 'VIPER 3',
          d: '2024-01-17',
          t: 'SEAD',
          sq: 'v93',
          th: 'Caucasus',
          cr: [],
          wp: [],
          ld: [],
          dr: {},
        },
        images: [
          {
            id: 'img-3',
            data: 'data:image/png;base64,single',
            missionId: 'imported-single',
            createdAt: Date.now(),
            size: 3072,
          },
        ],
        exportedAt: '2024-01-17T12:00:00Z',
      }

      // Mock the ensureDb for direct IndexedDB access
      interface MockRequest {
        onsuccess: (() => void) | null
        onerror: ((error?: Error) => void) | null
      }
      const mockAddRequests: MockRequest[] = []
      const mockAdd = vi.fn(() => {
        const request: MockRequest = { onsuccess: null, onerror: null }
        mockAddRequests.push(request)
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })
      const mockObjectStore = vi.fn(() => ({ add: mockAdd }))
      const mockTransaction = vi.fn(() => ({ objectStore: mockObjectStore }))
      const mockDb = { transaction: mockTransaction }

      const { imageStorage } = await import('@/services/imageStorage')
      ;(imageStorage as unknown as { ensureDb: () => Promise<unknown> })['ensureDb'] = vi
        .fn()
        .mockResolvedValue(mockDb)

      const { applySingleMissionImport } = useMissionListExport()
      await applySingleMissionImport(mockSingleMissionData)

      expect(mockLoadingBar.start).toHaveBeenCalled()
      expect(mockMessage.info).toHaveBeenCalledWith('Importing mission...')
      // Verify the add method was called for the image
      expect(mockTransaction).toHaveBeenCalled()
      expect(mockObjectStore).toHaveBeenCalled()
      expect(mockAdd).toHaveBeenCalled()
      expect(mockLoadingBar.finish).toHaveBeenCalled()
      expect(mockMessage.success).toHaveBeenCalledWith('Imported mission "Imported Single Mission"')

      // Verify localStorage was updated with appended mission
      const stored = localStorage.getItem('v303-missions')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.missions).toHaveLength(2) // Original + imported
      // The imported mission should have a new ID (not the original)
      expect(parsed.missions[1].n).toBe('Imported Single Mission')
      expect(parsed.missions[1].id).not.toBe('imported-single') // Should have new UUID
    })

    it('should handle importing to empty mission list', async () => {
      const mockSingleMissionData = {
        version: 2,
        mission: {
          id: 'first-mission',
          n: 'First Mission',
          cs: 'VIPER 1',
          d: '2024-01-18',
          t: 'CAS',
          sq: 'v303',
          th: 'Caucasus',
          cr: [],
          wp: [],
          ld: [],
          dr: {},
        },
        images: [],
        exportedAt: '2024-01-18T12:00:00Z',
      }

      // Mock the ensureDb for direct IndexedDB access (no images to add)
      interface MockRequest {
        onsuccess: (() => void) | null
        onerror: ((error?: Error) => void) | null
      }
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(
              (): MockRequest => ({
                onsuccess: null,
                onerror: null,
              }),
            ),
          })),
        })),
      }

      const { imageStorage } = await import('@/services/imageStorage')
      ;(imageStorage as unknown as { ensureDb: () => Promise<unknown> })['ensureDb'] = vi
        .fn()
        .mockResolvedValue(mockDb)

      const { applySingleMissionImport } = useMissionListExport()
      await applySingleMissionImport(mockSingleMissionData)

      // Verify localStorage was created with the single mission
      const stored = localStorage.getItem('v303-missions')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.version).toBe(2)
      expect(parsed.missions).toHaveLength(1)
      expect(parsed.missions[0].n).toBe('First Mission')
    })

    it('should handle import errors', async () => {
      const mockSingleMissionData = {
        version: 2,
        mission: {
          id: 'error-mission',
          n: 'Error Mission',
          cs: 'VIPER 1',
          d: '2024-01-18',
          t: 'CAS',
          sq: 'v303',
          th: 'Caucasus',
          cr: [],
          wp: [],
          ld: [],
          dr: {},
        },
        images: [
          {
            id: 'img-error',
            data: 'data:image/png;base64,error',
            missionId: 'error-mission',
            createdAt: Date.now(),
            size: 1024,
          },
        ],
        exportedAt: '2024-01-18T12:00:00Z',
      }

      // Mock the ensureDb to simulate an error during add
      interface MockRequest {
        onsuccess: (() => void) | null
        onerror: ((error?: Error) => void) | null
      }
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(() => {
              const request: MockRequest = { onsuccess: null, onerror: null }
              setTimeout(() => request.onerror?.(new Error('Failed to import image')), 0)
              return request
            }),
          })),
        })),
      }

      const { imageStorage } = await import('@/services/imageStorage')
      ;(imageStorage as unknown as { ensureDb: () => Promise<unknown> })['ensureDb'] = vi
        .fn()
        .mockResolvedValue(mockDb)

      const { applySingleMissionImport } = useMissionListExport()

      await expect(applySingleMissionImport(mockSingleMissionData)).rejects.toThrow()

      expect(mockLoadingBar.error).toHaveBeenCalled()
      expect(mockMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to import mission'),
      )
    })

    it('should update image references to new mission ID', async () => {
      const mockSingleMissionData = {
        version: 2,
        mission: {
          id: 'old-id',
          n: 'Mission with Images',
          cs: 'VIPER 1',
          d: '2024-01-19',
          t: 'SEAD',
          sq: 'v93',
          th: 'Caucasus',
          cr: [],
          wp: [],
          ld: [],
          dr: {},
        },
        images: [
          {
            id: 'img-1',
            data: 'data:image/png;base64,test1',
            missionId: 'old-id',
            createdAt: Date.now(),
            size: 1024,
            purpose: 'mdc',
            type: 'image/png',
          },
          {
            id: 'img-2',
            data: 'data:image/png;base64,test2',
            missionId: 'old-id',
            createdAt: Date.now(),
            size: 2048,
            purpose: 'briefing',
            type: 'image/png',
          },
        ],
        exportedAt: '2024-01-19T12:00:00Z',
      }

      // Mock the ensureDb for direct IndexedDB access
      interface MockImage {
        missionId: string
        data: string
        purpose?: string
        type?: string
        [key: string]: unknown
      }
      interface MockRequest {
        onsuccess: (() => void) | null
        onerror: ((error?: Error) => void) | null
      }
      const addedImages: MockImage[] = []
      const mockDb = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn((image: MockImage) => {
              addedImages.push(image)
              const request: MockRequest = { onsuccess: null, onerror: null }
              setTimeout(() => request.onsuccess?.(), 0)
              return request
            }),
          })),
        })),
      }

      const { imageStorage } = await import('@/services/imageStorage')
      ;(imageStorage as unknown as { ensureDb: () => Promise<unknown> })['ensureDb'] = vi
        .fn()
        .mockResolvedValue(mockDb)

      const { applySingleMissionImport } = useMissionListExport()
      await applySingleMissionImport(mockSingleMissionData)

      // Check that images were added with updated mission IDs
      expect(addedImages).toHaveLength(2)

      // Mission ID should be a new UUID, not the old ID
      expect(addedImages[0].missionId).not.toBe('old-id')
      expect(addedImages[1].missionId).not.toBe('old-id')
      // Both images should have the same new mission ID
      expect(addedImages[0].missionId).toBe(addedImages[1].missionId)

      // Check other parameters are preserved
      expect(addedImages[0].data).toBe('data:image/png;base64,test1')
      expect(addedImages[0].purpose).toBe('mdc')
      expect(addedImages[0].type).toBe('image/png')

      expect(addedImages[1].data).toBe('data:image/png;base64,test2')
      expect(addedImages[1].purpose).toBe('briefing')
      expect(addedImages[1].type).toBe('image/png')
    })
  })
})
