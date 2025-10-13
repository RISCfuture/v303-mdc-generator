import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import { getEffectiveFlightCallsign } from '../../utils/formatting'

/**
 * Add mission info table (Callsign, Date, Mission#, Type)
 */
export function addMissionInfoTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    body: [
      [
        'Callsign',
        getEffectiveFlightCallsign(mission),
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
