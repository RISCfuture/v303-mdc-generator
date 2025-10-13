import { describe, it, expect } from 'vitest'
import { deepMerge } from '@/utils/deepMerge'

describe('deepMerge', () => {
  it('should merge simple objects', () => {
    const target = { a: 1, b: 2 }
    const source = { b: 3, c: 4 }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('should merge nested objects', () => {
    const target = { a: { b: 1, c: 2 } }
    const source = { a: { c: 3, d: 4 } }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } })
  })

  it('should replace arrays entirely', () => {
    const target = { arr: [1, 2, 3] }
    const source = { arr: [4, 5] }
    const result = deepMerge(target, source)
    expect(result).toEqual({ arr: [4, 5] })
  })

  it('should handle deeply nested objects', () => {
    const target = {
      level1: {
        level2: {
          level3: {
            value: 'old',
          },
        },
      },
    }
    const source = {
      level1: {
        level2: {
          level3: {
            value: 'new',
            extra: 'added',
          },
        },
      },
    }
    const result = deepMerge(target, source)
    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'new',
            extra: 'added',
          },
        },
      },
    })
  })

  it('should merge multiple sources in order', () => {
    const target = { a: 1 }
    const source1 = { a: 2, b: 2 }
    const source2 = { a: 3, c: 3 }
    const result = deepMerge(target, source1, source2)
    expect(result).toEqual({ a: 3, b: 2, c: 3 })
  })

  it('should handle null values', () => {
    const target = { a: 'value' }
    const source = { a: null }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: null })
  })

  it('should handle undefined values', () => {
    const target = { a: 'value', b: 'keep' }
    const source = { a: undefined }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: undefined, b: 'keep' })
  })

  it('should create nested objects if they do not exist in target', () => {
    const target = { a: 1 }
    const source = { b: { c: { d: 2 } } }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: 1, b: { c: { d: 2 } } })
  })

  it('should handle mixed types (overwriting)', () => {
    const target = { a: 'string' }
    const source = { a: { nested: 'object' } }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: { nested: 'object' } })
  })

  it('should handle arrays of objects', () => {
    const target = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    }
    const source = {
      items: [{ id: 3, name: 'Item 3' }],
    }
    const result = deepMerge(target, source)
    // Arrays are replaced, not merged
    expect(result).toEqual({
      items: [{ id: 3, name: 'Item 3' }],
    })
  })

  it('should work with MDC-like structures', () => {
    const target = {
      Misc: {
        BingoFuel: 2500,
        LaserStartTime: 8,
      },
      CMS: {
        ChaffBingo: 10,
        Programs: [{ Number: 1, ChaffBurstQty: 2 }],
      },
    }
    const source = {
      Misc: {
        BingoFuel: 3000,
        BullseyeWP: 25,
      },
      CMS: {
        Programs: [
          { Number: 1, ChaffBurstQty: 3 },
          { Number: 2, ChaffBurstQty: 4 },
        ],
      },
    }
    const result = deepMerge(target, source)
    expect(result).toEqual({
      Misc: {
        BingoFuel: 3000,
        LaserStartTime: 8,
        BullseyeWP: 25,
      },
      CMS: {
        ChaffBingo: 10,
        Programs: [
          { Number: 1, ChaffBurstQty: 3 },
          { Number: 2, ChaffBurstQty: 4 },
        ],
      },
    })
  })

  it('should not mutate source objects', () => {
    const target = { a: { b: 1 } }
    const source = { a: { c: 2 } }
    const sourceCopy = JSON.parse(JSON.stringify(source))
    deepMerge(target, source)
    expect(source).toEqual(sourceCopy)
  })

  it('should handle empty objects', () => {
    const target = {}
    const source = { a: 1 }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: 1 })
  })

  it('should handle empty source', () => {
    const target = { a: 1 }
    const source = {}
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: 1 })
  })

  it('should return target when no sources provided', () => {
    const target = { a: 1 }
    const result = deepMerge(target)
    expect(result).toEqual({ a: 1 })
    expect(result).toBe(target)
  })
})
