/**
 * PDF Generation using pdfMake
 * New implementation to replace jsPDF-based generator
 */
import pdfMake from 'pdfmake/build/pdfmake'
import 'pdfmake/build/vfs_fonts'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import { mdpdfmake } from 'mdpdfmake'
import { imageStorage } from '@/services/imageStorage'
import type { Mission } from '@/types'
import { formatNumber } from '@/utils/formatting'
import { getMunitionShortName } from '@/data/munitions'
import { getAirframeData, isHelicopter } from '@/utils/airframeHelpers'
import { getSquadronAirframe } from '@/data/squadrons'
import { calculateTakeoffFuel, calculateMissionGrossWeight } from '@/utils/fuelCalculations'
import { getAirframeDisplayName } from '@/data/airframes'
import { formatSTN } from '@/utils/crewFormatting'
import { getAirfieldsForTheater } from '@/data/airfields'
import { formatCoordinate } from '@/utils/coordinateFormatter'
import { COLORS } from './constants'
import { SQUADRON_LOGOS } from './squadronAssets'

// Type for table cells - use pdfMake's type but allow flexibility for our use case
// pdfMake's TableCell type is complex and strict, so we use a simplified version
// that will be cast to Content when needed
interface TableCell {
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
  return mission.flightCallsignOverride || ''
}

function getEffectiveLink16Prefix(mission: Mission): string {
  return mission.link16PrefixOverride || ''
}

function getFlightNumber(callsign: string): string {
  if (!callsign) return '1'
  const match = callsign.match(/(\d)$/)
  return match && match[1] ? match[1] : '1'
}

function formatBullseyeCoords(mission: Mission): string {
  const bullseye = mission.bullseye
  if (
    !bullseye ||
    bullseye.latitude === undefined ||
    bullseye.longitude === null ||
    bullseye.latitude === null ||
    bullseye.longitude === undefined
  ) {
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
  const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const hours = colonMatch[1].padStart(2, '0')
    const minutes = colonMatch[2]
    return `${hours}${minutes}z`
  }
  const noColonMatch = cleaned.match(/^(\d{2})(\d{2})$/)
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
    const parts: Array<{
      type: 'text' | 'image'
      content: string
      imageId?: string
      alt?: string
    }> = []

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
          contentArray.push(...content)
        } else {
          contentArray.push(content)
        }
      } else if (part.type === 'image' && part.imageId) {
        // Fetch and add image
        try {
          const storedImage = await imageStorage.getImage(part.imageId)
          if (storedImage && storedImage.data) {
            // Use provided maxImageWidth or default to 400
            const imageWidth = options?.maxImageWidth || 400
            contentArray.push({
              image: storedImage.data,
              width: imageWidth, // Max width, maintains aspect ratio
              margin: [0, 5, 0, 5],
            })
          } else {
            contentArray.push({
              text: `[Image not found: ${part.alt || part.imageId}]`,
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
      return contentArray[0]!
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
  const match = tacan.match(/^(\d+)([XY])$/i)
  if (!match || !match[1] || !match[2]) return ''
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
function generateHeaderBanner(mission: Mission): unknown {
  // Determine squadron-specific properties
  const isV93 = mission.squadron === 'v93'

  // Convert RGB array to hex color string
  const rgbToHex = (rgb: [number, number, number]): string => {
    return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
  }

  const backgroundColor = isV93
    ? rgbToHex(COLORS.v93Blue) // v93 FS blue
    : rgbToHex(COLORS.v303Red) // v303 FS red
  const squadronLogo = isV93 ? SQUADRON_LOGOS.v93FS : SQUADRON_LOGOS.v303FS

  return {
    table: {
      widths: [40, '*', 40], // Left logo, text, right logo
      body: [
        [
          {
            image: SQUADRON_LOGOS.v303FG,
            width: 30,
            fillColor: backgroundColor,
            border: [false, false, false, false],
            margin: [3, 3, 3, 3],
          },
          {
            text: `v303rd FG Mission Data Card - ${mission.name}`,
            fillColor: backgroundColor,
            color: '#FFFFFF',
            bold: true,
            fontSize: 16,
            alignment: 'center',
            border: [false, false, false, false],
            margin: [0, 8, 0, 0], // Top margin to vertically center text
          },
          {
            image: squadronLogo,
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
  const leadIntraflight = flightLead?.intraflight || ''
  const leadAaTcn = flightLead?.aaTcn || ''
  const reciprocalTacan = calculateReciprocalTacan(leadAaTcn)

  const rows = []
  // Only show rows for crew members that are assigned
  for (let i = 0; i < mission.crew.length; i++) {
    const member = mission.crew[i]
    if (!member) continue

    const callsignDisplay =
      member.pilot && effectiveLink16Prefix ? `${effectiveLink16Prefix}${flightNumber}${i + 1}` : ''
    const aaTcnDisplay = member.pilot ? (i === 0 ? leadAaTcn : reciprocalTacan) : ''
    const intraflightDisplay = member.pilot ? leadIntraflight : ''

    rows.push([
      { text: `-${i + 1}`, fillColor: '#DCDCDC', bold: true },
      { text: member.position, fillColor: '#EBF1FA', italics: true },
      { text: member.pilot, fillColor: '#EBF1FA', italics: true },
      { text: callsignDisplay, fillColor: '#EBF1FA', italics: true },
      { text: member.stn || '', fillColor: '#EBF1FA', italics: true },
      { text: member.mode3 || '', fillColor: '#EBF1FA', italics: true },
      { text: aaTcnDisplay, fillColor: '#EBF1FA', italics: true },
      { text: intraflightDisplay, fillColor: '#EBF1FA', italics: true },
      { text: member.laser || '', fillColor: '#EBF1FA', italics: true },
    ])
  }

  return {
    table: {
      widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: [
        [
          { text: 'Flight', fillColor: '#DCDCDC', bold: true, colSpan: 9, alignment: 'center' },
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {},
        ],
        [
          { text: '#', fillColor: '#DCDCDC', bold: true },
          { text: 'POSITION', fillColor: '#DCDCDC', bold: true },
          { text: 'PILOT', fillColor: '#DCDCDC', bold: true },
          { text: 'CALLSIGN', fillColor: '#DCDCDC', bold: true },
          { text: 'STN', fillColor: '#DCDCDC', bold: true },
          { text: 'MODE 3', fillColor: '#DCDCDC', bold: true },
          { text: 'A/A TCN', fillColor: '#DCDCDC', bold: true },
          { text: 'INTRAFLIGHT', fillColor: '#DCDCDC', bold: true },
          { text: 'LASER', fillColor: '#DCDCDC', bold: true },
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
 * Generate radios table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
function generateRadiosTable(mission: Mission): unknown {
  const airframe = getSquadronAirframe(mission.squadron)
  const airframeData = getAirframeData(airframe)
  const rows: TableRow[] = []
  mission.radioPresets.forEach((radioPresets, radioIndex) => {
    const radioLabel = airframeData?.radios[radioIndex]?.name || `Radio ${radioIndex + 1}`
    let presetDesc = ''
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
  const weatherText = mission.weather || ''
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
  const radioName = airframeData?.radios[0]?.name || 'Radio 1'

  const filteredPresets = mission.radioPresets[0]
    ? mission.radioPresets[0].filter((p) => p.description && p.description.trim() !== '')
    : []
  const halfCount = Math.ceil(filteredPresets.length / 2)
  const rows: TableRow[] = []

  for (let i = 0; i < halfCount; i++) {
    const left = filteredPresets[i]
    const right = filteredPresets[i + halfCount]
    rows.push([
      { text: left ? left.number.toString() : '', fillColor: '#DCDCDC', bold: true },
      {
        text: left ? `${left.frequency} // ${left.description}` : '',
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

  const chaffTotal = mission.ecmCmds.chaffTotal || 0
  const flareTotal = mission.ecmCmds.flareTotal || 0
  const chaffBingo = mission.ecmCmds.chaffBingo || 0
  const flareBingo = mission.ecmCmds.flareBingo || 0
  const cmdsProfile = mission.cmdsProfile || 'PRGM 1'
  const ecmPrograms = mission.ecmProgram || ''

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
  const guns = airframeData?.guns || []
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

  // If no guns, still add the first CM data row
  if (guns.length === 0) {
    rows.push([
      { text: '', fillColor: '#DCDCDC', bold: true },
      { text: '', fillColor: '#EBF1FA', italics: true },
      { text: '', fillColor: '#EBF1FA', italics: true },
      cmData[0] ?? { text: '', fillColor: '#EBF1FA', italics: true },
    ])
  }

  // Add station rows using airframe station data
  const stations = airframeData?.stations || []
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
  const grossWeight = mission.told.grossWeight || calculateGrossWeight(mission)
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
                mission.told.minAgl !== undefined && mission.told.minAgl !== null
                  ? formatNumber(mission.told.minAgl) + ' ft'
                  : '',
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
                mission.told.minMsl !== undefined && mission.told.minMsl !== null
                  ? formatNumber(mission.told.minMsl) + ' ft'
                  : '',
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
            text: formatNumber(mission.told.rotation || 0) + ' kts',
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
              mission.told.minAgl !== undefined && mission.told.minAgl !== null
                ? formatNumber(mission.told.minAgl) + ' ft'
                : '',
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
              mission.told.minMsl !== undefined && mission.told.minMsl !== null
                ? formatNumber(mission.told.minMsl) + ' ft'
                : '',
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
  const departureProc = mission.departureRecovery.departureProcedure || ''
  const departureAirport = getAirportName(
    mission.departureRecovery.departureAirportId || '',
    mission.theater,
  )
  const departureRunway = mission.departureRecovery.departureRunwayName || ''
  const departureAirportWithRunway = departureRunway
    ? `${departureAirport} RWY ${departureRunway}`
    : departureAirport

  const arrivalProc = mission.departureRecovery.recoveryProcedure || ''
  const arrivalAirport = getAirportName(
    mission.departureRecovery.recoveryAirportId || '',
    mission.theater,
  )
  const arrivalRunway = mission.departureRecovery.recoveryRunwayName || ''
  const arrivalAirportWithRunway = arrivalRunway
    ? `${arrivalAirport} RWY ${arrivalRunway}`
    : arrivalAirport

  const alternateAirport = getAirportName(
    mission.departureRecovery.alternateAirportId || '',
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
        { text: wp.name || '', fillColor: '#EBF1FA', italics: true },
        { text: wp.type || '', fillColor: '#EBF1FA', italics: true },
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

  const hasPrimaryData = !!(
    primary?.name ||
    primary?.dmpi ||
    (primary?.latitude !== null && primary?.latitude !== undefined) ||
    (primary?.longitude !== null && primary?.longitude !== undefined) ||
    primary?.remarks ||
    primary?.attackHeading !== undefined ||
    primary?.ingressAltitude !== undefined
  )

  const hasSecondaryData = !!(
    secondary?.name ||
    secondary?.dmpi ||
    secondary?.remarks ||
    secondary?.attackHeading !== undefined ||
    secondary?.ingressAltitude !== undefined
  )

  return hasPrimaryData || hasSecondaryData
}

/**
 * Generate target/tasking table
 * Returns unknown to be cast as Content when used (pdfMake types are complex)
 */
async function generateTargetTable(mission: Mission): Promise<unknown> {
  const primaryTarget = mission.details.primaryTarget
  const primaryName = primaryTarget?.name || ''
  const primaryDmpi = primaryTarget?.dmpi || ''
  const primaryCoords =
    primaryTarget?.latitude !== null &&
    primaryTarget?.latitude !== undefined &&
    primaryTarget?.longitude !== null &&
    primaryTarget?.longitude !== undefined
      ? formatCoordinate(
          primaryTarget.latitude,
          primaryTarget.longitude,
          primaryTarget.coordinateFormat ?? 'DDM', // Use stored format, default to DDM
        )
      : ''
  const primaryRemarks = primaryTarget?.remarks || ''

  const secondaryName = mission.details.secondaryTarget?.name || ''
  const secondaryDmpi = mission.details.secondaryTarget?.dmpi || ''
  const secondaryRemarks = mission.details.secondaryTarget?.remarks || ''

  const primaryAttackHdg = mission.details.primaryTarget?.attackHeading
  const primaryIngressAlt = mission.details.primaryTarget?.ingressAltitude
  const secondaryAttackHdg = mission.details.secondaryTarget?.attackHeading
  const secondaryIngressAlt = mission.details.secondaryTarget?.ingressAltitude

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
      { text: '', fillColor: '#EBF1FA', italics: true },
    ],
    [
      { text: 'Attack Hdg', fillColor: '#DCDCDC', bold: true },
      {
        text:
          primaryAttackHdg !== undefined && primaryAttackHdg !== null ? `${primaryAttackHdg}°` : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
      { text: 'Attack Hdg', fillColor: '#DCDCDC', bold: true },
      {
        text:
          secondaryAttackHdg !== undefined && secondaryAttackHdg !== null
            ? `${secondaryAttackHdg}°`
            : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
    ],
    [
      { text: 'Ingress Alt', fillColor: '#DCDCDC', bold: true },
      {
        text:
          primaryIngressAlt !== undefined && primaryIngressAlt !== null
            ? `${primaryIngressAlt} ft`
            : '',
        fillColor: '#EBF1FA',
        italics: true,
      },
      { text: 'Ingress Alt', fillColor: '#DCDCDC', bold: true },
      {
        text:
          secondaryIngressAlt !== undefined && secondaryIngressAlt !== null
            ? `${secondaryIngressAlt} ft`
            : '',
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
            fontSize: 10,
            maxImageWidth: maxImageWidthForColumn,
          })) as object),
          fillColor: '#EBF1FA',
        }
      : { text: '', fillColor: '#EBF1FA' }

    const secondaryRemarksContent: TableCell = secondaryRemarks
      ? {
          ...((await markdownToPdfMake(secondaryRemarks, {
            fontSize: 10,
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

  const tgtWaypoints = mission.waypoints.filter(
    (wp) => wp.type === 'TGT' && wp.ccip !== undefined && wp.ccip !== null,
  )

  for (const waypoint of tgtWaypoints) {
    const ccip = waypoint.ccip!

    const hasReferencePoints = !!(
      ccip?.vip?.bearing !== undefined ||
      ccip?.vip?.distance !== undefined ||
      ccip?.vip?.elevation !== undefined ||
      ccip?.vrp?.bearing !== undefined ||
      ccip?.vrp?.distance !== undefined ||
      ccip?.vrp?.elevation !== undefined ||
      ccip?.oa1?.bearing !== undefined ||
      ccip?.oa1?.distance !== undefined ||
      ccip?.oa1?.elevation !== undefined ||
      ccip?.oa2?.bearing !== undefined ||
      ccip?.oa2?.distance !== undefined ||
      ccip?.oa2?.elevation !== undefined ||
      ccip?.pup?.bearing !== undefined ||
      ccip?.pup?.distance !== undefined ||
      ccip?.pup?.elevation !== undefined
    )

    if (!hasReferencePoints) continue

    const refPointType = ccip?.referencePointType ?? 'None'
    const refPoint =
      refPointType === 'VIP' ? ccip?.vip : refPointType === 'VRP' ? ccip?.vrp : undefined

    const formatBearing = (value: number | undefined): string => {
      if (value === undefined || value === null) return ''
      return value.toFixed(1)
    }

    const formatDistance = (feet: number | undefined): string => {
      if (feet === undefined || feet === null) return ''
      const nm = feet / 6076
      return nm.toFixed(1)
    }

    const formatElevation = (
      offset: number | undefined,
      waypointAltitude: number | null,
    ): string => {
      if (offset === undefined || offset === null) return ''
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
            { text: '', fillColor: '#EBF1FA', italics: true },
            { text: refPointType, fillColor: '#DCDCDC', bold: true },
            { text: 'OA1', fillColor: '#DCDCDC', bold: true },
            { text: 'OA2', fillColor: '#DCDCDC', bold: true },
            { text: 'PUP', fillColor: '#DCDCDC', bold: true },
          ],
          [
            { text: 'BRNG', fillColor: '#DCDCDC', bold: true },
            { text: formatBearing(refPoint?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip?.oa1?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip?.oa2?.bearing), fillColor: '#EBF1FA', italics: true },
            { text: formatBearing(ccip?.pup?.bearing), fillColor: '#EBF1FA', italics: true },
          ],
          [
            { text: 'RNG', fillColor: '#DCDCDC', bold: true },
            { text: formatDistance(refPoint?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip?.oa1?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip?.oa2?.distance), fillColor: '#EBF1FA', italics: true },
            { text: formatDistance(ccip?.pup?.distance), fillColor: '#EBF1FA', italics: true },
          ],
          [
            { text: 'ELEV', fillColor: '#DCDCDC', bold: true },
            {
              text: formatElevation(refPoint?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip?.oa1?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip?.oa2?.elevation, waypoint.altitude),
              fillColor: '#EBF1FA',
              italics: true,
            },
            {
              text: formatElevation(ccip?.pup?.elevation, waypoint.altitude),
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
    { text: asset.location || '', fillColor: '#EBF1FA', italics: true },
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
    fontSize: 10,
    maxImageWidth: 500,
  })

  return [
    { text: '', pageBreak: 'after' },
    generateHeaderBanner(mission),
    {
      text: 'Notes / Images / SLEDs',
      fontSize: 10,
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
 * Generate PDF briefing card
 */
export async function generatePdfMakeBriefingCard(mission: Mission): Promise<void> {
  const content: unknown[] = [
    // Page 1 - Full width sections
    generateHeaderBanner(mission),
    generateMissionInfoTable(mission),
    generateFlightTable(mission),

    // Two-column section: Radios, Presets, Weather/Bullseye, Loadout
    // Left and right columns flow independently without trying to align horizontally
    {
      columns: [
        {
          width: '*',
          stack: [generateRadiosTable(mission), generatePresetsTable(mission)],
        },
        {
          width: '*',
          stack: [generateWeatherBullseyeTable(mission), generateLoadoutTable(mission)],
        },
      ],
      columnGap: 2,
    },

    // Back to full width sections
    generateToldTable(mission),
    generateDepartureRecoveryTable(mission),
    generateFlightPlanTable(mission),
  ]

  // Determine if Page 2 has any content
  const deliveryTables = generateDeliveryTables(mission)
  const hasPackageData = mission.packageMembers && mission.packageMembers.length > 0
  const hasSupportAssetsData = mission.supportAssets && mission.supportAssets.length > 0
  const hasTarget = hasTargetData(mission)
  const hasPage2Content =
    hasTarget || deliveryTables.length > 0 || hasPackageData || hasSupportAssetsData

  // Only include Page 2 if there is any content
  if (hasPage2Content) {
    content.push({ text: '', pageBreak: 'after' })
    content.push(generateHeaderBanner(mission))

    // Only include Target/Tasking table if there is data
    if (hasTarget) {
      content.push(await generateTargetTable(mission))
    }

    content.push(...deliveryTables)

    // Only include Package table if there are package members
    if (hasPackageData) {
      content.push(generatePackageTable(mission))
    }

    // Only include Support Assets table if there are support assets
    if (hasSupportAssetsData) {
      content.push(generateSupportAssetsTable(mission))
    }
  }

  // Page 3 (if remarks exist)
  const notesContent = await generateNotesPage(mission)
  content.push(...notesContent)
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    defaultStyle: {
      fontSize: 9,
    },
    footer: (currentPage, pageCount) => {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        fontSize: 7,
        margin: [0, 0, 0, 20],
      }
    },
    content: content as Content,
  }

  await pdfMake.createPdf(docDefinition).download(`${mission.name}.pdf`)
}
