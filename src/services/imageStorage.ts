/**
 * IndexedDB service for storing mission images
 * Stores images separately from mission data to keep localStorage compact
 */

const DB_NAME = 'v303-mdc-images'
const DB_VERSION = 1
const STORE_NAME = 'images'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB

export type StoredImage = {
  id: string
  data: string // base64 data URL
  missionId: string
  createdAt: number
  size: number
}

class ImageStorageService {
  private db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database
   */
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('missionId', 'missionId', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Failed to initialize database')
    }
    return this.db
  }

  /**
   * Compress an image if it exceeds the size limit
   */
  public async compressImage(file: File, maxSize: number = MAX_IMAGE_SIZE): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calculate new dimensions if image is too large
        const maxDimension = 1920 // Max width or height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Try different quality levels to meet size requirement
        let quality = 0.9
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }

              if (blob.size <= maxSize || quality <= 0.1) {
                resolve(blob)
              } else {
                quality -= 0.1
                tryCompress()
              }
            },
            file.type,
            quality,
          )
        }

        tryCompress()
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * Convert a File or Blob to a base64 data URL
   */
  private async fileToDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => {
        reject(reader.error ?? new Error('FileReader failed'))
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * Generate a unique ID for an image
   */
  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Save an image to IndexedDB
   */
  public async saveImage(file: File, missionId: string): Promise<StoredImage> {
    const db = await this.ensureDb()

    // Check if compression is needed
    let imageFile: File | Blob = file

    if (file.size > MAX_IMAGE_SIZE) {
      imageFile = await this.compressImage(file)
    }

    const dataUrl = await this.fileToDataUrl(imageFile)

    const storedImage: StoredImage = {
      id: this.generateId(),
      data: dataUrl,
      missionId,
      createdAt: Date.now(),
      size: imageFile.size,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(storedImage)

      request.onsuccess = () => {
        resolve(storedImage)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }

  /**
   * Get an image by ID
   */
  public async getImage(id: string): Promise<StoredImage | null> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve((request.result as StoredImage | null) ?? null)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }

  /**
   * Get all images for a mission
   */
  public async getImagesByMission(missionId: string): Promise<StoredImage[]> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('missionId')
      const request = index.getAll(missionId)

      request.onsuccess = () => {
        resolve(request.result as StoredImage[])
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }

  /**
   * Delete an image by ID
   */
  public async deleteImage(id: string): Promise<void> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }

  /**
   * Delete all images for a mission
   */
  public async deleteImagesByMission(missionId: string): Promise<void> {
    const images = await this.getImagesByMission(missionId)
    await Promise.all(images.map((img) => this.deleteImage(img.id)))
  }

  /**
   * Get all images in the database
   */
  public async getAllImages(): Promise<StoredImage[]> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result as StoredImage[])
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }

  /**
   * Get total storage size used by images
   */
  public async getStorageSize(): Promise<number> {
    const images = await this.getAllImages()
    return images.reduce((total, img) => total + img.size, 0)
  }

  /**
   * Clean up orphaned images (images not referenced by any mission)
   */
  public async cleanupOrphanedImages(validMissionIds: string[]): Promise<number> {
    const allImages = await this.getAllImages()
    const orphaned = allImages.filter((img) => !validMissionIds.includes(img.missionId))

    await Promise.all(orphaned.map((img) => this.deleteImage(img.id)))

    return orphaned.length
  }

  /**
   * Clear all images (use with caution!)
   */
  public async clearAll(): Promise<void> {
    const db = await this.ensureDb()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
    })
  }
}

// Export singleton instance
export const imageStorage = new ImageStorageService()

// Export max size for validation
export { MAX_IMAGE_SIZE }
