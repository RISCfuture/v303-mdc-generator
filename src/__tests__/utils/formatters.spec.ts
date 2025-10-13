import { describe, it, expect } from 'vitest'
import { formatFileSize } from '@/utils/formatters'

describe('formatters', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 byte')
      expect(formatFileSize(500)).toBe('500 byte')
      expect(formatFileSize(1023)).toBe('1,023 byte')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 kB')
      expect(formatFileSize(1536)).toBe('2 kB') // 1.5 KB rounds to 2
      expect(formatFileSize(125 * 1024)).toBe('125 kB')
      expect(formatFileSize(1023 * 1024)).toBe('1,023 kB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
      expect(formatFileSize(3795 * 1024)).toBe('3.7 MB')
      expect(formatFileSize(999 * 1024 * 1024)).toBe('999 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB')
      expect(formatFileSize(2.75 * 1024 * 1024 * 1024)).toBe('2.75 GB')
    })

    it('should handle negative values', () => {
      expect(formatFileSize(-1024)).toBe('-1 kB')
      expect(formatFileSize(-1024 * 1024)).toBe('-1 MB')
    })

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 byte')
    })

    it('should use correct decimal places for each unit', () => {
      // Bytes: no decimals
      expect(formatFileSize(500)).not.toMatch(/\./)

      // Kilobytes: no decimals (values that stay under 1 MB)
      expect(formatFileSize(500 * 1024)).not.toMatch(/\./)

      // Megabytes: 1 decimal
      expect(formatFileSize(1.23 * 1024 * 1024)).toBe('1.2 MB')

      // Gigabytes: 2 decimals
      expect(formatFileSize(1.234 * 1024 * 1024 * 1024)).toBe('1.23 GB')
    })
  })
})
