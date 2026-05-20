/**
 * PDF Generation using pdfMake
 * New implementation to replace jsPDF-based generator
 */
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.addVirtualFileSystem(pdfFonts)
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import { mdpdfmake } from 'mdpdfmake'
import { imageStorage } from '@/services/imageStorage'
import type { Mission } from '@/types'
import { formatNumber } from '@/utils/formatting'
import { getMunitionShortName } from '@/data/munitions'
import { getAirframeData, isHelicopter, isF16, isC130, atcFrequency } from '@/utils/airframeHelpers'
import { getSquadronAirframe, squadronDatabase } from '@/data/squadrons'
import { calculateTakeoffFuel, calculateMissionGrossWeight } from '@/utils/fuelCalculations'
import { getAirframeDisplayName } from '@/data/airframes'
import { getFlightNumber } from '@/utils/callsignHelpers'
import { formatSTN } from '@/utils/crewFormatting'
import { getAirfieldsForTheater } from '@/data/airfields'
import { formatCoordinate } from '@/utils/coordinateFormatter'
import { FONT_SIZES } from './constants'
import { SQUADRON_LOGOS } from './squadronAssets'
import {
  resolveSquadronFormat,
  type SquadronFormat,
  type SectionId,
  type SectionBuilder,
  type SectionEntry,
  type CompositionContext,
} from './squadronFormats'

// Type for table cells - use pdfMake's type but allow flexibility for our use case
// pdfMake's TableCell type is complex and strict, so we use a simplified version
// that will be cast to Content when needed
type TableCell = {
  text?: string | number
  fillColor?: string
  bold?: boolean
  italics?: boolean
  colSpan?: number
  alignment?: string
  color?: string
  fontSize?: number
}

type TableRow = TableCell[]

// Helper functions
function getEffectiveFlightCallsign(mission: Mission): string {
  return mission.flightCallsignOverride ?? ''
}

function getEffectiveLink16Prefix(mission: Mission): string {
  return mission.link16PrefixOverride ?? ''
}

function formatBullseyeCoords(mission: Mission): string {
  const bullseye = mission.bullseye
  if (bullseye?.latitude == null || bullseye.longitude == null) {
    return ''
  }
  // Use the stored format preference, defaulting to DDM if not specified
  const format = bullseye.coordinateFormat ?? 'DDM'
  return formatCoordinate(bullseye.latitude, bullseye.longitude, format)
}

function getAirportName(airportId: string, theater: string): string {
  if (!airportId || airportId.trim() === '') {
    return ''
  }
  const airfields = getAirfieldsForTheater(theater)
  const airfield = airfields.find((af) => af.name === airportId)
  return airfield ? airfield.name : airportId
}

function formatZuluTime(timeString: string): string {
  const cleaned = timeString.trim().replace(/[zZ]$/i, '')
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(cleaned)
  if (colonMatch?.[1] && colonMatch[2]) {
    const hours = colonMatch[1].padStart(2, '0')
    const minutes = colonMatch[2]
    return `${hours}${minutes}z`
  }
  const noColonMatch = /^(\d{2})(\d{2})$/.exec(cleaned)
  if (noColonMatch) {
    return `${cleaned}z`
  }
  return `${cleaned}z`
}

// Common table layout
const defaultTableLayout = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => '#000000',
  vLineColor: () => '#000000',
}

/**
 * Convert markdown to pdfMake content using mdpdfmake library
 * Supports full markdown features: headings, lists, links, images, formatting
 * Returns unknown because mdpdfmake doesn't provide strong type definitions
 *
 * @param markdown - Markdown text to convert
 * @param options - Conversion options
 * @param options.fontSize - Font size for text content
 * @param options.maxImageWidth - Maximum width for images to prevent overflow
 */
async function markdownToPdfMake(
  markdown: string,
  options?: { fontSize?: number; maxImageWidth?: number },
): Promise<unknown> {
  if (!markdown || markdown.trim() === '') {
    return { text: '' }
  }

  try {
    // Split markdown by image boundaries to preserve image positions
    const imagePattern = /!\[([^\]]*)\]\((img_\d+_[a-z0-9]+)\)/g
    const parts: {
      type: 'text' | 'image'
      content: string
      imageId?: string
      alt?: string
    }[] = []

    let lastIndex = 0
    let match

    while ((match = imagePattern.exec(markdown)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: markdown.substring(lastIndex, match.index),
        })
      }

      // Add the image
      parts.push({
        type: 'image',
        content: match[0],
        imageId: match[2],
        alt: match[1],
      })

      lastIndex = match.index + match[0].length
    }

    // Add any remaining text after the last image
    if (lastIndex < markdown.length) {
      parts.push({
        type: 'text',
        content: markdown.substring(lastIndex),
      })
    }

    // Process each part
    const contentArray: unknown[] = []

    for (const part of parts) {
      if (part.type === 'text' && part.content.trim()) {
        // Process text part with mdpdfmake
        const docDef = await mdpdfmake(part.content, {
          headingFontSizes: [12, 11, 10, 9, 8, 8],
          headingUnderline: false,
        })

        let content: unknown = docDef.content || docDef

        // Apply fontSize if specified
        if (options?.fontSize) {
          const applyFontSize = (item: unknown): unknown => {
            if (Array.isArray(item)) {
              return item.map(applyFontSize)
            }
            if (typeof item === 'object' && item !== null) {
              const itemObj = item as Record<string, unknown>
              if (!itemObj.fontSize || itemObj.fontSize === 12) {
                return { ...itemObj, fontSize: options.fontSize }
              }
              return item
            }
            return item
          }
          content = applyFontSize(content)
        }

        // Add content to array
        if (Array.isArray(content)) {
          contentArray.push(...(content as unknown[]))
        } else {
          contentArray.push(content)
        }
      } else if (part.type === 'image' && part.imageId) {
        // Fetch and add image
        try {
          const storedImage = await imageStorage.getImage(part.imageId)
          if (storedImage?.data) {
            // Use provided maxImageWidth or default to 400
            const imageWidth = options?.maxImageWidth ?? 400
            contentArray.push({
              image: storedImage.data,
              width: imageWidth, // Max width, maintains aspect ratio
              margin: [0, 5, 0, 5],
            })
          } else {
            contentArray.push({
              text: `[Image not found: ${part.alt ?? part.imageId}]`,
              italics: true,
              color: '#999999',
            })
          }
        } catch {
          // Silently ignore image loading errors
        }
      }
    }

    // If content is an array with a single item, unwrap it
    if (contentArray.length === 1) {
      return contentArray[0] ?? { text: '' }
    }

    // If content is an array, wrap it in a stack
    return { stack: contentArray }
  } catch {
    return { text: markdown }
  }
}

/**
 * Calculate +63 reciprocal TACAN
 */
function calculateReciprocalTacan(tacan: string | undefined): string {
  if (!tacan) return ''
  const match = /^(\d+)([XY])$/i.exec(tacan)
  if (!match?.[1] || !match[2]) return ''
  const channel = parseInt(match[1])
  const band = match[2].toUpperCase()
  let newChannel = channel + 63
  if (newChannel > 126) newChannel -= 126
  return `${newChannel}${band}`
}

/**
 * Calculate gross weight
 */
function calculateGrossWeight(mission: Mission): number {
  return calculateMissionGrossWeight(mission)
}

/**
 * Generate header banner
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
/** Substitute `{name}`/`{date}` placeholders in a format template string. */
function applyTemplate(template: string, mission: Mission): string {
  return template.replace('{name}', mission.name).replace('{date}', mission.date)
}

/** Convert an RGB tuple to a `#rrggbb` hex string. */
function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

function generateHeaderBanner(
  mission: Mission,
  format: SquadronFormat = resolveSquadronFormat(mission.squadron),
): unknown {
  const backgroundColor = rgbToHex(format.theme.headerBackground)

  return {
    table: {
      widths: [40, '*', 40], // Left logo, text, right logo
      body: [
        [
          {
            image: SQUADRON_LOGOS[format.logos.left],
            width: 30,
            fillColor: backgroundColor,
            border: [false, false, false, false],
            margin: [3, 3, 3, 3],
          },
          {
            text: applyTemplate(format.theme.headerTitleTemplate, mission),
            fillColor: backgroundColor,
            color: '#FFFFFF',
            bold: true,
            fontSize: FONT_SIZES.header,
            alignment: 'center',
            border: [false, false, false, false],
            margin: [0, 8, 0, 0], // Top margin to vertically center text
          },
          {
            image: SQUADRON_LOGOS[format.logos.right],
            width: 30,
            fillColor: backgroundColor,
            border: [false, false, false, false],
            margin: [3, 3, 3, 3],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 5],
  }
}

/**
 * Generate mission info table (Callsign, Date, Mission#, Type)
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateMissionInfoTable(mission: Mission): unknown {
  return {
    table: {
      widths: ['auto', '*', 'auto', '*', 'auto', '*', 'auto', '*'],
      body: [
        [
          { text: 'Callsign', fillColor: '#DCDCDC', bold: true },
          { text: getEffectiveFlightCallsign(mission), fillColor: '#EBF1FA', italics: true },
          { text: 'Date', fillColor: '#DCDCDC', bold: true },
          { text: mission.date, fillColor: '#EBF1FA', italics: true },
          { text: 'Mission#', fillColor: '#DCDCDC', bold: true },
          { text: mission.missionNumber, fillColor: '#EBF1FA', italics: true },
          { text: 'Type', fillColor: '#DCDCDC', bold: true },
          { text: mission.type, fillColor: '#EBF1FA', italics: true },
        ],
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate flight table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateFlightTable(mission: Mission): unknown {
  const effectiveLink16Prefix = getEffectiveLink16Prefix(mission)
  const flightNumber = getFlightNumber(getEffectiveFlightCallsign(mission))
  const flightLead = mission.crew[0]
  const leadIntraflight = flightLead.intraflight
  const leadAaTcn = flightLead.aaTcn
  const reciprocalTacan = calculateReciprocalTacan(leadAaTcn)
  // Two-crew airframes (C-130J) carry a copilot column.
  const twoCrew = isC130(getSquadronAirframe(mission.squadron))

  const rows = []
  // Only show rows for crew members that are assigned
  for (let i = 0; i < mission.crew.length; i++) {
    const member = mission.crew[i]

    const callsignDisplay =
      member.pilot && effectiveLink16Prefix ? `${effectiveLink16Prefix}${flightNumber}${i + 1}` : ''
    const aaTcnDisplay = member.pilot ? (i === 0 ? leadAaTcn : reciprocalTacan) : ''
    const intraflightDisplay = member.pilot ? leadIntraflight : ''

    rows.push([
      { text: `-${i + 1}`, fillColor: '#DCDCDC', bold: true },
      { text: member.position, fillColor: '#EBF1FA', italics: true },
      { text: member.pilot, fillColor: '#EBF1FA', italics: true },
      ...(twoCrew ? [{ text: member.copilot ?? '', fillColor: '#EBF1FA', italics: true }] : []),
      { text: callsignDisplay, fillColor: '#EBF1FA', italics: true },
      { text: member.stn || '', fillColor: '#EBF1FA', italics: true },
      { text: member.mode3 || '', fillColor: '#EBF1FA', italics: true },
      { text: aaTcnDisplay, fillColor: '#EBF1FA', italics: true },
      { text: intraflightDisplay, fillColor: '#EBF1FA', italics: true },
      { text: member.laser || '', fillColor: '#EBF1FA', italics: true },
    ])
  }

  const headerLabels = [
    '#',
    'POSITION',
    'PILOT',
    ...(twoCrew ? ['COPILOT'] : []),
    'CALLSIGN',
    'STN',
    'MODE 3',
    'A/A TCN',
    'INTRAFLIGHT',
    'LASER',
  ]
  const colCount = headerLabels.length

  return {
    table: {
      widths: [
        'auto',
        'auto',
        '*',
        ...(twoCrew ? ['*'] : []),
        'auto',
        'auto',
        'auto',
        'auto',
        'auto',
        'auto',
      ],
      body: [
        [
          {
            text: 'Flight',
            fillColor: '#DCDCDC',
            bold: true,
            colSpan: colCount,
            alignment: 'center',
          },
          ...Array.from({ length: colCount - 1 }, () => ({})),
        ],
        headerLabels.map((label) => ({ text: label, fillColor: '#DCDCDC', bold: true })),
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate radios table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateRadiosTable(mission: Mission): unknown {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)
  const rows: TableRow[] = []
  mission.radioPresets.forEach((radioPresets, radioIndex) => {
    const radioLabel = airframeData?.radios[radioIndex]?.name ?? `Radio ${radioIndex + 1}`
    let presetDesc: string
    const radioCommLadder = mission.commLadders?.[radioIndex]
    if (radioCommLadder && radioCommLadder.trim() !== '') {
      presetDesc = radioCommLadder
    } else {
      presetDesc = radioPresets
        .slice(0, 12)
        .filter((p) => p.description && p.description.trim() !== '')
        .map((p) => `${p.number} (${p.description})`)
        .join(' - ')
    }
    rows.push([
      { text: radioLabel, fillColor: '#DCDCDC', bold: true },
      { text: presetDesc, fillColor: '#EBF1FA', italics: true },
    ])
  })

  return {
    table: {
      widths: ['auto', '*'],
      body: [
        [{ text: 'Radios', fillColor: '#DCDCDC', bold: true, colSpan: 2, alignment: 'center' }, {}],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate weather and bullseye table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateWeatherBullseyeTable(mission: Mission): unknown {
  const weatherText = mission.weather ?? ''
  const bullseyeText = formatBullseyeCoords(mission)

  return {
    table: {
      widths: ['auto', '*'],
      body: [
        [
          { text: 'Weather', fillColor: '#DCDCDC', bold: true },
          { text: weatherText, fillColor: '#EBF1FA', italics: true },
        ],
        [
          { text: 'Bullseye', fillColor: '#DCDCDC', bold: true },
          { text: bullseyeText, fillColor: '#EBF1FA', italics: true },
        ],
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
    width: '*',
  }
}

/**
 * Generate radio presets table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generatePresetsTable(mission: Mission): unknown {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)

  // Get the first radio's name (typically UHF/COM1)
  const radioName = airframeData?.radios[0]?.name ?? 'Radio 1'

  const filteredPresets = mission.radioPresets[0]
    ? mission.radioPresets[0].filter((p) => p.description && p.description.trim() !== '')
    : []
  const halfCount = Math.ceil(filteredPresets.length / 2)
  const rows: TableRow[] = []

  for (let i = 0; i < halfCount; i++) {
    const left = filteredPresets[i]
    const right = filteredPresets[i + halfCount] as (typeof filteredPresets)[number] | undefined
    rows.push([
      { text: left.number.toString(), fillColor: '#DCDCDC', bold: true },
      {
        text: `${left.frequency} // ${left.description}`,
        fillColor: '#EBF1FA',
        italics: true,
      },
      { text: right ? right.number.toString() : '', fillColor: '#DCDCDC', bold: true },
      {
        text: right ? `${right.frequency} // ${right.description}` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
    ])
  }

  return {
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [
          {
            text: `${radioName} Presets`,
            fillColor: '#DCDCDC',
            bold: true,
            colSpan: 4,
            alignment: 'center',
          },
          {},
          {},
          {},
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate loadout table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateLoadoutTable(mission: Mission): unknown {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)

  const chaffTotal = mission.ecmCmds.chaffTotal ?? 0
  const flareTotal = mission.ecmCmds.flareTotal ?? 0
  const chaffBingo = mission.ecmCmds.chaffBingo
  const flareBingo = mission.ecmCmds.flareBingo
  const cmdsProfile = mission.cmdsProfile ?? 'PRGM 1'
  const ecmPrograms = mission.ecmProgram ?? ''

  const cmData = [
    { text: 'CHAFF', fillColor: '#DCDCDC', bold: true },
    { text: `${chaffTotal} / Bingo ${chaffBingo}`, fillColor: '#EBF1FA', italics: true },
    { text: 'FLARE', fillColor: '#DCDCDC', bold: true },
    { text: `${flareTotal} / Bingo ${flareBingo}`, fillColor: '#EBF1FA', italics: true },
    { text: 'CMDS', fillColor: '#DCDCDC', bold: true },
    { text: cmdsProfile, fillColor: '#EBF1FA', italics: true },
    { text: 'ECM', fillColor: '#DCDCDC', bold: true },
    { text: ecmPrograms, fillColor: '#EBF1FA', italics: true },
  ]

  const rows: TableRow[] = []

  // Add gun row if aircraft has guns
  const guns = airframeData?.guns ?? []
  if (guns.length > 0 && mission.gunAmmoType) {
    // Determine label: gun name if single gun, else "Gun Ammo"
    const gunLabel = guns.length === 1 && guns[0] ? guns[0].name : 'Gun Ammo'

    // Calculate total capacity across all guns
    const totalCapacity = guns.reduce((sum, gun) => sum + gun.capacity, 0)

    rows.push([
      { text: gunLabel, fillColor: '#DCDCDC', bold: true },
      { text: mission.gunAmmoType, fillColor: '#EBF1FA', italics: true },
      { text: totalCapacity.toString(), fillColor: '#EBF1FA', italics: true },
      cmData[0] ?? { text: '', fillColor: '#EBF1FA', italics: true },
    ])
  }

  // Airframes without guns: no gun row at all. The CM data simply starts on
  // the first station row (cmIndex below), so we omit the empty placeholder
  // cells entirely instead of rendering near-zero-width blanks.

  // Add station rows using airframe station data
  const stations = airframeData?.stations ?? []
  const gunRowCount = guns.length > 0 && mission.gunAmmoType ? 1 : 0
  stations.forEach((station, index) => {
    const stationData = mission.loadout.find((s) => String(s.station) === String(station.station))
    const item =
      stationData && stationData.item !== 'EMPTY' ? getMunitionShortName(stationData.item) : ''
    const cmIndex = gunRowCount + index

    // Strip "STA " or "Station " prefix to shorten the label
    let stationLabel = station.name
    if (stationLabel.startsWith('STA ')) {
      stationLabel = stationLabel.substring(4)
    } else if (stationLabel.startsWith('Station ')) {
      stationLabel = stationLabel.substring(8)
    }

    rows.push([
      { text: stationLabel, fillColor: '#DCDCDC', bold: true },
      { text: item, fillColor: '#EBF1FA', italics: true, colSpan: 2 },
      {},
      cmData[cmIndex] ?? { text: '', fillColor: '#EBF1FA', italics: true },
    ])
  })

  return {
    table: {
      widths: ['auto', '*', 'auto', 'auto'],
      body: [
        [
          { text: 'LOADOUT', fillColor: '#DCDCDC', bold: true, colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
    width: '*',
  }
}

/**
 * Generate TOLD and Fuel table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateToldTable(mission: Mission): unknown {
  const grossWeight = mission.told.grossWeight ?? calculateGrossWeight(mission)
  const airframe = getSquadronAirframe(mission.squadron)
  const showRotationRefusal = !isHelicopter(airframe)

  // Helicopters: 4-column layout (no rotation/refusal)
  // Fixed-wing: 6-column layout (with rotation/refusal)
  if (!showRotationRefusal) {
    return {
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'TOLD', fillColor: '#DCDCDC', bold: true, colSpan: 2, alignment: 'center' },
            {},
            { text: 'Fuel', fillColor: '#DCDCDC', bold: true, colSpan: 2, alignment: 'center' },
            {},
          ],
          [
            { text: 'Gross Wt', fillColor: '#DCDCDC', bold: true },
            { text: formatNumber(grossWeight) + ' lbs', fillColor: '#EBF1FA', italics: true },
            { text: 'TO', fillColor: '#DCDCDC', bold: true },
            {
              text: formatNumber(calculateTakeoffFuel(mission)) + ' lbs',
              fillColor: '#EBF1FA',
              italics: true,
            },
          ],
          [
            { text: 'Min AGL', fillColor: '#DCDCDC', bold: true },
            {
              text:
                mission.told.minAgl !== undefined ? formatNumber(mission.told.minAgl) + ' ft' : '',
              fillColor: '#EBF1FA',
              italics: true,
            },
            { text: 'Joker', fillColor: '#DCDCDC', bold: true },
            {
              text: formatNumber(mission.fuel.joker) + ' lbs',
              fillColor: '#EBF1FA',
              italics: true,
            },
          ],
          [
            { text: 'Min MSL', fillColor: '#DCDCDC', bold: true },
            {
              text:
                mission.told.minMsl !== undefined ? formatNumber(mission.told.minMsl) + ' ft' : '',
              fillColor: '#EBF1FA',
              italics: true,
            },
            { text: 'Bingo', fillColor: '#DCDCDC', bold: true },
            {
              text: formatNumber(mission.fuel.bingo) + ' lbs',
              fillColor: '#EBF1FA',
              italics: true,
            },
          ],
        ],
      },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    }
  }

  return {
    table: {
      widths: ['auto', '*', 'auto', '*', 'auto', '*'],
      body: [
        [
          { text: 'TOLD', fillColor: '#DCDCDC', bold: true, colSpan: 4, alignment: 'center' },
          {},
          {},
          {},
          { text: 'Fuel', fillColor: '#DCDCDC', bold: true, colSpan: 2, alignment: 'center' },
          {},
        ],
        [
          { text: 'Gross Wt', fillColor: '#DCDCDC', bold: true },
          { text: formatNumber(grossWeight) + ' lbs', fillColor: '#EBF1FA', italics: true },
          { text: 'Rotation', fillColor: '#DCDCDC', bold: true },
          {
            text: formatNumber(mission.told.rotation ?? 0) + ' kts',
            fillColor: '#EBF1FA',
            italics: true,
          },
          { text: 'TO', fillColor: '#DCDCDC', bold: true },
          {
            text: formatNumber(calculateTakeoffFuel(mission)) + ' lbs',
            fillColor: '#EBF1FA',
            italics: true,
          },
        ],
        [
          { text: 'Min AGL', fillColor: '#DCDCDC', bold: true },
          {
            text:
              mission.told.minAgl !== undefined ? formatNumber(mission.told.minAgl) + ' ft' : '',
            fillColor: '#EBF1FA',
            italics: true,
          },
          { text: 'Refusal', fillColor: '#DCDCDC', bold: true },
          {
            text: mission.told.refusal ? formatNumber(mission.told.refusal) + ' kts' : '',
            fillColor: '#EBF1FA',
            italics: true,
          },
          { text: 'Joker', fillColor: '#DCDCDC', bold: true },
          { text: formatNumber(mission.fuel.joker) + ' lbs', fillColor: '#EBF1FA', italics: true },
        ],
        [
          { text: 'Min MSL', fillColor: '#DCDCDC', bold: true },
          {
            text:
              mission.told.minMsl !== undefined ? formatNumber(mission.told.minMsl) + ' ft' : '',
            fillColor: '#EBF1FA',
            italics: true,
          },
          { text: '', fillColor: '#EBF1FA', italics: true },
          { text: '', fillColor: '#EBF1FA', italics: true },
          { text: 'Bingo', fillColor: '#DCDCDC', bold: true },
          { text: formatNumber(mission.fuel.bingo) + ' lbs', fillColor: '#EBF1FA', italics: true },
        ],
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate departure/recovery table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateDepartureRecoveryTable(mission: Mission): unknown {
  const departureProc = mission.departureRecovery.departureProcedure ?? ''
  const departureAirport = getAirportName(
    mission.departureRecovery.departureAirportId ?? '',
    mission.theater,
  )
  const departureRunway = mission.departureRecovery.departureRunwayName ?? ''
  const departureAirportWithRunway = departureRunway
    ? `${departureAirport} RWY ${departureRunway}`
    : departureAirport

  const arrivalProc = mission.departureRecovery.recoveryProcedure ?? ''
  const arrivalAirport = getAirportName(
    mission.departureRecovery.recoveryAirportId ?? '',
    mission.theater,
  )
  const arrivalRunway = mission.departureRecovery.recoveryRunwayName ?? ''
  const arrivalAirportWithRunway = arrivalRunway
    ? `${arrivalAirport} RWY ${arrivalRunway}`
    : arrivalAirport

  const alternateAirport = getAirportName(
    mission.departureRecovery.alternateAirportId ?? '',
    mission.theater,
  )

  return {
    table: {
      widths: ['auto', 'auto', '*'],
      body: [
        [
          { text: 'Departure', fillColor: '#DCDCDC', bold: true },
          { text: departureAirportWithRunway, fillColor: '#EBF1FA', italics: true },
          { text: departureProc, fillColor: '#EBF1FA', italics: true },
        ],
        [
          { text: 'Arrival', fillColor: '#DCDCDC', bold: true },
          { text: arrivalAirportWithRunway, fillColor: '#EBF1FA', italics: true },
          { text: arrivalProc, fillColor: '#EBF1FA', italics: true },
        ],
        [
          { text: 'Alternate', fillColor: '#DCDCDC', bold: true },
          { text: alternateAirport, fillColor: '#EBF1FA', italics: true, colSpan: 2 },
          {},
        ],
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate flight plan table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 *
 * Note: Blank steerpoints (where latitude, longitude, altitude, and speed are all null)
 * are excluded from the PDF output. The steerpoint numbering will skip any numbers
 * assigned to blank steerpoints.
 */
function generateFlightPlanTable(mission: Mission): unknown {
  const rows: TableRow[] = mission.waypoints
    .filter((wp) => {
      // Exclude blank steerpoints from PDF export
      const isBlank =
        wp.latitude === null && wp.longitude === null && wp.altitude === null && wp.speed === null
      return !isBlank
    })
    .map((wp) => {
      let coordsDisplay = ''
      if (wp.type !== 'PARK' && wp.latitude !== null && wp.longitude !== null) {
        // Use the waypoint's stored format preference, defaulting to DDM if not specified
        const format = wp.coordinateFormat ?? 'DDM'
        coordsDisplay = formatCoordinate(wp.latitude, wp.longitude, format)
      }
      // Format TOT to HHMMz format if present
      const totDisplay = wp.timeOnTarget ? formatZuluTime(wp.timeOnTarget) : ''

      return [
        { text: wp.sequence.toString(), fillColor: '#DCDCDC', bold: true },
        { text: wp.name, fillColor: '#EBF1FA', italics: true },
        { text: wp.type ?? '', fillColor: '#EBF1FA', italics: true },
        { text: coordsDisplay, fillColor: '#EBF1FA', italics: true },
        { text: wp.altitude ? formatNumber(wp.altitude) : '', fillColor: '#EBF1FA', italics: true },
        { text: wp.speed ? formatNumber(wp.speed) : '', fillColor: '#EBF1FA', italics: true },
        { text: totDisplay, fillColor: '#EBF1FA', italics: true },
      ]
    })

  return {
    table: {
      widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: [
        [
          {
            text: 'Flight Plan',
            fillColor: '#DCDCDC',
            bold: true,
            colSpan: 7,
            alignment: 'center',
          },
          {},
          {},
          {},
          {},
          {},
          {},
        ],
        [
          { text: 'WPT', fillColor: '#DCDCDC', bold: true },
          { text: 'Name', fillColor: '#DCDCDC', bold: true },
          { text: 'Type', fillColor: '#DCDCDC', bold: true },
          { text: 'Coords', fillColor: '#DCDCDC', bold: true },
          { text: 'Alt', fillColor: '#DCDCDC', bold: true },
          { text: 'IAS', fillColor: '#DCDCDC', bold: true },
          { text: 'TOT', fillColor: '#DCDCDC', bold: true },
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true, // Keep the entire table together on one page
  }
}

/**
 * Check if target/tasking table has data
 */
function hasTargetData(mission: Mission): boolean {
  const primary = mission.details.primaryTarget
  const secondary = mission.details.secondaryTarget

  const hasPrimaryData =
    !!primary?.name ||
    !!primary?.dmpi ||
    (primary?.latitude !== null && primary?.latitude !== undefined) ||
    (primary?.longitude !== null && primary?.longitude !== undefined) ||
    !!primary?.remarks ||
    primary?.attackHeading !== undefined ||
    primary?.ingressAltitude !== undefined

  const hasSecondaryData =
    !!secondary?.name ||
    !!secondary?.dmpi ||
    !!secondary?.remarks ||
    secondary?.attackHeading !== undefined ||
    secondary?.ingressAltitude !== undefined

  return hasPrimaryData || hasSecondaryData
}

/**
 * Generate target/tasking table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 *
 * Exported for unit testing.
 */
export async function generateTargetTable(mission: Mission): Promise<unknown> {
  const primaryTarget = mission.details.primaryTarget
  const primaryName = primaryTarget?.name ?? ''
  const primaryDmpi = primaryTarget?.dmpi ?? ''
  const primaryCoords =
    primaryTarget?.latitude != null && primaryTarget.longitude != null
      ? formatCoordinate(
          primaryTarget.latitude,
          primaryTarget.longitude,
          primaryTarget.coordinateFormat ?? 'DDM',
        )
      : ''
  const primaryRemarks = primaryTarget?.remarks ?? ''

  const secondaryTarget = mission.details.secondaryTarget
  const secondaryName = secondaryTarget?.name ?? ''
  const secondaryDmpi = secondaryTarget?.dmpi ?? ''
  const secondaryCoords =
    secondaryTarget?.latitude != null && secondaryTarget.longitude != null
      ? formatCoordinate(
          secondaryTarget.latitude,
          secondaryTarget.longitude,
          secondaryTarget.coordinateFormat ?? 'DDM',
        )
      : ''
  const secondaryRemarks = secondaryTarget?.remarks ?? ''

  const primaryAttackHdg = primaryTarget?.attackHeading
  const primaryIngressAlt = primaryTarget?.ingressAltitude
  const secondaryAttackHdg = secondaryTarget?.attackHeading
  const secondaryIngressAlt = secondaryTarget?.ingressAltitude

  const rows: TableRow[] = [
    [
      { text: 'Primary', fillColor: '#DCDCDC', bold: true },
      { text: primaryName, fillColor: '#EBF1FA', italics: true },
      { text: 'Secondary', fillColor: '#DCDCDC', bold: true },
      { text: secondaryName, fillColor: '#EBF1FA', italics: true },
    ],
    [
      { text: 'DMPI', fillColor: '#DCDCDC', bold: true },
      { text: primaryDmpi, fillColor: '#EBF1FA', italics: true },
      { text: 'DMPI', fillColor: '#DCDCDC', bold: true },
      { text: secondaryDmpi, fillColor: '#EBF1FA', italics: true },
    ],
    [
      { text: 'Coords', fillColor: '#DCDCDC', bold: true },
      { text: primaryCoords, fillColor: '#EBF1FA', italics: true },
      { text: 'Coords', fillColor: '#DCDCDC', bold: true },
      { text: secondaryCoords, fillColor: '#EBF1FA', italics: true },
    ],
    [
      { text: 'Attack Hdg', fillColor: '#DCDCDC', bold: true },
      {
        text: primaryAttackHdg !== undefined ? `${primaryAttackHdg}°` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
      { text: 'Attack Hdg', fillColor: '#DCDCDC', bold: true },
      {
        text: secondaryAttackHdg !== undefined ? `${secondaryAttackHdg}°` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
    ],
    [
      { text: 'Ingress Alt', fillColor: '#DCDCDC', bold: true },
      {
        text: primaryIngressAlt !== undefined ? `${primaryIngressAlt} ft` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
      { text: 'Ingress Alt', fillColor: '#DCDCDC', bold: true },
      {
        text: secondaryIngressAlt !== undefined ? `${secondaryIngressAlt} ft` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
    ],
  ]

  if (primaryRemarks || secondaryRemarks) {
    // Target remarks are displayed in a 2-column layout
    // Page width ~595pt, minus margins ~40pt = 555pt
    // Divided by 2 columns with label columns ('auto') = ~210pt per content column
    const maxImageWidthForColumn = 210

    const primaryRemarksContent: TableCell = primaryRemarks
      ? {
          ...((await markdownToPdfMake(primaryRemarks, {
            fontSize: FONT_SIZES.content,
            maxImageWidth: maxImageWidthForColumn,
          })) as object),
          fillColor: '#EBF1FA',
        }
      : { text: '', fillColor: '#EBF1FA' }

    const secondaryRemarksContent: TableCell = secondaryRemarks
      ? {
          ...((await markdownToPdfMake(secondaryRemarks, {
            fontSize: FONT_SIZES.content,
            maxImageWidth: maxImageWidthForColumn,
          })) as object),
          fillColor: '#EBF1FA',
        }
      : { text: '', fillColor: '#EBF1FA' }

    rows.push([
      { text: 'Remarks/TOT', fillColor: '#DCDCDC', bold: true },
      primaryRemarksContent,
      { text: 'Remarks/TOT', fillColor: '#DCDCDC', bold: true },
      secondaryRemarksContent,
    ])
  }

  return {
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [
          {
            text: 'Target / Tasking',
            fillColor: '#DCDCDC',
            bold: true,
            colSpan: 4,
            alignment: 'center',
          },
          {},
          {},
          {},
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate CCIP delivery tables
 * Returns unknown[] to be cast as Content[] when used (pdfMake types are complex)
 */
function generateDeliveryTables(mission: Mission): unknown[] {
  const tables: unknown[] = []

  const tgtWaypoints = mission.waypoints.filter((wp) => wp.type === 'TGT' && wp.ccip !== undefined)

  for (const waypoint of tgtWaypoints) {
    const ccip = waypoint.ccip
    if (!ccip) continue

    const hasReferencePoints =
      ccip.vip?.bearing !== undefined ||
      ccip.vip?.distance !== undefined ||
      ccip.vip?.elevation !== undefined ||
      ccip.vrp?.bearing !== undefined ||
      ccip.vrp?.distance !== undefined ||
      ccip.vrp?.elevation !== undefined ||
      ccip.oa1?.bearing !== undefined ||
      ccip.oa1?.distance !== undefined ||
      ccip.oa1?.elevation !== undefined ||
      ccip.oa2?.bearing !== undefined ||
      ccip.oa2?.distance !== undefined ||
      ccip.oa2?.elevation !== undefined ||
      ccip.pup?.bearing !== undefined ||
      ccip.pup?.distance !== undefined ||
      ccip.pup?.elevation !== undefined

    if (!hasReferencePoints) continue

    const refPointType = ccip.referencePointType ?? 'None'
    const refPoint =
      refPointType === 'VIP' ? ccip.vip : refPointType === 'VRP' ? ccip.vrp : undefined

    const formatBearing = (value: number | undefined): string => {
      if (value === undefined) return ''
      return value.toFixed(1)
    }

    const formatDistance = (feet: number | undefined): string => {
      if (feet === undefined) return ''
      const nm = feet / 6076
      return nm.toFixed(1)
    }

    const formatElevation = (
      offset: number | undefined,
      waypointAltitude: number | null,
    ): string => {
      if (offset === undefined) return ''
      if (!waypointAltitude) return ''
      const msl = waypointAltitude + offset
      return Math.round(msl).toString()
    }

    tables.push({
      table: {
        widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            {
              text: `CCIP - Steerpoint ${waypoint.sequence}: ${waypoint.name}`,
              fillColor: '#DCDCDC',
              bold: true,
              colSpan: 5,
              alignment: 'center',
            },
            {},
            {},
            {},
            {},
          ],
          [
            { text: '', fillColor: '#DCDCDC', bold: true },
            { text: refPointType, fillColor: '#DCDCDC', bold: true },
            { text: 'OA1', fillColor: '#DCDCDC', bold: true },
            { text: 'OA2', fillColor: '#DCDCDC', bold: true },
            { text: 'PUP', fillColor: '#DCDCDC', bold: true },
          ],
          [
            { text: 'BRNG', fillColor: '#DCDCDC', bold: true },
            { text: formatBearing(refPoint?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip.oa1?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip.oa2?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip.pup?.bearing), fillColor: '#EBF1FA', italics: true },
          ],
          [
            { text: 'RNG', fillColor: '#DCDCDC', bold: true },
            { text: formatDistance(refPoint?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip.oa1?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip.oa2?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip.pup?.distance), fillColor: '#EBF1FA', italics: true },
          ],
          [
            { text: 'ELEV', fillColor: '#DCDCDC', bold: true },
            {
              text: formatElevation(refPoint?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip.oa1?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip.oa2?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip.pup?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
          ],
        ],
      },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    })
  }

  return tables
}

/**
 * Generate package table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generatePackageTable(mission: Mission): unknown {
  const rows: TableRow[] = mission.packageMembers.map((member) => [
    { text: member.callsign || '', fillColor: '#EBF1FA', italics: true },
    { text: getAirframeDisplayName(member.aircraft), fillColor: '#EBF1FA', italics: true },
    { text: member.time ? formatZuluTime(member.time) : '', fillColor: '#EBF1FA', italics: true },
    { text: member.comms || '', fillColor: '#EBF1FA', italics: true },
    { text: member.stn ? formatSTN(member.stn) : '', fillColor: '#EBF1FA', italics: true },
    { text: member.aaTacan || '', fillColor: '#EBF1FA', italics: true },
    { text: member.task || '', fillColor: '#EBF1FA', italics: true },
  ])

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: [
        [
          { text: 'Package', fillColor: '#DCDCDC', bold: true, colSpan: 7, alignment: 'center' },
          {},
          {},
          {},
          {},
          {},
          {},
        ],
        [
          { text: 'Callsign', fillColor: '#DCDCDC', bold: true },
          { text: 'A/C', fillColor: '#DCDCDC', bold: true },
          { text: 'Time (Z)', fillColor: '#DCDCDC', bold: true },
          { text: 'Comms', fillColor: '#DCDCDC', bold: true },
          { text: 'STN', fillColor: '#DCDCDC', bold: true },
          { text: 'A/A TCN', fillColor: '#DCDCDC', bold: true },
          { text: 'Task', fillColor: '#DCDCDC', bold: true },
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate support assets table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateSupportAssetsTable(mission: Mission): unknown {
  const rows: TableRow[] = mission.supportAssets.map((asset) => [
    { text: asset.callsign || '', fillColor: '#EBF1FA', italics: true },
    { text: asset.role || '', fillColor: '#EBF1FA', italics: true },
    {
      text:
        asset.frequency && asset.preset
          ? `${asset.frequency} (${asset.preset})`
          : asset.frequency || '',
      fillColor: '#EBF1FA',
      italics: true,
    },
    { text: asset.aaTacan || '', fillColor: '#EBF1FA', italics: true },
    { text: asset.location ?? '', fillColor: '#EBF1FA', italics: true },
    {
      text: asset.altitude ? formatNumber(asset.altitude) : '',
      fillColor: '#EBF1FA',
      italics: true,
    },
  ])

  return {
    table: {
      widths: ['*', 'auto', 'auto', 'auto', '*', 'auto'],
      body: [
        [
          {
            text: 'Support Assets',
            fillColor: '#DCDCDC',
            bold: true,
            colSpan: 6,
            alignment: 'center',
          },
          {},
          {},
          {},
          {},
          {},
        ],
        [
          { text: 'Callsign', fillColor: '#DCDCDC', bold: true },
          { text: 'Role', fillColor: '#DCDCDC', bold: true },
          { text: 'Freq (Preset)', fillColor: '#DCDCDC', bold: true },
          { text: 'A/A TCN', fillColor: '#DCDCDC', bold: true },
          { text: 'Location', fillColor: '#DCDCDC', bold: true },
          { text: 'Alt', fillColor: '#DCDCDC', bold: true },
        ],
        ...rows,
      ],
    },
    layout: defaultTableLayout,
    margin: [0, 0, 0, 2],
    unbreakable: true,
  }
}

/**
 * Generate Notes/Images/SLEDs page
 * Returns unknown[] to be cast as Content[] when used (pdfMake types are complex)
 */
async function generateNotesPage(mission: Mission): Promise<unknown[]> {
  if (!mission.details.remarks) {
    return []
  }

  // Mission remarks use full page width (~555pt after margins)
  const remarksContent = await markdownToPdfMake(mission.details.remarks, {
    fontSize: FONT_SIZES.content,
    maxImageWidth: 500,
  })

  return [
    { text: '', pageBreak: 'after' },
    generateHeaderBanner(mission),
    {
      text: 'Notes / Images / SLEDs',
      fontSize: FONT_SIZES.content,
      bold: true,
      margin: [0, 0, 0, 4],
    },
    {
      ...(remarksContent as object),
      margin: [0, 0, 0, 4],
    },
  ]
}

/**
 * Generate F-16 mission timing table (STEP / TAXI / T-O / PUSH / VUL-TOT / RTB).
 * Returns [] when there is no timing data so it can be composed unconditionally.
 */
function generateMissionTimingTable(mission: Mission): unknown[] {
  const t = mission.missionTiming
  if (!t || !Object.values(t).some(Boolean)) return []
  const cols: [string, string][] = [
    ['STEP', t.step ?? ''],
    ['TAXI', t.taxi ?? ''],
    ['T-O', t.takeoff ?? ''],
    ['PUSH', t.push ?? ''],
    ['VUL/TOT', t.vulTot ?? ''],
    ['RTB', t.rtb ?? ''],
  ]
  return [
    {
      table: {
        widths: cols.map(() => '*'),
        body: [
          [
            {
              text: 'Mission Timing',
              fillColor: '#DCDCDC',
              bold: true,
              colSpan: cols.length,
              alignment: 'center',
            },
            ...cols.slice(1).map(() => ({})),
          ],
          cols.map(([label]) => ({ text: label, fillColor: '#DCDCDC', bold: true })),
          cols.map(([, value]) => ({ text: value, fillColor: '#EBF1FA', italics: true })),
        ],
      },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    },
  ]
}

/**
 * Generate F-16 airbase nav table (DEP / APR / DIVERT rows).
 *
 * Rows are derived from the Basic Info airport selections
 * (`departureRecovery.{departure,recovery,alternate}AirportId`) and the
 * theater airfield database — there is no separate stored airbaseNav field.
 * Returns [] for non-F-16 airframes or when no airbases are selected.
 *
 * - TCN: `<channel><band>` from the airfield's TACAN (e.g. "16X")
 * - ELV: airfield position elevation (feet MSL)
 * - RWY / ILS: from the selected runway (DEP=departureRunwayName,
 *   APR=recoveryRunwayName, DIVERT has no runway selection so left blank)
 * - ATC: facility frequency from the airfield's ATC radio matrix, sourced via
 *   the squadron's airToGround radio slot (UHF first, then VHF-AM, etc.).
 *   Blank when the airfield has no Radio.lua entry.
 */
function generateAirbaseNavTable(mission: Mission): unknown[] {
  if (!isF16(getSquadronAirframe(mission.squadron))) return []

  const airfields = getAirfieldsForTheater(mission.theater)
  const findAf = (id?: string) => (id ? (airfields.find((af) => af.name === id) ?? null) : null)
  const squadron = squadronDatabase[mission.squadron]
  const airframe = getSquadronAirframe(mission.squadron)

  type RowKey = 'DEP' | 'APR' | 'DIVERT'
  type Row = {
    role: RowKey
    airportId?: string
    runwayName?: string
    facility: 'tower' | 'approach'
  }
  const sources: Row[] = [
    {
      role: 'DEP',
      airportId: mission.departureRecovery.departureAirportId,
      runwayName: mission.departureRecovery.departureRunwayName,
      facility: 'tower',
    },
    {
      role: 'APR',
      airportId: mission.departureRecovery.recoveryAirportId,
      runwayName: mission.departureRecovery.recoveryRunwayName,
      facility: 'approach',
    },
    {
      role: 'DIVERT',
      airportId: mission.departureRecovery.alternateAirportId,
      facility: 'tower',
    },
  ]

  const rows = sources
    .map((src) => {
      const af = findAf(src.airportId)
      if (!af) return null
      const tcn = af.tacan
        ? // Runtime TACAN shape has a `band` (e.g. "X"/"Y") even though the
          // type advertises `frequency`; reach through `unknown` to read both.
          (() => {
            const t = af.tacan as unknown as {
              channel?: number
              band?: string
              frequency?: number
            }
            return t.channel != null && t.band
              ? `${t.channel}${t.band}`
              : (t.channel?.toString() ?? '')
          })()
        : ''
      const runway = src.runwayName
        ? (af.runways.find((rw) => rw.name === src.runwayName) ?? null)
        : null
      const ils = runway?.ils ? `${runway.ils.name} ${runway.ils.frequency}`.trim() : ''
      // Pick the ATC frequency the squadron's airToGround radio would tune.
      // Fall back from approach->tower for APR rows so we always show something
      // when the airfield only published a single channel for all facilities.
      let atc = atcFrequency({
        airfield: af,
        squadron,
        airframe,
        facility: src.facility,
      })
      if (atc == null && src.facility === 'approach') {
        atc = atcFrequency({ airfield: af, squadron, airframe, facility: 'tower' })
      }
      return {
        role: src.role,
        airportName: af.name,
        tcn,
        elevation: af.position.elevation,
        runwayName: runway?.name ?? src.runwayName ?? '',
        ils,
        atc: atc != null ? atc.toFixed(3).replace(/\.?0+$/, '') : '',
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) return []

  const headers = ['AIRBASE', 'Airport', 'TCN', 'ATC', 'ELV', 'RWY', 'ILS']
  return [
    {
      table: {
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          headers.map((h) => ({ text: h, fillColor: '#DCDCDC', bold: true })),
          ...rows.map((r) => [
            { text: r.role, fillColor: '#DCDCDC', bold: true },
            { text: r.airportName, fillColor: '#EBF1FA', italics: true },
            { text: r.tcn, fillColor: '#EBF1FA', italics: true },
            { text: r.atc, fillColor: '#EBF1FA', italics: true },
            {
              text: r.elevation != null ? formatNumber(r.elevation) : '',
              fillColor: '#EBF1FA',
              italics: true,
            },
            { text: r.runwayName, fillColor: '#EBF1FA', italics: true },
            { text: r.ils, fillColor: '#EBF1FA', italics: true },
          ]),
        ],
      },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    },
  ]
}

/**
 * Generate F-16 weapon delivery profile tables (Profile 1 / Profile 2 ...).
 * Returns [] when there are no profiles.
 */
/**
 * Compact F-16 weapon delivery profile table, modeled on the BMS WDP card:
 * each profile is its own small label/value/label/value grid so the values
 * (mostly short numbers) don't drive an oversized table. Designed to sit in
 * a column next to the CCIP delivery tables — see `v93Pages` page 2.
 */
function generateWeaponProfilesTable(mission: Mission): unknown[] {
  const profiles = mission.weaponProfiles ?? []
  if (profiles.length === 0) return []
  return profiles.map((p, i) => {
    // Pair order keeps related fields aligned across the two value columns:
    // identity left, geometry/ballistics right.
    const pairs: [string, string][] = [
      ['Weapon', p.weapon ?? ''],
      ['Rel Angle', p.releaseAngle != null ? `${p.releaseAngle}` : ''],
      ['Fuze', p.fuze ?? ''],
      ['Spacing', p.spacing != null ? formatNumber(p.spacing) : ''],
      ['Release', p.releaseType ?? ''],
      ['Qty', p.quantity != null ? `${p.quantity}` : ''],
      ['TBRG', p.ballisticBearing != null ? `${p.ballisticBearing}` : ''],
      ['Rel Spd', p.releaseSpeed != null ? `${p.releaseSpeed}` : ''],
      ['RNG', p.ballisticRange != null ? formatNumber(p.ballisticRange) : ''],
      ['Rel Ht', p.releaseHeight != null ? formatNumber(p.releaseHeight) : ''],
      ['ELV', p.ballisticElevation != null ? formatNumber(p.ballisticElevation) : ''],
      ['Attack Hdg', p.attackHeading != null ? `${p.attackHeading}` : ''],
      ['TGT STPT', p.targetSteerpoint != null ? `${p.targetSteerpoint}` : ''],
    ]
    const body: unknown[][] = [
      [
        {
          text: p.label ?? `Weapon Delivery Profile ${i + 1}`,
          fillColor: '#DCDCDC',
          bold: true,
          colSpan: 4,
          alignment: 'center',
        },
        {},
        {},
        {},
      ],
    ]
    for (let j = 0; j < pairs.length; j += 2) {
      const left = pairs[j]
      const right = j + 1 < pairs.length ? pairs[j + 1] : undefined
      body.push([
        { text: left[0], fillColor: '#DCDCDC', bold: true },
        { text: left[1], fillColor: '#EBF1FA', italics: true },
        right
          ? { text: right[0], fillColor: '#DCDCDC', bold: true }
          : { text: '', fillColor: '#EBF1FA' },
        right
          ? { text: right[1], fillColor: '#EBF1FA', italics: true }
          : { text: '', fillColor: '#EBF1FA' },
      ])
    }
    return {
      table: { widths: ['auto', '*', 'auto', '*'], body },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    }
  })
}

/**
 * Generate C-130J drop zone / CARP table. Returns [] for non-C-130 airframes
 * or when there is no drop zone data.
 */
function generateDropZoneTable(mission: Mission): unknown[] {
  if (!isC130(getSquadronAirframe(mission.squadron))) return []
  const dz = mission.dropZone
  if (!dz || !Object.values(dz).some(Boolean)) return []
  const piCoords =
    dz.piLatitude != null && dz.piLongitude != null
      ? formatCoordinate(dz.piLatitude, dz.piLongitude, dz.piCoordinateFormat ?? 'DDM')
      : ''
  const pairs: [string, string][] = [
    ['DZ Name', dz.dzName ?? ''],
    ['PI Coords', piCoords],
    ['TOT', dz.tot ?? ''],
    ['Run-In Course', dz.runInCourse != null ? `${dz.runInCourse}` : ''],
    ['CARP LE-TE', dz.carpLeTe != null ? formatNumber(dz.carpLeTe) : ''],
    ['CARP LE-PI', dz.carpLePi != null ? formatNumber(dz.carpLePi) : ''],
    ['SD Distance', dz.carpSd != null ? formatNumber(dz.carpSd) : ''],
    ['TP Distance', dz.carpTp != null ? formatNumber(dz.carpTp) : ''],
    ['Load Type', dz.loadType ?? ''],
    ['Fus Sta', dz.fuselageStation ?? ''],
    ['Stage', dz.stage ?? ''],
    ['Release Sys', dz.releaseSystem ?? ''],
    ['Chute #', dz.chuteCount != null ? `${dz.chuteCount}` : ''],
    ['Drop Payload', dz.dropPayload ?? ''],
    ['ALT W/V', dz.altWind ?? ''],
    ['ALT Temp', dz.altTemp != null ? `${dz.altTemp}` : ''],
    ['SFC W/V', dz.surfaceWind ?? ''],
    ['SFC Temp', dz.surfaceTemp != null ? `${dz.surfaceTemp}` : ''],
    [
      'Rqd Clnc Ht',
      dz.requiredClearanceHeight != null ? formatNumber(dz.requiredClearanceHeight) : '',
    ],
    ['Obstr Elev', dz.obstructionElevation != null ? formatNumber(dz.obstructionElevation) : ''],
    ['Min Drop Ht', dz.minDropHeight != null ? formatNumber(dz.minDropHeight) : ''],
    ['DZ Elev', dz.dzElevation != null ? formatNumber(dz.dzElevation) : ''],
  ]
  const body: unknown[][] = [
    [
      {
        text: 'Drop Zone / CARP',
        fillColor: '#DCDCDC',
        bold: true,
        colSpan: 4,
        alignment: 'center',
      },
      {},
      {},
      {},
    ],
  ]
  for (let i = 0; i < pairs.length; i += 2) {
    const left = pairs[i]
    const right = i + 1 < pairs.length ? pairs[i + 1] : undefined
    body.push([
      { text: left[0], fillColor: '#DCDCDC', bold: true },
      { text: left[1], fillColor: '#EBF1FA', italics: true },
      right
        ? { text: right[0], fillColor: '#DCDCDC', bold: true }
        : { text: '', fillColor: '#EBF1FA' },
      right
        ? { text: right[1], fillColor: '#EBF1FA', italics: true }
        : { text: '', fillColor: '#EBF1FA' },
    ])
  }
  return [
    {
      table: { widths: ['auto', '*', 'auto', '*'], body },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 2],
      unbreakable: true,
    },
  ]
}

/**
 * Static "Mission Type / Waypoint Type Definitions" reference block, kept from
 * the source MDC formats. Transport airframes use airdrop-specific terms.
 */
function generateDefinitionsBlock(mission: Mission): unknown[] {
  const transport = isC130(getSquadronAirframe(mission.squadron))
  const missionTypes = transport
    ? 'AIRDROP – Air Drop  |  AIRLAND – Air Land  |  CSAR – Combat Search & Rescue  |  EQUIPTRANS – Equipment Transport  |  PARADROP – Paradrop  |  TROOPTRANS – Troop Transport'
    : 'AI – Air Interdiction  |  CAS – Close Air Support  |  CSAR – Combat Search & Rescue  |  FAC(A) – Forward Air Controller (Airborne)  |  SCAR – Strike Coordination & Recon  |  TRNC – Training'
  const waypointTypes = transport
    ? 'PARK – Parking  |  PI – Point of Impact  |  HOLD – Hold  |  FAF – Final Approach Fix  |  TRN – Turn  |  DZ – Drop Zone  |  IAF – Initial Approach Fix  |  LDG – Landing'
    : 'CP – Contact Point  |  FAF – Final Approach Fix  |  IAF – Initial Approach Fix  |  LDG – Landing  |  PARK – Parking  |  TGT – Target  |  TRN – Turn'
  return [
    {
      text: 'Definitions',
      fontSize: FONT_SIZES.content,
      bold: true,
      margin: [0, 6, 0, 4],
    },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [
            { text: 'Mission Types', fillColor: '#DCDCDC', bold: true },
            { text: missionTypes, fillColor: '#EBF1FA' },
          ],
          [
            { text: 'Waypoint Types', fillColor: '#DCDCDC', bold: true },
            { text: waypointTypes, fillColor: '#EBF1FA' },
          ],
        ],
      },
      layout: defaultTableLayout,
      margin: [0, 0, 0, 4],
    },
  ]
}

/**
 * Build the id -> builder map for a given squadron format. `header` closes
 * over the format; every other builder takes only the mission.
 */
function buildSectionBuilders(format: SquadronFormat): Record<SectionId, SectionBuilder> {
  return {
    header: (m) => generateHeaderBanner(m, format),
    missionInfo: generateMissionInfoTable,
    flight: generateFlightTable,
    radios: generateRadiosTable,
    presets: generatePresetsTable,
    weatherBullseye: generateWeatherBullseyeTable,
    loadout: generateLoadoutTable,
    told: generateToldTable,
    departureRecovery: generateDepartureRecoveryTable,
    flightPlan: generateFlightPlanTable,
    target: generateTargetTable,
    // 'delivery' is precomputed once (also a page-2 gate input) and reused.
    delivery: generateDeliveryTables,
    package: generatePackageTable,
    supportAssets: generateSupportAssetsTable,
    notes: generateNotesPage,
    missionTiming: generateMissionTimingTable,
    airbaseNav: generateAirbaseNavTable,
    weaponProfiles: generateWeaponProfilesTable,
    dropZone: generateDropZoneTable,
    definitions: generateDefinitionsBlock,
  }
}

/** Resolve a single entry to a flat list of pdfMake nodes (or [] if gated). */
async function collectEntry(
  entry: SectionEntry,
  ctx: CompositionContext,
  builders: Record<SectionId, SectionBuilder>,
  deliveryTables: unknown[],
): Promise<unknown[]> {
  if (entry.when && !entry.when(ctx)) return []

  if (entry.kind === 'columns') {
    const columns = []
    for (const col of entry.columns) {
      const stack: unknown[] = []
      for (const sub of col.stack) {
        stack.push(...(await collectEntry(sub, ctx, builders, deliveryTables)))
      }
      columns.push({ width: col.width, stack })
    }
    return [{ columns, columnGap: entry.columnGap }]
  }

  // 'delivery' is precomputed once and reused (also a page-2 gate input).
  if (entry.section === 'delivery') return deliveryTables

  const raw: unknown = await builders[entry.section](ctx.mission)
  return Array.isArray(raw) ? (raw as unknown[]) : [raw]
}

/**
 * Assemble the pdfMake document definition for a mission, driven by the
 * resolved per-squadron format. Pure (no download) so it is unit-testable.
 */
export async function buildDocDefinition(mission: Mission): Promise<TDocumentDefinitions> {
  const format = resolveSquadronFormat(mission.squadron)
  const builders = buildSectionBuilders(format)

  // Precompute predicates once (generateDeliveryTables called exactly once,
  // as before — it feeds both the page-2 gate and the 'delivery' section).
  const deliveryTables = generateDeliveryTables(mission)
  const ctx: CompositionContext = {
    mission,
    hasTarget: hasTargetData(mission),
    hasPackage: mission.packageMembers.length > 0,
    hasSupportAssets: mission.supportAssets.length > 0,
    hasDeliveryTables: deliveryTables.length > 0,
    hasPage2Content: false,
  }
  ctx.hasPage2Content =
    ctx.hasTarget || ctx.hasDeliveryTables || ctx.hasPackage || ctx.hasSupportAssets

  const content: unknown[] = []
  for (const page of format.pages) {
    if (page.when && !page.when(ctx)) continue
    if (page.pageBreakBefore) content.push({ text: '', pageBreak: 'after' })
    for (const entry of page.entries) {
      content.push(...(await collectEntry(entry, ctx, builders, deliveryTables)))
    }
  }

  const footerTemplate = format.theme.footerTemplate
  return {
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    defaultStyle: {
      fontSize: FONT_SIZES.default,
    },
    footer: (currentPage, pageCount) => {
      return {
        text:
          footerTemplate == null
            ? `Page ${currentPage} of ${pageCount}`
            : applyTemplate(footerTemplate, mission),
        alignment: 'center',
        fontSize: FONT_SIZES.footer,
        margin: [0, 0, 0, 20],
      }
    },
    content: content as Content,
  }
}

/**
 * Generate and download the PDF briefing card.
 */
export async function generatePdfMakeBriefingCard(mission: Mission): Promise<void> {
  const docDefinition = await buildDocDefinition(mission)
  await pdfMake.createPdf(docDefinition).download(`${mission.name}.pdf`)
}
