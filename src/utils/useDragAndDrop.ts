import { ref } from 'vue'

export type DragAndDropReturn<T> = {
  draggedIndex: ReturnType<typeof ref<number | null>>
  handleDragStart: (index: number) => void
  handleDragOver: (event: DragEvent) => void
  handleDrop: (
    targetIndex: number,
    items: T[],
    updateCallback: (updatedItems: T[]) => void,
    resequence?: boolean,
  ) => void
}

/**
 * Composable for handling drag-and-drop reordering of items in a list
 * @returns Drag-and-drop handlers and state
 */
export function useDragAndDrop<T>(): DragAndDropReturn<T> {
  const draggedIndex = ref<number | null>(null)

  function handleDragStart(index: number) {
    draggedIndex.value = index
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
  }

  function handleDrop(
    targetIndex: number,
    items: T[],
    updateCallback: (updatedItems: T[]) => void,
    resequence = true,
  ) {
    if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
      draggedIndex.value = null
      return
    }

    const updatedItems = [...items]
    const draggedItem = updatedItems[draggedIndex.value]

    // Remove dragged item
    updatedItems.splice(draggedIndex.value, 1)
    // Insert at new position
    updatedItems.splice(targetIndex, 0, draggedItem)

    // Re-sequence if needed (for items with sequence property)
    if (resequence) {
      updatedItems.forEach((item, i) => {
        if (typeof item === 'object' && item !== null && 'sequence' in item) {
          ;(item as T & { sequence: number }).sequence = i + 1
        }
      })
    }

    updateCallback(updatedItems)
    draggedIndex.value = null
  }

  return {
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
  }
}
