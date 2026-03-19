/**
 * Mission storage validation utilities
 *
 * IMPORTANT: Distinction between "valid" and "complete":
 * - VALID: Mission conforms to TypeScript types and can be stored in localStorage
 * - COMPLETE: Mission passes all JSON Schema requirements and is ready for export
 *
 * The JSON Schema enforces COMPLETENESS (export-readiness), not just validity.
 * TypeScript conformance determines VALIDITY (storability).
 */

import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import missionSchema from '@/schemas/mission.schema.json'

let validator: ValidateFunction | null = null

/**
 * Initialize the JSON Schema validator
 */
function getValidator(): ValidateFunction {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(ajv)
    validator = ajv.compile(missionSchema)
  }
  return validator
}

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean
  errors?: {
    path: string
    message: string
  }[]
}

/**
 * Check if mission storage data is COMPLETE (ready for export)
 *
 * This validates against the JSON Schema, which enforces all requirements
 * for a mission to be exportable (non-empty callsign, crew, waypoints, etc.)
 *
 * Use this to determine if the Export button should be enabled.
 *
 * @param data - The parsed storage data to validate
 * @returns Validation result with any errors
 */
export function isMissionStorageComplete(data: unknown): ValidationResult {
  const validate = getValidator()
  const valid = validate(data)

  if (valid) {
    return { valid: true }
  }

  // Format validation errors for easier consumption
  const errors = (validate.errors ?? []).map((error) => ({
    path: error.instancePath || 'root',
    message: error.message ?? 'Unknown validation error',
  }))

  return {
    valid: false,
    errors,
  }
}

/**
 * @deprecated Use isMissionStorageComplete() instead for clarity.
 * This function checks COMPLETENESS (export-readiness), not just validity.
 */
export function validateMissionStorage(data: unknown): ValidationResult {
  return isMissionStorageComplete(data)
}
