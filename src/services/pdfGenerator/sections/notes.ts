// Notes/Remarks page section
import type jsPDF from 'jspdf'
import type { Mission } from '@/types'
import { PAGE_CONFIG, FONT_SIZES } from '../constants'
import { renderMarkdownToPdf } from '@/utils/markdownToPdf'

/**
 * Add notes page with remarks
 * Returns true if page was added, false otherwise
 */
export async function addNotesPage(doc: jsPDF, mission: Mission): Promise<boolean> {
  if (!mission.details.remarks) {
    return false
  }

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.addPage()
  let y = 0.3 // Start lower to account for text baseline

  doc.setFontSize(FONT_SIZES.sectionTitle)
  doc.setFont('helvetica', 'bold')
  doc.text('Notes / Images / SLEDs', PAGE_CONFIG.margin, y)

  y += 0.25 // Increased spacing after header

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  await renderMarkdownToPdf(doc, mission.details.remarks, {
    x: PAGE_CONFIG.margin,
    y,
    maxWidth: pageWidth - 2 * PAGE_CONFIG.margin,
    fontSize: 8,
    lineHeight: 0.12,
  })

  return true
}
