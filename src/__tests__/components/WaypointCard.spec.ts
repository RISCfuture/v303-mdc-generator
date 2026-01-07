import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WaypointCard from '@/components/mission/steerpoints/WaypointCard.vue'
import { createMockWaypoint, expectEmitted, expectEmittedWith } from '@/__tests__/helpers'
import type { Airframe } from '@/types'

describe('WaypointCard', () => {
  describe('Delete functionality', () => {
    it('should emit remove when delete button is clicked', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const deleteButton = wrapper
        .findAll('button')
        .find((b) => b.classes().includes('waypoint-delete'))
      await deleteButton?.trigger('click')

      expectEmitted(wrapper, 'remove')
    })
  })

  describe('Drag and drop behavior', () => {
    it('should emit dragstart when dragging starts', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointItem = wrapper.find('.waypoint-item')
      await waypointItem.trigger('dragstart')

      expectEmitted(wrapper, 'dragstart')
    })

    it('should emit dragover when dragging over', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointItem = wrapper.find('.waypoint-item')
      await waypointItem.trigger('dragover')

      expectEmitted(wrapper, 'dragover')
    })

    it('should emit drop when dropped', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointItem = wrapper.find('.waypoint-item')
      await waypointItem.trigger('drop')

      expectEmitted(wrapper, 'drop')
    })

    it('should be draggable', () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointItem = wrapper.find('.waypoint-item')
      expect(waypointItem.attributes('draggable')).toBe('true')
    })
  })

  describe('Field updates propagation', () => {
    it('should emit update-field when waypoint field changes', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointFields = wrapper.findComponent({ name: 'WaypointFields' })
      waypointFields.vm.$emit('update-field', 'name', 'New Name')

      expectEmittedWith(wrapper, 'update-field', ['name', 'New Name'])
    })

    it('should emit blur when waypoint field loses focus', async () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointFields = wrapper.findComponent({ name: 'WaypointFields' })
      waypointFields.vm.$emit('blur')

      expectEmitted(wrapper, 'blur')
    })
  })

  describe('Props propagation to WaypointFields', () => {
    it('should pass isWaypointFieldIncomplete callback to WaypointFields', () => {
      const waypoint = createMockWaypoint()
      const mockCallback = () => false

      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1430Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
          isWaypointFieldIncomplete: mockCallback,
        },
      })

      const waypointFields = wrapper.findComponent({ name: 'WaypointFields' })
      expect(waypointFields.props('isWaypointFieldIncomplete')).toBe(mockCallback)
    })

    it('should pass totPlaceholder to WaypointFields', () => {
      const waypoint = createMockWaypoint()
      const wrapper = mount(WaypointCard, {
        props: {
          waypoint,
          index: 0,
          isFirst: false,
          isLast: false,
          totPlaceholder: '1500Z',
          airframe: 'F-16C_50' as Airframe,
          isFirstTgt: false,
        },
      })

      const waypointFields = wrapper.findComponent({ name: 'WaypointFields' })
      expect(waypointFields.props('totPlaceholder')).toBe('1500Z')
    })
  })
})
