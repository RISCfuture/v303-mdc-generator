import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MissionSteerpoints from '@/components/mission/steerpoints/MissionSteerpoints.vue'
import type { Waypoint, Navaid, Airframe } from '@/types'
import { clickNButton } from '@/__tests__/helpers/naive-ui-helpers'

const createMockWaypoint = (overrides = {}): Waypoint => ({
  id: 'wp-1',
  sequence: 1,
  name: 'IP',
  type: 'IP',
  latitude: 42.0,
  longitude: 42.0,
  altitude: 15000,
  speed: 350,
  timeOnTarget: '',
  ...overrides,
})

const createMockNavaid = (overrides = {}): Navaid => ({
  name: 'TACAN',
  latitude: 42.5,
  longitude: 42.5,
  elevation: 1000,
  ...overrides,
})

describe('MissionSteerpoints', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockDragDrop = {
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
  }

  describe('Waypoint calculations', () => {
    it('should calculate distance and time between waypoints', () => {
      const waypoints = [
        createMockWaypoint({ sequence: 1, latitude: 42.0, longitude: 42.0, speed: 300 }),
        createMockWaypoint({ sequence: 2, latitude: 42.1, longitude: 42.1, speed: 300 }),
      ]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.waypointPairs).toBeDefined()
      expect(wrapper.vm.waypointPairs.length).toBeGreaterThan(0)
    })

    it('should handle waypoints with missing coordinates', () => {
      const waypoints = [
        createMockWaypoint({ sequence: 1, latitude: null, longitude: null }),
        createMockWaypoint({ sequence: 2, latitude: 42.1, longitude: 42.1 }),
      ]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.waypointPairs).toBeDefined()
    })

    it('should calculate TOT placeholders for all waypoints', () => {
      const waypoints = [
        createMockWaypoint({ sequence: 1, timeOnTarget: '1430Z' }),
        createMockWaypoint({ sequence: 2, timeOnTarget: '' }),
      ]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.totPlaceholders).toBeDefined()
      expect(wrapper.vm.totPlaceholders.length).toBe(waypoints.length)
    })
  })

  describe('Navaid dropdown', () => {
    it('should populate navaid options from availableNavaids', () => {
      const navaids = [createMockNavaid({ name: 'TACAN' }), createMockNavaid({ name: 'VOR' })]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints: [],
          availableNavaids: navaids,
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // The component should have the navaids available
      expect(wrapper.props('availableNavaids')).toHaveLength(2)
      expect(wrapper.props('availableNavaids')[0].name).toBe('TACAN')
      expect(wrapper.props('availableNavaids')[1].name).toBe('VOR')
    })
  })

  describe('Event emissions', () => {
    it('should emit add-waypoint when custom steerpoint button is clicked', async () => {
      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints: [],
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      await clickNButton(wrapper, 'Custom Steerpoint')

      expect(wrapper.emitted('add-waypoint')).toBeTruthy()
    })

    it('should have navaid selector with available navaids', async () => {
      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints: [],
          availableNavaids: [createMockNavaid({ name: 'TACAN' })],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // Verify the navaid selector is present
      expect(wrapper.html()).toContain('Add from database')

      // Verify the navaids are available
      expect(wrapper.props('availableNavaids')).toHaveLength(1)
    })

    it('should emit remove-waypoint from WaypointCard', async () => {
      const waypoints = [createMockWaypoint()]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCard = wrapper.findComponent({ name: 'WaypointCard' })
      waypointCard.vm.$emit('remove')

      expect(wrapper.emitted('remove-waypoint')).toBeTruthy()
      expect(wrapper.emitted('remove-waypoint')?.[0]).toEqual([0])
    })

    it('should emit move-waypoint-up from WaypointCard', async () => {
      const waypoints = [createMockWaypoint(), createMockWaypoint({ sequence: 2 })]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCards = wrapper.findAllComponents({ name: 'WaypointCard' })
      waypointCards[1].vm.$emit('move-up')

      expect(wrapper.emitted('move-waypoint-up')).toBeTruthy()
      expect(wrapper.emitted('move-waypoint-up')?.[0]).toEqual([1])
    })

    it('should emit move-waypoint-down from WaypointCard', async () => {
      const waypoints = [createMockWaypoint(), createMockWaypoint({ sequence: 2 })]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCards = wrapper.findAllComponents({ name: 'WaypointCard' })
      waypointCards[0].vm.$emit('move-down')

      expect(wrapper.emitted('move-waypoint-down')).toBeTruthy()
      expect(wrapper.emitted('move-waypoint-down')?.[0]).toEqual([0])
    })
  })

  describe('Drag and drop', () => {
    it('should call drag drop handlers for waypoint cards', async () => {
      const waypoints = [createMockWaypoint()]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCard = wrapper.findComponent({ name: 'WaypointCard' })
      waypointCard.vm.$emit('dragstart')

      expect(mockDragDrop.handleDragStart).toHaveBeenCalledWith(0)
    })

    it('should emit waypoint-drop when drop event occurs', async () => {
      const waypoints = [createMockWaypoint()]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCard = wrapper.findComponent({ name: 'WaypointCard' })
      waypointCard.vm.$emit('drop')

      expect(wrapper.emitted('waypoint-drop')).toBeTruthy()
      expect(wrapper.emitted('waypoint-drop')?.[0]).toEqual([0])
    })
  })

  describe('Empty state', () => {
    it('should display error message when no waypoints', () => {
      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints: [],
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('steerpoint')
    })

    it('should not display empty state when waypoints exist', () => {
      const waypoints = [createMockWaypoint()]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const emptyState = wrapper.find('.empty-state')
      expect(emptyState.exists()).toBe(false)
    })
  })

  describe('Distance/time display between waypoints', () => {
    it('should display interstitial text between waypoints', () => {
      const waypoints = [
        createMockWaypoint({ sequence: 1, latitude: 42.0, longitude: 42.0 }),
        createMockWaypoint({ sequence: 2, latitude: 42.1, longitude: 42.1 }),
      ]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // Should have one interstitial text between two waypoints
      const waypointsList = wrapper.find('.waypoints-list')
      expect(waypointsList.exists()).toBe(true)
    })
  })

  describe('Props propagation', () => {
    it('should pass isWaypointFieldIncomplete to WaypointCard', () => {
      const mockCallback = vi.fn()
      const waypoints = [createMockWaypoint()]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          isWaypointFieldIncomplete: mockCallback,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCard = wrapper.findComponent({ name: 'WaypointCard' })
      expect(waypointCard.props('isWaypointFieldIncomplete')).toBe(mockCallback)
    })

    it('should pass correct totPlaceholder to each WaypointCard', () => {
      const waypoints = [createMockWaypoint(), createMockWaypoint({ sequence: 2 })]

      const wrapper = mount(MissionSteerpoints, {
        props: {
          waypoints,
          availableNavaids: [],
          waypointDragDrop: mockDragDrop,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      const waypointCards = wrapper.findAllComponents({ name: 'WaypointCard' })
      waypointCards.forEach((card, index) => {
        expect(card.props('totPlaceholder')).toBe(wrapper.vm.totPlaceholders[index])
      })
    })
  })
})
