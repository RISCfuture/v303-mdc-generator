import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import { getAirportName } from '../../utils/formatting'
import { COLORS } from '../../constants'

/**
 * Add departure/arrival/alternate table
 */
export function addDepartureRecoveryTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const departureProc = mission.departureRecovery.departureProcedure || ''
  const departureAirport = getAirportName(
    mission.departureRecovery.departureAirportId || '',
    mission.theater,
  )
  const departureRunway = mission.departureRecovery.departureRunwayName || ''
  const departureAirportWithRunway = departureRunway
    ? `${departureAirport} RWY ${departureRunway}`
    : departureAirport

  const arrivalProc = mission.departureRecovery.recoveryProcedure || ''
  const arrivalAirport = getAirportName(
    mission.departureRecovery.recoveryAirportId || '',
    mission.theater,
  )
  const arrivalRunway = mission.departureRecovery.recoveryRunwayName || ''
  const arrivalAirportWithRunway = arrivalRunway
    ? `${arrivalAirport} RWY ${arrivalRunway}`
    : arrivalAirport

  const alternateAirport = getAirportName(
    mission.departureRecovery.alternateAirportId || '',
    mission.theater,
  )

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    body: [
      [{ content: 'Departure', colSpan: 2 }],
      [departureAirportWithRunway, departureProc],
      [{ content: 'Arrival', colSpan: 2 }],
      [arrivalAirportWithRunway, arrivalProc],
      [{ content: 'Alternate', colSpan: 2 }],
      [{ content: alternateAirport, colSpan: 2 }],
    ],
    didParseCell: (data) => {
      // Style title rows (Departure, Arrival, Alternate) as gray and bold
      if (
        data.section === 'body' &&
        (data.row.index === 0 || data.row.index === 2 || data.row.index === 4)
      ) {
        data.cell.styles.fillColor = COLORS.lightGray
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.halign = 'center'
      }
    },
  })

  return doc.lastAutoTable!.finalY
}
