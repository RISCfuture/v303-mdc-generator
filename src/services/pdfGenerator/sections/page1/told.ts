import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../../types'
import { getDefaultTableOptions } from './tableOptions'
import { formatNumber } from '@/utils/formatting'
import { getLoadoutOnlyWeight, getFuelCapacity } from '@/data/munitions'
import { getAirframeData } from '@/utils/airframeHelpers'
import { getSquadronAirframe } from '@/data/squadrons'
import { COLORS } from '../../constants'

/**
 * Calculate gross weight
 */
function calculateGrossWeight(mission: Mission): number {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)
  const emptyWeight = airframeData?.emptyWeight || 0
  const loadoutWeight = mission.loadout.reduce((total, station) => {
    return total + getLoadoutOnlyWeight(station.item)
  }, 0)
  const internalFuel = airframeData?.internalFuel || 0
  const externalFuel = mission.loadout.reduce((total, station) => {
    const fuelCapacity = getFuelCapacity(station.item)
    return total + (fuelCapacity > 0 ? fuelCapacity : 0)
  }, 0)
  return emptyWeight + loadoutWeight + internalFuel + externalFuel
}

/**
 * Add TOLD and Fuel table
 */
export function addToldTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const grossWeight = mission.told.grossWeight || calculateGrossWeight(mission)

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        { content: 'TOLD', colSpan: 4 },
        { content: 'Fuel', colSpan: 2 },
      ],
    ],
    body: [
      [
        'Gross Wt',
        formatNumber(grossWeight) + ' lbs',
        'Rotation',
        formatNumber(mission.told.rotation || 0) + ' kts',
        'TO',
        formatNumber(mission.fuel.takeoff) + ' lbs',
      ],
      [
        'Min AGL',
        mission.told.minAgl !== undefined && mission.told.minAgl !== null
          ? formatNumber(mission.told.minAgl) + ' ft'
          : '',
        'Refusal',
        mission.told.refusal ? formatNumber(mission.told.refusal) + ' kts' : '',
        'Joker',
        formatNumber(mission.fuel.joker) + ' lbs',
      ],
      [
        'Min MSL',
        mission.told.minMsl !== undefined && mission.told.minMsl !== null
          ? formatNumber(mission.told.minMsl) + ' ft'
          : '',
        '',
        '',
        'Bingo',
        formatNumber(mission.fuel.bingo) + ' lbs',
      ],
    ],
    columnStyles: {
      0: { cellWidth: 0.7 },
      1: { cellWidth: 1.3 },
      2: { cellWidth: 0.7 },
      3: { cellWidth: 0.9 },
      4: { cellWidth: 0.6 },
      5: { cellWidth: 1.0 },
    },
    didParseCell: (data) => {
      // Style label cells (columns 0, 2, 4) as gray and bold
      if (
        data.section === 'body' &&
        (data.column.index === 0 || data.column.index === 2 || data.column.index === 4)
      ) {
        data.cell.styles.fillColor = COLORS.lightGray
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  return doc.lastAutoTable!.finalY
}
