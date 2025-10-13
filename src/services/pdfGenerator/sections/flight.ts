// Flight crew table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { DEFAULTS } from '../constants'
import {
  getEffectiveFlightCallsign,
  getEffectiveLink16Prefix,
  getFlightNumber,
  getPositionLabel,
} from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Add flight crew table
 */
export function addFlightTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const effectiveFlightCallsign = getEffectiveFlightCallsign(mission)
  const effectiveLink16Prefix = getEffectiveLink16Prefix(mission)
  const flightNumber = getFlightNumber(effectiveFlightCallsign)

  // Get flight lead's data (first crew member)
  const flightLead = mission.crew[0]
  const leadIntraflight = flightLead?.intraflight || ''
  const leadAaTcn = flightLead?.aaTcn || ''

  // Calculate +63 reciprocal TACAN for wingmen
  const calculateReciprocalTacan = (tacan: string | undefined): string => {
    if (!tacan) return ''
    const match = tacan.match(/^(\d+)([XY])$/i)
    if (!match || !match[1] || !match[2]) return ''

    const channel = parseInt(match[1])
    const band = match[2].toUpperCase()

    // Add 63 and wrap around if needed (TACAN channels are 1-126)
    let newChannel = channel + 63
    if (newChannel > 126) newChannel -= 126

    return `${newChannel}${band}`
  }

  const reciprocalTacan = calculateReciprocalTacan(leadAaTcn)

  // Build flight data rows
  const flightData = mission.crew.map((member, index) => {
    // Use flight lead's Link16 prefix + flight number + position (1-4)
    let callsignDisplay = ''
    if (member.pilot && effectiveLink16Prefix) {
      callsignDisplay = `${effectiveLink16Prefix}${flightNumber}${index + 1}`
    }

    // Use flight lead's intraflight for everyone
    const intraflightDisplay = member.pilot ? leadIntraflight : ''

    // For A/A TACAN: lead uses their TACAN, others use +63 reciprocal
    let aaTcnDisplay = ''
    if (member.pilot) {
      aaTcnDisplay = index === 0 ? leadAaTcn : reciprocalTacan
    }

    return [
      `-${index + 1}`,
      member.position,
      member.pilot,
      callsignDisplay,
      member.stn || '',
      member.mode3 || '',
      aaTcnDisplay,
      intraflightDisplay,
      member.laser || '',
    ]
  })

  // Add up to 4 rows
  while (flightData.length < DEFAULTS.maxFlightMembers) {
    const nextIndex = flightData.length
    const position = getPositionLabel(nextIndex)
    flightData.push([`-${nextIndex + 1}`, position, '', '', '', '', '', '', ''])
  }

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Flight',
          colSpan: 9,
        },
      ],
      ['#', 'POSITION', 'PILOT', 'CALLSIGN', 'STN', 'MODE 3', 'A/A TCN', 'INTRAFLIGHT', 'LASER'],
    ],
    body: flightData,
    columnStyles: {
      0: { cellWidth: 0.25 },
      1: { cellWidth: 0.6 },
      2: { cellWidth: 0.6 },
      3: { cellWidth: 0.5 },
      4: { cellWidth: 0.4 },
      5: { cellWidth: 0.45 },
      6: { cellWidth: 0.45 },
      7: { cellWidth: 0.6 },
      8: { cellWidth: 0.4 },
    },
  })

  return doc.lastAutoTable!.finalY
}
