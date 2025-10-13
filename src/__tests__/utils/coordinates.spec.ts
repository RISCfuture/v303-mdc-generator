import { describe, it, expect } from 'vitest'
import {
  decimalToDMS,
  dmsToDecimal,
  formatDMS,
  parseDMS,
  decimalToDMSString,
  dmsStringToDecimal,
  isValidDecimal,
  isValidDMS,
  type DMSCoordinate,
} from '@/utils/coordinates'

describe('coordinates', () => {
  describe('decimalToDMS', () => {
    it('should convert positive latitude to N hemisphere', () => {
      const result = decimalToDMS(36.2057583, 'latitude')
      expect(result.hemisphere).toBe('N')
      expect(result.degrees).toBe(36)
      expect(result.minutes).toBe(12)
      expect(result.seconds).toBeCloseTo(20.73, 1)
    })

    it('should convert negative latitude to S hemisphere', () => {
      const result = decimalToDMS(-36.2057583, 'latitude')
      expect(result.hemisphere).toBe('S')
      expect(result.degrees).toBe(36)
      expect(result.minutes).toBe(12)
      expect(result.seconds).toBeCloseTo(20.73, 1)
    })

    it('should convert positive longitude to E hemisphere', () => {
      const result = decimalToDMS(65.8476583, 'longitude')
      expect(result.hemisphere).toBe('E')
      expect(result.degrees).toBe(65)
      expect(result.minutes).toBe(50)
      expect(result.seconds).toBeCloseTo(51.57, 1)
    })

    it('should convert negative longitude to W hemisphere', () => {
      const result = decimalToDMS(-122.4194, 'longitude')
      expect(result.hemisphere).toBe('W')
      expect(result.degrees).toBe(122)
      expect(result.minutes).toBe(25)
      expect(result.seconds).toBeCloseTo(9.84, 1)
    })

    it('should handle zero degrees', () => {
      const result = decimalToDMS(0, 'latitude')
      expect(result.hemisphere).toBe('N')
      expect(result.degrees).toBe(0)
      expect(result.minutes).toBe(0)
      expect(result.seconds).toBe(0)
    })
  })

  describe('dmsToDecimal', () => {
    it('should convert N hemisphere to positive', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const result = dmsToDecimal(dms)
      expect(result).toBeCloseTo(36.2057583, 6)
    })

    it('should convert S hemisphere to negative', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'S',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const result = dmsToDecimal(dms)
      expect(result).toBeCloseTo(-36.2057583, 6)
    })

    it('should convert E hemisphere to positive', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'E',
        degrees: 65,
        minutes: 50,
        seconds: 51.57,
      }
      const result = dmsToDecimal(dms)
      expect(result).toBeCloseTo(65.8476583, 6)
    })

    it('should convert W hemisphere to negative', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'W',
        degrees: 122,
        minutes: 25,
        seconds: 9.84,
      }
      const result = dmsToDecimal(dms)
      expect(result).toBeCloseTo(-122.4194, 6)
    })
  })

  describe('formatDMS', () => {
    it('should format latitude with leading zeros', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 1,
        minutes: 1,
        seconds: 0.06,
      }
      const result = formatDMS(dms, 'latitude')
      expect(result).toBe('N 01° 01.001′')
    })

    it('should format longitude with 3-digit degrees', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'E',
        degrees: 1,
        minutes: 1,
        seconds: 0.06,
      }
      const result = formatDMS(dms, 'longitude')
      expect(result).toBe('E 001° 01.001′')
    })

    it('should format minutes with decimal places', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const result = formatDMS(dms, 'latitude')
      // 20.73 seconds / 60 = 0.3455 minutes, so 12 + 0.3455 = 12.3455 ≈ 12.345
      expect(result).toBe('N 36° 12.345′')
    })

    it('should format whole minutes without decimal', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 0,
      }
      const result = formatDMS(dms, 'latitude')
      expect(result).toBe('N 36° 12′')
    })

    it('should limit decimal places to 3', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.123456789,
      }
      const result = formatDMS(dms, 'latitude')
      // 20.123456789 / 60 = 0.33539..., so 12 + 0.335 = 12.335
      expect(result).toBe('N 36° 12.335′')
    })
  })

  describe('parseDMS', () => {
    it('should parse formatted latitude string', () => {
      const result = parseDMS('N 36° 12.346′')
      expect(result).toEqual({
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: expect.closeTo(20.76, 1),
      })
    })

    it('should parse formatted longitude string', () => {
      const result = parseDMS('E 001° 01.001′')
      expect(result).toEqual({
        hemisphere: 'E',
        degrees: 1,
        minutes: 1,
        seconds: expect.closeTo(0.06, 2),
      })
    })

    it('should parse whole minutes', () => {
      const result = parseDMS('N 36° 12′')
      expect(result).toEqual({
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 0,
      })
    })

    it('should return null for invalid format', () => {
      expect(parseDMS('Invalid')).toBeNull()
      expect(parseDMS('N36°12′')).toBeNull() // missing spaces
      expect(parseDMS("N 36° 12'")).toBeNull() // wrong prime symbol
    })
  })

  describe('decimalToDMSString', () => {
    it('should convert decimal latitude to formatted string', () => {
      const result = decimalToDMSString(36.2057583, 'latitude')
      expect(result).toBe('N 36° 12.345′')
    })

    it('should convert decimal longitude to formatted string', () => {
      const result = decimalToDMSString(65.8476583, 'longitude')
      expect(result).toBe('E 065° 50.859′')
    })

    it('should handle negative values', () => {
      const result = decimalToDMSString(-36.2057583, 'latitude')
      expect(result).toBe('S 36° 12.345′')
    })
  })

  describe('dmsStringToDecimal', () => {
    it('should convert formatted string to decimal', () => {
      const result = dmsStringToDecimal('N 36° 12.346′')
      expect(result).toBeCloseTo(36.2057667, 5)
    })

    it('should handle S/W hemispheres as negative', () => {
      const result = dmsStringToDecimal('S 36° 12.346′')
      expect(result).toBeCloseTo(-36.2057667, 5)
    })

    it('should return null for invalid format', () => {
      expect(dmsStringToDecimal('Invalid')).toBeNull()
    })
  })

  describe('isValidDecimal', () => {
    it('should validate latitude range', () => {
      expect(isValidDecimal(0, 'latitude')).toBe(true)
      expect(isValidDecimal(90, 'latitude')).toBe(true)
      expect(isValidDecimal(-90, 'latitude')).toBe(true)
      expect(isValidDecimal(91, 'latitude')).toBe(false)
      expect(isValidDecimal(-91, 'latitude')).toBe(false)
    })

    it('should validate longitude range', () => {
      expect(isValidDecimal(0, 'longitude')).toBe(true)
      expect(isValidDecimal(180, 'longitude')).toBe(true)
      expect(isValidDecimal(-180, 'longitude')).toBe(true)
      expect(isValidDecimal(181, 'longitude')).toBe(false)
      expect(isValidDecimal(-181, 'longitude')).toBe(false)
    })
  })

  describe('isValidDMS', () => {
    it('should validate latitude DMS', () => {
      expect(
        isValidDMS(
          {
            hemisphere: 'N',
            degrees: 36,
            minutes: 12,
            seconds: 20,
          },
          'latitude',
        ),
      ).toBe(true)

      expect(
        isValidDMS(
          {
            hemisphere: 'E',
            degrees: 36,
            minutes: 12,
            seconds: 20,
          },
          'latitude',
        ),
      ).toBe(false) // wrong hemisphere
    })

    it('should validate longitude DMS', () => {
      expect(
        isValidDMS(
          {
            hemisphere: 'E',
            degrees: 122,
            minutes: 25,
            seconds: 10,
          },
          'longitude',
        ),
      ).toBe(true)

      expect(
        isValidDMS(
          {
            hemisphere: 'N',
            degrees: 122,
            minutes: 25,
            seconds: 10,
          },
          'longitude',
        ),
      ).toBe(false) // wrong hemisphere
    })

    it('should reject invalid degree ranges', () => {
      expect(
        isValidDMS(
          {
            hemisphere: 'N',
            degrees: 91,
            minutes: 0,
            seconds: 0,
          },
          'latitude',
        ),
      ).toBe(false)

      expect(
        isValidDMS(
          {
            hemisphere: 'E',
            degrees: 181,
            minutes: 0,
            seconds: 0,
          },
          'longitude',
        ),
      ).toBe(false)
    })

    it('should reject invalid minutes/seconds', () => {
      expect(
        isValidDMS(
          {
            hemisphere: 'N',
            degrees: 36,
            minutes: 60,
            seconds: 0,
          },
          'latitude',
        ),
      ).toBe(false)

      expect(
        isValidDMS(
          {
            hemisphere: 'N',
            degrees: 36,
            minutes: 12,
            seconds: 60,
          },
          'latitude',
        ),
      ).toBe(false)
    })
  })

  describe('round-trip conversions', () => {
    it('should maintain accuracy through decimal -> DMS -> decimal', () => {
      const original = 36.2057583
      const dms = decimalToDMS(original, 'latitude')
      const result = dmsToDecimal(dms)
      expect(result).toBeCloseTo(original, 6)
    })

    it('should maintain accuracy through DMS -> decimal -> DMS', () => {
      const original: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const decimal = dmsToDecimal(original)
      const result = decimalToDMS(decimal, 'latitude')
      expect(result.hemisphere).toBe(original.hemisphere)
      expect(result.degrees).toBe(original.degrees)
      expect(result.minutes).toBe(original.minutes)
      expect(result.seconds).toBeCloseTo(original.seconds, 2)
    })
  })
})
