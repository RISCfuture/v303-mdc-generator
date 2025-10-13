import { describe, it, expect } from 'vitest'
import { buildStationLoadoutOptions } from '@/data/munitions'

describe('buildStationLoadoutOptions', () => {
  describe('composite munition categorization', () => {
    it('should categorize BRU-42 with bombs as air-to-ground', () => {
      // A-10C Station 3 has BRU-42 with Mk-82 bombs
      const options = buildStationLoadoutOptions('A-10C', 3)

      // Find air-to-ground category
      const airToGround = options.find((g) => g.key === 'air-to-ground')
      expect(airToGround).toBeDefined()

      // Check that BRU-42 with Mk-82 is in air-to-ground, not rack
      const bruMk82 = airToGround?.children.find(
        (c) => c.value === '{BRU42_2X_MK-82_L}' || c.value === 'BRU-42_3*Mk-82AIR',
      )
      expect(bruMk82).toBeDefined()
    })

    it('should categorize BRU-42 with rockets as air-to-ground', () => {
      // A-10C Station 3 has BRU-42 with LAU rockets
      const options = buildStationLoadoutOptions('A-10C', 3)

      // Find air-to-ground category
      const airToGround = options.find((g) => g.key === 'air-to-ground')
      expect(airToGround).toBeDefined()

      // Check that BRU-42 with rockets is in air-to-ground, not rack
      const bruRockets = airToGround?.children.find(
        (c) => c.value.includes('BRU42LS_2*LAU') && c.value.includes('HYDRA'),
      )
      expect(bruRockets).toBeDefined()
    })

    it('should categorize empty racks as rack category', () => {
      // A-10C Station 3 has empty BRU-42
      const options = buildStationLoadoutOptions('A-10C', 3)

      // Find rack category
      const rack = options.find((g) => g.key === 'rack')

      // Check that empty BRU-42 is in rack category
      const emptyBru = rack?.children.find((c) => c.value === 'BRU-42_LS')
      expect(emptyBru).toBeDefined()
    })

    it('should not categorize rack composites as Unknown', () => {
      // Test that rack composites (identified by '*' in CLSID and category 'rack' in database)
      // are correctly recategorized based on their payload
      const options = buildStationLoadoutOptions('A-10C', 3)

      // Find the unknown category (may contain missing munitions from database)
      const unknown = options.find((g) => g.key === 'unknown')

      // If unknown exists, verify it doesn't contain BRU-42 composites
      if (unknown) {
        const bruComposites = unknown.children.filter(
          (c) => c.value.includes('BRU') && c.value.includes('*'),
        )
        expect(bruComposites).toHaveLength(0)
      }

      // Verify that BRU-42 composites with rockets are in air-to-ground
      const airToGround = options.find((g) => g.key === 'air-to-ground')
      expect(airToGround).toBeDefined()

      const bruRockets = airToGround?.children.filter(
        (c) => c.value.includes('BRU') && c.value.includes('HYDRA'),
      )
      expect(bruRockets!.length).toBeGreaterThan(0)
    })
  })
})
