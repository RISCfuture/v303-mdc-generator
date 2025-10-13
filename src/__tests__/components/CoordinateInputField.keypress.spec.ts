import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import CoordinateInputField from '@/components/common/CoordinateInputField.vue'

/**
 * Comprehensive tests for lat/lon input field that verify proper behavior
 * from various preexisting input states + the addition of one keypress.
 *
 * These tests simulate realistic user typing scenarios to reveal bugs in
 * coordinate formatting and validation.
 */
describe('CoordinateInputField - Keypress Tests', () => {
  describe('Latitude - Building up coordinate character by character', () => {
    let wrapper: VueWrapper

    beforeEach(() => {
      wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })
    })

    describe('Starting from empty input', () => {
      it('should format single letter N correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N')
        expect(input.element.value).toBe('N')
      })

      it('should format single letter S correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('S')
        expect(input.element.value).toBe('S')
      })

      it('should reject invalid letter E for latitude', async () => {
        const input = wrapper.find('input')
        await input.setValue('E')
        // Should be removed or rejected
        expect(input.element.value).toBe('')
      })

      it('should format single digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('3')
        expect(input.element.value).toBe('3')
      })
    })

    describe('After typing hemisphere', () => {
      it('should format N + digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3')
        expect(input.element.value).toBe('N 3')
      })

      it('should format S + digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('S4')
        expect(input.element.value).toBe('S 4')
      })
    })

    describe('Building degrees (2 digits for latitude)', () => {
      it('should format N3 + second digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N36')
        expect(input.element.value).toBe('N 36°')
      })

      it('should format 3 + second digit correctly (no hemisphere)', async () => {
        const input = wrapper.find('input')
        await input.setValue('36')
        expect(input.element.value).toBe('36°')
      })
    })

    describe('Adding minutes after degrees', () => {
      it('should format N36 + first minute digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N361')
        expect(input.element.value).toBe('N 36° 1')
      })

      it('should format N36 + two minute digits correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612')
        expect(input.element.value).toBe('N 36° 12′')
      })

      it('should format 36 + first minute digit correctly (no hemisphere)', async () => {
        const input = wrapper.find('input')
        await input.setValue('361')
        expect(input.element.value).toBe('36° 1')
      })

      it('should format 36 + two minute digits correctly (no hemisphere)', async () => {
        const input = wrapper.find('input')
        await input.setValue('3612')
        expect(input.element.value).toBe('36° 12′')
      })
    })

    describe('Adding decimal minutes', () => {
      it('should format N3612 + decimal point correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.')
        expect(input.element.value).toBe('N 36° 12.′')
      })

      it('should format N3612. + first decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.3')
        expect(input.element.value).toBe('N 36° 12.3′')
      })

      it('should format N3612.3 + second decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.34')
        expect(input.element.value).toBe('N 36° 12.34′')
      })

      it('should format N3612.34 + third decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.345')
        expect(input.element.value).toBe('N 36° 12.345′')
      })

      it('should limit decimal places to 3', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.3456')
        expect(input.element.value).toBe('N 36° 12.345′')
      })
    })

    describe('Backspace scenarios', () => {
      it('should handle backspace from N3612.345 to N3612.34', async () => {
        const input = wrapper.find('input')
        // Start with full coordinate
        await input.setValue('N3612.345')
        expect(input.element.value).toBe('N 36° 12.345′')

        // Simulate backspace by removing last character from raw input
        await input.setValue('N3612.34')
        expect(input.element.value).toBe('N 36° 12.34′')
      })

      it('should handle backspace from N3612.3 to N3612.', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.3')
        expect(input.element.value).toBe('N 36° 12.3′')

        await input.setValue('N3612.')
        expect(input.element.value).toBe('N 36° 12.′')
      })

      it('should handle backspace from N3612. to N3612', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.')
        expect(input.element.value).toBe('N 36° 12.′')

        await input.setValue('N3612')
        expect(input.element.value).toBe('N 36° 12′')
      })

      it('should handle backspace from N3612 to N361', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612')
        expect(input.element.value).toBe('N 36° 12′')

        await input.setValue('N361')
        expect(input.element.value).toBe('N 36° 1')
      })

      it('should handle backspace from N361 to N36', async () => {
        const input = wrapper.find('input')
        await input.setValue('N361')
        expect(input.element.value).toBe('N 36° 1')

        await input.setValue('N36')
        expect(input.element.value).toBe('N 36°')
      })

      it('should handle backspace from N36 to N3', async () => {
        const input = wrapper.find('input')
        await input.setValue('N36')
        expect(input.element.value).toBe('N 36°')

        await input.setValue('N3')
        expect(input.element.value).toBe('N 3')
      })

      it('should handle backspace from N3 to N', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3')
        expect(input.element.value).toBe('N 3')

        await input.setValue('N')
        expect(input.element.value).toBe('N')
      })

      it('should handle backspace from N to empty', async () => {
        const input = wrapper.find('input')
        await input.setValue('N')
        expect(input.element.value).toBe('N')

        await input.setValue('')
        expect(input.element.value).toBe('')
      })
    })

    describe('Edge cases - Invalid input', () => {
      it('should reject letters in numeric positions', async () => {
        const input = wrapper.find('input')
        await input.setValue('N36A')
        // Should ignore 'A' and show N 36°
        expect(input.element.value).toBe('N 36°')
      })

      it('should reject special characters', async () => {
        const input = wrapper.find('input')
        await input.setValue('N36@12')
        // Should ignore '@' and show N 36° 12′
        expect(input.element.value).toBe('N 36° 12′')
      })

      it('should handle multiple dots gracefully', async () => {
        const input = wrapper.find('input')
        await input.setValue('N3612.3.4')
        // Should handle multiple dots - all decimals after first dot are concatenated
        expect(input.element.value).toBe('N 36° 12.34′')
      })

      it('should ignore wrong hemisphere letters mixed with numbers', async () => {
        const input = wrapper.find('input')
        await input.setValue('N36E12')
        // Should ignore 'E' (wrong hemisphere for latitude) and show N 36° 12′
        expect(input.element.value).toBe('N 36° 12′')
      })

      it('should handle hemisphere in middle of input', async () => {
        const input = wrapper.find('input')
        await input.setValue('36N12')
        // N should be ignored if not at start, show 36° 12′
        expect(input.element.value).toBe('36° 12′')
      })

      it('should handle multiple hemisphere letters', async () => {
        const input = wrapper.find('input')
        await input.setValue('NNNN3612')
        // Only first N should be kept
        expect(input.element.value).toBe('N 36° 12′')
      })

      it('should handle spaces correctly (they should be ignored)', async () => {
        const input = wrapper.find('input')
        await input.setValue('N 36 12')
        // Spaces should be ignored, result should be same as N3612
        expect(input.element.value).toBe('N 36° 12′')
      })
    })
  })

  describe('Longitude - Building up coordinate character by character', () => {
    let wrapper: VueWrapper

    beforeEach(() => {
      wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })
    })

    describe('Starting from empty input', () => {
      it('should format single letter E correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('E')
        expect(input.element.value).toBe('E')
      })

      it('should format single letter W correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W')
        expect(input.element.value).toBe('W')
      })

      it('should reject invalid letter N for longitude', async () => {
        const input = wrapper.find('input')
        await input.setValue('N')
        expect(input.element.value).toBe('')
      })

      it('should format single digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('1')
        expect(input.element.value).toBe('1')
      })
    })

    describe('Building degrees (3 digits for longitude)', () => {
      it('should format E + first digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('E1')
        expect(input.element.value).toBe('E 1')
      })

      it('should format E1 + second digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('E12')
        expect(input.element.value).toBe('E 12')
      })

      it('should format E12 + third digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('E122')
        expect(input.element.value).toBe('E 122°')
      })

      it('should format 1 + second digit correctly (no hemisphere)', async () => {
        const input = wrapper.find('input')
        await input.setValue('12')
        expect(input.element.value).toBe('12')
      })

      it('should format 12 + third digit correctly (no hemisphere)', async () => {
        const input = wrapper.find('input')
        await input.setValue('122')
        expect(input.element.value).toBe('122°')
      })
    })

    describe('Adding minutes after degrees', () => {
      it('should format W122 + first minute digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W1222')
        expect(input.element.value).toBe('W 122° 2')
      })

      it('should format W1222 + second minute digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W12225')
        expect(input.element.value).toBe('W 122° 25′')
      })
    })

    describe('Adding decimal minutes', () => {
      it('should format W12225 + decimal point correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W12225.')
        expect(input.element.value).toBe('W 122° 25.′')
      })

      it('should format W12225. + first decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W12225.5')
        expect(input.element.value).toBe('W 122° 25.5′')
      })

      it('should format W12225.5 + second decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W12225.56')
        expect(input.element.value).toBe('W 122° 25.56′')
      })

      it('should format W12225.56 + third decimal digit correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W12225.567')
        expect(input.element.value).toBe('W 122° 25.567′')
      })
    })

    describe('Backspace scenarios', () => {
      it('should handle backspace from E12225.567 to E12225.56', async () => {
        const input = wrapper.find('input')
        await input.setValue('E12225.567')
        expect(input.element.value).toBe('E 122° 25.567′')

        await input.setValue('E12225.56')
        expect(input.element.value).toBe('E 122° 25.56′')
      })

      it('should handle backspace from E122 to E12', async () => {
        const input = wrapper.find('input')
        await input.setValue('E122')
        expect(input.element.value).toBe('E 122°')

        await input.setValue('E12')
        expect(input.element.value).toBe('E 12')
      })

      it('should handle backspace from E12 to E1', async () => {
        const input = wrapper.find('input')
        await input.setValue('E12')
        expect(input.element.value).toBe('E 12')

        await input.setValue('E1')
        expect(input.element.value).toBe('E 1')
      })

      it('should handle backspace from E1 to E', async () => {
        const input = wrapper.find('input')
        await input.setValue('E1')
        expect(input.element.value).toBe('E 1')

        await input.setValue('E')
        expect(input.element.value).toBe('E')
      })
    })

    describe('Edge cases - Invalid input', () => {
      it('should ignore wrong hemisphere letters mixed with numbers', async () => {
        const input = wrapper.find('input')
        await input.setValue('E122N25')
        // Should ignore 'N' (wrong hemisphere for longitude) and show E 122° 25′
        expect(input.element.value).toBe('E 122° 25′')
      })

      it('should handle hemisphere in middle of input', async () => {
        const input = wrapper.find('input')
        await input.setValue('122W25')
        // W should be ignored if not at start, show 122° 25′
        expect(input.element.value).toBe('122° 25′')
      })

      it('should handle multiple hemisphere letters', async () => {
        const input = wrapper.find('input')
        await input.setValue('WWWW12225')
        // Only first W should be kept
        expect(input.element.value).toBe('W 122° 25′')
      })

      it('should handle spaces correctly', async () => {
        const input = wrapper.find('input')
        await input.setValue('W 122 25')
        // Spaces should be ignored
        expect(input.element.value).toBe('W 122° 25′')
      })

      it('should reject letters A-Z except valid hemispheres', async () => {
        const input = wrapper.find('input')
        await input.setValue('W122ABC25XYZ')
        // Should ignore all letters except W at start
        expect(input.element.value).toBe('W 122° 25′')
      })
    })
  })

  describe('Model value emission during typing', () => {
    it('should NOT emit modelValue for incomplete latitude input', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N3')

      // Should not emit because coordinate is incomplete
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeFalsy()
    })

    it('should emit modelValue when latitude input is complete and valid', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N3612')

      // Should emit because we have N 36° 12′ which is complete
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toBeCloseTo(36.2, 5)
    })

    it('should emit updated modelValue as decimal digits are added', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')

      // Complete coordinate
      await input.setValue('N3612')
      let emitted = wrapper.emitted('update:modelValue')
      expect(emitted?.[0]?.[0]).toBeCloseTo(36.2, 5)

      // Add decimal point - should emit new value
      await input.setValue('N3612.3')
      emitted = wrapper.emitted('update:modelValue')
      // N 36° 12.3′ = 36 + 12.3/60 = 36.205
      const lastEmission = emitted?.[emitted.length - 1]?.[0]
      expect(lastEmission).toBeCloseTo(36.205, 5)
    })

    it('should NOT emit modelValue for incomplete longitude input', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('W12')

      // Should not emit because coordinate is incomplete (needs 3 digits for degrees)
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeFalsy()
    })

    it('should emit modelValue when longitude input is complete and valid', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('W12225')

      // Should emit because we have W 122° 25′ which is complete
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toBeCloseTo(-122.41667, 5)
    })
  })

  describe('Reported bugs', () => {
    it('should allow typing S-1-3 without blocking further input', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')

      // User types S
      await input.setValue('S')
      expect(input.element.value).toBe('S')

      // User types 1
      await input.setValue('S1')
      expect(input.element.value).toBe('S 1')

      // User types 3 - this should append to make S13, not S 01 03
      await input.setValue('S13')
      expect(input.element.value).toBe('S 13°')
    })

    it('should handle typing 3-6-1-2 to build 36° 12′', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')

      await input.setValue('3')
      expect(input.element.value).toBe('3')

      await input.setValue('36')
      expect(input.element.value).toBe('36°')

      await input.setValue('361')
      expect(input.element.value).toBe('36° 1')

      await input.setValue('3612')
      expect(input.element.value).toBe('36° 12′')
    })
  })

  describe('Real-world typing scenarios', () => {
    it('should handle typing "N 36° 12.345′" character by character', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      const steps = [
        { input: 'N', expected: 'N' },
        { input: 'N3', expected: 'N 3' },
        { input: 'N36', expected: 'N 36°' },
        { input: 'N361', expected: 'N 36° 1' },
        { input: 'N3612', expected: 'N 36° 12′' },
        { input: 'N3612.', expected: 'N 36° 12.′' },
        { input: 'N3612.3', expected: 'N 36° 12.3′' },
        { input: 'N3612.34', expected: 'N 36° 12.34′' },
        { input: 'N3612.345', expected: 'N 36° 12.345′' },
      ]

      for (const step of steps) {
        await input.setValue(step.input)
        expect(input.element.value).toBe(step.expected)
      }
    })

    it('should handle typing "W 122° 25.567′" character by character', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      const steps = [
        { input: 'W', expected: 'W' },
        { input: 'W1', expected: 'W 1' },
        { input: 'W12', expected: 'W 12' },
        { input: 'W122', expected: 'W 122°' },
        { input: 'W1222', expected: 'W 122° 2' },
        { input: 'W12225', expected: 'W 122° 25′' },
        { input: 'W12225.', expected: 'W 122° 25.′' },
        { input: 'W12225.5', expected: 'W 122° 25.5′' },
        { input: 'W12225.56', expected: 'W 122° 25.56′' },
        { input: 'W12225.567', expected: 'W 122° 25.567′' },
      ]

      for (const step of steps) {
        await input.setValue(step.input)
        expect(input.element.value).toBe(step.expected)
      }
    })
  })

  describe('Additional edge cases', () => {
    it('should handle empty input gracefully', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('')
      expect(input.element.value).toBe('')
    })

    it('should handle only dots', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('...')
      expect(input.element.value).toBe('')
    })

    it('should handle only invalid characters', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('!@#$%^&*()')
      expect(input.element.value).toBe('')
    })

    it('should handle very long input by limiting to max allowed digits', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N9999999999')
      // Should only use 99 (degrees) + 99 (minutes) = N 99° 99′
      expect(input.element.value).toBe('N 99° 99′')
    })

    it('should handle decimal point at start', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('.123')
      // Should be treated as no degrees, won't format properly
      expect(input.element.value).toBe('')
    })

    it('should handle hemisphere change (S to N by retyping)', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('S3612')
      expect(input.element.value).toBe('S 36° 12′')

      // User clears and retypes with different hemisphere
      await input.setValue('N3612')
      expect(input.element.value).toBe('N 36° 12′')
    })

    it('should handle longitude at boundary values', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('E18000')
      expect(input.element.value).toBe('E 180° 00′')
    })

    it('should handle latitude at boundary values', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N9000')
      expect(input.element.value).toBe('N 90° 00′')
    })
  })
})
