import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import { getRadioLabel, formatBullseye } from '../../utils/formatting'
import { COLORS } from '../../constants'

/**
 * Add radios table (comm ladder summary)
 */
export function addRadiosTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const radioRows: TableRow[] = []
  mission.radioPresets.forEach((radioPresets, radioIndex) => {
    const radioLabel = getRadioLabel(radioIndex)
    let presetDesc = ''
    const radioCommLadder = mission.commLadders?.[radioIndex]
    if (radioCommLadder && radioCommLadder.length > 0) {
      presetDesc = radioCommLadder.join(' - ')
    } else {
      presetDesc = radioPresets
        .slice(0, 12)
        .filter((p) => p.description && p.description.trim() !== '')
        .map((p) => `${p.number} (${p.description})`)
        .join(' - ')
    }
    radioRows.push([radioLabel, presetDesc])
  })

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: 'Radios', colSpan: 2 }]],
    body: radioRows,
    columnStyles: {
      0: { cellWidth: 0.6 },
    },
    didParseCell: (data) => {
      // Style radio label cells (column 0) as gray and bold
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = COLORS.lightGray
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add weather and bullseye table
 */
export function addWeatherBullseyeTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const weatherText = mission.weather || ''
  const bullseyeText = formatBullseye(
    mission.bullseye?.latitude ?? undefined,
    mission.bullseye?.longitude ?? undefined,
  )

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    body: [
      ['Weather', weatherText],
      ['Bullseye', bullseyeText],
    ],
    columnStyles: {
      0: { cellWidth: 0.6 },
    },
    didParseCell: (data) => {
      // Style label cells (column 0) as gray and bold
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = COLORS.lightGray
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  return doc.lastAutoTable!.finalY
}
