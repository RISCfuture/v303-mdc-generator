import { describe, it, expect } from 'vitest'
import { getNavaidsForTheater } from '@/data/navaids'

// Helper to get the first theater with navaids data
function findTheaterWithNavaids(): {
  theater: string
  navaids: ReturnType<typeof getNavaidsForTheater>
} | null {
  const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']
  for (const theater of theaters) {
    const navaids = getNavaidsForTheater(theater)
    if (navaids.length > 0) {
      return { theater, navaids }
    }
  }
  return null
}

describe('navaids', () => {
  describe('getNavaidsForTheater', () => {
    it('should return an array for any theater input', () => {
      const navaids = getNavaidsForTheater('Afghanistan')
      expect(Array.isArray(navaids)).toBe(true)
    })

    it('should return empty array for invalid theater', () => {
      const navaids = getNavaidsForTheater('NonExistentTheater')
      expect(navaids).toEqual([])
    })

    it('should return navaids with required properties when data exists', () => {
      const result = findTheaterWithNavaids()
      expect(result).not.toBeNull()
      const navaid = result!.navaids[0]
      expect(navaid).toHaveProperty('name')
      expect(navaid).toHaveProperty('latitude')
      expect(navaid).toHaveProperty('longitude')
      expect(navaid).toHaveProperty('elevation')
    })

    it('should have valid coordinates when navaids exist', () => {
      const result = findTheaterWithNavaids()
      expect(result).not.toBeNull()
      result!.navaids.forEach((navaid) => {
        expect(typeof navaid.latitude).toBe('number')
        expect(typeof navaid.longitude).toBe('number')
        expect(navaid.latitude).toBeGreaterThanOrEqual(-90)
        expect(navaid.latitude).toBeLessThanOrEqual(90)
        expect(navaid.longitude).toBeGreaterThanOrEqual(-180)
        expect(navaid.longitude).toBeLessThanOrEqual(180)
      })
    })

    it('should handle empty string theater name', () => {
      const navaids = getNavaidsForTheater('')
      expect(navaids).toEqual([])
    })

    it('should return different navaids for different theaters', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']
      const navaidsData: unknown[][] = []

      theaters.forEach((theater) => {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          navaidsData.push(navaids)
        }
      })

      // We should have navaids for at least 2 theaters
      expect(navaidsData.length).toBeGreaterThanOrEqual(2)
      expect(JSON.stringify(navaidsData[0])).not.toEqual(JSON.stringify(navaidsData[1]))
    })

    it('should have valid elevation values when data exists', () => {
      const result = findTheaterWithNavaids()
      expect(result).not.toBeNull()
      result!.navaids.forEach((navaid) => {
        expect(typeof navaid.elevation).toBe('number')
        // Elevation should be a reasonable value
        expect(navaid.elevation).toBeGreaterThanOrEqual(-1000)
        expect(navaid.elevation).toBeLessThanOrEqual(50000)
      })
    })

    it('should have non-empty names when navaids exist', () => {
      const result = findTheaterWithNavaids()
      expect(result).not.toBeNull()
      result!.navaids.forEach((navaid) => {
        expect(typeof navaid.name).toBe('string')
        expect(navaid.name.length).toBeGreaterThan(0)
      })
    })
  })

  describe('navaids database structure', () => {
    it('should maintain consistent structure across all theaters', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']

      theaters.forEach((theater) => {
        const navaids = getNavaidsForTheater(theater)
        navaids.forEach((navaid) => {
          expect(navaid).toHaveProperty('name')
          expect(navaid).toHaveProperty('latitude')
          expect(navaid).toHaveProperty('longitude')
          expect(navaid).toHaveProperty('elevation')
        })
      })
    })
  })
})
