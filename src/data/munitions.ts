// Munitions weights and specifications for TOLD calculations
// Data source: DCS World data via Quaggles DCS Lua Datamine
// Aircraft specifications and station configurations from DCS
import munitionsDataJson from '@/data/json/munitions.json'
import munitionsShortnamesJson from '@/data/json/munitions-shortnames.json'
import { airframeDatabase } from '@/data/airframes'

export interface MunitionData {
  id: string // DCS weapon ID (e.g., "Mk_82", "AGM_65D")
  name: string // Full display name (e.g., "Mk-82", "AGM-65D")
  shortName: string // Short display name (e.g., "Mk-82", "AGM-65")
  weight: number // pounds (total weight including fuel for fuel tanks)
  category: 'air-to-air' | 'air-to-ground' | 'fuel' | 'pod' | 'gun' | 'rack' | 'empty'
  additionalFuel?: number // pounds of fuel only (for fuel tanks)
}

const munitionsDatabase: Record<string, MunitionData> = munitionsDataJson as Record<
  string,
  MunitionData
>

// Database of custom shortnames for munitions (for PDF export)
const munitionsShortnamesDatabase: Record<string, string> = munitionsShortnamesJson as Record<
  string,
  string
>

/**
 * Parse a DCS CLSID to extract components and calculate weight
 *
 * Handles DCS composite CLSID formats from airframe JSON files:
 *   - Simple munition: "MK_82" or "{GBU-38}"
 *   - Rack with quantity: "{TER_9A_3*MK-82}" (3x Mk-82 on TER-9A)
 *   - Launcher with qty: "LAU-105_2*AIM-9L" (2x AIM-9L on LAU-105)
 *   - With L/R suffix: "{TER_9A_2L*MK-82}" (2x left-mounted)
 *   - Nested racks: "{BRU42LS_2*LAU68_HYDRA_70_MK1}" (BRU-42 with 2x LAU-68 rocket pods)
 *   - Complex nested: "BRU-42_3*Mk-82AIR" (no braces variant)
 *
 * Note: Quaggles database stores composite CLSIDs without the asterisk separator.
 * Airframe files use: {TER_9A_2L*GBU-12}
 * Quaggles database has: {TER_9A_2LGBU-12}
 *
 * Returns an object with total weight and component breakdown
 */
function parseLoadoutId(itemId: string): {
  totalWeight: number
  components: Array<{ id: string; weight: number; quantity: number }>
} {
  if (itemId === 'EMPTY') {
    return { totalWeight: 0, components: [] }
  }

  // First, try direct lookup in database (handles simple munitions)
  const directWeight = getMunitionWeight(itemId)
  if (directWeight > 0) {
    return {
      totalWeight: directWeight,
      components: [{ id: itemId, weight: directWeight, quantity: 1 }],
    }
  }

  // Remove braces if present: "{GBU-38}" -> "GBU-38"
  const cleanId = itemId.replace(/^{|}$/g, '')

  // For composite CLSIDs with asterisk separator, try converting to Quaggles format
  // Example: {TER_9A_2L*GBU-12} -> {TER_9A_2LGBU-12}
  if (cleanId.includes('*')) {
    const quagglesFormat = `{${cleanId.replace('*', '')}}`
    const quagglesWeight = getMunitionWeight(quagglesFormat)
    if (quagglesWeight > 0) {
      return {
        totalWeight: quagglesWeight,
        components: [{ id: quagglesFormat, weight: quagglesWeight, quantity: 1 }],
      }
    }
  }

  // Check for DCS composite format: RACK_QTY*MUNITION or RACK*MUNITION
  // Examples: "TER_9A_3*MK-82", "LAU-105_2*AIM-9L", "BRU-42_3*Mk-82AIR"
  const compositeMatch = cleanId.match(/^([^*]+)_(\d+)([LR]?)\*(.+)$/)

  if (compositeMatch && compositeMatch[1] && compositeMatch[2] && compositeMatch[4]) {
    const rackBase = compositeMatch[1]
    const qtyStr = compositeMatch[2]
    const lrSuffix = compositeMatch[3] || ''
    const munitionId = compositeMatch[4]
    const quantity = parseInt(qtyStr, 10)

    // Build the actual rack CLSID (may have L/R suffix)
    const rackId = lrSuffix ? `{${rackBase}_${qtyStr}${lrSuffix}}` : `{${rackBase}}`

    // Get weights
    const rackWeight = getMunitionWeight(rackId)
    const munitionWeight = getMunitionWeight(`{${munitionId}}`) || getMunitionWeight(munitionId)

    const components: Array<{ id: string; weight: number; quantity: number }> = [
      { id: rackId, weight: rackWeight, quantity: 1 },
      { id: munitionId, weight: munitionWeight, quantity: quantity },
    ]

    const totalWeight = rackWeight + munitionWeight * quantity

    return { totalWeight, components }
  }

  // Check for simple composite without quantity in name: "RACK*MUNITION"
  // Example: "BRU-42*Mk-82"
  const simpleCompositeMatch = cleanId.match(/^([^*_\d]+)\*(.+)$/)

  if (simpleCompositeMatch && simpleCompositeMatch[1] && simpleCompositeMatch[2]) {
    const rackBase = simpleCompositeMatch[1]
    const munitionId = simpleCompositeMatch[2]

    // Try to infer quantity from munition name or default to 1
    const quantity = 1
    const rackId = `{${rackBase}}`

    const rackWeight = getMunitionWeight(rackId)
    const munitionWeight = getMunitionWeight(`{${munitionId}}`) || getMunitionWeight(munitionId)

    const components: Array<{ id: string; weight: number; quantity: number }> = [
      { id: rackId, weight: rackWeight, quantity: 1 },
      { id: munitionId, weight: munitionWeight, quantity: quantity },
    ]

    const totalWeight = rackWeight + munitionWeight * quantity

    return { totalWeight, components }
  }

  // Not a composite - simple munition
  // Try with braces first, then without
  const weight = getMunitionWeight(`{${cleanId}}`) || getMunitionWeight(cleanId)

  return {
    totalWeight: weight,
    components: [{ id: cleanId, weight, quantity: 1 }],
  }
}

// Get munition weight, returns 0 if not found
function getMunitionWeight(munitionKey: string): number {
  return munitionsDatabase[munitionKey]?.weight ?? 0
}

/**
 * Get the short display name for a DCS CLSID (for PDF export)
 * Returns the custom shortname if available, otherwise falls back to full display name
 */
export function getMunitionShortName(itemId: string): string {
  if (itemId === 'EMPTY') return 'Empty'

  // Check if we have a custom shortname for this CLSID
  if (munitionsShortnamesDatabase[itemId]) {
    return munitionsShortnamesDatabase[itemId]
  }

  // Fall back to full display name
  return getMunitionDisplayName(itemId)
}

/**
 * Get the display name for a DCS CLSID
 * Returns the munition name from the database, or a formatted composite label
 */
export function getMunitionDisplayName(itemId: string): string {
  if (itemId === 'EMPTY') return 'Empty'

  // Try direct database lookup first (handles both simple and composite CLSIDs)
  if (munitionsDatabase[itemId]?.name) {
    return munitionsDatabase[itemId].name
  }

  // Try with asterisk removed (airframe format -> Quaggles format)
  const cleanId = itemId.replace(/^{|}$/g, '')
  if (cleanId.includes('*')) {
    const quagglesFormat = `{${cleanId.replace('*', '')}}`
    if (munitionsDatabase[quagglesFormat]?.name) {
      return munitionsDatabase[quagglesFormat].name
    }
  }

  // Try without braces
  if (munitionsDatabase[cleanId]?.name) {
    return munitionsDatabase[cleanId].name
  }

  // Parse the CLSID using the DCS format parser
  const parsed = parseLoadoutId(itemId)

  if (parsed.components.length > 1) {
    // Composite loadout - format as "Rack w/ Qty× Munition"
    const rack = parsed.components[0]
    const munition = parsed.components[1]

    if (rack && munition) {
      // Try to get names from database
      const rackData = munitionsDatabase[rack.id]
      const munitionData = munitionsDatabase[munition.id] || munitionsDatabase[`{${munition.id}}`]

      if (rackData && munitionData) {
        return `${rackData.name} w/ ${munition.quantity}× ${munitionData.name}`
      } else if (rackData) {
        // Have rack but not munition - try munition ID without braces
        const munitionName = munitionData?.name ?? munition.id.replace(/^{|}$/g, '')
        return `${rackData.name} w/ ${munition.quantity}× ${munitionName}`
      } else if (munitionData) {
        // Have munition but not rack
        const rackName = rack.id.replace(/^{|}$/g, '')
        return `${rackName} w/ ${munition.quantity}× ${munitionData.name}`
      } else {
        // Don't have either - use IDs
        const rackName = rack.id.replace(/^{|}$/g, '')
        const munitionName = munition.id.replace(/^{|}$/g, '')
        return `${rackName} w/ ${munition.quantity}× ${munitionName}`
      }
    }
  }

  // Fallback - return the CLSID itself
  return cleanId
}

/**
 * Get the weight of a loadout item (handles simple and complex loadouts)
 * Uses parseLoadoutId to handle variable-depth hierarchies
 */
export function getLoadoutItemWeight(itemId: string): number {
  return parseLoadoutId(itemId).totalWeight
}

/**
 * Extract fuel capacity from a fuel tank ID and calculate fuel weight
 * Returns 0 if not a fuel tank
 *
 * First checks the munitions database for additionalFuel field (most accurate).
 * Falls back to parsing gallon amount from ID and using 6.7 lb/gal density.
 */
export function getFuelCapacity(itemId: string): number {
  if (itemId === 'EMPTY') return 0

  // Try direct lookup in database for additionalFuel field
  const munitionData = munitionsDatabase[itemId]
  if (munitionData?.additionalFuel) {
    return munitionData.additionalFuel
  }

  // Try with braces removed
  const cleanId = itemId.replace(/^{|}$/g, '')
  const cleanData = munitionsDatabase[cleanId] || munitionsDatabase[`{${cleanId}}`]
  if (cleanData?.additionalFuel) {
    return cleanData.additionalFuel
  }

  // Fallback: Match patterns like "370 GAL", "{DFT-370gal}", "300 GAL", "600 GAL"
  const galMatch = itemId.match(/(\d+)\s*GAL/i)
  if (galMatch) {
    const gallons = parseInt(galMatch[1]!, 10)
    return gallons * 6.7 // lb/gal
  }

  return 0
}

/**
 * Get the weight for loadout calculations (excludes fuel for fuel tanks)
 * For fuel tanks: returns empty tank weight (total weight - fuel weight)
 * For other munitions: returns full weight including all racks/launchers
 */
export function getLoadoutOnlyWeight(itemId: string): number {
  if (itemId === 'EMPTY') return 0

  const totalWeight = parseLoadoutId(itemId).totalWeight

  // For fuel tanks, subtract the fuel weight to get empty tank weight
  const munitionData = munitionsDatabase[itemId]
  if (munitionData?.category === 'fuel' && munitionData.additionalFuel) {
    return totalWeight - munitionData.additionalFuel
  }

  // Try with braces removed
  const cleanId = itemId.replace(/^{|}$/g, '')
  const cleanData = munitionsDatabase[cleanId] || munitionsDatabase[`{${cleanId}}`]
  if (cleanData?.category === 'fuel' && cleanData.additionalFuel) {
    return totalWeight - cleanData.additionalFuel
  }

  return totalWeight
}

/**
 * Infer munition category from its display name
 * Used when database category is 'rack' but we need to determine the actual payload category
 */
function inferCategoryFromName(name: string): string {
  const lowerName = name.toLowerCase()

  // Check for rockets
  if (lowerName.includes('rkts') || lowerName.includes('rocket') || lowerName.includes('hydra')) {
    return 'air-to-ground'
  }

  // Check for bombs
  if (
    lowerName.includes('bomb') ||
    lowerName.includes('gbu') ||
    lowerName.includes('mk-') ||
    lowerName.includes('mk ') ||
    lowerName.includes('bdu-')
  ) {
    return 'air-to-ground'
  }

  // Check for missiles
  if (lowerName.includes('agm-') || lowerName.includes('aim-') || lowerName.includes('missile')) {
    if (lowerName.includes('agm-') || lowerName.includes('maverick')) {
      return 'air-to-ground'
    }
    if (
      lowerName.includes('aim-') ||
      lowerName.includes('sidewinder') ||
      lowerName.includes('amraam')
    ) {
      return 'air-to-air'
    }
  }

  // Check for illumination/flares (air-to-ground utility)
  if (
    lowerName.includes('luu-') ||
    lowerName.includes('illumination') ||
    lowerName.includes('flare')
  ) {
    return 'air-to-ground'
  }

  // Default to rack if we can't determine
  return 'rack'
}

/**
 * Build dropdown options for a specific station on an aircraft
 * Returns munitions grouped by category (air-to-air, air-to-ground, fuel, pod, etc.)
 *
 * Each option group includes:
 * - type: 'group'
 * - label: Category name (capitalized)
 * - key: Category identifier
 * - children: Array of munition options with label and value
 */
export function buildStationLoadoutOptions(
  aircraft: string,
  stationNumber: number | string,
): Array<{
  type: 'group'
  label: string
  key: string
  children: Array<{ label: string; value: string }>
}> {
  const airframeData = airframeDatabase[aircraft]
  if (!airframeData) return []

  // Find the station in the airframe data
  const station = airframeData.stations.find((s) => s.station === stationNumber)
  if (!station || !station.munitions) return []

  // Group munitions by category
  const grouped = new Map<string, Array<{ label: string; value: string }>>()

  // Always include EMPTY as the first option
  grouped.set('empty', [{ label: 'Empty', value: 'EMPTY' }])

  for (const clsid of station.munitions) {
    // Parse the CLSID to determine category
    const parsed = parseLoadoutId(clsid)

    let category = 'rack' // Default for composites
    const label = getMunitionDisplayName(clsid)

    // Check if this is a composite by looking at the parsed result
    const isComposite = parsed.components.length > 1

    if (isComposite) {
      // For composites, use the category of the last munition in the chain
      const lastComponent = parsed.components[parsed.components.length - 1]
      if (lastComponent) {
        const lastMunitionData =
          munitionsDatabase[lastComponent.id] ||
          munitionsDatabase[`{${lastComponent.id}}`] ||
          munitionsDatabase[lastComponent.id.replace(/^{|}$/g, '')]
        category = lastMunitionData?.category ?? 'rack'
      }
    } else {
      // For simple munitions, use database category
      const cleanId = clsid.replace(/^{|}$/g, '')

      // Try multiple lookup formats to find the munition data
      // For CLSIDs with asterisk, also try Quaggles format (asterisk removed)
      const quagglesFormat = cleanId.includes('*') ? `{${cleanId.replace('*', '')}}` : null
      const munitionData =
        munitionsDatabase[clsid] ||
        (quagglesFormat && munitionsDatabase[quagglesFormat]) ||
        munitionsDatabase[`{${cleanId}}`] ||
        munitionsDatabase[cleanId]

      // If the munition is categorized as 'rack' in the database, try to infer the actual category
      // from the munition name or by parsing composite CLSIDs
      if (munitionData?.category === 'rack') {
        // For composites with asterisk, try to extract the last munition
        if (clsid.includes('*')) {
          const cleanClsid = clsid.replace(/^{|}$/g, '')
          // Match patterns like: BRU42LS_2*LAU68_HYDRA_70_MK1_L
          const match = cleanClsid.match(/^([^*]+)\*(.+)$/)
          if (match && match[2]) {
            const lastMunitionId = match[2]
            const lastMunitionData =
              munitionsDatabase[`{${lastMunitionId}}`] || munitionsDatabase[lastMunitionId]
            if (lastMunitionData && lastMunitionData.category !== 'rack') {
              category = lastMunitionData.category
            } else {
              // Fall through to name-based inference
              category = inferCategoryFromName(munitionData.name)
            }
          } else {
            category = inferCategoryFromName(munitionData.name)
          }
        } else {
          // Try to infer from the munition name
          category = inferCategoryFromName(munitionData.name)
        }
      } else {
        category = munitionData?.category ?? 'unknown'
      }
    }

    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push({ label, value: clsid })
  }

  // Convert to NSelect group format with proper ordering
  const categoryOrder = ['empty', 'air-to-air', 'air-to-ground', 'fuel', 'pod', 'gun', 'rack']
  const categoryLabels: Record<string, string> = {
    empty: 'Empty',
    'air-to-air': 'Air-to-Air',
    'air-to-ground': 'Air-to-Ground',
    fuel: 'Fuel Tanks',
    pod: 'Pods',
    gun: 'Gun Pods',
    rack: 'Racks & Launchers',
  }

  const result: Array<{
    type: 'group'
    label: string
    key: string
    children: Array<{ label: string; value: string }>
  }> = []

  // Add categories in order
  for (const category of categoryOrder) {
    const items = grouped.get(category)
    if (items && items.length > 0) {
      result.push({
        type: 'group',
        label: categoryLabels[category] ?? category,
        key: category,
        children: items,
      })
    }
  }

  // Add any remaining categories not in the order list
  for (const [category, items] of grouped.entries()) {
    if (!categoryOrder.includes(category) && items.length > 0) {
      result.push({
        type: 'group',
        label: categoryLabels[category] ?? category.charAt(0).toUpperCase() + category.slice(1),
        key: category,
        children: items,
      })
    }
  }

  return result
}
