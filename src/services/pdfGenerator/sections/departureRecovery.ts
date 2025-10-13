// Departure and Recovery section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../types'
import { getAirportName } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Add Departure/Recovery table
 */
export function addDepartureRecoveryTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const rows: TableRow[] = []

  // Departure row (airport first, then procedure)
  const departureProc = mission.departureRecovery.departureProcedure || ''
  const departureAirport = getAirportName(
    mission.departureRecovery.departureAirportId || '',
    mission.theater,
  )
  const departureRunway = mission.departureRecovery.departureRunwayName || ''
  const departureAirportWithRunway = departureRunway
    ? `${departureAirport} RWY ${departureRunway}`
    : departureAirport

  rows.push(['Departure', departureAirportWithRunway, departureProc])

  // Arrival row (airport first, then procedure)
  const arrivalProc = mission.departureRecovery.recoveryProcedure || ''
  const arrivalAirport = getAirportName(
    mission.departureRecovery.recoveryAirportId || '',
    mission.theater,
  )
  const arrivalRunway = mission.departureRecovery.recoveryRunwayName || ''
  const arrivalAirportWithRunway = arrivalRunway
    ? `${arrivalAirport} RWY ${arrivalRunway}`
    : arrivalAirport

  rows.push(['Arrival', arrivalAirportWithRunway, arrivalProc])

  // Alternate row
  const alternateAirport = getAirportName(
    mission.departureRecovery.alternateAirportId || '',
    mission.theater,
  )

  rows.push(['Alternate', { content: alternateAirport, colSpan: 2 }, ''])

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: 'Departure / Recovery', colSpan: 3 }]],
    body: rows,
    columnStyles: {
      0: { cellWidth: 0.8 },
      1: { cellWidth: 2.0 },
      2: { cellWidth: 1.45 },
    },
  })

  return doc.lastAutoTable!.finalY
}
