import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadioPresetsEditor from '@/components/mission/radios/RadioPresetsEditor.vue'
import type { RadioPreset, Airframe } from '@/types'

const createMockPreset = (overrides = {}): RadioPreset => ({
  number: 1,
  frequency: '251.0',
  description: 'Tower',
  ...overrides,
})

describe('RadioPresetsEditor', () => {
  describe('F-16 configuration', () => {
    it('should have two radios configured for F-16', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      expect(wrapper.vm.radios.length).toBe(2)
    })

    it('should have radio labels for F-16', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      expect(wrapper.vm.radios[0].label).toBeDefined()
      expect(wrapper.vm.radios[1].label).toBeDefined()
    })
  })

  describe('A-10 configuration', () => {
    it('should have three radios configured for A-10', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'A-10C_2' as Airframe,
          radioPresets: [[], [], []],
        },
      })

      expect(wrapper.vm.radios.length).toBe(3)
    })

    it('should have radio labels for A-10', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'A-10C_2' as Airframe,
          radioPresets: [[], [], []],
        },
      })

      // A-10C_2 has UHF/VHF (COM 1), UHF AM (COM 2), and VHF FM (COM 3)
      expect(wrapper.vm.radios[0].label).toContain('UHF')
      expect(wrapper.vm.radios[1].label).toContain('UHF')
      expect(wrapper.vm.radios[2].label).toContain('VHF')
    })
  })

  describe('Preset management', () => {
    it('should render RadioPresetRow for each preset slot', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      const presetRows = wrapper.findAllComponents({ name: 'RadioPresetRow' })
      expect(presetRows.length).toBeGreaterThan(0)
    })

    it('should handle empty presets array', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [],
        },
      })

      expect(wrapper.vm.radios).toBeDefined()
    })

    it('should populate existing presets in correct slots', () => {
      const presets = [
        createMockPreset({ number: 1, frequency: '251.0', description: 'Tower' }),
        createMockPreset({ number: 5, frequency: '305.5', description: 'Approach' }),
      ]

      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [presets, []],
        },
      })

      expect(wrapper.vm.radios[0].slots[0].frequency).toBe('251.0')
      expect(wrapper.vm.radios[0].slots[4].frequency).toBe('305.5')
    })
  })

  describe('Preset updates', () => {
    it('should emit update:radioPresets when frequency is changed', async () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      const presetRow = wrapper.findComponent({ name: 'RadioPresetRow' })
      presetRow.vm.$emit('update:frequency', 251.0)

      expect(wrapper.emitted('update:radioPresets')).toBeTruthy()
    })

    it('should emit update:radioPresets when description is changed', async () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      const presetRow = wrapper.findComponent({ name: 'RadioPresetRow' })
      presetRow.vm.$emit('update:description', 'New Description')

      expect(wrapper.emitted('update:radioPresets')).toBeTruthy()
    })

    it('should remove empty presets from array when cleared', async () => {
      const presets = [createMockPreset({ number: 1, frequency: '', description: '' })]

      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [presets, []],
        },
      })

      // Update description to empty (frequency is already empty)
      wrapper.vm.updatePresetDescription(0, 1, '')

      const emittedPresets = wrapper.emitted('update:radioPresets')?.[0]?.[0] as RadioPreset[][]
      // When both frequency and description are empty, preset should be removed
      expect(emittedPresets[0]).toEqual([])
    })

    it('should keep preset with only description filled', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      wrapper.vm.updatePresetDescription(0, 1, 'Description Only')

      const emittedPresets = wrapper.emitted('update:radioPresets')?.[0]?.[0] as RadioPreset[][]
      expect(emittedPresets[0].length).toBe(1)
      expect(emittedPresets[0][0].description).toBe('Description Only')
    })
  })

  describe('Comm ladder', () => {
    it('should display comm ladder selector for each radio', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      // Each radio should be configured with comm ladder support
      expect(wrapper.vm.radios.length).toBeGreaterThan(0)
      // Verify HTML contains comm ladder selector text
      expect(wrapper.html()).toContain('Comm Ladder')
    })

    it('should emit update:commLadders when ladder is changed', async () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
          commLadders: [[], []],
        },
      })

      wrapper.vm.updateCommLadder(0, [1, 2, 3])

      expect(wrapper.emitted('update:commLadders')).toBeTruthy()
      const emittedLadders = wrapper.emitted('update:commLadders')?.[0]?.[0] as number[][]
      expect(emittedLadders[0]).toEqual([1, 2, 3])
    })

    it('should have preset options 1-20 for comm ladder', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      expect(wrapper.vm.commLadderOptions.length).toBe(20)
      expect(wrapper.vm.commLadderOptions[0].value).toBe(1)
      expect(wrapper.vm.commLadderOptions[19].value).toBe(20)
    })

    it('should handle null comm ladder value', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
          commLadders: [[], []],
        },
      })

      wrapper.vm.updateCommLadder(0, null)

      const emittedLadders = wrapper.emitted('update:commLadders')?.[0]?.[0] as number[][]
      expect(emittedLadders[0]).toEqual([])
    })
  })

  describe('Radio configuration by airframe', () => {
    it('should create correct number of preset slots per radio', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      wrapper.vm.radios.forEach((radio) => {
        expect(radio.slots.length).toBe(radio.presetCount)
      })
    })

    it('should maintain preset numbers in order', () => {
      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [[], []],
        },
      })

      wrapper.vm.radios.forEach((radio) => {
        radio.slots.forEach((slot, index) => {
          expect(slot.number).toBe(index + 1)
        })
      })
    })
  })

  describe('Preset sorting', () => {
    it('should sort presets by number after update', () => {
      const presets = [
        createMockPreset({ number: 5, frequency: '305.5' }),
        createMockPreset({ number: 1, frequency: '251.0' }),
      ]

      const wrapper = mount(RadioPresetsEditor, {
        props: {
          airframe: 'F-16C_50' as Airframe,
          radioPresets: [presets, []],
        },
      })

      wrapper.vm.updatePresetFrequency(0, 3, 275.0)

      const emittedPresets = wrapper.emitted('update:radioPresets')?.[0]?.[0] as RadioPreset[][]
      const radioPresets = emittedPresets[0]

      for (let i = 1; i < radioPresets.length; i++) {
        expect(radioPresets[i].number).toBeGreaterThan(radioPresets[i - 1].number)
      }
    })
  })
})
