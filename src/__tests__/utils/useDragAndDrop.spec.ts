import { describe, it, expect, vi } from 'vitest'
import { useDragAndDrop } from '@/utils/useDragAndDrop'

interface TestItem {
  id: number
  name: string
  sequence?: number
}

describe('useDragAndDrop', () => {
  it('should initialize with null draggedIndex', () => {
    const { draggedIndex } = useDragAndDrop<TestItem>()
    expect(draggedIndex.value).toBeNull()
  })

  it('should set draggedIndex on handleDragStart', () => {
    const { draggedIndex, handleDragStart } = useDragAndDrop<TestItem>()
    handleDragStart(2)
    expect(draggedIndex.value).toBe(2)
  })

  it('should prevent default on handleDragOver', () => {
    const { handleDragOver } = useDragAndDrop<TestItem>()
    const mockEvent = { preventDefault: vi.fn() } as unknown as DragEvent
    handleDragOver(mockEvent)
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('should reorder items without sequence property', () => {
    const { handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ]

    const callback = vi.fn()

    handleDragStart(0) // Start dragging first item
    handleDrop(2, items, callback, false) // Drop at third position

    expect(callback).toHaveBeenCalledWith([
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
      { id: 1, name: 'Item 1' },
    ])
  })

  it('should reorder items with sequence property and update sequences', () => {
    const { handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1', sequence: 1 },
      { id: 2, name: 'Item 2', sequence: 2 },
      { id: 3, name: 'Item 3', sequence: 3 },
    ]

    const callback = vi.fn()

    handleDragStart(2) // Start dragging third item
    handleDrop(0, items, callback, true) // Drop at first position

    expect(callback).toHaveBeenCalledWith([
      { id: 3, name: 'Item 3', sequence: 1 },
      { id: 1, name: 'Item 1', sequence: 2 },
      { id: 2, name: 'Item 2', sequence: 3 },
    ])
  })

  it('should not call callback when dropping on same index', () => {
    const { handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]

    const callback = vi.fn()

    handleDragStart(1)
    handleDrop(1, items, callback, false)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should not call callback when draggedIndex is null', () => {
    const { handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]

    const callback = vi.fn()

    // Don't call handleDragStart first
    handleDrop(1, items, callback, false)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should reset draggedIndex after drop', () => {
    const { draggedIndex, handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]

    handleDragStart(0)
    expect(draggedIndex.value).toBe(0)

    handleDrop(1, items, () => {}, false)
    expect(draggedIndex.value).toBeNull()
  })

  it('should handle drag from end to beginning', () => {
    const { handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1', sequence: 1 },
      { id: 2, name: 'Item 2', sequence: 2 },
      { id: 3, name: 'Item 3', sequence: 3 },
      { id: 4, name: 'Item 4', sequence: 4 },
    ]

    const callback = vi.fn()

    handleDragStart(3) // Drag last item
    handleDrop(0, items, callback, true) // Drop at beginning

    expect(callback).toHaveBeenCalledWith([
      { id: 4, name: 'Item 4', sequence: 1 },
      { id: 1, name: 'Item 1', sequence: 2 },
      { id: 2, name: 'Item 2', sequence: 3 },
      { id: 3, name: 'Item 3', sequence: 4 },
    ])
  })

  it('should handle drag from beginning to end', () => {
    const { handleDragStart, handleDrop } = useDragAndDrop<TestItem>()
    const items: TestItem[] = [
      { id: 1, name: 'Item 1', sequence: 1 },
      { id: 2, name: 'Item 2', sequence: 2 },
      { id: 3, name: 'Item 3', sequence: 3 },
      { id: 4, name: 'Item 4', sequence: 4 },
    ]

    const callback = vi.fn()

    handleDragStart(0) // Drag first item
    handleDrop(3, items, callback, true) // Drop at end

    expect(callback).toHaveBeenCalledWith([
      { id: 2, name: 'Item 2', sequence: 1 },
      { id: 3, name: 'Item 3', sequence: 2 },
      { id: 4, name: 'Item 4', sequence: 3 },
      { id: 1, name: 'Item 1', sequence: 4 },
    ])
  })
})
