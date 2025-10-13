import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadioPresetRow from '@/components/mission/radios/RadioPresetRow.vue'
import type { Radio } from '@/types'

const createMockRadioConfig = (overrides = {}): Radio => ({
  description: 'UHF Radio',
  presetCount: 20,
  min: 225.0,
  max: 399.975,
  step: 0.025,
  ...overrides,
})

describe('RadioPresetRow', () => {
  describe('Rendering', () => {
    it('should display preset number', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 5,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.text()).toContain('5')
    })

    it('should render preset row structure', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      const presetRow = wrapper.find('.preset-row')
      expect(presetRow.exists()).toBe(true)
    })

    it('should have frequency and description placeholders', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.html()).toContain('Frequency')
      expect(wrapper.html()).toContain('Description')
    })
  })

  describe('Props handling', () => {
    it('should receive frequency as prop', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '251.0',
          description: 'Tower',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.props('frequency')).toBe('251.0')
    })

    it('should receive description as prop', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: 'Tower',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.props('description')).toBe('Tower')
    })

    it('should receive radioConfig as prop', () => {
      const config = createMockRadioConfig({ min: 225.0, max: 399.975 })

      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: config,
        },
      })

      expect(wrapper.props('radioConfig')).toEqual(config)
    })

    it('should handle empty frequency', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.props('frequency')).toBe('')
    })
  })

  describe('Frequency formatting', () => {
    it('should have frequency formatter', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.vm.frequencyFormatter).toBeDefined()
      expect(wrapper.vm.frequencyFormatter.format).toBeDefined()
    })

    it('should format frequency with at least 1 decimal place', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '251',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      const formatted = wrapper.vm.frequencyFormatter.format(251)
      expect(formatted).toContain('.')
      expect(formatted).toBe('251.0')
    })

    it('should format frequency with 3 decimal places when needed', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '251.025',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      const formatted = wrapper.vm.frequencyFormatter.format(251.025)
      expect(formatted).toBe('251.025')
    })
  })

  describe('Step validation', () => {
    it('should validate frequency matches step increment', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig({ min: 225.0, step: 0.025 }),
        },
      })

      // Valid step: 225.0 + (1 * 0.025) = 225.025
      expect(wrapper.vm.isValidStep(225.025, 225.0, 0.025)).toBe(true)

      // Invalid step: 225.012 is not a valid increment
      expect(wrapper.vm.isValidStep(225.012, 225.0, 0.025)).toBe(false)
    })

    it('should handle edge cases in step validation', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig({ min: 225.0, step: 0.025 }),
        },
      })

      // Minimum value should be valid
      expect(wrapper.vm.isValidStep(225.0, 225.0, 0.025)).toBe(true)

      // Large number of steps should still be valid
      expect(wrapper.vm.isValidStep(300.0, 225.0, 0.025)).toBe(true)
    })

    it('should validate with different step sizes', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig({ min: 30.0, step: 0.05 }),
        },
      })

      // Valid for 0.05 step
      expect(wrapper.vm.isValidStep(30.05, 30.0, 0.05)).toBe(true)
      expect(wrapper.vm.isValidStep(30.1, 30.0, 0.05)).toBe(true)

      // Invalid for 0.05 step
      expect(wrapper.vm.isValidStep(30.025, 30.0, 0.05)).toBe(false)
    })
  })

  describe('Radio configuration', () => {
    it('should use radio config step value', () => {
      const config = createMockRadioConfig({ step: 0.025 })

      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: config,
        },
      })

      expect(wrapper.props('radioConfig').step).toBe(0.025)
    })

    it('should use radio config min/max values', () => {
      const config = createMockRadioConfig({ min: 225.0, max: 399.975 })

      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: config,
        },
      })

      expect(wrapper.props('radioConfig').min).toBe(225.0)
      expect(wrapper.props('radioConfig').max).toBe(399.975)
    })

    it('should handle null min/max in radio config', () => {
      const config = createMockRadioConfig({ min: null, max: null })

      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: config,
        },
      })

      expect(wrapper.props('radioConfig').min).toBeNull()
      expect(wrapper.props('radioConfig').max).toBeNull()
    })
  })

  describe('Preset number display', () => {
    it('should display different preset numbers correctly', () => {
      for (let i = 1; i <= 5; i++) {
        const wrapper = mount(RadioPresetRow, {
          props: {
            presetNumber: i,
            frequency: '',
            description: '',
            radioConfig: createMockRadioConfig(),
          },
        })

        const presetNumber = wrapper.find('.preset-number')
        expect(presetNumber.exists()).toBe(true)
        expect(wrapper.text()).toContain(i.toString())
      }
    })
  })

  describe('Component structure', () => {
    it('should have preset row class', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 1,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      expect(wrapper.classes()).toContain('preset-row')
    })

    it('should have preset number element', () => {
      const wrapper = mount(RadioPresetRow, {
        props: {
          presetNumber: 7,
          frequency: '',
          description: '',
          radioConfig: createMockRadioConfig(),
        },
      })

      const presetNumber = wrapper.find('.preset-number')
      expect(presetNumber.exists()).toBe(true)
      expect(presetNumber.text()).toBe('7')
    })
  })
})
