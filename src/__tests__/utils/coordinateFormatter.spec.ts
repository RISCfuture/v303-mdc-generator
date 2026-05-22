import { describe, it, expect } from 'vitest'
import { formatCoordinate, parseCoordinate, convertCoordinate } from '@/utils/coordinateFormatter'

describe('coordinateFormatter', () => {
  const testLat = 36.2057583
  const testLon = -115.1234567

  describe('formatCoordinate', () => {
    it('should format DD (Decimal Degrees)', () => {
      const result = formatCoordinate(testLat, testLon, 'DD')
      expect(result).toBe('36.2057583, -115.1234567')
    })

    it('should format DDM (Degrees Decimal Minutes)', () => {
      const result = formatCoordinate(testLat, testLon, 'DDM')
      expect(result).toContain('N 36°')
      expect(result).toContain('W 115°')
      expect(result).toContain('′')
    })

    it('should format DMS (Degrees Minutes Seconds)', () => {
      const result = formatCoordinate(testLat, testLon, 'DMS')
      expect(result).toContain('N 36°')
      expect(result).toContain('W 115°')
      expect(result).toContain('′')
      expect(result).toContain('″')
    })

    it('should format MGRS', () => {
      const result = formatCoordinate(testLat, testLon, 'MGRS')
      expect(result).toBeTruthy()
      expect(result).toMatch(/\d{1,2}[A-Z]\s+[A-Z]{2}/u)
    })

    it('should handle null coordinates', () => {
      expect(formatCoordinate(null, testLon, 'DD')).toBe('')
      expect(formatCoordinate(testLat, null, 'DD')).toBe('')
      expect(formatCoordinate(null, null, 'DD')).toBe('')
    })

    it('should handle NaN coordinates', () => {
      expect(formatCoordinate(NaN, testLon, 'DD')).toBe('')
      expect(formatCoordinate(testLat, NaN, 'DD')).toBe('')
    })

    it('should default to DDM when format is unspecified', () => {
      const result = formatCoordinate(testLat, testLon)
      expect(result).toContain('N 36°')
      expect(result).toContain('W 115°')
      expect(result).toContain('′')
      expect(result).not.toContain('″')
    })

    it('should respect MGRS precision parameter', () => {
      const precision5 = formatCoordinate(testLat, testLon, 'MGRS', 5)
      const precision3 = formatCoordinate(testLat, testLon, 'MGRS', 3)
      expect(precision5.length).toBeGreaterThan(precision3.length)
    })
  })

  describe('parseCoordinate', () => {
    describe('DD format', () => {
      it('should parse decimal degrees', () => {
        const result = parseCoordinate('36.2057583, -115.1234567', 'DD')
        expect(result).toEqual({ lat: 36.2057583, lon: -115.1234567 })
      })

      it('should handle spaces', () => {
        const result = parseCoordinate('36.2057583,-115.1234567', 'DD')
        expect(result).toEqual({ lat: 36.2057583, lon: -115.1234567 })
      })

      it('should return null for invalid format', () => {
        expect(parseCoordinate('invalid', 'DD')).toBeNull()
        expect(parseCoordinate('36.123', 'DD')).toBeNull()
      })
    })

    describe('DDM format', () => {
      it('should parse DDM format', () => {
        const result = parseCoordinate('N 36° 12.345′, W 115° 07.407′', 'DDM')
        expect(result).not.toBeNull()
        expect(result?.lat).toBeCloseTo(36.2057583, 4)
        expect(result?.lon).toBeCloseTo(-115.12345, 4)
      })

      it('should parse DDM format with degrees only', () => {
        const result = parseCoordinate('N 36°, E 121°', 'DDM')
        expect(result).not.toBeNull()
        expect(result?.lat).toBeCloseTo(36, 5)
        expect(result?.lon).toBeCloseTo(121, 5)
      })

      it('should return null if missing comma separator', () => {
        const result = parseCoordinate('N 36° 12.345′', 'DDM')
        expect(result).toBeNull()
      })

      it('should return null for invalid format', () => {
        expect(parseCoordinate('invalid', 'DDM')).toBeNull()
      })
    })

    describe('DMS format', () => {
      it('should parse DMS format', () => {
        const result = parseCoordinate('N 36° 12′ 21″, W 115° 07′ 24″', 'DMS')
        expect(result).not.toBeNull()
        expect(result?.lat).toBeCloseTo(36.2058333, 5)
        expect(result?.lon).toBeCloseTo(-115.1233333, 5)
      })

      it('should return null if missing comma separator', () => {
        const result = parseCoordinate('N 36° 12′ 21″', 'DMS')
        expect(result).toBeNull()
      })

      it('should return null for invalid format', () => {
        expect(parseCoordinate('invalid', 'DMS')).toBeNull()
      })
    })

    describe('MGRS format', () => {
      it('should parse MGRS format', () => {
        const mgrsString = '11S PA 44000 84000'
        const result = parseCoordinate(mgrsString, 'MGRS')
        expect(result).not.toBeNull()
        expect(result?.lat).toBeGreaterThan(0)
        expect(result?.lon).toBeLessThan(0) // Western hemisphere
      })

      it('should handle compact MGRS format', () => {
        const compact = '11SPA4400084000'
        const result = parseCoordinate(compact, 'MGRS')
        expect(result).not.toBeNull()
      })

      it('should return null for invalid MGRS', () => {
        expect(parseCoordinate('invalid', 'MGRS')).toBeNull()
      })
    })

    it('should return null for empty input', () => {
      expect(parseCoordinate('', 'DD')).toBeNull()
      expect(parseCoordinate('  ', 'DDM')).toBeNull()
    })
  })

  describe('convertCoordinate', () => {
    it('should convert DD to DDM', () => {
      const input = '36.2057583, -115.1234567'
      const result = convertCoordinate(input, 'DD', 'DDM')
      expect(result).toContain('N 36°')
      expect(result).toContain('W 115°')
    })

    it('should convert DDM to DD', () => {
      const input = 'N 36° 12.345′, W 115° 07.407′'
      const result = convertCoordinate(input, 'DDM', 'DD')
      expect(result).toContain('36.2057')
      expect(result).toContain('-115.1234')
    })

    it('should convert DD to MGRS', () => {
      const input = '36.2057583, -115.1234567'
      const result = convertCoordinate(input, 'DD', 'MGRS')
      expect(result).toBeTruthy()
      expect(result).toMatch(/\d{1,2}[A-Z]\s+[A-Z]{2}/u)
    })

    it('should convert MGRS to DD', () => {
      const input = '11S PA 44000 84000'
      const result = convertCoordinate(input, 'MGRS', 'DD')
      expect(result).toContain(',')
      expect(result).toMatch(/-?\d+\.\d+,\s*-?\d+\.\d+/u)
    })

    it('should handle DMS to DDM conversion', () => {
      const input = 'N 36° 12′ 21″, W 115° 07′ 24″'
      const result = convertCoordinate(input, 'DMS', 'DDM')
      expect(result).toContain('N 36°')
      expect(result).toContain('W 115°')
      expect(result).toContain('′')
      expect(result).not.toContain('″')
    })

    it('should return empty string for invalid input', () => {
      expect(convertCoordinate('invalid', 'DD', 'DDM')).toBe('')
      expect(convertCoordinate('', 'DD', 'MGRS')).toBe('')
    })

    it('should respect MGRS precision parameter', () => {
      const input = '36.2057583, -115.1234567'
      const precision5 = convertCoordinate(input, 'DD', 'MGRS', 5)
      const precision3 = convertCoordinate(input, 'DD', 'MGRS', 3)
      expect(precision5.length).toBeGreaterThan(precision3.length)
    })

    it('should handle round-trip conversions accurately', () => {
      const original = '36.2057583, -115.1234567'

      // DD -> MGRS -> DD
      const mgrs = convertCoordinate(original, 'DD', 'MGRS', 5)
      const backToDD = convertCoordinate(mgrs, 'MGRS', 'DD')
      const parsed = parseCoordinate(backToDD, 'DD')

      expect(parsed).not.toBeNull()
      expect(parsed?.lat).toBeCloseTo(36.2057583, 4)
      expect(parsed?.lon).toBeCloseTo(-115.1234567, 4)
    })
  })
})
