// Header banner section
import type jsPDF from 'jspdf'
import type { Mission } from '@/types'
import { COLORS, FONT_SIZES } from '../constants'
import { getSquadronDisplayName } from '@/data/squadrons'
import { resetColors } from '../utils/layout'

/**
 * Add blue header banner with squadron name and logo placeholders
 */
export function addHeaderBanner(doc: jsPDF, mission: Mission) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const squadronName = getSquadronDisplayName(mission.squadron) || 'Squadron'

  // Blue background banner
  doc.setFillColor(...COLORS.headerBlue)
  doc.rect(0, 0, pageWidth, 0.5, 'F')

  // Left logo placeholder (white box)
  doc.setFillColor(...COLORS.white)
  doc.rect(0.1, 0.05, 0.4, 0.4, 'F')
  doc.setDrawColor(...COLORS.white)
  doc.rect(0.1, 0.05, 0.4, 0.4, 'S')

  // Right logo placeholder (white box)
  doc.rect(pageWidth - 0.5, 0.05, 0.4, 0.4, 'F')
  doc.rect(pageWidth - 0.5, 0.05, 0.4, 0.4, 'S')

  // White text
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(FONT_SIZES.header)
  doc.setFont('helvetica', 'bold')
  doc.text(`${squadronName.toUpperCase()} MISSION DATA CARD`, pageWidth / 2, 0.33, {
    align: 'center',
  })

  // Reset colors
  resetColors(doc)
}
