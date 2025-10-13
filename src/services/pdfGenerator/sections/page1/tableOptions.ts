import { PAGE_CONFIG, COLORS, TABLE_STYLES } from '../../constants'

/**
 * Default table options for page 1 - 2px outer borders, 1px inner borders
 */
export function getDefaultTableOptions() {
  return {
    theme: 'grid' as const,
    tableWidth: 'auto' as const,
    styles: {
      fontSize: TABLE_STYLES.fontSize,
      cellPadding: TABLE_STYLES.cellPadding,
      lineWidth: TABLE_STYLES.innerLineWidth,
      lineColor: COLORS.black,
      fontStyle: 'italic' as const,
      halign: 'left' as const,
    },
    headStyles: {
      fillColor: COLORS.lightGray,
      textColor: COLORS.black,
      fontStyle: 'bold' as const,
      halign: 'center' as const,
    },
    bodyStyles: {
      fillColor: COLORS.lightBlue,
      textColor: COLORS.black,
      fontStyle: 'italic' as const,
    },
    tableLineWidth: TABLE_STYLES.outerLineWidth,
    tableLineColor: COLORS.black,
    margin: { left: PAGE_CONFIG.margin, right: PAGE_CONFIG.margin },
  }
}
