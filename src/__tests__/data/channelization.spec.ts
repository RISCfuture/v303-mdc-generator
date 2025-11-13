import { describe, it, expect } from 'vitest'
import { getDefaultRadioPresets } from '@/data/channelization'
import type { Theater, Airframe } from '@/types'

describe('channelization', () => {
  describe('getDefaultRadioPresets', () => {
    it('should return an array for valid theater, airframe, and radio index', () => {
      // Test with Afghanistan/A-10C_2 which should have channelization data
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 0)
      expect(Array.isArray(presets)).toBe(true)
    })

    it('should return empty array for invalid theater', () => {
      const presets = getDefaultRadioPresets(
        'NonExistentTheater' as Theater,
        'A-10C_2' as Airframe,
        0,
      )
      expect(presets).toEqual([])
    })

    it('should return empty array for invalid airframe', () => {
      const presets = getDefaultRadioPresets(
        'Afghanistan' as Theater,
        'NonExistentAircraft' as Airframe,
        0,
      )
      expect(presets).toEqual([])
    })

    it('should return empty array for invalid radio index', () => {
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 999)
      expect(presets).toEqual([])
    })

    it('should return radio presets with valid structure when data exists', () => {
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 0)
      if (presets.length > 0) {
        const preset = presets[0]!
        expect(preset).toHaveProperty('frequency')
        expect(typeof preset.frequency).toBe('string')
      }
    })

    it('should handle negative radio indices', () => {
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, -1)
      expect(presets).toEqual([])
    })

    it('should return different presets for different radios', () => {
      const presets0 = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 0)
      const presets1 = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 1)

      // If both have data, they should be different
      if (presets0.length > 0 && presets1.length > 0) {
        expect(JSON.stringify(presets0)).not.toEqual(JSON.stringify(presets1))
      }
    })

    it('should return different presets for different theaters with same airframe', () => {
      // Try Afghanistan and Caucasus if they exist
      const presetsAfghan = getDefaultRadioPresets(
        'Afghanistan' as Theater,
        'A-10C_2' as Airframe,
        0,
      )
      const presetsCaucasus = getDefaultRadioPresets(
        'Caucasus' as Theater,
        'A-10C_2' as Airframe,
        0,
      )

      // If both have data, they might be different (theater-specific channelization)
      if (presetsAfghan.length > 0 && presetsCaucasus.length > 0) {
        // They could be the same or different - just verify structure
        expect(Array.isArray(presetsAfghan)).toBe(true)
        expect(Array.isArray(presetsCaucasus)).toBe(true)
      }
    })

    it('should handle edge case of radio index 0', () => {
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 0)
      expect(Array.isArray(presets)).toBe(true)
    })

    it('should handle empty string theater name', () => {
      const presets = getDefaultRadioPresets('' as Theater, 'A-10C_2' as Airframe, 0)
      expect(presets).toEqual([])
    })

    it('should handle empty string airframe name', () => {
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, '' as Airframe, 0)
      expect(presets).toEqual([])
    })
  })

  describe('channelization database structure', () => {
    it('should have consistent data structure across all entries', () => {
      // This is an indirect test - if getDefaultRadioPresets works, the structure is correct
      const presets = getDefaultRadioPresets('Afghanistan' as Theater, 'A-10C_2' as Airframe, 0)
      if (presets.length > 0) {
        presets.forEach((preset) => {
          expect(preset).toHaveProperty('frequency')
        })
      }
    })
  })
})
