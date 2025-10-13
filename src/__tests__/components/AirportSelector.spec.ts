import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AirportSelector from '@/components/mission/told-fuel/AirportSelector.vue'
import * as airfieldsModule from '@/data/airfields'
import { selectNSelectValue, createMockAirfields, expectEmittedWith } from '@/__tests__/helpers'

vi.mock('@/data/airfields', () => ({
  getAirfieldsForTheater: vi.fn(),
}))

describe('AirportSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(createMockAirfields())
  })

  describe('Component rendering', () => {
    it('should render with required props', () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load airfields for the theater', () => {
      mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledWith('Caucasus')
    })

    it('should display Airport heading', () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.text()).toContain('Airport')
    })
  })

  describe('Airport selection', () => {
    it('should emit update:airportId when airport is selected', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      await selectNSelectValue(wrapper, 'handleAirportChange', 'Kutaisi')

      expectEmittedWith(wrapper, 'update:airportId', ['Kutaisi'])
    })

    it('should emit update:fieldElevation when airport is selected', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      await selectNSelectValue(wrapper, 'handleAirportChange', 'Kutaisi')

      expect(wrapper.emitted('update:fieldElevation')).toBeTruthy()
      // Field elevation emission should occur (value depends on composable mock)
      const emissions = wrapper.emitted('update:fieldElevation')
      expect(emissions).toBeTruthy()
      expect(emissions?.length).toBeGreaterThan(0)
    })

    it('should clear runway when airport changes', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      await selectNSelectValue(wrapper, 'handleAirportChange', 'Batumi')

      expectEmittedWith(wrapper, 'update:runwayName', [null])
    })

    it('should clear runway heading when airport changes', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      await selectNSelectValue(wrapper, 'handleAirportChange', 'Batumi')

      expectEmittedWith(wrapper, 'update:runwayHeading', [undefined])
    })
  })

  describe('Runway selection', () => {
    it('should emit update:runwayName when runway is selected', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      await selectNSelectValue(wrapper, 'handleRunwayChange', '08')

      expectEmittedWith(wrapper, 'update:runwayName', ['08'])
    })

    it('should emit update:runwayHeading when runway is selected', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      await selectNSelectValue(wrapper, 'handleRunwayChange', '08')

      expectEmittedWith(wrapper, 'update:runwayHeading', [80])
    })
  })

  describe('Field elevation display', () => {
    it('should receive field elevation prop', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          fieldElevation: 148,
        },
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.props('fieldElevation')).toBe(148)
    })

    it('should handle null field elevation', () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.props('fieldElevation')).toBeUndefined()
    })
  })

  describe('Runway heading display', () => {
    it('should receive runway information', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.props('runwayName')).toBe('08')
    })
  })

  describe('Initialization', () => {
    it('should initialize from props on mount', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Batumi',
          runwayName: '13',
          fieldElevation: 33,
        },
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.airport.selectedAirfieldName.value).toBe('Batumi')
      expect(wrapper.vm.airport.selectedRunwayName.value).toBe('13')
      expect(wrapper.vm.airport.fieldElevation.value).toBe(33)
    })

    it('should reinitialize when props change', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      await wrapper.setProps({
        airportId: 'Batumi',
        runwayName: '13',
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.airport.selectedAirfieldName.value).toBe('Batumi')
      expect(wrapper.vm.airport.selectedRunwayName.value).toBe('13')
    })
  })

  describe('Labels', () => {
    it('should show Airport label', () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.text()).toContain('Airport')
    })

    it('should show Runway label', () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.text()).toContain('Runway')
    })

    it('should show Field Elevation label when displayed', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          fieldElevation: 148,
        },
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Field Elevation')
    })

    it('should show Runway Heading label when displayed', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Runway Heading')
    })
  })

  describe('Edge cases', () => {
    it('should handle null airport selection', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      await selectNSelectValue(wrapper, 'handleAirportChange', null)

      expect(wrapper.emitted('update:airportId')?.[0]).toEqual([null])
    })

    it('should handle null runway selection', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      await selectNSelectValue(wrapper, 'handleRunwayChange', null)

      expect(wrapper.emitted('update:runwayName')?.[0]).toEqual([null])
      expect(wrapper.emitted('update:runwayHeading')?.[0]).toEqual([undefined])
    })

    it('should handle theater with no airfields', () => {
      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue([])

      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'UnknownTheater',
        },
      })

      expect(wrapper.vm.airport.airfieldOptions.value).toHaveLength(0)
    })

    it('should handle large elevation values', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          fieldElevation: 1482,
        },
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.props('fieldElevation')).toBe(1482)
    })

    it('should display runway heading when runway is selected', async () => {
      const wrapper = mount(AirportSelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      await wrapper.vm.$nextTick()

      // Runway heading should be available in the composable state
      expect(wrapper.vm.airport.selectedRunway.value?.heading).toBe(80)
    })
  })
})
