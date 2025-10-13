// Package and Support Assets tables
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { getAirframeDisplayName } from '@/data/airframes'
import { formatZuluTime, formatNumber } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'
import { formatSTN } from '@/utils/crewFormatting'

/**
 * Add package table
 */
export function addPackageTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  // Build package data rows
  const packageData = mission.packageMembers.map((member) => [
    member.callsign || '',
    getAirframeDisplayName(member.aircraft),
    member.time ? formatZuluTime(member.time) : '',
    member.comms || '',
    member.stn ? formatSTN(member.stn) : '',
    member.aaTacan || '',
    member.task || '',
  ])

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Package',
          colSpan: 7,
        },
      ],
      ['Callsign', 'A/C', 'Time (Z)', 'Comms', 'STN', 'A/A TCN', 'Task'],
    ],
    body: packageData,
    columnStyles: {
      0: { cellWidth: 0.7 },
      1: { cellWidth: 0.8 },
      2: { cellWidth: 0.6 },
      3: { cellWidth: 0.6 },
      4: { cellWidth: 0.4 },
      5: { cellWidth: 0.5 },
      6: { cellWidth: 1.65 },
    },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add support assets table
 */
export function addSupportAssetsTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  // Build support asset data rows
  const assetData = mission.supportAssets.map((asset) => [
    asset.callsign || '',
    asset.role || '',
    asset.frequency && asset.preset
      ? `${asset.frequency} (${asset.preset})`
      : asset.frequency || '',
    asset.aaTacan || '',
    asset.location || '',
    asset.altitude ? formatNumber(asset.altitude) : '',
  ])

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Support Assets',
          colSpan: 6,
        },
      ],
      ['Callsign', 'Role', 'Freq (Preset)', 'A/A TCN', 'Location', 'Alt'],
    ],
    body: assetData,
    columnStyles: {
      0: { cellWidth: 0.8 },
      1: { cellWidth: 0.7 },
      2: { cellWidth: 0.9 },
      3: { cellWidth: 0.6 },
      4: { cellWidth: 1.5 },
      5: { cellWidth: 0.75 },
    },
  })

  return doc.lastAutoTable!.finalY
}
