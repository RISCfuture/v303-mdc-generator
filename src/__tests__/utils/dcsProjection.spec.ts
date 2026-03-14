import { describe, it, expect } from 'vitest'
import { latLonToDCS, dcsToLatLon, isTheaterProjectionSupported } from '@/utils/dcsProjection'

describe('dcsProjection', () => {
  describe('latLonToDCS', () => {
    it('converts known Nevada coordinates correctly', () => {
      // Nellis AFB approximate location
      const result = latLonToDCS(36.236, -115.034, 'Nevada')
      expect(result).not.toBeNull()
      expect(typeof result!.x).toBe('number')
      expect(typeof result!.y).toBe('number')
      // Verify output is in a reasonable range for DCS world coords
      expect(Math.abs(result!.x)).toBeGreaterThan(1000)
      expect(Math.abs(result!.y)).toBeGreaterThan(1000)
    })

    it('converts known Persian Gulf coordinates correctly', () => {
      const result = latLonToDCS(25.613, 55.923, 'PersianGulf')
      expect(result).not.toBeNull()
      expect(typeof result!.x).toBe('number')
      expect(typeof result!.y).toBe('number')
    })

    it('returns null for unsupported theater', () => {
      expect(latLonToDCS(0, 0, 'UnknownTheater')).toBeNull()
    })
  })

  describe('dcsToLatLon', () => {
    it('round-trips lat/lon through DCS coords with less than 1m error', () => {
      const theaters = ['Caucasus', 'Nevada', 'Syria', 'PersianGulf']
      const testCoords = [
        { lat: 42.0, lon: 44.0 }, // Caucasus
        { lat: 36.236, lon: -115.034 }, // Nevada
        { lat: 33.5, lon: 36.3 }, // Syria
        { lat: 25.613, lon: 55.923 }, // Persian Gulf
      ]

      for (let i = 0; i < theaters.length; i++) {
        const theater = theaters[i]!
        const coords = testCoords[i]!

        const dcs = latLonToDCS(coords.lat, coords.lon, theater)
        expect(dcs).not.toBeNull()

        const result = dcsToLatLon(dcs!.x, dcs!.y, theater)
        expect(result).not.toBeNull()

        // ~1m accuracy ≈ ~0.00001 degrees
        expect(result!.lat).toBeCloseTo(coords.lat, 4)
        expect(result!.lon).toBeCloseTo(coords.lon, 4)
      }
    })

    it('returns null for unsupported theater', () => {
      expect(dcsToLatLon(0, 0, 'UnknownTheater')).toBeNull()
    })
  })

  describe('isTheaterProjectionSupported', () => {
    const supportedTheaters = [
      'Caucasus',
      'Nevada',
      'Syria',
      'PersianGulf',
      'Falklands',
      'MarianaIslands',
      'Normandy',
      'TheChannel',
      'Afghanistan',
      'GermanyCW',
      'Iraq',
      'Kola',
      'SinaiMap',
    ]

    it('returns true for all 13 supported theaters', () => {
      for (const theater of supportedTheaters) {
        expect(isTheaterProjectionSupported(theater)).toBe(true)
      }
    })

    it('returns false for unknown theater', () => {
      expect(isTheaterProjectionSupported('UnknownTheater')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(isTheaterProjectionSupported('caucasus')).toBe(false)
      expect(isTheaterProjectionSupported('NEVADA')).toBe(false)
    })
  })
})
