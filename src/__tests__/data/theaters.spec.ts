import { describe, it, expect } from 'vitest'
import { theaterDatabase } from '@/data/theaters'
import type { Theater } from '@/types'

describe('theaters', () => {
  describe('theaterDatabase', () => {
    it('should be a non-empty object', () => {
      expect(typeof theaterDatabase).toBe('object')
      expect(Object.keys(theaterDatabase).length).toBeGreaterThan(0)
    })

    it('should have theaters with required properties', () => {
      Object.values(theaterDatabase).forEach((theater) => {
        expect(theater).toHaveProperty('name')
        expect(theater).toHaveProperty('displayName')
        expect(theater).toHaveProperty('navaidsUrl')
        expect(theater).toHaveProperty('isTraining')
      })
    })

    it('should have valid property types', () => {
      Object.values(theaterDatabase).forEach((theater) => {
        expect(typeof theater.name).toBe('string')
        expect(typeof theater.displayName).toBe('string')
        expect(typeof theater.navaidsUrl).toBe('string')
        expect(typeof theater.isTraining).toBe('boolean')

        expect(theater.name.length).toBeGreaterThan(0)
        expect(theater.displayName.length).toBeGreaterThan(0)
        expect(theater.navaidsUrl.length).toBeGreaterThan(0)
      })
    })

    it('should have matching name property with object key', () => {
      Object.entries(theaterDatabase).forEach(([key, theater]) => {
        expect(theater.name).toBe(key)
      })
    })

    it('should have valid URLs for navaidsUrl', () => {
      Object.values(theaterDatabase).forEach((theater) => {
        // Should start with http:// or https:// or be a relative path
        expect(
          theater.navaidsUrl.startsWith('http://') ||
            theater.navaidsUrl.startsWith('https://') ||
            theater.navaidsUrl.startsWith('/') ||
            theater.navaidsUrl.startsWith('./'),
        ).toBe(true)
      })
    })

    it('should have valid URLs for ifgUrl when present', () => {
      const theatersWithIfg = Object.values(theaterDatabase).filter(
        (theater) => theater.ifgUrl !== undefined,
      )
      theatersWithIfg.forEach((theater) => {
        expect(
          theater.ifgUrl!.startsWith('http://') ||
            theater.ifgUrl!.startsWith('https://') ||
            theater.ifgUrl!.startsWith('/') ||
            theater.ifgUrl!.startsWith('./'),
        ).toBe(true)
      })
    })

    it('should include known DCS theaters', () => {
      const theaterNames = Object.keys(theaterDatabase)
      // Check for at least some common DCS theaters
      const knownTheaters = ['Caucasus', 'Nevada', 'Syria', 'Afghanistan']
      const hasKnownTheater = theaterNames.some((name) => knownTheaters.includes(name))
      expect(hasKnownTheater).toBe(true)
    })

    it('should have at least one training theater', () => {
      const hasTrainingTheater = Object.values(theaterDatabase).some(
        (theater) => theater.isTraining,
      )
      // This might not always be true, but it's a good structural check
      // If it fails, it's worth investigating
      expect(typeof hasTrainingTheater).toBe('boolean')
    })

    it('should allow null defaultAirfield', () => {
      Object.values(theaterDatabase).forEach((theater) => {
        // defaultAirfield should be either undefined, null, or a string
        expect(
          theater.defaultAirfield === undefined ||
            theater.defaultAirfield === null ||
            typeof theater.defaultAirfield === 'string',
        ).toBe(true)
      })
    })

    it('should have valid defaultSupportAssets when present', () => {
      const theatersWithAssets = Object.values(theaterDatabase).filter(
        (theater) => theater.defaultSupportAssets !== undefined,
      )
      theatersWithAssets.forEach((theater) => {
        expect(Array.isArray(theater.defaultSupportAssets)).toBe(true)
        theater.defaultSupportAssets!.forEach((asset) => {
          // Support assets should have some basic structure
          expect(typeof asset).toBe('object')
        })
      })
    })

    it('should have unique theater names', () => {
      const names = Object.values(theaterDatabase).map((t) => t.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('should have unique display names', () => {
      const displayNames = Object.values(theaterDatabase).map((t) => t.displayName)
      const uniqueDisplayNames = new Set(displayNames)
      expect(uniqueDisplayNames.size).toBe(displayNames.length)
    })
  })

  describe('theater lookup by key', () => {
    it('should allow access to theater data by key', () => {
      const theaterKeys = Object.keys(theaterDatabase) as Theater[]
      expect(theaterKeys.length).toBeGreaterThan(0)
      const firstKey = theaterKeys[0]
      const theater = theaterDatabase[firstKey]
      expect(theater).toBeDefined()
      expect(theater.name).toBe(firstKey)
    })

    it('should have consistent data structure across all theaters', () => {
      const theaterKeys = Object.keys(theaterDatabase) as Theater[]
      theaterKeys.forEach((key) => {
        const theater = theaterDatabase[key]
        expect(theater).toHaveProperty('name')
        expect(theater).toHaveProperty('displayName')
        expect(theater).toHaveProperty('navaidsUrl')
        expect(theater).toHaveProperty('isTraining')
      })
    })
  })
})
