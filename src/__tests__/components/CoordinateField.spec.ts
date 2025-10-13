import { describe, it, expect } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CoordinateField from '@/components/common/CoordinateField.vue'
import type { CoordinateFormat } from '@/types'

// Helper to get the component's internal state
function getComponentState(wrapper: VueWrapper<InstanceType<typeof CoordinateField>>) {
  return {
    displayValue: wrapper.vm.displayValue,
    isValid: wrapper.vm.isValid,
  }
}

// Helper to simulate input event
async function simulateInput(
  wrapper: VueWrapper<InstanceType<typeof CoordinateField>>,
  value: string,
  triggerBlur = true,
) {
  const input = wrapper.find('.coordinate-input input')
  if (!input.exists()) {
    throw new Error('Input element not found')
  }
  await input.setValue(value)
  await input.trigger('input')

  // Trigger blur to apply formatting
  if (triggerBlur) {
    await input.trigger('blur')
  }

  await nextTick()
}

describe('CoordinateField', () => {
  describe('DD (Decimal Degrees) input formatting', () => {
    it('should allow valid DD characters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.2057583, -115.1234567')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('36.2057583, -115.1234567')
    })

    it('should filter invalid characters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.20ABC, -115.12XYZ')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('36.20, -115.12')
    })

    it('should allow partial input', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.2')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('36.2')
    })

    it('should limit to one comma', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.20, -115.12, 45')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('36.20, -115.1245')
    })
  })

  describe('DDM (Degrees Decimal Minutes) input formatting', () => {
    it('should capitalize hemisphere letters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n36')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36°')
    })

    it('should add degree symbol after 2 degree digits', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 1')
    })

    it('should format partial DDM input "n123"', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n123')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 12° 3')
    })

    it('should add minute symbol after full minutes', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n3612')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′')
    })

    it('should handle decimal minutes', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n3612.345')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12.345′')
    })

    it('should limit decimal minutes to 3 places', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n3612.34567890')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12.345′')
    })

    it('should handle compact format without spaces (n36e121)', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n36e121')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36°, E 121°')
      expect(state.isValid).toBe(true)

      // Check emitted events
      const latitudeEvents = wrapper.emitted('update:latitude')
      const longitudeEvents = wrapper.emitted('update:longitude')
      expect(latitudeEvents).toBeTruthy()
      expect(longitudeEvents).toBeTruthy()
      expect(latitudeEvents?.[latitudeEvents.length - 1]?.[0]).toBeCloseTo(36, 5)
      expect(longitudeEvents?.[longitudeEvents.length - 1]?.[0]).toBeCloseTo(121, 5)
    })

    it('should handle comma-separated lat/lon', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n3612.345,w11507.407')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12.345′, W 115° 07.407′')
    })

    it('should handle longitude with 3 degree digits', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'w1150724')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('W 115° 07.24′')
    })

    it('should filter invalid characters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n36@12#.345')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12.345′')
    })

    it('should auto-insert comma when typing second hemisphere', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      // Type first coordinate, space, then second hemisphere
      await simulateInput(wrapper, 'n3622.354w')

      const state = getComponentState(wrapper)
      // Should auto-insert comma between N and W coordinates
      expect(state.displayValue).toContain('N 36° 22.354′')
      expect(state.displayValue).toContain('W')
    })

    it('should require hemisphere letter at the start', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      // Try typing digits before hemisphere
      await simulateInput(wrapper, '3622n')

      const state = getComponentState(wrapper)
      // Leading digits should be removed, only "N" remains
      expect(state.displayValue).toBe('N')
    })
  })

  describe('DMS (Degrees Minutes Seconds) input formatting', () => {
    it('should capitalize hemisphere letters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 's36')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('S 36°')
    })

    it('should add degree symbol after full degrees', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 1')
    })

    it('should add minute symbol after full minutes', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n3612')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′')
    })

    it('should add seconds symbol after full seconds', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361221')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′ 21″')
    })

    it('should handle decimal seconds', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361221.73')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′ 21.73″')
    })

    it('should limit decimal seconds to 2 places', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361221.7345')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′ 21.73″')
    })

    it('should handle comma-separated lat/lon', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n361221,w1150724')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′ 21″, W 115° 07′ 24″')
    })

    it('should filter invalid characters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n36@12#21$')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('N 36° 12′ 21″')
    })

    it('should require hemisphere letter at the start', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DMS' as CoordinateFormat,
        },
      })

      // Try typing digits before hemisphere
      await simulateInput(wrapper, '361221n')

      const state = getComponentState(wrapper)
      // Leading digits should be removed, only "N" remains
      expect(state.displayValue).toBe('N')
    })
  })

  describe('MGRS input formatting', () => {
    it('should capitalize all letters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11spa')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA')
    })

    it('should auto-space grid zone designation', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11s')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S')
    })

    it('should auto-space 100km square identifier', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11spa')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA')
    })

    it('should auto-space easting and northing', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11spa4400084000')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 44000 84000')
    })

    it('should handle partial easting/northing', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11spa44')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 44')
    })

    it('should filter invalid characters', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '11s@pa#44000$84000')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 44000 84000')
    })

    it('should handle various precisions', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'MGRS' as CoordinateFormat,
        },
      })

      // 1-meter precision (5 digits)
      await simulateInput(wrapper, '11spa4400084000')
      let state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 44000 84000')

      // 10-meter precision (4 digits) - clear and re-enter
      await simulateInput(wrapper, '')
      await simulateInput(wrapper, '11spa44008400')
      state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 4400 8400')

      // 100-meter precision (3 digits)
      await simulateInput(wrapper, '')
      await simulateInput(wrapper, '11spa440840')
      state = getComponentState(wrapper)
      expect(state.displayValue).toBe('11S PA 440 840')
    })
  })

  describe('Format switching', () => {
    it('should convert coordinates when format changes', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: 36.2057583,
          longitude: -115.1234567,
          format: 'DD' as CoordinateFormat,
        },
      })

      // Should start with DD format
      const initialState = getComponentState(wrapper)
      expect(initialState.displayValue).toBe('36.2057583, -115.1234567')

      // Switch to DDM
      await wrapper.setProps({ format: 'DDM' as CoordinateFormat })
      await nextTick()

      const newState = getComponentState(wrapper)
      expect(newState.displayValue).toContain('N 36°')
      expect(newState.displayValue).toContain('W 115°')
      expect(newState.displayValue).toContain('′')
    })
  })

  describe('Validation', () => {
    it('should validate complete DD coordinates', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.2057583, -115.1234567')

      const state = getComponentState(wrapper)
      expect(state.isValid).toBe(true)
      expect(wrapper.emitted('update:latitude')?.[0]).toEqual([36.2057583])
      expect(wrapper.emitted('update:longitude')?.[0]).toEqual([-115.1234567])
    })

    it('should mark partial input as invalid but not emit', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '36.205')

      const state = getComponentState(wrapper)
      expect(state.isValid).toBe(false)
      expect(wrapper.emitted('update:latitude')).toBeUndefined()
      expect(wrapper.emitted('update:longitude')).toBeUndefined()
    })

    it('should validate latitude range', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      // Valid latitude
      await simulateInput(wrapper, '90, 0')
      let state = getComponentState(wrapper)
      expect(state.isValid).toBe(true)

      // Invalid latitude (too high)
      await simulateInput(wrapper, '91, 0')
      state = getComponentState(wrapper)
      expect(state.isValid).toBe(false)
    })

    it('should validate longitude range', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      // Valid longitude
      await simulateInput(wrapper, '0, 180')
      let state = getComponentState(wrapper)
      expect(state.isValid).toBe(true)

      // Invalid longitude (too high)
      await simulateInput(wrapper, '0, 181')
      state = getComponentState(wrapper)
      expect(state.isValid).toBe(false)
    })

    it('should clear coordinates when input is empty', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: 36.2057583,
          longitude: -115.1234567,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, '')

      const state = getComponentState(wrapper)
      expect(state.displayValue).toBe('')
      expect(state.isValid).toBe(true)
      expect(wrapper.emitted('update:latitude')?.[0]).toEqual([null])
      expect(wrapper.emitted('update:longitude')?.[0]).toEqual([null])
    })
  })

  describe('Error messages', () => {
    it('should filter invalid DD input to empty string', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'invalid')

      const state = getComponentState(wrapper)
      // All letters should be filtered out, leaving empty string
      expect(state.displayValue).toBe('')
      // Empty input should not show error
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('should not show error for empty input', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DD' as CoordinateFormat,
        },
      })

      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('should show error for partial but incomplete input', async () => {
      const wrapper = mount(CoordinateField, {
        props: {
          latitude: null,
          longitude: null,
          format: 'DDM' as CoordinateFormat,
        },
      })

      await simulateInput(wrapper, 'n36')

      // Should show error since it's incomplete
      expect(wrapper.find('.error-message').exists()).toBe(true)
    })
  })
})
