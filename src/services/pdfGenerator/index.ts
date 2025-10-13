// PDF Briefing Card Generator
// Main entry point for generating briefing cards similar to the v93 FS format

import jsPDF from 'jspdf'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from './types'
import { PAGE_CONFIG } from './constants'
import { generatePage1 } from './pages/page1'
import { generatePage2 } from './pages/page2'
import { generatePage3 } from './pages/page3'

/**
 * Generate and download PDF briefing card
 */
export async function generateBriefingCard(mission: Mission) {
  // Kneeboard size: 5.5" x 8.5" (half of landscape letter)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [PAGE_CONFIG.width, PAGE_CONFIG.height],
  }) as PDFDocumentExtended

  // Generate Page 1
  generatePage1(doc, mission)

  // Generate Page 2
  generatePage2(doc, mission)

  // Generate Page 3 (if needed)
  await generatePage3(doc, mission)

  // Save PDF
  doc.save(`${mission.name || 'mission'}_briefing.pdf`)
}
