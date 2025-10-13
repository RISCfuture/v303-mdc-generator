import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import { imageStorage, MAX_IMAGE_SIZE } from '@/services/imageStorage'
import { setupTestEnvironment, waitForAsyncSetup } from '@/__tests__/helpers'

// Mock the md-editor-v3 component
vi.mock('md-editor-v3', () => ({
  MdEditor: {
    name: 'MdEditor',
    template: '<div class="md-editor-mock"><slot /></div>',
    props: [
      'modelValue',
      'language',
      'theme',
      'preview',
      'toolbars',
      'placeholder',
      'showCodeRowNumber',
    ],
    emits: ['onChange', 'onUploadImg'],
  },
}))

// Mock naive-ui
vi.mock('naive-ui', () => ({
  useMessage: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('MarkdownEditor', () => {
  const mockMissionId = 'test-mission-123'

  setupTestEnvironment({ matchMedia: true })

  // Mock getImagesByMission to return empty array by default
  // This prevents indexedDB errors during component initialization
  vi.spyOn(imageStorage, 'getImagesByMission').mockResolvedValue([])

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component initialization', () => {
    it('should render with default props', () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should initialize with provided modelValue', async () => {
      const initialText = '# Test Markdown'

      // Mock needs to be set before mount
      vi.spyOn(imageStorage, 'getImagesByMission').mockResolvedValue([])

      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: initialText,
        },
      })

      // Wait for onMounted to complete
      await flushPromises()
      await waitForAsyncSetup()

      expect(wrapper.vm.editorText).toBe(initialText)
    })

    it('should use placeholder when provided', () => {
      const placeholder = 'Enter mission notes...'
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          placeholder,
        },
      })

      const mdEditor = wrapper.findComponent({ name: 'MdEditor' })
      expect(mdEditor.props('placeholder')).toBe(placeholder)
    })
  })

  describe('Theme detection', () => {
    it('should detect system dark mode preference', () => {
      // Mock matchMedia to return dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      expect(wrapper.vm.isDarkMode).toBe(true)
      expect(wrapper.vm.editorTheme).toBe('dark')
    })

    it('should detect system light mode preference', () => {
      // Mock matchMedia to return light mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      expect(wrapper.vm.isDarkMode).toBe(false)
      expect(wrapper.vm.editorTheme).toBe('light')
    })
  })

  describe('Model value synchronization', () => {
    it('should watch external modelValue changes', async () => {
      // Mock needs to be set before mount
      vi.spyOn(imageStorage, 'getImagesByMission').mockResolvedValue([])

      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Initial text',
        },
      })

      await flushPromises()
      await waitForAsyncSetup()

      expect(wrapper.vm.editorText).toBe('Initial text')

      await wrapper.setProps({ modelValue: 'Updated text' })
      await flushPromises()
      await waitForAsyncSetup()

      expect(wrapper.vm.editorText).toBe('Updated text')
    })

    it('should not update if modelValue equals current editorText', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Same text',
        },
      })

      wrapper.vm.editorText = 'Same text'
      await wrapper.setProps({ modelValue: 'Same text' })

      // editorText should remain unchanged
      expect(wrapper.vm.editorText).toBe('Same text')
    })

    it('should handle undefined modelValue', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Some text',
        },
      })

      await wrapper.setProps({ modelValue: undefined })
      expect(wrapper.vm.editorText).toBe('')
    })
  })

  describe('Text change handling', () => {
    it('should emit update:modelValue when text changes', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const newText = '## New Heading'
      wrapper.vm.handleChange(newText)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([newText])
    })

    it('should emit update:imageIds when text changes', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      wrapper.vm.handleChange('Some text')

      expect(wrapper.emitted('update:imageIds')).toBeTruthy()
      expect(wrapper.emitted('update:imageIds')?.[0]).toEqual([[]])
    })

    it('should update internal editorText', () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const newText = 'Updated content'
      wrapper.vm.handleChange(newText)

      expect(wrapper.vm.editorText).toBe(newText)
    })
  })

  describe('Image upload handling', () => {
    it('should process valid image files', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['image content'], 'test.png', { type: 'image/png' })
      const mockStoredImage = {
        id: 'img-123',
        data: 'data:image/png;base64,abc123',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: 1024,
      }

      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue(mockStoredImage)

      const result = await wrapper.vm.processFiles([mockFile])

      expect(imageStorage.saveImage).toHaveBeenCalledWith(mockFile, mockMissionId)
      expect(result).toEqual([mockStoredImage.data])
      expect(wrapper.vm.imageIds).toContain(mockStoredImage.id)
    })

    it('should reject non-image files', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['text content'], 'test.txt', { type: 'text/plain' })

      const result = await wrapper.vm.processFiles([mockFile])

      expect(result).toEqual([])
    })

    it('should compress images larger than MAX_IMAGE_SIZE', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const largeFile = new File(['x'.repeat(MAX_IMAGE_SIZE + 1)], 'large.png', {
        type: 'image/png',
      })

      const compressedBlob = new Blob(['compressed'], { type: 'image/png' })
      vi.spyOn(imageStorage, 'compressImage').mockResolvedValue(compressedBlob)
      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue({
        id: 'img-123',
        data: 'data:image/png;base64,compressed',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: compressedBlob.size,
      })

      await wrapper.vm.processFiles([largeFile])

      expect(imageStorage.compressImage).toHaveBeenCalledWith(largeFile)
    })

    it('should handle compression errors gracefully', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const largeFile = new File(['x'.repeat(MAX_IMAGE_SIZE + 1)], 'large.png', {
        type: 'image/png',
      })

      vi.spyOn(imageStorage, 'compressImage').mockRejectedValue(new Error('Compression failed'))

      const result = await wrapper.vm.processFiles([largeFile])

      expect(result).toEqual([])
    })

    it('should handle save errors gracefully', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['image content'], 'test.png', { type: 'image/png' })

      vi.spyOn(imageStorage, 'saveImage').mockRejectedValue(new Error('Save failed'))

      const result = await wrapper.vm.processFiles([mockFile])

      expect(result).toEqual([])
    })

    it('should process multiple files', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const file1 = new File(['img1'], 'test1.png', { type: 'image/png' })
      const file2 = new File(['img2'], 'test2.jpg', { type: 'image/jpeg' })

      vi.spyOn(imageStorage, 'saveImage')
        .mockResolvedValueOnce({
          id: 'img-1',
          data: 'data:image/png;base64,img1',
          missionId: mockMissionId,
          createdAt: Date.now(),
          size: 100,
        })
        .mockResolvedValueOnce({
          id: 'img-2',
          data: 'data:image/jpeg;base64,img2',
          missionId: mockMissionId,
          createdAt: Date.now(),
          size: 200,
        })

      const result = await wrapper.vm.processFiles([file1, file2])

      expect(result).toHaveLength(2)
      expect(wrapper.vm.imageIds.size).toBe(2)
    })
  })

  describe('Upload callback handling', () => {
    it('should call callback with successful uploads', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const callback = vi.fn()

      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue({
        id: 'img-123',
        data: 'data:image/png;base64,test',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: 100,
      })

      await wrapper.vm.handleUploadImg([mockFile], callback)
      await flushPromises()

      expect(callback).toHaveBeenCalledWith(['data:image/png;base64,test'])
    })

    it('should emit imageIds after successful upload', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const callback = vi.fn()

      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue({
        id: 'img-123',
        data: 'data:image/png;base64,test',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: 100,
      })

      await wrapper.vm.handleUploadImg([mockFile], callback)
      await flushPromises()

      expect(wrapper.emitted('update:imageIds')).toBeTruthy()
      expect(wrapper.emitted('update:imageIds')?.[0]).toEqual([['img-123']])
    })

    it('should handle upload errors', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const callback = vi.fn()

      vi.spyOn(imageStorage, 'saveImage').mockRejectedValue(new Error('Upload failed'))

      await wrapper.vm.handleUploadImg([mockFile], callback)
      await flushPromises()

      expect(callback).toHaveBeenCalledWith([])
    })
  })

  describe('Drag and drop handling', () => {
    it('should handle dropped image files', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Existing text',
        },
      })

      await flushPromises()
      await waitForAsyncSetup()

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue({
        id: 'img-123',
        data: 'data:image/png;base64,test',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: 100,
      })

      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()
      await waitForAsyncSetup()

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(wrapper.vm.editorText).toContain('![image](data:image/png;base64,test)')
    })

    it('should append images to existing text', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Existing content',
        },
      })

      await flushPromises()
      await waitForAsyncSetup()

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      vi.spyOn(imageStorage, 'saveImage').mockResolvedValue({
        id: 'img-123',
        data: 'data:image/png;base64,test',
        missionId: mockMissionId,
        createdAt: Date.now(),
        size: 100,
      })

      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()
      await waitForAsyncSetup()

      expect(wrapper.vm.editorText).toBe('Existing content![image](data:image/png;base64,test)\n')
    })

    it('should handle empty file drops', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Text',
        },
      })

      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [],
        },
      } as unknown as DragEvent

      await wrapper.vm.handleDrop(mockEvent)

      // When there are no files, handleDrop returns early without modifying editorText
      // editorText is initially empty and gets set during onMounted
      expect(wrapper.vm.editorText).toBe('')
    })

    it('should handle drop errors gracefully', async () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          modelValue: 'Text',
        },
      })

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent

      vi.spyOn(imageStorage, 'saveImage').mockRejectedValue(new Error('Drop failed'))

      await wrapper.vm.handleDrop(mockEvent)
      await flushPromises()

      // Text should remain unchanged on error
      expect(wrapper.vm.editorText).toBe('Text')
    })
  })

  describe('Editor height calculation', () => {
    it('should calculate height based on rows prop', () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
          rows: 5,
        },
      })

      // 5 rows * 24px + 50px = 170px
      expect(wrapper.vm.editorHeight).toBe('170px')
    })

    it('should use default rows value', () => {
      const wrapper = mount(MarkdownEditor, {
        props: {
          missionId: mockMissionId,
        },
      })

      // 3 rows (default) * 24px + 50px = 122px
      expect(wrapper.vm.editorHeight).toBe('122px')
    })
  })
})
