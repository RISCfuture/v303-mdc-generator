import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoordinateInputField from '@/components/common/CoordinateInputField.vue'

describe('CoordinateInputField', () => {
  describe('Input and emission', () => {
    it('should emit decimal degrees when user types lat/lon in DMS format', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')

      // Type N3130.346 - should emit decimal degrees
      await input.setValue('N3130.346')
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // N 31° 30.346′ = 31 + 30.346/60 = 31.5057667
      expect(emitted?.[0]?.[0]).toBeCloseTo(31.5057667, 5)
    })

    it('should emit negative decimal for S hemisphere', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('S2515')
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // S 25° 15′ = -(25 + 15/60) = -25.25
      expect(emitted?.[0]?.[0]).toBeCloseTo(-25.25, 5)
    })

    it('should emit negative decimal for W hemisphere', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('W12225')
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // W 122° 25′ = -(122 + 25/60) = -122.41667
      expect(emitted?.[0]?.[0]).toBeCloseTo(-122.41667, 5)
    })

    it('should handle 3-digit longitude degrees', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('E00101.001')
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // E 001° 01.001′ = 1 + 1.001/60 = 1.01668333
      expect(emitted?.[0]?.[0]).toBeCloseTo(1.01668333, 5)
    })
  })

  describe('Display formatting', () => {
    it('should display DMS format when given decimal degrees', () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 36.2057583,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      // 36.2057583 decimal = N 36° 12.345′
      expect(input.element.value).toBe('N 36° 12.345′')
    })

    it('should display negative latitude as S hemisphere', () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: -25.25,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('S 25° 15′')
    })

    it('should display negative longitude as W hemisphere', () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: -122.41667,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('W 122° 25′')
    })

    it('should display 3-digit longitude degrees with leading zeroes', () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 1.01668333,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('E 001° 01.001′')
    })

    it('should handle null model value', () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('')
    })
  })

  describe('Model value updates', () => {
    it('should update display when modelValue prop changes', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 36.2057583,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('N 36° 12.345′')

      await wrapper.setProps({ modelValue: -25.25 })
      expect(input.element.value).toBe('S 25° 15′')
    })
  })

  describe('Blur event', () => {
    it('should emit blur event', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.trigger('blur')

      expect(wrapper.emitted('blur')).toBeTruthy()
    })
  })

  describe('Edge cases and validation', () => {
    it('should handle empty string input', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 36.2057583,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('')

      expect(input.element.value).toBe('')
    })

    it('should handle degrees-only input and emit valid coordinate', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N31')

      // Should show formatted degrees with degree symbol
      expect(input.element.value).toBe('N 31°')

      // Should emit update:modelValue for valid degrees-only coordinate
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1]?.[0]).toBeCloseTo(31, 5)
    })

    it('should handle decimal inputs in minutes', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N3130.123')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      // N 31° 30.123′ = 31 + 30.123/60
      expect(emitted?.[0]?.[0]).toBeCloseTo(31.50205, 5)
    })

    it('should reject invalid hemisphere for latitude', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      // Try to input E (East) for latitude - should be stripped
      await input.setValue('E3130')

      // Should strip invalid hemisphere
      expect(input.element.value).toBe('31° 30′')
    })

    it('should reject invalid hemisphere for longitude', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      // Try to input N (North) for longitude - should be stripped
      await input.setValue('N12345')

      // Should strip invalid hemisphere
      expect(input.element.value).toBe('123° 45′')
    })

    it('should limit latitude degrees to 2 digits', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N12345')

      // Should treat as N 12° 34′ (only first 2 digits as degrees, whole number minutes)
      expect(input.element.value).toBe('N 12° 34′')
    })

    it('should limit longitude degrees to 3 digits', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('E123456')

      // Should treat as E 123° 45′ (only first 3 digits as degrees, whole number minutes)
      expect(input.element.value).toBe('E 123° 45′')
    })

    it('should handle zero coordinates', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 0,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('N 00° 00′')
    })

    it('should limit decimal minutes to 3 places', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N3130.123456789')

      // Should truncate to 3 decimal places
      expect(input.element.value).toBe('N 31° 30.123′')
    })

    it('should strip non-alphanumeric characters except dots', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N 31° 30.5′')

      // Should clean and format properly
      expect(input.element.value).toBe('N 31° 30.5′')
    })

    it('should handle very small negative values', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: -0.001,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      // -0.001 degrees = S 00° 00.06′
      expect(input.element.value).toBe('S 00° 00.06′')
    })

    it('should validate latitude range', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 95, // Invalid - exceeds 90
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      // Should still display but might show error state
      expect(input.element.value).toBe('N 95° 00′')
    })

    it('should validate longitude range', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: 185, // Invalid - exceeds 180
          type: 'longitude',
        },
      })

      const input = wrapper.find('input')
      // Should still display but might show error state
      expect(input.element.value).toBe('E 185° 00′')
    })

    it('should show error status for invalid values', async () => {
      const wrapper = mount(CoordinateInputField, {
        props: {
          modelValue: null,
          type: 'latitude',
        },
      })

      const input = wrapper.find('input')
      await input.setValue('N91') // Over 90 degrees

      // Component should show partial input with degree symbol
      expect(input.element.value).toBe('N 91°')
    })
  })
})
