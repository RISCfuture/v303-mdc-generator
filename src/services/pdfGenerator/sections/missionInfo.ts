// Mission info table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { getEffectiveFlightCallsign } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Add mission info table (callsign, date, mission#, type)
 */
export function addMissionInfoTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const effectiveFlightCallsign = getEffectiveFlightCallsign(mission)

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    body: [
      [
        'Callsign',
        effectiveFlightCallsign,
        'Date',
        mission.date,
        'Mission#',
        mission.missionNumber,
        'Type',
        mission.type,
      ],
    ],
  })

  return doc.lastAutoTable!.finalY
}
