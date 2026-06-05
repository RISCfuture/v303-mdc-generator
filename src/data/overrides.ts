/**
 * Generic path-based override system
 *
 * Supports declarative overrides using path notation with bracket indices:
 * - "stations[3].munitions": { "add": [...], "remove": [...] }  // Array operations
 * - "radios[0].name": "FRONT"  // Direct property update
 * - "guns[1].capacity": 500  // Nested property update
 *
 * This module provides generic utilities for applying path-based overrides
 * to any data structure, making it reusable across airframes, munitions, etc.
 */

/**
 * Array operation for declarative overrides
 * Supports adding and removing items without duplicating entire arrays
 */
export type ArrayOperation<T> = {
  add?: T[]
  remove?: T[]
}

/**
 * Check if value is an ArrayOperation object (has add or remove keys)
 */
export function isArrayOperation(value: unknown): value is ArrayOperation<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ('add' in value || 'remove' in value)
  )
}

/**
 * Parse a path string into segments
 * Examples:
 *   "stations[3].munitions" → ["stations", 3, "munitions"]
 *   "radios[0].name" → ["radios", 0, "name"]
 *   "guns" → ["guns"]
 */
export function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = []

  // Match property names and array indices
  // Pattern: word followed by optional [number]
  const pattern = /(?<property>[^.[]+)|\[(?<index>\d+)\]/gu
  let match: RegExpExecArray | null

  while ((match = pattern.exec(path)) !== null) {
    if (match.groups?.property) {
      // Property name
      segments.push(match.groups.property)
    } else if (match.groups?.index) {
      // Array index
      segments.push(parseInt(match.groups.index, 10))
    }
  }

  return segments
}

/**
 * Apply add/remove operations to an array
 */
export function applyArrayOperation(
  baseArray: unknown[],
  operations: ArrayOperation<unknown>,
): unknown[] {
  let result = [...baseArray]

  // Apply remove first
  if (operations.remove && operations.remove.length > 0) {
    const removeItems = operations.remove
    result = result.filter((item) => {
      // For objects, do deep equality check
      if (typeof item === 'object' && item !== null) {
        return !removeItems.some(
          (removeItem) => JSON.stringify(item) === JSON.stringify(removeItem),
        )
      }
      // For primitives, do simple equality
      return !removeItems.includes(item)
    })
  }

  // Apply add
  if (operations.add && operations.add.length > 0) {
    result.push(...operations.add)
  }

  return result
}

/**
 * Navigate to a path in an object and apply an operation
 * Handles array operations (add/remove) and direct property sets
 */
export function applyPathOperation(base: unknown, path: string, value: unknown): unknown {
  // Deep clone to avoid mutations
  const result = JSON.parse(JSON.stringify(base)) as unknown

  const segments = parsePath(path)
  if (segments.length === 0) {
    console.warn('[Path Override] Empty path')
    return result
  }

  // Navigate to parent of target
  let current: Record<string | number, unknown> = result as Record<string | number, unknown>
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (current[segment] === undefined) {
      console.warn(`[Path Override] Path segment not found: ${segment} in path ${path}`)
      return result
    }
    current = current[segment] as Record<string | number, unknown>
  }

  // Apply operation at target
  const lastSegment = segments[segments.length - 1]

  if (isArrayOperation(value)) {
    // Array add/remove operation
    const targetArray = current[lastSegment]
    if (!Array.isArray(targetArray)) {
      console.warn(`[Path Override] Target is not an array: ${path}`)
      return result
    }

    current[lastSegment] = applyArrayOperation(targetArray, value)
  } else {
    // Direct property set
    current[lastSegment] = value
  }

  return result
}

/**
 * Apply multiple path-based overrides to a base object
 *
 * @param base - The base object to apply overrides to
 * @param overrides - Object with path keys and override values
 * @returns New object with all overrides applied
 *
 * @example
 * const base = { stations: [{ name: "STA 1" }, { name: "STA 2" }] }
 * const overrides = {
 *   "stations[0].name": "Station 1",
 *   "stations[1].munitions": { "add": ["GBU-39"] }
 * }
 * const result = applyOverrides(base, overrides)
 */
export function applyOverrides<T>(base: T, overrides: Record<string, unknown>): T {
  let result = base

  // Apply each path-based override
  for (const [path, value] of Object.entries(overrides)) {
    // Skip schema field (JSON schema reference)
    if (path === '$schema') continue

    result = applyPathOperation(result, path, value) as T
  }

  return result
}
