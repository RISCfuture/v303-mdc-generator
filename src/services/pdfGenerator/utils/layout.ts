// Layout utility functions for PDF generation
import type jsPDF from 'jspdf'
import type { UserOptions } from 'jspdf-autotable'
import { COLORS, PAGE_CONFIG, FONT_SIZES, TABLE_STYLES } from '../constants'
import { formatFooterDate } from './formatting'

/**
 * Add page footer with date and page number
 */
export function addPageFooter(doc: jsPDF, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(FONT_SIZES.footer)
  doc.setFont('helvetica', 'normal')
  doc.text(`v93 FS MDC; ${formatFooterDate()}`, PAGE_CONFIG.margin, pageHeight - 0.1)
  doc.text(pageNumber.toString(), pageWidth - PAGE_CONFIG.margin - 0.1, pageHeight - 0.1)
}

/**
 * Reset text and draw colors to black
 */
export function resetColors(doc: jsPDF) {
  doc.setTextColor(...COLORS.black)
  doc.setDrawColor(...COLORS.black)
}

/**
 * Get default table options - unified simple styling
 * - Gray header row backgrounds
 * - Light blue content row backgrounds
 * - Bold 2px table borders
 * - 1px inner borders
 * - Bold header text
 * - Italic content text
 */
export function getDefaultTableOptions(): Partial<UserOptions> {
  return {
    theme: 'grid',
    styles: {
      fontSize: TABLE_STYLES.fontSize,
      cellPadding: TABLE_STYLES.cellPadding,
      lineWidth: TABLE_STYLES.innerLineWidth,
      lineColor: COLORS.black,
      fontStyle: 'italic', // Italic content text
    },
    headStyles: {
      fillColor: COLORS.lightGray,
      textColor: COLORS.black,
      fontStyle: 'bold', // Bold header text
      halign: 'center',
    },
    bodyStyles: {
      fillColor: COLORS.lightBlue,
      textColor: COLORS.black,
      fontStyle: 'italic', // Italic content text
    },
    tableLineWidth: TABLE_STYLES.outerLineWidth, // Bold 2px outer border
    tableLineColor: COLORS.black,
    margin: { left: PAGE_CONFIG.margin, right: PAGE_CONFIG.margin },
  }
}
