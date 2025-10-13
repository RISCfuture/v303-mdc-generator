import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import {
  getEffectiveFlightCallsign,
  getEffectiveLink16Prefix,
  getFlightNumber,
  getPositionLabel,
} from '../../utils/formatting'

/**
 * Calculate +63 reciprocal TACAN
 */
function calculateReciprocalTacan(tacan: string | undefined): string {
  if (!tacan) return ''
  const match = tacan.match(/^(\d+)([XY])$/i)
  if (!match || !match[1] || !match[2]) return ''
  const channel = parseInt(match[1])
  const band = match[2].toUpperCase()
  let newChannel = channel + 63
  if (newChannel > 126) newChannel -= 126
  return `${newChannel}${band}`
}

/**
 * Add flight table (crew members)
 */
export function addFlightTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const effectiveLink16Prefix = getEffectiveLink16Prefix(mission)
  const flightNumber = getFlightNumber(getEffectiveFlightCallsign(mission))
  const flightLead = mission.crew[0]
  const leadIntraflight = flightLead?.intraflight || ''
  const leadAaTcn = flightLead?.aaTcn || ''
  const reciprocalTacan = calculateReciprocalTacan(leadAaTcn)

  const flightRows: TableRow[] = []
  for (let i = 0; i < 4; i++) {
    const member = mission.crew[i]
    if (member) {
      const callsignDisplay =
        member.pilot && effectiveLink16Prefix
          ? `${effectiveLink16Prefix}${flightNumber}${i + 1}`
          : ''
      const aaTcnDisplay = member.pilot ? (i === 0 ? leadAaTcn : reciprocalTacan) : ''
      const intraflightDisplay = member.pilot ? leadIntraflight : ''

      flightRows.push([
        `-${i + 1}`,
        member.position,
        member.pilot,
        callsignDisplay,
        member.stn || '',
        member.mode3 || '',
        aaTcnDisplay,
        intraflightDisplay,
        member.laser || '',
      ])
    } else {
      flightRows.push([`-${i + 1}`, getPositionLabel(i), '', '', '', '', '', '', ''])
    }
  }

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [{ content: 'Flight', colSpan: 9 }],
      ['#', 'POSITION', 'PILOT', 'CALLSIGN', 'STN', 'MODE 3', 'A/A TCN', 'INTRAFLIGHT', 'LASER'],
    ],
    body: flightRows,
  })

  return doc.lastAutoTable!.finalY
}
