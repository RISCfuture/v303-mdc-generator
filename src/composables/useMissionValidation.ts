/**
 * Mission validation composable
 * Provides reactive validation for missions
 *
 * IMPORTANT: Distinction between "valid" and "complete":
 * - A mission can be STORED if it conforms to TypeScript types (valid)
 * - A mission can be EXPORTED if it passes JSON Schema validation (complete)
 *
 * The isComplete computed property checks export-readiness via JSON Schema.
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import type { Mission } from '@/types'
import { serializeMission } from '@/utils/missionStorage'
import { isMissionStorageComplete, type ValidationResult } from '@/utils/validateMissionStorage'

export function useMissionValidation(
  mission: Ref<Mission | null> | ComputedRef<Mission | null | undefined>,
) {
  /**
   * Check if mission is COMPLETE (ready for export)
   *
   * Returns true only if the mission passes all JSON Schema requirements:
   * - Non-empty callsign and Link16 prefix
   * - At least one crew member
   * - At least one waypoint with valid coordinates
   * - Departure/recovery airports and runways specified
   * - TOLD data (rotation/refusal speeds)
   * - Fuel data (takeoff/joker/bingo)
   * - Mission details (remarks)
   *
   * All steerpoints must have non-null lat/lon/alt to pass validation.
   */
  const isComplete = computed(() => {
    if (!mission.value) {
      return false
    }

    try {
      const serialized = serializeMission(mission.value)

      const result = isMissionStorageComplete({
        version: 2,
        missions: [serialized],
      })

      // Completeness check must pass
      if (!result.valid) {
        return false
      }

      return true
    } catch {
      return false
    }
  })

  /**
   * Get completeness validation result with field paths
   *
   * This returns detailed errors about which fields are incomplete,
   * preventing the mission from being exported.
   */
  const validationResult = computed<ValidationResult>(() => {
    if (!mission.value) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'No mission data' }],
      }
    }

    try {
      const serialized = serializeMission(mission.value)
      const result = isMissionStorageComplete({
        version: 2,
        missions: [serialized],
      })

      return result
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'root',
            message: error instanceof Error ? error.message : 'Completeness check failed',
          },
        ],
      }
    }
  })

  /**
   * Get field-specific validation errors
   */
  const fieldErrors = computed<Map<string, string>>(() => {
    const errorMap = new Map<string, string>()

    if (!validationResult.value.errors) {
      // Debug: Log when validation failed but no errors found
      if (!validationResult.value.valid) {
        console.warn('[useMissionValidation] Validation failed but no errors array present', {
          validationResult: validationResult.value,
        })
      }
      return errorMap
    }

    // Debug: Log validation errors for debugging
    if (validationResult.value.errors.length > 0) {
      console.log('[useMissionValidation] Raw validation errors:', validationResult.value.errors)
    }

    // Map schema paths to field names for UI
    validationResult.value.errors.forEach((error) => {
      const path = error.path
      const message = error.message

      // Parse the JSON path to determine which field is invalid
      // Examples:
      // "/missions/0/n" -> name
      // "/missions/0/cr" -> crew
      // "/missions/0/wp/0/lat" -> waypoint latitude
      // "/missions/0/tld/rot" -> rotation speed
      // "/missions/0/dr/depProc" -> departure procedure

      if (path.endsWith('/n')) errorMap.set('name', message)
      else if (path.endsWith('/d') && !path.includes('/tld')) errorMap.set('date', message)
      else if (path.endsWith('/t') && !path.includes('/det')) errorMap.set('type', message)
      else if (path.endsWith('/cs')) errorMap.set('callsign', message)
      else if (path.endsWith('/l16')) errorMap.set('link16Prefix', message)
      else if (path.endsWith('/cr') || path.includes('/cr/')) errorMap.set('crew', message)
      else if (path.includes('/wp/') || path.includes('/wp')) {
        // For waypoint errors, include the waypoint index if available
        const wpMatch = /\/wp\/(\d+)/u.exec(path)
        if (wpMatch?.[1]) {
          const wpIndex = parseInt(wpMatch[1], 10)
          const wpNumber = wpIndex + 1 // Convert to 1-based for display
          const existing = errorMap.get('waypoints')
          if (existing) {
            errorMap.set('waypoints', `${existing}; Waypoint ${wpNumber} ${message}`)
          } else {
            errorMap.set('waypoints', `Waypoint ${wpNumber} ${message}`)
          }
        } else {
          errorMap.set('waypoints', message)
        }
      } else if (path.endsWith('/ld') || path.includes('/ld/')) errorMap.set('loadout', message)
      else if (path.includes('/tld/rot')) errorMap.set('rotation', message)
      else if (path.includes('/tld/ref')) errorMap.set('refusal', message)
      else if (path.includes('/dr/depProc')) errorMap.set('departureProcedure', message)
      else if (path.includes('/dr/depApt')) errorMap.set('departureAirport', message)
      else if (path.includes('/dr/depRwy')) errorMap.set('departureRunway', message)
      else if (path.includes('/dr/recProc')) errorMap.set('recoveryProcedure', message)
      else if (path.includes('/dr/recApt')) errorMap.set('recoveryAirport', message)
      else if (path.includes('/dr/recRwy')) errorMap.set('recoveryRunway', message)
      else if (path.includes('/f/b')) errorMap.set('bingo', message)
      else if (path.includes('/det/rem')) errorMap.set('remarks', message)
      else if (path.includes('/c1') || path.includes('/c2') || path.includes('/c3'))
        errorMap.set('radioPresets', message)
      else if (path.includes('/be')) errorMap.set('bullseye', message)
      else {
        // Unmapped error - add with the raw path as the field name
        console.warn('[useMissionValidation] Unmapped validation error:', { path, message })
        errorMap.set(`Unknown field (${path})`, message)
      }
    })

    // Debug: Log the final mapped errors
    if (errorMap.size > 0) {
      console.log('[useMissionValidation] Mapped field errors:', Array.from(errorMap.entries()))
    }

    return errorMap
  })

  /**
   * Check if a specific field has validation errors
   */
  const hasFieldError = (fieldName: string): boolean => {
    return fieldErrors.value.has(fieldName)
  }

  /**
   * Get error message for a specific field
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors.value.get(fieldName)
  }

  /**
   * Check if a specific waypoint field is incomplete (for visual feedback only)
   * Returns true if the field is required for completeness but currently empty/null
   */
  const isWaypointFieldIncomplete = (
    waypoint: Pick<
      Mission['waypoints'][number],
      'name' | 'latitude' | 'longitude' | 'altitude' | 'speed'
    >,
    field: 'name' | 'latitude' | 'longitude' | 'altitude',
  ): boolean => {
    if (!mission.value) return false

    switch (field) {
      case 'name':
        return !waypoint.name || waypoint.name.trim() === ''
      case 'latitude':
        return waypoint.latitude === null
      case 'longitude':
        return waypoint.longitude === null
      case 'altitude':
        return waypoint.altitude === null
      default:
        return false
    }
  }

  /**
   * Check if any mission field is incomplete for completeness
   * This provides a way to show visual feedback without blocking saves
   */
  const isFieldIncomplete = (fieldName: string): boolean => {
    if (!mission.value) return false

    // Check basic fields
    if (fieldName === 'name') return !mission.value.name || mission.value.name.trim() === ''
    if (fieldName === 'date') return !mission.value.date || mission.value.date.trim() === ''
    if (fieldName === 'type') return !mission.value.type || mission.value.type.trim() === ''
    if (fieldName === 'callsign')
      return !mission.value.callsign || mission.value.callsign.trim() === ''
    if (fieldName === 'link16Prefix')
      return !mission.value.link16PrefixOverride || mission.value.link16PrefixOverride.trim() === ''

    // Check TOLD fields
    if (fieldName === 'rotation') return mission.value.told.rotation === undefined
    if (fieldName === 'refusal') return mission.value.told.refusal === undefined

    // Check departure/recovery airport/runway fields (procedures are optional)
    if (fieldName === 'departureAirport')
      return (
        !mission.value.departureRecovery.departureAirportId ||
        mission.value.departureRecovery.departureAirportId.trim() === ''
      )
    if (fieldName === 'departureRunway')
      return (
        !mission.value.departureRecovery.departureRunwayName ||
        mission.value.departureRecovery.departureRunwayName.trim() === ''
      )
    if (fieldName === 'recoveryAirport')
      return (
        !mission.value.departureRecovery.recoveryAirportId ||
        mission.value.departureRecovery.recoveryAirportId.trim() === ''
      )
    if (fieldName === 'recoveryRunway')
      return (
        !mission.value.departureRecovery.recoveryRunwayName ||
        mission.value.departureRecovery.recoveryRunwayName.trim() === ''
      )

    // Check fuel
    if (fieldName === 'bingo') return mission.value.fuel.bingo === 0

    // Check remarks
    if (fieldName === 'remarks')
      return !mission.value.details.remarks || mission.value.details.remarks.trim() === ''

    // Check crew
    if (fieldName === 'crew') return mission.value.crew.length === 0

    // Check waypoints
    if (fieldName === 'waypoints') return mission.value.waypoints.length === 0

    // Note: Empty loadout (all EMPTY stations) is now considered valid
    // No need to check loadout field

    return false
  }

  return {
    isComplete,
    validationResult,
    fieldErrors,
    hasFieldError,
    getFieldError,
    isWaypointFieldIncomplete,
    isFieldIncomplete,
  }
}
