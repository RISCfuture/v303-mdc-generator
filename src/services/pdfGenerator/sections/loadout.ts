// Loadout table section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../types'
import { PAGE_CONFIG, F16_STATIONS } from '../constants'
import { getDefaultTableOptions } from '../utils/layout'
import { getMunitionDisplayName } from '@/data/munitions'

/**
 * Add loadout table with gun, stations, and countermeasures integrated
 */
export function addLoadoutTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const loadoutRows: TableRow[] = []

  // Gun ammo type from mission data (or default to 'HEI')
  const gunAmmoType = mission.gunAmmoType || 'HEI'
  const gunRounds = 511 // F-16C standard

  // First row: Gun with split columns for ammo type and rounds
  loadoutRows.push(['M61A1', gunAmmoType, gunRounds.toString()])

  // F-16C has stations: 1, 2, 3, 4, 5L, 5, 5R, 6, 7, 8, 9
  F16_STATIONS.forEach((stationNum) => {
    const stationData = mission.loadout.find((s) => String(s.station) === String(stationNum))
    const item =
      stationData && stationData.item !== 'EMPTY' ? getMunitionDisplayName(stationData.item) : ''
    loadoutRows.push([`STA ${stationNum}`, { content: item, colSpan: 2 }, ''])
  })

  // Get CMDS totals
  const chaffTotal = mission.ecmCmds.chaffTotal || 0
  const flareTotal = mission.ecmCmds.flareTotal || 0
  const chaffBingo = mission.ecmCmds.chaffBingo || 0
  const flareBingo = mission.ecmCmds.flareBingo || 0

  // CMDS profile from mission data (or default to 'PRGM 1')
  const cmdsProfile = mission.cmdsProfile || 'PRGM 1'

  // ECM programs from mission data - format as comma-separated list
  const ecmPrograms =
    mission.ecmPrograms && mission.ecmPrograms.length > 0 ? mission.ecmPrograms.join(', ') : ''

  // Countermeasures rows
  loadoutRows.push(['CHAFF', { content: `${chaffTotal} / Bingo ${chaffBingo}`, colSpan: 2 }, ''])
  loadoutRows.push(['FLARE', { content: `${flareTotal} / Bingo ${flareBingo}`, colSpan: 2 }, ''])
  loadoutRows.push(['CMDS', { content: cmdsProfile, colSpan: 2 }, ''])
  if (ecmPrograms) {
    loadoutRows.push(['ECM', { content: ecmPrograms, colSpan: 2 }, ''])
  }

  const midPoint = doc.internal.pageSize.getWidth() / 2

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: 'LOADOUT', colSpan: 3 }]],
    body: loadoutRows,
    columnStyles: {
      0: { cellWidth: 0.6 },
      1: { cellWidth: 0.6 },
      2: { cellWidth: 0.45 },
    },
    margin: { left: midPoint + 0.02, right: PAGE_CONFIG.margin },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * @deprecated Use addLoadoutTable instead
 */
export function addStationsTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  return addLoadoutTable(doc, mission, startY)
}

/**
 * @deprecated Use addLoadoutTable instead - countermeasures are now integrated into loadout table
 */
export function addCountermeasuresTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  // Return the same Y position since this is now part of addLoadoutTable
  return startY
}
