// Page 3 layout (optional notes page)
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { addNotesPage } from '../sections/notes'
import { addPageFooter } from '../utils/layout'

/**
 * Generate page 3 of the briefing card (if needed)
 * Returns true if page was generated, false otherwise
 */
export async function generatePage3(doc: PDFDocumentExtended, mission: Mission): Promise<boolean> {
  const pageAdded = await addNotesPage(doc, mission)

  if (pageAdded) {
    addPageFooter(doc, 3)
  }

  return pageAdded
}
