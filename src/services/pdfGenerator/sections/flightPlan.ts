// Flight plan (waypoints) table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { DEFAULTS } from '../constants'
import { formatNumber } from '@/utils/formatting'
import { formatLatLonToDMM } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Build waypoint data rows (only for filled waypoints)
 */
function buildWaypointData(mission: Mission) {
  // Filter to only include waypoints that have been filled in (have a name or coordinates)
  return mission.waypoints
    .filter((wp) => {
      // Include waypoint if it has a name and valid coordinates
      return wp.name && (wp.latitude !== null || wp.longitude !== null)
    })
    .map((wp) => {
      // Skip coordinates for PARKING waypoints
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
}

/**
 * Add flight plan table for page 1 (first 15 waypoints)
 */
export function addFlightPlanPage1(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const wpData = buildWaypointData(mission)
  const wpDataPage1 = wpData.slice(0, DEFAULTS.maxWaypointsPage1)

  // No padding - only show filled waypoints

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Flight Plan',
          colSpan: 6,
        },
      ],
      ['WPT', 'Name', 'Type', 'NAVAID/Coords/Offset', 'Alt', 'IAS'],
    ],
    body: wpDataPage1,
    columnStyles: {
      0: { cellWidth: 0.25 },
      1: { cellWidth: 0.7 },
      2: { cellWidth: 0.35 },
      3: { cellWidth: 2.2 },
      4: { cellWidth: 0.4 },
      5: { cellWidth: 0.4 },
    },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add flight plan table for page 2 (waypoints 16-25)
 */
export function addFlightPlanPage2(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const wpData = buildWaypointData(mission)
  const wpDataPage2 = wpData.slice(
    DEFAULTS.maxWaypointsPage1,
    DEFAULTS.maxWaypointsPage1 + DEFAULTS.maxWaypointsPage2,
  )

  // Skip if no waypoints for page 2
  if (wpDataPage2.length === 0) {
    return startY
  }

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Flight Plan',
          colSpan: 6,
        },
      ],
      ['WPT', 'Name', 'Type', 'NAVAID/Coords/Offset', 'Alt', 'IAS'],
    ],
    body: wpDataPage2,
    columnStyles: {
      0: { cellWidth: 0.3 },
      1: { cellWidth: 0.8 },
      2: { cellWidth: 0.4 },
      3: { cellWidth: 2.2 },
      4: { cellWidth: 0.4 },
      5: { cellWidth: 0.4 },
    },
  })

  return doc.lastAutoTable!.finalY
}
