import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import { formatLatLonToDMM } from '../../utils/formatting'
import { formatNumber } from '@/utils/formatting'

/**
 * Add flight plan table (page 1)
 */
export function addFlightPlanTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const waypointRows: TableRow[] = mission.waypoints
    .filter((wp) => wp.name && (wp.latitude !== null || wp.longitude !== null))
    .map((wp) => {
      let coordsDisplay = ''
      if (wp.type !== 'PARK' && wp.latitude !== null && wp.longitude !== null) {
        coordsDisplay = formatLatLonToDMM(wp.latitude, wp.longitude)
      }
      return [
        wp.sequence.toString(),
        wp.name || '',
        wp.type || '',
        coordsDisplay,
        wp.altitude ? formatNumber(wp.altitude) : '',
        wp.speed ? formatNumber(wp.speed) : '',
      ]
    })

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [{ content: 'Flight Plan', colSpan: 6 }],
      ['WPT', 'Name', 'Type', 'Coords', 'Alt', 'IAS'],
    ],
    body: waypointRows,
  })

  return doc.lastAutoTable!.finalY
}
