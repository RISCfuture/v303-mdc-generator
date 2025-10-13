// Page 1 layout - refactored into separate section functions
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { addHeaderBanner } from '../sections/header'
import { addPageFooter } from '../utils/layout'
import { addMissionInfoTable } from '../sections/page1/missionInfo'
import { addFlightTable } from '../sections/page1/flight'
import { addRadiosTable, addWeatherBullseyeTable } from '../sections/page1/radios'
import { addPresetsAndLoadoutTables } from '../sections/page1/presetsLoadout'
import { addToldTable } from '../sections/page1/told'
import { addDepartureRecoveryTable } from '../sections/page1/departureRecovery'
import { addFlightPlanTable } from '../sections/page1/flightPlan'

/**
 * Generate page 1 of the briefing card
 * Complete rewrite following template exactly - organized into sections
 */
export function generatePage1(doc: PDFDocumentExtended, mission: Mission) {
  addHeaderBanner(doc, mission)

  let y = 0.52

  // Mission info table (Callsign, Date, Mission#, Type)
  y = addMissionInfoTable(doc, mission, y)

  // Flight table (crew members)
  y = addFlightTable(doc, mission, y)

  // Radios section (comm ladder summary)
  y = addRadiosTable(doc, mission, y)

  // Weather and Bullseye single row
  y = addWeatherBullseyeTable(doc, mission, y)

  // Presets (left side) and Loadout (right side) side-by-side
  y = addPresetsAndLoadoutTables(doc, mission, y)

  // TOLD and Fuel tables
  y = addToldTable(doc, mission, y)

  // Departure/Recovery table
  y = addDepartureRecoveryTable(doc, mission, y)

  // Flight Plan
  addFlightPlanTable(doc, mission, y)

  // Page footer
  addPageFooter(doc, 1)
}
