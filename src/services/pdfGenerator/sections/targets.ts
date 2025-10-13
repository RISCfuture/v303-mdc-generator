// Target/Tasking and remarks section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../types'
import { formatLatLonToDMM } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'
import { renderMarkdownToPdf } from '@/utils/markdownToPdf'
import { PAGE_CONFIG, FONT_SIZES } from '../constants'

/**
 * Add target/tasking table with remarks
 */
export function addTargetTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const primaryName = mission.details.primaryTarget?.name || ''
  const primaryDmpi = mission.details.primaryTarget?.dmpi || ''
  const primaryCoords =
    mission.details.primaryTarget?.latitude !== null &&
    mission.details.primaryTarget?.latitude !== undefined &&
    mission.details.primaryTarget?.longitude !== null &&
    mission.details.primaryTarget?.longitude !== undefined
      ? formatLatLonToDMM(
          mission.details.primaryTarget.latitude,
          mission.details.primaryTarget.longitude,
        )
      : ''
  const primaryRemarks = mission.details.primaryTarget?.remarks || ''

  const secondaryName = mission.details.secondaryTarget?.name || ''
  const secondaryDmpi = mission.details.secondaryTarget?.dmpi || ''
  const secondaryRemarks = mission.details.secondaryTarget?.remarks || ''

  const primaryAttackHdg = mission.details.primaryTarget?.attackHeading
  const primaryIngressAlt = mission.details.primaryTarget?.ingressAltitude
  const secondaryAttackHdg = mission.details.secondaryTarget?.attackHeading
  const secondaryIngressAlt = mission.details.secondaryTarget?.ingressAltitude

  const body: TableRow[] = [
    ['Primary', primaryName, 'Secondary', secondaryName],
    ['DMPI', primaryDmpi, 'DMPI', secondaryDmpi],
    ['Coords', primaryCoords, 'Coords', ''],
    [
      'Attack Hdg',
      primaryAttackHdg !== undefined && primaryAttackHdg !== null ? `${primaryAttackHdg}°` : '',
      'Attack Hdg',
      secondaryAttackHdg !== undefined && secondaryAttackHdg !== null
        ? `${secondaryAttackHdg}°`
        : '',
    ],
    [
      'Ingress Alt',
      primaryIngressAlt !== undefined && primaryIngressAlt !== null
        ? `${primaryIngressAlt} ft`
        : '',
      'Ingress Alt',
      secondaryIngressAlt !== undefined && secondaryIngressAlt !== null
        ? `${secondaryIngressAlt} ft`
        : '',
    ],
  ]

  // Add remarks rows if they exist
  if (primaryRemarks || secondaryRemarks) {
    body.push(['Remarks/TOT', primaryRemarks || '', 'Remarks/TOT', secondaryRemarks || ''])
  }

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Target / Tasking',
          colSpan: 4,
        },
      ],
    ],
    body,
    columnStyles: {
      0: { cellWidth: 0.6 },
      1: { cellWidth: 2.1 },
      2: { cellWidth: 0.6 },
      3: { cellWidth: 2.1 },
    },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add remarks/threats section with markdown support
 */
export async function addRemarksTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): Promise<number> {
  const primaryRemarks = mission.details.primaryTarget?.remarks
  const secondaryRemarks = mission.details.secondaryTarget?.remarks

  if (!primaryRemarks && !secondaryRemarks) {
    return startY
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = startY

  // Add header
  doc.setFontSize(FONT_SIZES.sectionTitle)
  doc.setFont('helvetica', 'bold')
  doc.text('Remarks/Threats/TOT', PAGE_CONFIG.margin, currentY)
  currentY += 0.2 // Increased spacing to prevent overlap

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Render primary target remarks if available
  if (primaryRemarks) {
    doc.setFont('helvetica', 'bold')
    doc.text('Target 1/2:', PAGE_CONFIG.margin, currentY)
    currentY += 0.15 // Increased spacing to prevent overlap
    doc.setFont('helvetica', 'normal')

    const result = await renderMarkdownToPdf(doc, primaryRemarks, {
      x: PAGE_CONFIG.margin,
      y: currentY,
      maxWidth: pageWidth - 2 * PAGE_CONFIG.margin,
      fontSize: 8,
      lineHeight: 0.12,
    })
    currentY = result.finalY + 0.1
  }

  // Render secondary target remarks if available
  if (secondaryRemarks) {
    doc.setFont('helvetica', 'bold')
    doc.text('Target 2/2:', PAGE_CONFIG.margin, currentY)
    currentY += 0.15 // Increased spacing to prevent overlap
    doc.setFont('helvetica', 'normal')

    const result = await renderMarkdownToPdf(doc, secondaryRemarks, {
      x: PAGE_CONFIG.margin,
      y: currentY,
      maxWidth: pageWidth - 2 * PAGE_CONFIG.margin,
      fontSize: 8,
      lineHeight: 0.12,
    })
    currentY = result.finalY
  }

  return currentY
}
