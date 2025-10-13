/**
 * Utilities for rendering Markdown content in PDFs
 * Converts markdown to structured content, then renders directly to PDF
 */
import type jsPDF from 'jspdf'
import MarkdownIt from 'markdown-it'
import { imageStorage } from '@/services/imageStorage'

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

interface RenderOptions {
  x: number
  y: number
  maxWidth: number
  fontSize?: number
  lineHeight?: number
}

interface RenderResult {
  finalY: number
  pageAdded: boolean
}

interface ContentBlock {
  type: 'paragraph' | 'heading' | 'list-item' | 'image'
  content: string
  level?: number // for headings
  imageData?: string // base64 data URL for images
  bold?: boolean
  italic?: boolean
}

/**
 * Parse markdown into structured content blocks
 */
async function parseMarkdownToBlocks(markdown: string): Promise<ContentBlock[]> {
  const tokens = md.parse(markdown, {})
  const blocks: ContentBlock[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue

    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.substring(1))
      const inlineToken = tokens[i + 1]
      if (inlineToken && inlineToken.type === 'inline') {
        blocks.push({
          type: 'heading',
          content: inlineToken.content,
          level,
        })
      }
      i += 2
    } else if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1]
      if (inlineToken && inlineToken.type === 'inline') {
        // Check if paragraph contains an image
        const hasImage = inlineToken.children?.some((child) => child.type === 'image')

        if (hasImage && inlineToken.children) {
          // Process images separately
          for (const child of inlineToken.children) {
            if (child.type === 'image') {
              const src = child.attrGet('src')
              if (src) {
                // Load image data
                let imageData = src
                if (!src.startsWith('data:')) {
                  const imageId = src.startsWith('image://')
                    ? src.substring('image://'.length)
                    : src
                  try {
                    const storedImage = await imageStorage.getImage(imageId)
                    if (storedImage) {
                      imageData = storedImage.data
                    } else {
                      console.warn(`Image not found: ${imageId}`)
                      continue
                    }
                  } catch (error) {
                    console.error(`Failed to load image ${imageId}:`, error)
                    continue
                  }
                }

                blocks.push({
                  type: 'image',
                  content: child.content || '',
                  imageData,
                })
              }
            }
          }
        } else {
          // Regular paragraph
          blocks.push({
            type: 'paragraph',
            content: inlineToken.content,
          })
        }
      }
      i += 2
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      // Process list items
      let j = i + 1
      while (
        j < tokens.length &&
        tokens[j]?.type !== 'bullet_list_close' &&
        tokens[j]?.type !== 'ordered_list_close'
      ) {
        if (tokens[j]?.type === 'list_item_open') {
          const paragraphToken = tokens[j + 2]
          if (paragraphToken && paragraphToken.type === 'inline') {
            blocks.push({
              type: 'list-item',
              content: '• ' + paragraphToken.content,
            })
          }
        }
        j++
      }
      i = j
    }
  }

  return blocks
}

/**
 * Render markdown to PDF with proper formatting
 */
export async function renderMarkdownToPdf(
  doc: jsPDF,
  markdown: string | undefined,
  options: RenderOptions,
): Promise<RenderResult> {
  if (!markdown || markdown.trim() === '') {
    return { finalY: options.y, pageAdded: false }
  }

  const { x, maxWidth } = options
  let { y } = options
  const fontSize = options.fontSize || 8
  const lineHeight = options.lineHeight || 0.15

  const pageHeight = doc.internal.pageSize.getHeight()
  const pageMargin = 0.5
  const topMargin = 0.3
  let pageAdded = false

  // Parse markdown into blocks
  const blocks = await parseMarkdownToBlocks(markdown)

  for (const block of blocks) {
    if (block.type === 'heading') {
      // Render heading
      const headingSize = fontSize + (4 - (block.level || 1)) * 1.5
      doc.setFontSize(headingSize)
      doc.setFont('helvetica', 'bold')

      if (y > pageHeight - pageMargin) {
        doc.addPage()
        y = topMargin
        pageAdded = true
      }

      doc.text(block.content, x, y)
      y += lineHeight + 0.1

      doc.setFontSize(fontSize)
      doc.setFont('helvetica', 'normal')
    } else if (block.type === 'paragraph' || block.type === 'list-item') {
      // Render text with word wrapping
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', 'normal')

      const lines = doc.splitTextToSize(block.content, maxWidth)

      for (const line of lines) {
        if (y > pageHeight - pageMargin) {
          doc.addPage()
          y = topMargin
          pageAdded = true
        }

        doc.text(line, x, y)
        y += lineHeight
      }

      // Add small gap after paragraphs
      y += 0.05
    } else if (block.type === 'image' && block.imageData) {
      // Render image
      try {
        const img = new Image()
        const imageLoaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = block.imageData!
        })

        if (!imageLoaded || img.width === 0 || img.height === 0) {
          console.warn('Image failed to load')
          continue
        }

        // Scale image to fit
        let scaledWidth = (img.width / 96) * 0.8 // 80% of actual size
        let scaledHeight = (img.height / 96) * 0.8

        if (scaledWidth > maxWidth) {
          const ratio = maxWidth / scaledWidth
          scaledWidth = maxWidth
          scaledHeight = scaledHeight * ratio
        }

        const maxImageHeight = 3
        if (scaledHeight > maxImageHeight) {
          const ratio = maxImageHeight / scaledHeight
          scaledHeight = maxImageHeight
          scaledWidth = scaledWidth * ratio
        }

        // Check if image fits on current page
        if (y + scaledHeight > pageHeight - pageMargin) {
          doc.addPage()
          y = topMargin
          pageAdded = true
        }

        // Detect format
        let format = 'JPEG'
        if (block.imageData.startsWith('data:image/png')) {
          format = 'PNG'
        }

        doc.addImage(block.imageData, format, x, y, scaledWidth, scaledHeight)
        y += scaledHeight + 0.15
      } catch (error) {
        console.error('Failed to render image:', error)
      }
    }
  }

  return {
    finalY: y,
    pageAdded,
  }
}
