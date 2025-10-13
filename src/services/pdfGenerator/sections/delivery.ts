// CCIP Delivery table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Add CCIP delivery tables (one per TGT steerpoint with CCIP data)
 */
export function addDeliveryTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  // Find all TGT waypoints with CCIP data
  const tgtWaypoints = mission.waypoints.filter(
    (wp) => wp.type === 'TGT' && wp.ccip !== undefined && wp.ccip !== null,
  )

  // If no TGT waypoints with CCIP data, return
  if (tgtWaypoints.length === 0) {
    return startY
  }

  let currentY = startY

  // Generate a table for each TGT waypoint with CCIP data
  for (const waypoint of tgtWaypoints) {
    const ccip = waypoint.ccip!

    // Check if at least one reference point exists
    const hasReferencePoints = !!(
      ccip?.vip?.bearing !== undefined ||
      ccip?.vip?.distance !== undefined ||
      ccip?.vip?.elevation !== undefined ||
      ccip?.vrp?.bearing !== undefined ||
      ccip?.vrp?.distance !== undefined ||
      ccip?.vrp?.elevation !== undefined ||
      ccip?.oa1?.bearing !== undefined ||
      ccip?.oa1?.distance !== undefined ||
      ccip?.oa1?.elevation !== undefined ||
      ccip?.oa2?.bearing !== undefined ||
      ccip?.oa2?.distance !== undefined ||
      ccip?.oa2?.elevation !== undefined ||
      ccip?.pup?.bearing !== undefined ||
      ccip?.pup?.distance !== undefined ||
      ccip?.pup?.elevation !== undefined
    )

    // Skip this waypoint's table if no reference points
    if (!hasReferencePoints) {
      continue
    }

    // Determine which reference point type to show (VIP or VRP)
    const refPointType = ccip?.referencePointType ?? 'VRP'
    const refPoint = refPointType === 'VIP' ? ccip?.vip : ccip?.vrp

    // Helper to format bearing with 0.1 precision
    const formatBearing = (value: number | undefined): string => {
      if (value === undefined || value === null) return ''
      return value.toFixed(1)
    }

    // Helper to format distance (feet to NM with 0.1 precision)
    const formatDistance = (feet: number | undefined): string => {
      if (feet === undefined || feet === null) return ''
      const nm = feet / 6076
      return nm.toFixed(1)
    }

    // Helper to format elevation (offset to MSL)
    const formatElevation = (
      offset: number | undefined,
      waypointAltitude: number | null,
    ): string => {
      if (offset === undefined || offset === null) return ''
      if (!waypointAltitude) return ''
      const msl = waypointAltitude + offset
      return Math.round(msl).toString()
    }

    autoTable(doc, {
      ...getDefaultTableOptions(),
      startY: currentY,
      head: [
        [
          {
            content: `CCIP - Steerpoint ${waypoint.sequence}: ${waypoint.name}`,
            colSpan: 5,
          },
        ],
      ],
      body: [
        ['', refPointType, 'OA1', 'OA2', 'PUP'],
        [
          'BRNG',
          formatBearing(refPoint?.bearing),
          formatBearing(ccip?.oa1?.bearing),
          formatBearing(ccip?.oa2?.bearing),
          formatBearing(ccip?.pup?.bearing),
        ],
        [
          'RNG',
          formatDistance(refPoint?.distance),
          formatDistance(ccip?.oa1?.distance),
          formatDistance(ccip?.oa2?.distance),
          formatDistance(ccip?.pup?.distance),
        ],
        [
          'ELEV',
          formatElevation(refPoint?.elevation, waypoint.altitude),
          formatElevation(ccip?.oa1?.elevation, waypoint.altitude),
          formatElevation(ccip?.oa2?.elevation, waypoint.altitude),
          formatElevation(ccip?.pup?.elevation, waypoint.altitude),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 0.6 },
        1: { cellWidth: 0.4 },
        2: { cellWidth: 0.4 },
        3: { cellWidth: 0.4 },
        4: { cellWidth: 0.4 },
      },
    })

    currentY = doc.lastAutoTable!.finalY
  }

  return currentY
}
