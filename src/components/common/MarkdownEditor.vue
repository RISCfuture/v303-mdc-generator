<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { imageStorage, MAX_IMAGE_SIZE } from '@/services/imageStorage'
import { useMessage } from 'naive-ui'

interface Props {
  modelValue?: string
  missionId: string
  placeholder?: string
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Enter text...',
  rows: 3,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:imageIds': [imageIds: string[]]
}>()

const message = useMessage()
const editorText = ref('') // Will be populated after loading images
const imageIds = ref<Set<string>>(new Set())
const imageDataMap = ref<Map<string, string>>(new Map()) // Map of imageId -> base64 data URL

/**
 * Extract image IDs from markdown text
 */
const extractImageIdsFromMarkdown = (markdown: string): Set<string> => {
  const ids = new Set<string>()
  const regex = /!\[.*?\]\((img_\d+_[a-z0-9]+)\)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    if (match[1]) {
      ids.add(match[1])
    }
  }
  return ids
}

/**
 * Convert markdown with image IDs to markdown with base64 data URLs for display
 */
const replaceImageIdsWithData = (markdown: string): string => {
  return markdown.replace(/!\[(.*?)\]\((img_\d+_[a-z0-9]+)\)/g, (match, alt, imageId) => {
    const dataUrl = imageDataMap.value.get(imageId)
    if (dataUrl) {
      return `![${alt}](${dataUrl})`
    }
    return match // Keep original if data not found
  })
}

/**
 * Convert markdown with base64 data URLs to markdown with image IDs for storage
 */
const replaceDataWithImageIds = (markdown: string): string => {
  try {
    let result = markdown

    // Replace data URLs with their corresponding image IDs
    // Use a simpler string-based approach instead of complex regex
    for (const [imageId, dataUrl] of imageDataMap.value.entries()) {
      // Find all occurrences of this data URL in the markdown
      const searchPattern = `](${dataUrl})`
      const replacement = `](${imageId})`

      // Use split/join for safer replacement (avoids regex issues with special chars)
      result = result.split(searchPattern).join(replacement)
    }
    return result
  } catch (error) {
    console.error('Error converting data URLs to image IDs:', error)
    return markdown // Return original if conversion fails
  }
}

// Load existing images for this mission from IndexedDB
onMounted(async () => {
  try {
    const existingImages = await imageStorage.getImagesByMission(props.missionId)

    // Build the image data map
    imageDataMap.value = new Map(existingImages.map((img) => [img.id, img.data]))
    imageIds.value = new Set(existingImages.map((img) => img.id))

    // Convert stored markdown (with image IDs) to display markdown (with data URLs)
    editorText.value = replaceImageIdsWithData(props.modelValue || '')
  } catch (error) {
    console.error('Failed to load existing images:', error)
    editorText.value = props.modelValue || ''
  }
})

// Detect system theme preference
const isDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
const editorTheme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

// Watch for theme changes
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
darkModeMediaQuery.addEventListener('change', (e) => {
  isDarkMode.value = e.matches
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    // Convert stored markdown (with image IDs) to display markdown (with data URLs)
    const displayValue = replaceImageIdsWithData(newValue || '')
    if (displayValue !== editorText.value) {
      editorText.value = displayValue
    }
  },
)

// Update parent when editor value changes
const handleChange = (value: string) => {
  try {
    editorText.value = value

    // Convert display markdown (with data URLs) to storage markdown (with image IDs)
    const storageValue = replaceDataWithImageIds(value)
    emit('update:modelValue', storageValue)

    // Extract image IDs that are actually present in the markdown
    // This allows orphaned images to be cleaned up
    const idsInMarkdown = extractImageIdsFromMarkdown(storageValue)
    emit('update:imageIds', Array.from(idsInMarkdown))
  } catch (error) {
    console.error('Error in handleChange:', error)
    // Still emit the value even if conversion fails
    emit('update:modelValue', value)
  }
}

// Process files and upload to IndexedDB
const processFiles = async (files: File[]): Promise<string[]> => {
  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        message.error(`${file.name} is not an image file`)
        return null
      }

      // Check file size and potentially compress
      let imageFile = file
      if (file.size > MAX_IMAGE_SIZE) {
        message.info(
          `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Compressing to fit 2MB limit...`,
        )
        try {
          const compressed = await imageStorage.compressImage(file)
          imageFile = new File([compressed], file.name, { type: file.type })
          message.success(
            `Compressed to ${(imageFile.size / 1024 / 1024).toFixed(1)}MB (${((compressed.size / file.size) * 100).toFixed(0)}% of original)`,
          )
        } catch (error) {
          message.error(`Failed to compress ${file.name}: ${error}`)
          return null
        }
      }

      // Save to IndexedDB
      try {
        const storedImage = await imageStorage.saveImage(imageFile, props.missionId)
        imageIds.value.add(storedImage.id)

        // Add to the image data map for display
        imageDataMap.value.set(storedImage.id, storedImage.data)

        // Return the base64 data URL for immediate display in the editor
        // (it will be converted to an image ID reference when saved)
        return storedImage.data
      } catch (error) {
        message.error(`Failed to save ${file.name}: ${error}`)
        return null
      }
    }),
  )

  // Filter out failed uploads
  return uploadedImages.filter((url) => url !== null) as string[]
}

// Handle image upload from toolbar button
const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    const successfulUploads = await processFiles(files)
    callback(successfulUploads)

    if (successfulUploads.length > 0) {
      emit('update:imageIds', Array.from(imageIds.value))
    }
  } catch (error) {
    message.error(`Image upload failed: ${error}`)
    callback([])
  }
}

// Handle drag and drop
const handleDrop = async (event: DragEvent) => {
  event.preventDefault()

  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length === 0) return

  try {
    const successfulUploads = await processFiles(files)

    if (successfulUploads.length > 0) {
      // Insert images into the editor at cursor position
      successfulUploads.forEach((url) => {
        const imageMarkdown = `![image](${url})\n`
        const currentText = editorText.value
        editorText.value = currentText + imageMarkdown
      })

      emit('update:imageIds', Array.from(imageIds.value))
    }
  } catch (error) {
    message.error(`Image upload failed: ${error}`)
  }
}

// Calculate editor height based on rows prop (approximate)
const editorHeight = ref(`${props.rows * 24 + 50}px`)
</script>

<template>
  <div class="markdown-editor-wrapper">
    <MdEditor
      v-model="editorText"
      language="en-US"
      :theme="editorTheme"
      :preview="true"
      :toolbars="[
        'bold',
        'italic',
        'strikeThrough',
        '-',
        'title',
        'unorderedList',
        'orderedList',
        '-',
        'image',
        'link',
        '-',
        'preview',
      ]"
      :placeholder="placeholder"
      @onChange="handleChange"
      @onUploadImg="handleUploadImg"
      @drop.prevent="handleDrop"
      @dragover.prevent
      :style="{ height: editorHeight }"
      :showCodeRowNumber="true"
    />
  </div>
</template>

<style scoped>
.markdown-editor-wrapper {
  width: 100%;
}

/* Match Naive UI styling */
.markdown-editor-wrapper :deep(.md-editor) {
  border-radius: 3px;
}
</style>
