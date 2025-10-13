import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaypointFields from '@/components/mission/steerpoints/WaypointFields.vue'
import * as waypointCalculations from '@/composables/useWaypointCalculations'
import { createMockWaypoint, expectEmitted, expectEmittedWith } from '@/__tests__/helpers'

// Mock parseTOT
vi.mock('@/composables/useWaypointCalculations', async () => {
  const actual = await vi.importActual('@/composables/useWaypointCalculations')
  return {
    ...actual,
    parseTOT: vi.fn((tot: string) => {
      if (!tot) return null
      const cleanTot = tot.toUpperCase().replace(/[^0-9:]/g, '')
      const match = cleanTot.match(/^(\d{1,2}):?(\d{2})$/)
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

      const coordinateFields = wrapper.findAllComponents({ name: 'CoordinateInputField' })
      const latitudeField = coordinateFields[0]
      latitudeField.vm.$emit('update:modelValue', 43.5)

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

      const coordinateFields = wrapper.findAllComponents({ name: 'CoordinateInputField' })
      const longitudeField = coordinateFields[1]
      longitudeField.vm.$emit('update:modelValue', 43.5)

      expectEmittedWith(wrapper, 'update-field', ['longitude', 43.5])
    })

    it('should emit blur when coordinate field loses focus', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateField = wrapper.findComponent({ name: 'CoordinateInputField' })
      coordinateField.vm.$emit('blur')

      expectEmitted(wrapper, 'blur')
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
    it('should render two coordinate fields for lat/lon', () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateFields = wrapper.findAllComponents({ name: 'CoordinateInputField' })
      expect(coordinateFields).toHaveLength(2)
    })

    it('should configure correct placeholders for lat/lon', () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateFields = wrapper.findAllComponents({ name: 'CoordinateInputField' })
      expect(coordinateFields[0].props('placeholder')).toBe('N --° --.---′')
      expect(coordinateFields[1].props('placeholder')).toBe('E ---° --.---′')
    })

    it('should handle null coordinates', () => {
      const waypoint = createMockWaypoint({ latitude: null, longitude: null })
      const wrapper = mount(WaypointFields, {
        props: {
          waypoint,
          totPlaceholder: '1430Z',
        },
      })

      const coordinateFields = wrapper.findAllComponents({ name: 'CoordinateInputField' })
      expect(coordinateFields[0].props('modelValue')).toBeNull()
      expect(coordinateFields[1].props('modelValue')).toBeNull()
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
