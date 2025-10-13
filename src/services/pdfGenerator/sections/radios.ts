// Radio presets section
import autoTable from 'jspdf-autotable'
import type { Mission } from '@/types'
import type { PDFDocumentExtended, TableRow } from '../types'
import { PAGE_CONFIG, DEFAULTS } from '../constants'
import { getRadioLabel, formatBullseye } from '../utils/formatting'
import { getDefaultTableOptions } from '../utils/layout'

/**
 * Add radios summary table
 */
export function addRadiosTable(doc: PDFDocumentExtended, mission: Mission, startY: number): number {
  const radioRows: TableRow[] = []
  radioRows.push(['Radio #', 'Freq or Preset'])

  mission.radioPresets.forEach((radioPresets, radioIndex) => {
    const radioLabel = getRadioLabel(radioIndex)

    // Check if this radio has a comm ladder defined
    let presetDesc = ''
    const radioCommLadder = mission.commLadders?.[radioIndex]
    if (radioCommLadder && radioCommLadder.length > 0) {
      // Show comm ladder as "1 - 2 - 3 - 4 - 12" format
      presetDesc = radioCommLadder.join(' - ')
    } else {
      // Otherwise, show filtered presets 1-12 with descriptions
      presetDesc = radioPresets
        .slice(0, 12)
        .filter((p) => p.description && p.description.trim() !== '')
        .map((p) => `${p.number} (${p.description})`)
        .join(' - ')
    }

    radioRows.push([radioLabel, presetDesc])
  })

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [
      [
        {
          content: 'Radios',
          colSpan: 2,
        },
      ],
    ],
    body: radioRows,
    columnStyles: {
      0: { cellWidth: 0.6 },
      1: { cellWidth: 'auto' },
    },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add presets table for first radio (radio index 0) - two-column layout
 */
export function addPresetsTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const presets: TableRow[] = []

  // Get filtered presets (only those with descriptions)
  const filteredPresets = mission.radioPresets[0]
    ? mission.radioPresets[0]
        .slice(0, DEFAULTS.maxRadioPresets)
        .filter((preset) => preset.description && preset.description.trim() !== '')
    : []

  // For F-16, first radio is typically UHF
  const radioName = 'UHF' // Could be made dynamic based on airframe

  // Split presets into two columns
  const halfCount = Math.ceil(filteredPresets.length / 2)

  for (let i = 0; i < halfCount; i++) {
    const leftPreset = filteredPresets[i]
    const rightPreset = filteredPresets[i + halfCount]

    const row: TableRow = []

    // Left side preset
    if (leftPreset) {
      row.push(leftPreset.number.toString())
      row.push(`${leftPreset.frequency} // ${leftPreset.description}`)
    } else {
      row.push('')
      row.push('')
    }

    // Right side preset
    if (rightPreset) {
      row.push(rightPreset.number.toString())
      row.push(`${rightPreset.frequency} // ${rightPreset.description}`)
    } else {
      row.push('')
      row.push('')
    }

    presets.push(row)
  }

  const midPoint = doc.internal.pageSize.getWidth() / 2

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    head: [[{ content: `${radioName} Presets`, colSpan: 4 }]],
    body: presets,
    columnStyles: {
      0: { cellWidth: 0.2 },
      1: { cellWidth: 0.79 },
      2: { cellWidth: 0.2 },
      3: { cellWidth: 0.79 },
    },
    margin: { left: PAGE_CONFIG.margin, right: midPoint },
  })

  return doc.lastAutoTable!.finalY
}

/**
 * Add weather and bullseye table - single row format matching reference
 */
export function addWeatherBullseyeTable(
  doc: PDFDocumentExtended,
  mission: Mission,
  startY: number,
): number {
  const weatherText = mission.weather || ''
  const bullseyeText = formatBullseye(
    mission.bullseye?.latitude ?? undefined,
    mission.bullseye?.longitude ?? undefined,
  )

  autoTable(doc, {
    ...getDefaultTableOptions(),
    startY,
    body: [['Weather', weatherText, 'Bullseye', bullseyeText]],
    columnStyles: {
      0: { cellWidth: 0.6 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 0.6 },
      3: { cellWidth: 'auto' },
    },
  })

  return doc.lastAutoTable!.finalY
}
