/**
 * Checks if a value is a plain object (not an array or null)
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge utility for MDC templates
 * Recursively merges source objects into target
 *
 * Merge behavior:
 * - Objects: Merged recursively
 * - Arrays: Replaced entirely (not merged)
 * - Primitives: Source overwrites target
 *
 * @param target - The target object to merge into
 * @param sources - One or more source objects to merge from
 * @returns The merged result
 *
 * @example
 * ```ts
 * const base = { a: 1, b: { c: 2, d: 3 } }
 * const override = { b: { d: 4 }, e: 5 }
 * deepMerge(base, override)
 * // Result: { a: 1, b: { c: 2, d: 4 }, e: 5 }
 * ```
 */
export function deepMerge<T>(target: T, ...sources: Array<Partial<T>>): T {
  if (!sources.length) return target

  const source = sources.shift()
  if (!source) return deepMerge(target, ...sources)

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = target[key as keyof T]

      if (isObject(sourceValue)) {
        // If target doesn't have this key, create an empty object
        if (!targetValue || !isObject(targetValue)) {
          ;(target as Record<string, unknown>)[key] = {}
        }
        // Recursively merge nested objects
        deepMerge(
          (target as Record<string, unknown>)[key] as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        )
      } else {
        // For arrays and primitives, replace entirely
        ;(target as Record<string, unknown>)[key] = sourceValue
      }
    }
  }

  return deepMerge(target, ...sources)
}
