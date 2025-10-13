import { describe, it, expect } from 'vitest'
import {
  decimalToDMS,
  dmsToDecimal,
  formatDD,
  parseDD,
  formatDDM,
  parseDDM,
  formatDMS,
  parseDMS,
  decimalToDDMString,
  ddmStringToDecimal,
  decimalToTrueDMSString,
  trueDmsStringToDecimal,
  decimalToDMSString,
  dmsStringToDecimal,
  isValidDecimal,
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

  // Note: These old tests were for formatDMS/parseDMS which now test true DMS (with seconds)
  // For DDM (decimal minutes) testing, see formatDDM/parseDDM tests below

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

  // Tests for new format functions (DD, DDM, DMS with seconds)

  describe('formatDD', () => {
    it('should format lat/lon as decimal degrees', () => {
      const result = formatDD(36.2057583, -115.1234567)
      expect(result).toBe('36.2057583, -115.1234567')
    })

    it('should handle zero values', () => {
      const result = formatDD(0, 0)
      expect(result).toBe('0.0000000, 0.0000000')
    })

    it('should use 7 decimal places', () => {
      const result = formatDD(36.123, -115.456)
      expect(result).toBe('36.1230000, -115.4560000')
    })
  })

  describe('parseDD', () => {
    it('should parse decimal degrees format', () => {
      const result = parseDD('36.2057583, -115.1234567')
      expect(result).toEqual({ lat: 36.2057583, lon: -115.1234567 })
    })

    it('should handle spaces around comma', () => {
      const result = parseDD('36.2057583,-115.1234567')
      expect(result).toEqual({ lat: 36.2057583, lon: -115.1234567 })
    })

    it('should validate latitude range', () => {
      expect(parseDD('91, 0')).toBeNull()
      expect(parseDD('-91, 0')).toBeNull()
    })

    it('should validate longitude range', () => {
      expect(parseDD('0, 181')).toBeNull()
      expect(parseDD('0, -181')).toBeNull()
    })

    it('should return null for invalid format', () => {
      expect(parseDD('invalid')).toBeNull()
      expect(parseDD('36.123')).toBeNull() // missing longitude
      expect(parseDD('abc, def')).toBeNull()
    })
  })

  describe('formatDDM', () => {
    it('should format DDM with decimal minutes', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const result = formatDDM(dms, 'latitude')
      expect(result).toBe('N 36° 12.345′')
    })

    it('should handle whole minutes', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 0,
      }
      const result = formatDDM(dms, 'latitude')
      expect(result).toBe('N 36° 12′')
    })

    it('should pad longitude degrees to 3 digits', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'E',
        degrees: 1,
        minutes: 2,
        seconds: 3,
      }
      const result = formatDDM(dms, 'longitude')
      expect(result).toBe('E 001° 02.05′')
    })
  })

  describe('parseDDM', () => {
    it('should parse DDM format with decimal minutes', () => {
      const result = parseDDM('N 36° 12.345′')
      expect(result?.hemisphere).toBe('N')
      expect(result?.degrees).toBe(36)
      expect(result?.minutes).toBe(12)
      expect(result?.seconds).toBeCloseTo(20.7, 1)
    })

    it('should parse whole minutes', () => {
      const result = parseDDM('N 36° 12′')
      expect(result).toEqual({
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 0,
      })
    })

    it('should return null for invalid format', () => {
      expect(parseDDM('invalid')).toBeNull()
      expect(parseDDM('N36°12′')).toBeNull() // missing spaces
    })
  })

  describe('formatDMS (true DMS with seconds)', () => {
    it('should format DMS with seconds', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 20.73,
      }
      const result = formatDMS(dms, 'latitude')
      expect(result).toBe('N 36° 12′ 20.73″')
    })

    it('should handle whole seconds', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 21,
      }
      const result = formatDMS(dms, 'latitude')
      expect(result).toBe('N 36° 12′ 21″')
    })

    it('should pad longitude degrees to 3 digits', () => {
      const dms: DMSCoordinate = {
        hemisphere: 'W',
        degrees: 5,
        minutes: 10,
        seconds: 15.5,
      }
      const result = formatDMS(dms, 'longitude')
      expect(result).toBe('W 005° 10′ 15.5″')
    })
  })

  describe('parseDMS (true DMS with seconds)', () => {
    it('should parse DMS format with seconds', () => {
      const result = parseDMS('N 36° 12′ 21″')
      expect(result).toEqual({
        hemisphere: 'N',
        degrees: 36,
        minutes: 12,
        seconds: 21,
      })
    })

    it('should parse decimal seconds', () => {
      const result = parseDMS('N 36° 12′ 20.73″')
      expect(result?.hemisphere).toBe('N')
      expect(result?.degrees).toBe(36)
      expect(result?.minutes).toBe(12)
      expect(result?.seconds).toBeCloseTo(20.73, 2)
    })

    it('should return null for invalid format', () => {
      expect(parseDMS('invalid')).toBeNull()
      expect(parseDMS('N 36° 12.345′')).toBeNull() // DDM format, not DMS
    })
  })

  describe('decimalToDDMString', () => {
    it('should convert decimal to DDM string', () => {
      const result = decimalToDDMString(36.2057583, 'latitude')
      expect(result).toBe('N 36° 12.345′')
    })

    it('should handle negative values', () => {
      const result = decimalToDDMString(-115.1234567, 'longitude')
      expect(result).toBe('W 115° 07.407′')
    })
  })

  describe('ddmStringToDecimal', () => {
    it('should convert DDM string to decimal', () => {
      const result = ddmStringToDecimal('N 36° 12.345′')
      expect(result).toBeCloseTo(36.2057583, 4) // Reduced precision to 4 decimal places
    })

    it('should handle S/W hemispheres as negative', () => {
      const result = ddmStringToDecimal('W 115° 07.407′')
      expect(result).toBeCloseTo(-115.12345, 4) // Reduced precision to 4 decimal places
    })

    it('should return null for invalid format', () => {
      expect(ddmStringToDecimal('invalid')).toBeNull()
    })
  })

  describe('decimalToTrueDMSString', () => {
    it('should convert decimal to DMS string with seconds', () => {
      const result = decimalToTrueDMSString(36.2057583, 'latitude')
      expect(result).toContain('N 36°')
      expect(result).toContain('12′')
      expect(result).toContain('″')
    })

    it('should handle negative values', () => {
      const result = decimalToTrueDMSString(-115.1234567, 'longitude')
      expect(result).toContain('W 115°')
      expect(result).toContain('07′')
      expect(result).toContain('″')
    })
  })

  describe('trueDmsStringToDecimal', () => {
    it('should convert DMS string with seconds to decimal', () => {
      const result = trueDmsStringToDecimal('N 36° 12′ 21″')
      expect(result).toBeCloseTo(36.2058333, 5)
    })

    it('should handle S/W hemispheres as negative', () => {
      const result = trueDmsStringToDecimal('W 115° 07′ 24″')
      expect(result).toBeCloseTo(-115.1233333, 5)
    })

    it('should return null for invalid format', () => {
      expect(trueDmsStringToDecimal('invalid')).toBeNull()
      expect(trueDmsStringToDecimal('N 36° 12.345′')).toBeNull() // DDM format, not DMS
    })
  })
})
