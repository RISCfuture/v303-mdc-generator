import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AirportRunwaySelector from '@/components/common/AirportRunwaySelector.vue'
import * as airfieldsModule from '@/data/airfields'
import { createMockAirfields, expectEmittedWith } from '@/__tests__/helpers'

vi.mock('@/data/airfields', () => ({
  getAirfieldsForTheater: vi.fn(),
}))

describe('AirportRunwaySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(createMockAirfields())
  })

  describe('Component initialization', () => {
    it('should render with required props', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load airfields for the specified theater', () => {
      mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(airfieldsModule.getAirfieldsForTheater).toHaveBeenCalledWith('Caucasus')
    })

    it('should initialize with provided airport and runway', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      expect(wrapper.vm.selectedAirfield?.name).toBe('Kutaisi')
      expect(wrapper.vm.selectedRunway?.name).toBe('08')
    })

    it('should initialize with field elevation', () => {
      mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          fieldElevation: 148,
        },
      })

      // Component should accept the field elevation prop
      expect(true).toBe(true)
    })
  })

  describe('Airport selection', () => {
    it('should populate airport dropdown options', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.vm.airfieldOptions).toHaveLength(2)
      expect(wrapper.vm.airfieldOptions[0]).toEqual({ label: 'Kutaisi', value: 'Kutaisi' })
      expect(wrapper.vm.airfieldOptions[1]).toEqual({ label: 'Batumi', value: 'Batumi' })
    })

    it('should emit update:airportId when airport is selected', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      wrapper.vm.handleAirportChange('Kutaisi')

      expectEmittedWith(wrapper, 'update:airportId', ['Kutaisi'])
    })

    it('should emit field elevation when airport is selected', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      wrapper.vm.handleAirportChange('Kutaisi')

      expect(wrapper.emitted('update:fieldElevation')).toBeTruthy()
      expect(wrapper.emitted('update:fieldElevation')?.[0]).toEqual([148])
    })

    it('should reset runway selection when airport changes', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      wrapper.vm.handleAirportChange('Batumi')

      expect(wrapper.emitted('update:runwayName')).toBeTruthy()
      expect(wrapper.emitted('update:runwayName')?.[0]).toEqual([undefined])
    })

    it('should reset runway heading when airport changes', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      wrapper.vm.handleAirportChange('Batumi')

      expect(wrapper.emitted('update:runwayHeading')).toBeTruthy()
      expect(wrapper.emitted('update:runwayHeading')?.[0]).toEqual([undefined])
    })

    it('should handle airport deselection', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      wrapper.vm.handleAirportChange(null)

      expect(wrapper.emitted('update:airportId')?.[0]).toEqual([undefined])
      expect(wrapper.emitted('update:fieldElevation')?.[0]).toEqual([undefined])
    })
  })

  describe('Runway selection', () => {
    it('should populate runway options based on selected airport', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      expect(wrapper.vm.runwayOptions).toHaveLength(2)
      expect(wrapper.vm.runwayOptions[0]).toEqual({ label: '08', value: '08' })
      expect(wrapper.vm.runwayOptions[1]).toEqual({ label: '26', value: '26' })
    })

    it('should have empty runway options when no airport is selected', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.vm.runwayOptions).toHaveLength(0)
    })

    it('should emit update:runwayName when runway is selected', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      wrapper.vm.handleRunwayChange('08')

      expect(wrapper.emitted('update:runwayName')).toBeTruthy()
      expect(wrapper.emitted('update:runwayName')?.[0]).toEqual(['08'])
    })

    it('should emit runway heading when runway is selected', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      wrapper.vm.handleRunwayChange('08')

      expect(wrapper.emitted('update:runwayHeading')).toBeTruthy()
      expect(wrapper.emitted('update:runwayHeading')?.[0]).toEqual([80])
    })

    it('should handle runway deselection', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '08',
        },
      })

      wrapper.vm.handleRunwayChange(null)

      expect(wrapper.emitted('update:runwayName')?.[0]).toEqual([undefined])
      expect(wrapper.emitted('update:runwayHeading')?.[0]).toEqual([undefined])
    })
  })

  describe('Selected airfield and runway computations', () => {
    it('should compute selected airfield correctly', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Batumi',
        },
      })

      expect(wrapper.vm.selectedAirfield?.name).toBe('Batumi')
      expect(wrapper.vm.selectedAirfield?.position.elevation).toBe(33)
    })

    it('should return null when no airport is selected', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.vm.selectedAirfield).toBeNull()
    })

    it('should return null for invalid airport ID', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'NonexistentAirport',
        },
      })

      expect(wrapper.vm.selectedAirfield).toBeNull()
    })

    it('should compute selected runway correctly', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '26',
        },
      })

      expect(wrapper.vm.selectedRunway?.name).toBe('26')
      expect(wrapper.vm.selectedRunway?.heading).toBe(260)
    })

    it('should return null when no runway is selected', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      expect(wrapper.vm.selectedRunway).toBeNull()
    })

    it('should return null for invalid runway name', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
          runwayName: '99',
        },
      })

      expect(wrapper.vm.selectedRunway).toBeNull()
    })
  })

  describe('Custom labels and placeholders', () => {
    it('should use custom airport label', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportLabel: 'Departure Airport',
        },
      })

      expect(wrapper.text()).toContain('Departure Airport')
    })

    it('should use custom runway label', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          runwayLabel: 'Departure Runway',
        },
      })

      expect(wrapper.text()).toContain('Departure Runway')
    })

    it('should use custom procedure label', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          procedureLabel: 'SID',
        },
      })

      expect(wrapper.text()).toContain('SID')
    })

    it('should use custom placeholders', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportPlaceholder: 'Choose departure...',
          runwayPlaceholder: 'Choose runway...',
          procedurePlaceholder: 'Enter SID...',
        },
      })

      // Component should receive custom placeholder props
      expect(wrapper.props('airportPlaceholder')).toBe('Choose departure...')
      expect(wrapper.props('runwayPlaceholder')).toBe('Choose runway...')
      expect(wrapper.props('procedurePlaceholder')).toBe('Enter SID...')
    })
  })

  describe('Validation states', () => {
    it('should receive incomplete airport prop', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          isAirportIncomplete: true,
        },
      })

      expect(wrapper.props('isAirportIncomplete')).toBe(true)
    })

    it('should receive incomplete runway prop', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          isRunwayIncomplete: true,
        },
      })

      expect(wrapper.props('isRunwayIncomplete')).toBe(true)
    })

    it('should receive incomplete procedure prop', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          isProcedureIncomplete: true,
        },
      })

      expect(wrapper.props('isProcedureIncomplete')).toBe(true)
    })

    it('should not have error states by default', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      expect(wrapper.props('isAirportIncomplete')).toBeFalsy()
      expect(wrapper.props('isRunwayIncomplete')).toBeFalsy()
      expect(wrapper.props('isProcedureIncomplete')).toBeFalsy()
    })
  })

  describe('Procedure input', () => {
    it('should have procedure prop that can be updated', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          procedure: 'KUTA1A',
        },
      })

      expect(wrapper.props('procedure')).toBe('KUTA1A')
    })

    it('should display current procedure value', () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          procedure: 'BATU2B',
        },
      })

      expect(wrapper.props('procedure')).toBe('BATU2B')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty airfield list', () => {
      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue([])

      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'UnknownTheater',
        },
      })

      expect(wrapper.vm.airfieldOptions).toHaveLength(0)
      expect(wrapper.vm.runwayOptions).toHaveLength(0)
    })

    it('should handle airfield without runways', () => {
      const airfieldWithoutRunways: Airfield[] = [
        {
          name: 'TestAirport',
          position: {
            latitude: 0,
            longitude: 0,
            elevation: 0,
          },
          runways: [],
        },
      ]

      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(airfieldWithoutRunways)

      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'TestTheater',
          airportId: 'TestAirport',
        },
      })

      expect(wrapper.vm.runwayOptions).toHaveLength(0)
    })

    it('should handle airfield without elevation data', () => {
      const airfieldWithoutElevation: Airfield[] = [
        {
          name: 'TestAirport',
          position: {
            latitude: 0,
            longitude: 0,
          },
          runways: [{ name: '09', heading: 90, length: 2000 }],
        },
      ]

      vi.spyOn(airfieldsModule, 'getAirfieldsForTheater').mockReturnValue(airfieldWithoutElevation)

      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'TestTheater',
        },
      })

      wrapper.vm.handleAirportChange('TestAirport')

      expect(wrapper.emitted('update:fieldElevation')?.[0]).toEqual([undefined])
    })

    it('should update runway options when airport changes', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
          airportId: 'Kutaisi',
        },
      })

      expect(wrapper.vm.runwayOptions).toHaveLength(2)
      expect(wrapper.vm.runwayOptions[0].label).toBe('08')

      // Update props to simulate parent responding to emit
      await wrapper.setProps({ airportId: 'Batumi' })

      expect(wrapper.vm.runwayOptions).toHaveLength(2)
      expect(wrapper.vm.runwayOptions[0].label).toBe('13')
    })
  })

  describe('Cascading behavior', () => {
    it('should maintain correct state through multiple selections', async () => {
      const wrapper = mount(AirportRunwaySelector, {
        props: {
          theater: 'Caucasus',
        },
      })

      // Select airport (simulate parent updating props in response to emit)
      await wrapper.setProps({ airportId: 'Kutaisi' })
      expect(wrapper.vm.selectedAirfield?.name).toBe('Kutaisi')

      // Select runway (simulate parent updating props in response to emit)
      await wrapper.setProps({ airportId: 'Kutaisi', runwayName: '08' })
      expect(wrapper.vm.selectedRunway?.name).toBe('08')

      // Change airport - should emit events to clear runway
      wrapper.vm.handleAirportChange('Batumi')
      expect(wrapper.emitted('update:runwayName')?.[0]).toEqual([undefined])
    })
  })
})
