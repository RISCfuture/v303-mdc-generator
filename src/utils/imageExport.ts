/**
 * Utility functions for exporting and importing mission images from IndexedDB
 */

import { imageStorage, type StoredImage } from '@/services/imageStorage'

/**
 * Export all images from IndexedDB
 * @returns Array of all stored images
 */
export async function exportAllImages(): Promise<StoredImage[]> {
  try {
    return await imageStorage.getAllImages()
  } catch (error) {
    console.error('Failed to export images:', error)
    return []
  }
}

/**
 * Import images into IndexedDB
 * Clears existing images and imports the new ones
 * @param images - Array of images to import
 */
export async function importAllImages(images: StoredImage[]): Promise<void> {
  if (!images || !Array.isArray(images)) {
    throw new Error('Invalid images data')
  }

  const db = await imageStorage['ensureDb']()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readwrite')
    const store = transaction.objectStore('images')

    // Clear existing images first
    const clearRequest = store.clear()

    clearRequest.onsuccess = () => {
      // Import new images
      let completed = 0
      const total = images.length

      if (total === 0) {
        resolve()
        return
      }

      images.forEach((image) => {
        // Create a clean object to avoid DataCloneError
        const cleanImage: StoredImage = {
          id: image.id,
          data: image.data,
          missionId: image.missionId,
          createdAt: image.createdAt,
          size: image.size,
        }

        const addRequest = store.add(cleanImage)

        addRequest.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }

        addRequest.onerror = () => {
          reject(new Error(`Failed to import image ${image.id}`))
        }
      })
    }

    clearRequest.onerror = () => {
      reject(new Error('Failed to clear existing images'))
    }
  })
}

/**
 * Validate that images data is in the correct format
 * @param images - Data to validate
 * @returns True if valid, false otherwise
 */
export function validateImagesData(images: unknown): images is StoredImage[] {
  if (!Array.isArray(images)) {
    return false
  }

  return images.every((img) => {
    return (
      typeof img === 'object' &&
      img !== null &&
      typeof img.id === 'string' &&
      typeof img.data === 'string' &&
      typeof img.missionId === 'string' &&
      typeof img.createdAt === 'number' &&
      typeof img.size === 'number' &&
      img.data.startsWith('data:')
    )
  })
}
