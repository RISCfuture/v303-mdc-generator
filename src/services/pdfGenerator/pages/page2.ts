// Page 2 layout
import type { Mission } from '@/types'
import type { PDFDocumentExtended } from '../types'
import { addFlightPlanPage2 } from '../sections/flightPlan'
import { addTargetTable } from '../sections/targets'
import { addDeliveryTable } from '../sections/delivery'
import { addPackageTable, addSupportAssetsTable } from '../sections/package'
import { addPageFooter } from '../utils/layout'

/**
 * Generate page 2 of the briefing card
 */
export function generatePage2(doc: PDFDocumentExtended, mission: Mission) {
  doc.addPage()

  let y = 0.15

  // Flight Plan continuation (rows 16-25)
  y = addFlightPlanPage2(doc, mission, y) + 0.02

  // Target / Tasking (now includes remarks in table)
  y = addTargetTable(doc, mission, y) + 0.02

  // CCIP Delivery table (LEFT side only)
  const deliveryFinalY = addDeliveryTable(doc, mission, y) + 0.02

  // Package and Support Assets
  y = addPackageTable(doc, mission, deliveryFinalY) + 0.02
  addSupportAssetsTable(doc, mission, y)

  // Page 2 footer
  addPageFooter(doc, 2)
}
