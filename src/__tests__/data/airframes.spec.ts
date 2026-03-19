import { describe, it, expect } from 'vitest'
import { airframeDatabase, getAirframeDisplayName } from '@/data/airframes'

describe('airframes', () => {
  describe('airframeDatabase', () => {
    it('should be a non-empty object', () => {
      expect(airframeDatabase).toBeTypeOf('object')
      expect(Object.keys(airframeDatabase).length).toBeGreaterThan(0)
    })

    it('should contain airframes with required properties', () => {
      const airframeKeys = Object.keys(airframeDatabase)
      expect(airframeKeys.length).toBeGreaterThan(0)

      const firstAirframe = airframeDatabase[airframeKeys[0]]
      expect(firstAirframe).toHaveProperty('aircraft')
      expect(firstAirframe).toHaveProperty('displayName')
      expect(firstAirframe).toHaveProperty('emptyWeight')
      expect(firstAirframe).toHaveProperty('maxTakeoffWeight')
      expect(firstAirframe).toHaveProperty('internalFuel')
      expect(firstAirframe).toHaveProperty('radios')
      expect(firstAirframe).toHaveProperty('stations')
    })

    it('should have valid weight values', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        expect(airframe.emptyWeight).toBeGreaterThan(0)
        expect(airframe.maxTakeoffWeight).toBeGreaterThan(0)
        expect(airframe.maxTakeoffWeight).toBeGreaterThan(airframe.emptyWeight)
        expect(airframe.internalFuel).toBeGreaterThanOrEqual(0)
      })
    })

    it('should have valid CMDS properties', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        expect(airframe.cmdsCapacity).toBeGreaterThanOrEqual(0)
        expect(airframe.chaffIncrement).toBeGreaterThanOrEqual(0)
        expect(airframe.flareIncrement).toBeGreaterThanOrEqual(0)
        expect(airframe.defaultChaff).toBeGreaterThanOrEqual(0)
        expect(airframe.defaultFlare).toBeGreaterThanOrEqual(0)
      })
    })

    it('should have valid fuel properties', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        expect(airframe.defaultJoker).toBeGreaterThan(0)
        expect(airframe.defaultBingo).toBeGreaterThan(0)
        expect(airframe.defaultJoker).toBeGreaterThan(airframe.defaultBingo)
      })
    })

    it('should have radios array', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        expect(Array.isArray(airframe.radios)).toBe(true)
        // Some airframes may have empty radios array
        expect(airframe.radios.length).toBeGreaterThanOrEqual(0)
      })
    })

    it('should have stations array with valid data', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        expect(Array.isArray(airframe.stations)).toBe(true)
        expect(airframe.stations.length).toBeGreaterThan(0)

        airframe.stations.forEach((station) => {
          expect(station).toHaveProperty('station')
          expect(station).toHaveProperty('name')
          expect(station).toHaveProperty('munitions')
          expect(Array.isArray(station.munitions)).toBe(true)
        })
      })
    })

    it('should include known aircraft types', () => {
      const airframeKeys = Object.keys(airframeDatabase)
      // Check for at least one known aircraft (A-10C or F-16C)
      expect(airframeKeys.some((key) => key.includes('A-10C') || key.includes('F-16C'))).toBe(true)
    })
  })

  describe('getAirframeDisplayName', () => {
    it('should return display name for valid airframe', () => {
      const airframeKeys = Object.keys(airframeDatabase)
      expect(airframeKeys.length).toBeGreaterThan(0)
      const airframeKey = airframeKeys[0]
      const displayName = getAirframeDisplayName(airframeKey)
      expect(displayName).toBeTruthy()
      expect(displayName).toBe(airframeDatabase[airframeKey].displayName)
    })

    it('should return the airframe key for invalid airframe', () => {
      const displayName = getAirframeDisplayName('NonExistentAircraft')
      expect(displayName).toBe('NonExistentAircraft')
    })

    it('should handle empty string', () => {
      const displayName = getAirframeDisplayName('')
      expect(displayName).toBe('')
    })
  })

  describe('airframe override system', () => {
    it('should properly merge overrides into base airframe data', () => {
      // Test that the override system works by checking if known overrides are applied
      // This is a structural test - if overrides exist, they should be merged
      Object.values(airframeDatabase).forEach((airframe) => {
        // Verify the structure is intact after merging
        expect(airframe.aircraft).toBeTruthy()
        expect(airframe.displayName).toBeTruthy()
      })
    })

    it('should maintain array integrity after merging', () => {
      Object.values(airframeDatabase).forEach((airframe) => {
        // Radios should be an array
        expect(Array.isArray(airframe.radios)).toBe(true)
        // Stations should be an array
        expect(Array.isArray(airframe.stations)).toBe(true)
        // If guns exist, should be an array
        expect(!airframe.guns || Array.isArray(airframe.guns)).toBe(true)
      })
    })

    it('should apply F-16C GBU-39 override correctly', () => {
      const f16 = airframeDatabase['F-16C_50']
      expect(f16).toBeDefined()

      // Find stations 3 and 7
      const station3 = f16.stations.find((s) => s.station === 3)
      const station7 = f16.stations.find((s) => s.station === 7)

      expect(station3).toBeDefined()
      expect(station7).toBeDefined()

      // Verify GBU-39 variants are present (added via override)
      const gbu39Variants = [
        '{BRU-61/A - 1 x GBU-39/B}',
        '{BRU-61/A - 2 x GBU-39/B}',
        '{BRU-61/A - 3 x GBU-39/B}',
        '{BRU-61/A - 4 x GBU-39/B}',
      ]

      gbu39Variants.forEach((variant) => {
        expect(station3!.munitions).toContain(variant)
        expect(station7!.munitions).toContain(variant)
      })
    })
  })

  describe('generic merge system', () => {
    it('should handle keyed array overrides', () => {
      // The F-16C override demonstrates keyed array override
      // Format: { "stations": { "3": { add: [...] }, "7": { add: [...] } } }
      const f16 = airframeDatabase['F-16C_50']
      expect(f16).toBeDefined()
      expect(f16.stations).toBeDefined()
      expect(Array.isArray(f16.stations)).toBe(true)
    })

    it('should preserve all existing munitions when using add operations', () => {
      // When using "add" operations, original munitions should be preserved
      const f16 = airframeDatabase['F-16C_50']
      const station3 = f16.stations.find((s) => s.station === 3)

      // Station 3 should have many munitions (original + added GBU-39s)
      expect(station3!.munitions.length).toBeGreaterThan(4)

      // Should still have some original munitions (e.g., AIM-9 variants)
      const hasOriginalMunitions = station3!.munitions.some((m) => m.includes('AIM'))
      expect(hasOriginalMunitions).toBe(true)
    })

    it('should not affect unmodified stations', () => {
      // Stations that are not in the override should remain unchanged
      const f16 = airframeDatabase['F-16C_50']
      const station1 = f16.stations.find((s) => s.station === 1)

      // Station 1 was not modified by override, so should not have GBU-39
      expect(station1).toBeDefined()
      const hasGbu39 = station1!.munitions.some((m) => m.includes('GBU-39'))
      expect(hasGbu39).toBe(false)
    })

    it('should maintain station metadata during merge', () => {
      // Station name and other metadata should be preserved
      const f16 = airframeDatabase['F-16C_50']
      const station3 = f16.stations.find((s) => s.station === 3)

      expect(station3!.station).toBe(3)
      expect(station3!.name).toBeTruthy()
      expect(typeof station3!.name).toBe('string')
    })
  })

  describe('gun data', () => {
    it('should have valid gun data when present', () => {
      const airframesWithGuns = Object.values(airframeDatabase).filter(
        (airframe) => airframe.guns && airframe.guns.length > 0,
      )
      expect(airframesWithGuns.length).toBeGreaterThan(0)

      airframesWithGuns.forEach((airframe) => {
        airframe.guns!.forEach((gun) => {
          expect(gun).toHaveProperty('name')
          expect(gun).toHaveProperty('capacity')
          expect(gun).toHaveProperty('shells')
          expect(gun.capacity).toBeGreaterThan(0)
          expect(Array.isArray(gun.shells)).toBe(true)
          expect(gun.shells.length).toBeGreaterThan(0)

          gun.shells.forEach((shell) => {
            expect(shell).toHaveProperty('name')
            expect(shell).toHaveProperty('displayName')
          })

          expect(!gun.mixes || Array.isArray(gun.mixes)).toBe(true)
          gun.mixes?.forEach((mix) => {
            expect(mix).toHaveProperty('sequence')
            expect(Array.isArray(mix.sequence)).toBe(true)
          })
        })
      })
    })
  })
})
