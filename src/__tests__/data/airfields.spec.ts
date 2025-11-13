import { describe, it, expect } from 'vitest'
import { getAirfieldsForTheater, getAvailableTheaters } from '@/data/airfields'

describe('airfields', () => {
  describe('getAvailableTheaters', () => {
    it('should return an array of theater names', () => {
      const theaters = getAvailableTheaters()
      expect(theaters).toBeInstanceOf(Array)
      expect(theaters.length).toBeGreaterThan(0)
    })

    it('should return sorted theater names', () => {
      const theaters = getAvailableTheaters()
      const sorted = [...theaters].sort()
      expect(theaters).toEqual(sorted)
    })

    it('should include known theaters', () => {
      const theaters = getAvailableTheaters()
      // Check for at least one known theater (adjust based on your actual data)
      expect(theaters.some((t) => ['Caucasus', 'Syria', 'Nevada', 'Afghanistan'].includes(t))).toBe(
        true,
      )
    })
  })

  describe('getAirfieldsForTheater', () => {
    it('should return an array of airfields for a valid theater', () => {
      const theaters = getAvailableTheaters()
      if (theaters.length > 0) {
        const airfields = getAirfieldsForTheater(theaters[0]!)
        expect(airfields).toBeInstanceOf(Array)
      }
    })

    it('should return airfields with required properties', () => {
      const theaters = getAvailableTheaters()
      if (theaters.length > 0) {
        const airfields = getAirfieldsForTheater(theaters[0]!)
        if (airfields.length > 0) {
          const airfield = airfields[0]!
          expect(airfield).toHaveProperty('name')
          expect(airfield).toHaveProperty('position')
          expect(airfield.position).toHaveProperty('latitude')
          expect(airfield.position).toHaveProperty('longitude')
        }
      }
    })

    it('should return an empty array for an invalid theater', () => {
      const airfields = getAirfieldsForTheater('NonExistentTheater')
      expect(airfields).toEqual([])
    })

    it('should return different airfields for different theaters', () => {
      const theaters = getAvailableTheaters()
      if (theaters.length >= 2) {
        const airfields1 = getAirfieldsForTheater(theaters[0]!)
        const airfields2 = getAirfieldsForTheater(theaters[1]!)
        // Different theaters should have different airfield sets (or at least different data)
        expect(JSON.stringify(airfields1)).not.toEqual(JSON.stringify(airfields2))
      }
    })

    it('should handle empty string as theater name', () => {
      const airfields = getAirfieldsForTheater('')
      expect(airfields).toEqual([])
    })
  })
})
