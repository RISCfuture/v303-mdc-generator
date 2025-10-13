// TOLD and Fuel table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../types'
import { formatNumber } from '@/utils/formatting'
import { getLoadoutOnlyWeight, getFuelCapacity } from '@/data/munitions'
import { getAirframeData } from '@/utils/airframeHelpers'
import { getSquadronAirframe } from '@/data/squadrons'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Calculate gross weight from loadout and fuel
 */
function calculateGrossWeight(mission: Mission): number {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)
  const emptyWeight = airframeData?.emptyWeight || 0

  // Calculate loadout weight
  const loadoutWeight = mission.loadout.reduce((total, station) => {
    return total + getLoadoutOnlyWeight(station.item)
  }, 0)

  // Calculate fuel weight (internal + external)
  const internalFuel = airframeData?.internalFuel || 0
  const externalFuel = mission.loadout.reduce((total, station) => {
    const fuelCapacity = getFuelCapacity(station.item)
    return total + (fuelCapacity > 0 ? fuelCapacity : 0)
  }, 0)
  const fuelWeight = internalFuel + externalFuel

  return emptyWeight + loadoutWeight + fuelWeight
}

/**
 * Add TOLD and Fuel table
 */
export function addToldTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const toldRows: TableRow[] = []

  // Calculate gross weight if not set
  const grossWeight = mission.told.grossWeight || calculateGrossWeight(mission)

  // Row 1: Gross Weight | Rotation | TO
  toldRows.push([
    'Gross Wt',
    formatNumber(grossWeight) + ' lbs',
    'Rotation',
    formatNumber(mission.told.rotation || 0) + ' kts',
    'TO',
    formatNumber(mission.fuel.takeoff) + ' lbs',
  ])

  // Row 2: Min AGL | Refusal | Joker
  toldRows.push([
    'Min AGL',
    mission.told.minAgl !== undefined && mission.told.minAgl !== null
      ? formatNumber(mission.told.minAgl) + ' ft'
      : '',
    'Refusal',
    mission.told.refusal ? formatNumber(mission.told.refusal) + ' kts' : '',
    'Joker',
    formatNumber(mission.fuel.joker) + ' lbs',
  ])

  // Row 3: Min MSL | (empty) | Bingo
  toldRows.push([
    'Min MSL',
    mission.told.minMsl !== undefined && mission.told.minMsl !== null
      ? formatNumber(mission.told.minMsl) + ' ft'
      : '',
    '',
    '',
    'Bingo',
    formatNumber(mission.fuel.bingo) + ' lbs',
  ])

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        { content: 'TOLD', colSpan: 4 },
        { content: 'Fuel', colSpan: 2 },
      ],
    ],
    body: toldRows,
    columnStyles: {
      0: { cellWidth: 0.7 },
      1: { cellWidth: 1.3 },
      2: { cellWidth: 0.7 },
      3: { cellWidth: 0.9 },
      4: { cellWidth: 0.6 },
      5: { cellWidth: 1.0 },
    },
  })

  return doc.lastAutoTable!.finalY
}
