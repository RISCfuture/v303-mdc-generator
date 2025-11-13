import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useMessage } from 'naive-ui'
import MissionList from '@/views/MissionList.vue'
import { useMissionListExport } from '@/composables/useMissionListExport'
import type { Mission } from '@/types'

// Mock Naive UI components
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    useMessage: vi.fn(() => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
    useLoadingBar: vi.fn(() => ({
      start: vi.fn(),
      finish: vi.fn(),
      error: vi.fn(),
    })),
  }
})

// Mock the export composable
vi.mock('@/composables/useMissionListExport', () => ({
  useMissionListExport: vi.fn(() => ({
    exportMissionList: vi.fn(),
    exportSingleMission: vi.fn(),
    parseImportFile: vi.fn(),
    applyMissionImport: vi.fn(),
    applySingleMissionImport: vi.fn(),
  })),
}))

// Mock the mission actions composable
vi.mock('@/composables/useMissionActions', () => ({
  useMissionActions: vi.fn(() => ({
    handleCreate: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    handleDuplicate: vi.fn(),
  })),
}))

describe('MissionList - Drag and Drop', () => {
  let wrapper: ReturnType<typeof mount>
  let mockParseImportFile: ReturnType<typeof vi.fn>
  let mockApplySingleMissionImport: ReturnType<typeof vi.fn>
  let mockApplyMissionImport: ReturnType<typeof vi.fn>
  let mockMessage: ReturnType<typeof useMessage>

  const mockMission: Mission = {
    id: 'mission-1',
    name: 'Test Mission',
    callsign: 'Eagle 1',
    type: 'CAS',
    squadron: 'v303',
    theater: 'caucasus',
    date: new Date().toISOString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    waypoints: [],
    briefing: '',
    flightRoster: [],
    told: '',
    fuel: {
      joker: 0,
      bingo: 0,
      total: 0,
    },
    details: {
      arriveAs: 'formation',
      recoverAs: 'formation',
    },
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock message
    mockMessage = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      destroyAll: vi.fn(),
      create: vi.fn(),
    }
    vi.mocked(useMessage).mockReturnValue(mockMessage)

    // Setup mock export functions
    mockParseImportFile = vi.fn()
    mockApplySingleMissionImport = vi.fn()
    mockApplyMissionImport = vi.fn()

    vi.mocked(useMissionListExport).mockReturnValue({
      exportMissionList: vi.fn(),
      exportSingleMission: vi.fn(),
      parseImportFile: mockParseImportFile,
      applyMissionImport: mockApplyMissionImport,
      applySingleMissionImport: mockApplySingleMissionImport,
    })

    // Mount component with Pinia
    wrapper = mount(MissionList, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              missions: {
                missions: [mockMission],
              },
            },
          }),
        ],
        stubs: {
          NCard: {
            template: '<div class="n-card" v-on="$attrs"><slot /></div>',
          },
          NButton: true,
          NSpace: true,
          NUpload: true,
          NModal: true,
          NPopover: true,
          NBadge: true,
          NIcon: true,
          NSelect: true,
          NInput: true,
          MissionTable: true,
          MissionCardGrid: true,
          CreateMissionModal: true,
          StorageWarning: true,
          RouterLink: true,
        },
      },
    })
  })

  describe('Drag Events', () => {
    it('should add drag-over class when dragging files over', async () => {
      const card = wrapper.find('.n-card')

      // Directly call the handleDragEnter method
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          types: ['Files'],
        },
      } as unknown as DragEvent

      wrapper.vm.handleDragEnter(mockEvent)
      await wrapper.vm.$nextTick()

      // Check that isDragging is true
      expect(wrapper.vm.isDragging).toBe(true)
      expect(card.classes()).toContain('drag-over')
    })

    it('should remove drag-over class when dragging leaves', async () => {
      const card = wrapper.find('.n-card')

      // First, set up dragging state
      wrapper.vm.isDragging = true
      wrapper.vm.dragCounter = 1
      await wrapper.vm.$nextTick()

      // Create a mock DragEvent
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as DragEvent

      // Call the handleDragLeave method
      wrapper.vm.handleDragLeave(mockEvent)
      await wrapper.vm.$nextTick()

      // Check that isDragging is false
      expect(wrapper.vm.isDragging).toBe(false)
      expect(card.classes()).not.toContain('drag-over')
    })

    it('should handle dragover event to allow drop', async () => {
      // Create a mock DragEvent
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          dropEffect: 'none',
        },
      } as unknown as DragEvent

      // Call the handleDragOver method
      wrapper.vm.handleDragOver(mockEvent)

      // Check that preventDefault was called
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.dataTransfer.dropEffect).toBe('copy')
    })
  })

  describe('Drop Events', () => {
    it('should import a single mission JSON file when dropped', async () => {
      // Mock file content
      const mockFile = new File(
        ['{"version":2,"mission":{},"images":[],"exportedAt":"2024-01-01"}'],
        'mission.json',
        { type: 'application/json' },
      )

      // Setup parseImportFile to return a single mission import
      mockParseImportFile.mockResolvedValue({
        version: 2,
        mission: mockMission,
        images: [],
        exportedAt: '2024-01-01',
      })

      // Create a mock DragEvent with files
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      // Call the handleDrop method
      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Check that parseImportFile was called
      expect(mockParseImportFile).toHaveBeenCalledWith(mockFile)

      // Check that applySingleMissionImport was called
      expect(mockApplySingleMissionImport).toHaveBeenCalled()

      // Check success message
      expect(mockMessage.success).toHaveBeenCalledWith('Mission imported successfully')

      // Check that drag state is reset
      expect(wrapper.vm.isDragging).toBe(false)
      expect(wrapper.vm.dragCounter).toBe(0)
    })

    it('should show import modal for full backup when dropped', async () => {
      // Mock file content
      const mockFile = new File(
        ['{"version":2,"missions":[],"images":[],"exportedAt":"2024-01-01"}'],
        'backup.json',
        { type: 'application/json' },
      )

      // Setup parseImportFile to return a full backup
      const mockBackup = {
        missionCount: 5,
        imageCount: 10,
        totalSize: 1024,
        exportedAt: '2024-01-01',
        data: {
          version: 2,
          missions: [],
          images: [],
          exportedAt: '2024-01-01',
        },
      }
      mockParseImportFile.mockResolvedValue(mockBackup)

      // Create a mock DragEvent with files
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      // Call the handleDrop method
      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Check that parseImportFile was called
      expect(mockParseImportFile).toHaveBeenCalledWith(mockFile)

      // Check that import modal is shown
      expect(wrapper.vm.showImportModal).toBe(true)
      expect(wrapper.vm.importPreview).toEqual(mockBackup)

      // Check that single mission import was NOT called
      expect(mockApplySingleMissionImport).not.toHaveBeenCalled()
    })

    it('should reject non-JSON files', async () => {
      // Mock non-JSON file
      const mockFile = new File(['test content'], 'document.txt', { type: 'text/plain' })

      // Create a mock DragEvent with files
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      // Call the handleDrop method
      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Check error message
      expect(mockMessage.error).toHaveBeenCalledWith('Please drop a JSON file')

      // Check that parseImportFile was NOT called
      expect(mockParseImportFile).not.toHaveBeenCalled()
    })

    it('should handle import errors gracefully', async () => {
      // Mock file content
      const mockFile = new File(['{"invalid":"json"}'], 'mission.json', {
        type: 'application/json',
      })

      // Setup parseImportFile to reject
      mockParseImportFile.mockRejectedValue(new Error('Invalid format'))

      // Create a mock DragEvent with files
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      // Call the handleDrop method
      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Check error message
      expect(mockMessage.error).toHaveBeenCalledWith('Failed to import file: Error: Invalid format')

      // Check that drag state is reset
      expect(wrapper.vm.isDragging).toBe(false)
      expect(wrapper.vm.dragCounter).toBe(0)
    })

    it('should ignore drop if no files are provided', async () => {
      // Create a mock DragEvent without files
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [],
        },
      } as unknown as DragEvent

      // Call the handleDrop method
      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Check that nothing was called
      expect(mockParseImportFile).not.toHaveBeenCalled()
      expect(mockMessage.error).not.toHaveBeenCalled()
      expect(mockMessage.success).not.toHaveBeenCalled()
    })
  })

  describe('Drag Counter Management', () => {
    it('should properly track nested drag enter/leave events', async () => {
      // Create mock DragEvents
      const createDragEvent = () =>
        ({
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          dataTransfer: {
            types: ['Files'],
          },
        }) as unknown as DragEvent

      // Simulate nested drag events (entering child elements)
      wrapper.vm.handleDragEnter(createDragEvent())
      expect(wrapper.vm.dragCounter).toBe(1)
      expect(wrapper.vm.isDragging).toBe(true)

      wrapper.vm.handleDragEnter(createDragEvent())
      expect(wrapper.vm.dragCounter).toBe(2)
      expect(wrapper.vm.isDragging).toBe(true)

      // Leave one child element
      wrapper.vm.handleDragLeave(createDragEvent())
      expect(wrapper.vm.dragCounter).toBe(1)
      expect(wrapper.vm.isDragging).toBe(true) // Still dragging

      // Leave the main element
      wrapper.vm.handleDragLeave(createDragEvent())
      expect(wrapper.vm.dragCounter).toBe(0)
      expect(wrapper.vm.isDragging).toBe(false) // No longer dragging
    })
  })
})
