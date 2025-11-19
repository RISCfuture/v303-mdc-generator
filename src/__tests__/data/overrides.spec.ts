import { describe, it, expect } from 'vitest'
import {
  parsePath,
  isArrayOperation,
  applyArrayOperation,
  applyPathOperation,
  applyOverrides,
} from '@/data/overrides'

describe('overrides', () => {
  describe('parsePath', () => {
    it('should parse simple property path', () => {
      expect(parsePath('name')).toEqual(['name'])
    })

    it('should parse dot notation path', () => {
      expect(parsePath('user.name')).toEqual(['user', 'name'])
    })

    it('should parse bracket notation with single index', () => {
      expect(parsePath('stations[3]')).toEqual(['stations', 3])
    })

    it('should parse bracket notation with dot notation', () => {
      expect(parsePath('stations[3].name')).toEqual(['stations', 3, 'name'])
    })

    it('should parse complex path with multiple indices', () => {
      expect(parsePath('radios[0].presets[5].frequency')).toEqual([
        'radios',
        0,
        'presets',
        5,
        'frequency',
      ])
    })

    it('should parse path with zero index', () => {
      expect(parsePath('items[0]')).toEqual(['items', 0])
    })

    it('should handle empty path', () => {
      expect(parsePath('')).toEqual([])
    })
  })

  describe('isArrayOperation', () => {
    it('should return true for object with add property', () => {
      expect(isArrayOperation({ add: ['item'] })).toBe(true)
    })

    it('should return true for object with remove property', () => {
      expect(isArrayOperation({ remove: ['item'] })).toBe(true)
    })

    it('should return true for object with both add and remove', () => {
      expect(isArrayOperation({ add: ['item1'], remove: ['item2'] })).toBe(true)
    })

    it('should return false for null', () => {
      expect(isArrayOperation(null)).toBe(false)
    })

    it('should return false for array', () => {
      expect(isArrayOperation(['item'])).toBe(false)
    })

    it('should return false for string', () => {
      expect(isArrayOperation('value')).toBe(false)
    })

    it('should return false for number', () => {
      expect(isArrayOperation(42)).toBe(false)
    })

    it('should return false for empty object', () => {
      expect(isArrayOperation({})).toBe(false)
    })

    it('should return false for object with other properties', () => {
      expect(isArrayOperation({ name: 'test' })).toBe(false)
    })
  })

  describe('applyArrayOperation', () => {
    it('should add items to array', () => {
      const base = ['a', 'b', 'c']
      const result = applyArrayOperation(base, { add: ['d', 'e'] })
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('should remove items from array', () => {
      const base = ['a', 'b', 'c', 'd']
      const result = applyArrayOperation(base, { remove: ['b', 'd'] })
      expect(result).toEqual(['a', 'c'])
    })

    it('should remove and then add items', () => {
      const base = ['a', 'b', 'c']
      const result = applyArrayOperation(base, { remove: ['b'], add: ['d', 'e'] })
      expect(result).toEqual(['a', 'c', 'd', 'e'])
    })

    it('should handle empty add array', () => {
      const base = ['a', 'b']
      const result = applyArrayOperation(base, { add: [] })
      expect(result).toEqual(['a', 'b'])
    })

    it('should handle empty remove array', () => {
      const base = ['a', 'b']
      const result = applyArrayOperation(base, { remove: [] })
      expect(result).toEqual(['a', 'b'])
    })

    it('should handle removing non-existent items', () => {
      const base = ['a', 'b']
      const result = applyArrayOperation(base, { remove: ['c', 'd'] })
      expect(result).toEqual(['a', 'b'])
    })

    it('should not mutate original array', () => {
      const base = ['a', 'b', 'c']
      const result = applyArrayOperation(base, { add: ['d'] })
      expect(base).toEqual(['a', 'b', 'c'])
      expect(result).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should handle object arrays with deep equality', () => {
      const base = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const result = applyArrayOperation(base, { remove: [{ id: 2 }] })
      expect(result).toEqual([{ id: 1 }, { id: 3 }])
    })

    it('should add object items to array', () => {
      const base = [{ id: 1 }]
      const result = applyArrayOperation(base, { add: [{ id: 2 }, { id: 3 }] })
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })
  })

  describe('applyPathOperation', () => {
    it('should set simple property', () => {
      const base = { name: 'old' }
      const result = applyPathOperation(base, 'name', 'new')
      expect(result).toEqual({ name: 'new' })
    })

    it('should set nested property', () => {
      const base = { user: { name: 'old', age: 30 } }
      const result = applyPathOperation(base, 'user.name', 'new')
      expect(result).toEqual({ user: { name: 'new', age: 30 } })
    })

    it('should set array element property', () => {
      const base = { items: [{ name: 'a' }, { name: 'b' }] }
      const result = applyPathOperation(base, 'items[1].name', 'c')
      expect(result).toEqual({ items: [{ name: 'a' }, { name: 'c' }] })
    })

    it('should apply array add operation', () => {
      const base = { items: ['a', 'b'] }
      const result = applyPathOperation(base, 'items', { add: ['c'] })
      expect(result).toEqual({ items: ['a', 'b', 'c'] })
    })

    it('should apply array remove operation', () => {
      const base = { items: ['a', 'b', 'c'] }
      const result = applyPathOperation(base, 'items', { remove: ['b'] })
      expect(result).toEqual({ items: ['a', 'c'] })
    })

    it('should apply array operation to nested array', () => {
      const base = { stations: [{ munitions: ['AIM-9'] }] }
      const result = applyPathOperation(base, 'stations[0].munitions', { add: ['AIM-120'] })
      expect(result).toEqual({ stations: [{ munitions: ['AIM-9', 'AIM-120'] }] })
    })

    it('should not mutate original object', () => {
      const base = { name: 'old' }
      const result = applyPathOperation(base, 'name', 'new')
      expect(base).toEqual({ name: 'old' })
      expect(result).toEqual({ name: 'new' })
    })

    it('should warn and return unchanged for empty path', () => {
      const base = { name: 'test' }
      const result = applyPathOperation(base, '', 'value')
      expect(result).toEqual({ name: 'test' })
    })

    it('should warn and return unchanged for non-existent path', () => {
      const base = { name: 'test' }
      const result = applyPathOperation(base, 'nonexistent.path', 'value')
      expect(result).toEqual({ name: 'test' })
    })

    it('should warn and return unchanged when target is not an array', () => {
      const base = { name: 'test' }
      const result = applyPathOperation(base, 'name', { add: ['item'] })
      expect(result).toEqual({ name: 'test' })
    })
  })

  describe('applyOverrides', () => {
    it('should apply multiple path-based overrides', () => {
      const base = {
        name: 'old',
        user: { age: 30 },
      }
      const overrides = {
        name: 'new',
        'user.age': 31,
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({
        name: 'new',
        user: { age: 31 },
      })
    })

    it('should apply array operations', () => {
      const base = {
        items: ['a', 'b'],
      }
      const overrides = {
        items: { add: ['c'], remove: ['a'] },
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({ items: ['b', 'c'] })
    })

    it('should skip $schema field', () => {
      const base = { name: 'old' }
      const overrides = {
        $schema: 'some-schema.json',
        name: 'new',
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({ name: 'new' })
      expect(result).not.toHaveProperty('$schema')
    })

    it('should handle munitions-style flat overrides', () => {
      const base = {
        ALQ_184: { name: 'ALQ-184 ECM Pod', shortName: 'ALQ184' },
        AIM_9M: { name: 'AIM-9M Sidewinder', shortName: 'AIM9M' },
      }
      const overrides = {
        'ALQ_184.shortName': 'ALQ-184',
        'AIM_9M.shortName': 'AIM-9M',
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({
        ALQ_184: { name: 'ALQ-184 ECM Pod', shortName: 'ALQ-184' },
        AIM_9M: { name: 'AIM-9M Sidewinder', shortName: 'AIM-9M' },
      })
    })

    it('should add new entries with dictionary syntax', () => {
      const base = {
        'existing-item': { id: 'existing-item', name: 'Existing', weight: 100 },
      }
      const overrides = {
        'new-item': {
          id: 'new-item',
          name: 'New Item',
          weight: 200,
          category: 'air-to-ground',
        },
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({
        'existing-item': { id: 'existing-item', name: 'Existing', weight: 100 },
        'new-item': {
          id: 'new-item',
          name: 'New Item',
          weight: 200,
          category: 'air-to-ground',
        },
      })
    })

    it('should handle airframe-style nested overrides with bracket notation', () => {
      const base = {
        radios: [
          { name: 'Radio 1', frequency: 121.5 },
          { name: 'Radio 2', frequency: 243.0 },
        ],
        stations: [
          { station: 1, name: 'Station 1', munitions: [] },
          { station: 2, name: 'Station 2', munitions: ['AIM-9'] },
        ],
      }
      const overrides = {
        'radios[0].name': 'FRONT',
        'radios[1].name': 'REAR',
        'stations[1].munitions': { add: ['AIM-120'] },
      }
      const result = applyOverrides(base, overrides)
      expect(result).toEqual({
        radios: [
          { name: 'FRONT', frequency: 121.5 },
          { name: 'REAR', frequency: 243.0 },
        ],
        stations: [
          { station: 1, name: 'Station 1', munitions: [] },
          { station: 2, name: 'Station 2', munitions: ['AIM-9', 'AIM-120'] },
        ],
      })
    })

    it('should not mutate original base object', () => {
      const base = { name: 'old' }
      const overrides = { name: 'new' }
      const result = applyOverrides(base, overrides)
      expect(base).toEqual({ name: 'old' })
      expect(result).toEqual({ name: 'new' })
    })

    it('should handle empty overrides', () => {
      const base = { name: 'test' }
      const result = applyOverrides(base, {})
      expect(result).toEqual({ name: 'test' })
    })

    it('should handle complex real-world F-16C scenario', () => {
      const base = {
        aircraft: 'F-16C_50',
        stations: [
          { station: 1, name: 'Left Wingtip', munitions: ['AIM-9M'] },
          { station: 3, name: 'Left Inboard', munitions: ['AIM-120', 'GBU-12'] },
          { station: 7, name: 'Right Inboard', munitions: ['AIM-120', 'GBU-12'] },
        ],
      }
      const overrides = {
        'stations[0].name': 'STA 1',
        'stations[1].name': 'STA 3',
        'stations[1].munitions': {
          add: ['{BRU-61/A - 1 x GBU-39/B}', '{BRU-61/A - 2 x GBU-39/B}'],
        },
        'stations[2].name': 'STA 7',
        'stations[2].munitions': {
          add: ['{BRU-61/A - 1 x GBU-39/B}', '{BRU-61/A - 2 x GBU-39/B}'],
        },
      }
      const result = applyOverrides(base, overrides)
      expect(result.stations[0]?.name).toBe('STA 1')
      expect(result.stations[1]?.name).toBe('STA 3')
      expect(result.stations[2]?.name).toBe('STA 7')
      expect(result.stations[1]?.munitions).toContain('{BRU-61/A - 1 x GBU-39/B}')
      expect(result.stations[2]?.munitions).toContain('{BRU-61/A - 2 x GBU-39/B}')
      // Original munitions should be preserved
      expect(result.stations[1]?.munitions).toContain('AIM-120')
      expect(result.stations[2]?.munitions).toContain('GBU-12')
    })
  })
})
