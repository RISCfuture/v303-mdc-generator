import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaypointFields from '@/components/mission/steerpoints/WaypointFields.vue'
import * as waypointCalculations from '@/composables/useWaypointCalculations'
import { createMockWaypoint, expectEmittedWith } from '@/__tests__/helpers'

// Mock parseTOT
vi.mock('@/composables/useWaypointCalculations', async () => {
  const actual = await vi.importActual('@/composables/useWaypointCalculations')
  return {
    ...actual,
    parseTOT: vi.fn((tot: string) => {
      if (!tot) return null
      const cleanTot = tot.toUpperCase().replace(/[^0-9:]/gu, '')
      const match = /^(\d{1,2}):?(\d{2})$/u.exec(cleanTot)
      if (!match) return null
      const hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      if (hours >= 24 || minutes >= 60) return null
      return hours * 60 + minutes
    }),
  }
})

describe('WaypointFields', () => {
  describe('Field update emissions', () => {
    it('should emit update-field when latitude changes', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      coordinateField.vm.$emit('update:latitude', 43.5)

      expectEmittedWith(wrapper, 'update-field', ['latitude', 43.5])
    })

    it('should emit update-field when longitude changes', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      coordinateField.vm.$emit('update:longitude', 43.5)

      expectEmittedWith(wrapper, 'update-field', ['longitude', 43.5])
    })

    it('should emit update-field when coordinate format changes', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      coordinateField.vm.$emit('update:format', 'MGRS')

      expectEmittedWith(wrapper, 'update-field', ['coordinateFormat', 'MGRS'])
    })
  })

  describe('TOT validation', () => {
    it('should validate HH:MM format', () => {
      const waypoint = createMockWaypoint({ timeOnTarget: '14:30' })
      mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(waypointCalculations.parseTOT).toHaveBeenCalledWith('14:30')
    })

    it('should validate HHMM format', () => {
      const waypoint = createMockWaypoint({ timeOnTarget: '1430' })
      mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(waypointCalculations.parseTOT).toHaveBeenCalledWith('1430')
    })

    it('should validate HHMMz format with Zulu suffix', () => {
      const waypoint = createMockWaypoint({ timeOnTarget: '1430z' })
      mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(waypointCalculations.parseTOT).toHaveBeenCalledWith('1430z')
    })

    it('should handle invalid TOT gracefully', () => {
      const waypoint = createMockWaypoint({ timeOnTarget: 'invalid' })

      vi.mocked(waypointCalculations.parseTOT).mockReturnValue(null)

      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(wrapper.props('waypoint').timeOnTarget).toBe('invalid')
    })

    it('should handle empty TOT', () => {
      const waypoint = createMockWaypoint({ timeOnTarget: '' })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(wrapper.props('waypoint').timeOnTarget).toBe('')
    })
  })

  describe('Validation callback integration', () => {
    it('should use isWaypointFieldIncomplete callback for validation states', () => {
      const waypoint = createMockWaypoint({ name: '' })
      const mockIsIncomplete = vi.fn((wp, field) => field === 'name')

      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
          isWaypointFieldIncomplete: mockIsIncomplete,
        },
      })

      expect(wrapper.props('isWaypointFieldIncomplete')).toBe(mockIsIncomplete)
    })

    it('should pass validation callback for all field types', () => {
      const mockIsIncomplete = vi.fn()
      const fields = ['name', 'latitude', 'longitude', 'altitude']

      fields.forEach((field) => {
        const waypoint = createMockWaypoint({ [field]: null })
        mockIsIncomplete.mockImplementation((wp, f) => f === field)

        const wrapper = mount(WaypointFields, {
          props: {
            waypoint,
            totPlaceholder: '1430Z',
            isWaypointFieldIncomplete: mockIsIncomplete,
          },
        })

        expect(wrapper.props('isWaypointFieldIncomplete')).toBe(mockIsIncomplete)
      })
    })
  })

  describe('Coordinate field configuration', () => {
    it('should render coordinate field component', () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      expect(coordinateField.exists()).toBe(true)
    })

    it('should pass correct props to coordinate field', () => {
      const waypoint = createMockWaypoint({
        latitude: 36.2057583,
        longitude: 65.8476583,
        coordinateFormat: 'DDM',
      })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      expect(coordinateField.props('latitude')).toBe(36.2057583)
      expect(coordinateField.props('longitude')).toBe(65.8476583)
      expect(coordinateField.props('format')).toBe('DDM')
    })

    it('should handle null coordinates', () => {
      const waypoint = createMockWaypoint({ latitude: null, longitude: null })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateField' })
      expect(coordinateField.props('latitude')).toBeNull()
      expect(coordinateField.props('longitude')).toBeNull()
    })
  })

  describe('Waypoint type options', () => {
    it('should accept standard waypoint types', () => {
      const expectedTypes = ['NAV', 'IP', 'TGT', 'PUSH', 'PRE-IP', 'IAF', 'EP']

      expectedTypes.forEach((type) => {
        const waypoint = createMockWaypoint({ type })
        const wrapper = mount(WaypointFields, {
          props: {
            waypoint,
            totPlaceholder: '1430Z',
          },
        })
        expect(wrapper.props('waypoint').type).toBe(type)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle null altitude', () => {
      const waypoint = createMockWaypoint({ altitude: null })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(wrapper.props('waypoint').altitude).toBeNull()
    })

    it('should handle undefined speed', () => {
      const waypoint = createMockWaypoint({ speed: undefined })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(wrapper.props('waypoint').speed).toBeUndefined()
    })

    it('should handle empty waypoint type', () => {
      const waypoint = createMockWaypoint({ type: '' })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      expect(wrapper.props('waypoint').type).toBe('')
    })
  })
})
