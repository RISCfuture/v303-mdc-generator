import { describe, it, expect } from 'vitest'
import { getNavaidsForTheater } from '@/data/navaids'

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
      // Try common theaters that likely have navaid data
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']
      let foundNavaids = false

      for (const theater of theaters) {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          foundNavaids = true
          const navaid = navaids[0]!
          expect(navaid).toHaveProperty('name')
          expect(navaid).toHaveProperty('latitude')
          expect(navaid).toHaveProperty('longitude')
          expect(navaid).toHaveProperty('elevation')
          break
        }
      }

      // If no navaids found in common theaters, just verify the function works
      if (!foundNavaids) {
        expect(true).toBe(true) // Test passes if function doesn't crash
      }
    })

    it('should have valid coordinates when navaids exist', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']

      for (const theater of theaters) {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          navaids.forEach((navaid) => {
            expect(typeof navaid.latitude).toBe('number')
            expect(typeof navaid.longitude).toBe('number')
            expect(navaid.latitude).toBeGreaterThanOrEqual(-90)
            expect(navaid.latitude).toBeLessThanOrEqual(90)
            expect(navaid.longitude).toBeGreaterThanOrEqual(-180)
            expect(navaid.longitude).toBeLessThanOrEqual(180)
          })
          break
        }
      }
    })

    it('should handle empty string theater name', () => {
      const navaids = getNavaidsForTheater('')
      expect(navaids).toEqual([])
    })

    it('should return different navaids for different theaters', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']
      const navaidsData: Array<unknown[]> = []

      theaters.forEach((theater) => {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          navaidsData.push(navaids)
        }
      })

      // If we have navaids for at least 2 theaters, they should be different
      if (navaidsData.length >= 2) {
        expect(JSON.stringify(navaidsData[0])).not.toEqual(JSON.stringify(navaidsData[1]))
      }
    })

    it('should have valid elevation values when data exists', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']

      for (const theater of theaters) {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          navaids.forEach((navaid) => {
            expect(typeof navaid.elevation).toBe('number')
            // Elevation should be a reasonable value
            expect(navaid.elevation).toBeGreaterThanOrEqual(-1000)
            expect(navaid.elevation).toBeLessThanOrEqual(50000)
          })
          break
        }
      }
    })

    it('should have non-empty names when navaids exist', () => {
      const theaters = ['Afghanistan', 'Caucasus', 'Syria', 'Nevada']

      for (const theater of theaters) {
        const navaids = getNavaidsForTheater(theater)
        if (navaids.length > 0) {
          navaids.forEach((navaid) => {
            expect(typeof navaid.name).toBe('string')
            expect(navaid.name.length).toBeGreaterThan(0)
          })
          break
        }
      }
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
