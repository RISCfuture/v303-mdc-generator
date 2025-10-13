import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../../types'
import { PAGE_CONFIG, F16_STATIONS, COLORS } from '../../constants'
import { getDefaultTableOptions } from './tableOptions'
import { getMunitionDisplayName } from '@/data/munitions'

/**
 * Add presets and loadout tables side-by-side
 * Returns the maximum finalY of both tables
 */
export function addPresetsAndLoadoutTables(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const midPoint = pageWidth / 2

  // LEFT: Presets table (two columns)
  const filteredPresets = mission.radioPresets[0]
    ? mission.radioPresets[0].filter((p) => p.description && p.description.trim() !== '')
    : []
  const halfCount = Math.ceil(filteredPresets.length / 2)
  const presetsRows: TableRow[] = []
  for (let i = 0; i < halfCount; i++) {
    const left = filteredPresets[i]
    const right = filteredPresets[i + halfCount]
    presetsRows.push([
      left ? left.number.toString() : '',
      left ? `${left.frequency} // ${left.description}` : '',
      right ? right.number.toString() : '',
      right ? `${right.frequency} // ${right.description}` : '',
    ])
  }

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: 'UHF Presets', colSpan: 4 }]],
    body: presetsRows,
    margin: { left: PAGE_CONFIG.margin, right: midPoint },
  })
  const presetsEndY = doc.lastAutoTable!.finalY

  // RIGHT: Loadout table
  const loadoutRows: TableRow[] = []
  const gunAmmoType = mission.gunAmmoType || 'HEI'

  const chaffTotal = mission.ecmCmds.chaffTotal || 0
  const flareTotal = mission.ecmCmds.flareTotal || 0
  const chaffBingo = mission.ecmCmds.chaffBingo || 0
  const flareBingo = mission.ecmCmds.flareBingo || 0
  const cmdsProfile = mission.cmdsProfile || 'PRGM 1'
  const ecmPrograms =
    mission.ecmPrograms && mission.ecmPrograms.length > 0 ? mission.ecmPrograms.join(', ') : ''

  // Build countermeasures column data (right-most column)
  const cmData = [
    'CHAFF',
    `${chaffTotal} / Bingo ${chaffBingo}`,
    'FLARE',
    `${flareTotal} / Bingo ${flareBingo}`,
    'CMDS',
    cmdsProfile,
    'ECM',
    ecmPrograms,
  ]

  // Row 0: Gun with ammo type, rounds, and CHAFF label
  loadoutRows.push(['M61A1', gunAmmoType, '511', cmData[0] || ''])

  // Rows 1-11: Stations (F-16 has 11 stations)
  F16_STATIONS.forEach((stationNum, index) => {
    const stationData = mission.loadout.find((s) => String(s.station) === String(stationNum))
    const item =
      stationData && stationData.item !== 'EMPTY' ? getMunitionDisplayName(stationData.item) : ''
    const cmValue = cmData[index + 1] || ''
    loadoutRows.push([`STA ${stationNum}`, { content: item, colSpan: 2 }, cmValue])
  })

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: 'LOADOUT', colSpan: 4 }]],
    body: loadoutRows,
    margin: { left: midPoint, right: PAGE_CONFIG.margin },
    columnStyles: {
      0: { cellWidth: 0.6 },
      3: { cellWidth: 0.6 },
    },
    didParseCell: (data) => {
      // Style label cells in columns 0 and 3 as gray and bold
      // Column 0: M61A1, STA X
      // Column 3: CHAFF, FLARE, CMDS, ECM labels
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = COLORS.lightGray
        data.cell.styles.fontStyle = 'bold'
      }
      // Style the countermeasure labels in column 3 (CHAFF, FLARE, CMDS, ECM)
      if (data.section === 'body' && data.column.index === 3) {
        const cellText = typeof data.cell.raw === 'string' ? data.cell.raw : ''
        if (
          cellText === 'CHAFF' ||
          cellText === 'FLARE' ||
          cellText === 'CMDS' ||
          cellText === 'ECM'
        ) {
          data.cell.styles.fillColor = COLORS.lightGray
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })
  const loadoutEndY = doc.lastAutoTable!.finalY

  return Math.max(presetsEndY, loadoutEndY)
}
