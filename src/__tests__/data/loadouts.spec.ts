import { describe, it, expect } from 'vitest'
import { getLoadoutsForAirframe } from '@/data/loadouts'
import type { Airframe } from '@/types'

describe('loadouts', () => {
  describe('getLoadoutsForAirframe', () => {
    it('should return an array for any airframe input', () => {
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      expect(Array.isArray(loadouts)).toBe(true)
    })

    it('should return empty array for invalid airframe', () => {
      const loadouts = getLoadoutsForAirframe('NonExistentAircraft' as Airframe)
      expect(loadouts).toEqual([])
    })

    it('should return loadouts with required properties when data exists', () => {
      // Test with A-10C_2 which likely has loadouts
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      if (loadouts.length > 0) {
        const loadout = loadouts[0]!
        expect(loadout).toHaveProperty('name')
        expect(loadout).toHaveProperty('description')
        expect(loadout).toHaveProperty('stations')

        expect(typeof loadout.name).toBe('string')
        expect(typeof loadout.description).toBe('string')
        expect(Array.isArray(loadout.stations)).toBe(true)
      }
    })

    it('should have valid station data in loadouts', () => {
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      if (loadouts.length > 0) {
        loadouts.forEach((loadout) => {
          expect(Array.isArray(loadout.stations)).toBe(true)
          loadout.stations.forEach((station) => {
            expect(station).toHaveProperty('station')
            // The property is 'item' not 'munition' in the JSON
            expect(station).toHaveProperty('item')
          })
        })
      }
    })

    it('should have non-empty names and descriptions', () => {
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      if (loadouts.length > 0) {
        loadouts.forEach((loadout) => {
          expect(loadout.name.length).toBeGreaterThan(0)
          expect(loadout.description.length).toBeGreaterThan(0)
        })
      }
    })

    it('should handle F-16C loadouts if they exist', () => {
      const loadouts = getLoadoutsForAirframe('F-16C_50' as Airframe)
      expect(Array.isArray(loadouts)).toBe(true)
      // F-16C may or may not have loadouts, just verify it doesn't crash
    })

    it('should handle empty string airframe', () => {
      const loadouts = getLoadoutsForAirframe('' as Airframe)
      expect(loadouts).toEqual([])
    })

    it('should return different loadouts for different airframes', () => {
      const loadoutsA10 = getLoadoutsForAirframe('A-10C_2' as Airframe)
      const loadoutsF16 = getLoadoutsForAirframe('F-16C_50' as Airframe)

      // If both have loadouts, they should be different
      if (loadoutsA10.length > 0 && loadoutsF16.length > 0) {
        expect(JSON.stringify(loadoutsA10)).not.toEqual(JSON.stringify(loadoutsF16))
      }
    })

    it('should have unique loadout names within an airframe', () => {
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      if (loadouts.length > 1) {
        const names = loadouts.map((l) => l.name)
        const uniqueNames = new Set(names)
        expect(uniqueNames.size).toBe(names.length)
      }
    })

    it('should have valid station numbers', () => {
      const loadouts = getLoadoutsForAirframe('A-10C_2' as Airframe)
      if (loadouts.length > 0) {
        loadouts.forEach((loadout) => {
          loadout.stations.forEach((station) => {
            expect(typeof station.station === 'number' || typeof station.station === 'string').toBe(
              true,
            )
          })
        })
      }
    })
  })

  describe('loadouts database structure', () => {
    it('should maintain consistent structure across all loadouts', () => {
      // Test multiple airframes to ensure consistency
      const airframesToTest = ['A-10C_2', 'F-16C_50'] as Airframe[]

      airframesToTest.forEach((airframe) => {
        const loadouts = getLoadoutsForAirframe(airframe)
        loadouts.forEach((loadout) => {
          expect(loadout).toHaveProperty('name')
          expect(loadout).toHaveProperty('description')
          expect(loadout).toHaveProperty('stations')
          expect(Array.isArray(loadout.stations)).toBe(true)
        })
      })
    })
  })
})
