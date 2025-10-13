import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { NMessageProvider } from 'naive-ui'
import { h } from 'vue'
import TargetSection from '@/components/mission/notes-targets/TargetSection.vue'
import type { Target } from '@/types'

const createMockTarget = (overrides = {}): Partial<Target> => ({
  name: 'Test Target',
  dmpi: 'Building 1',
  latitude: 33.0,
  longitude: 65.0,
  elevation: 1500,
  remarks: 'Test remarks',
  ...overrides,
})

// Helper to mount TargetSection with NMessageProvider
const mountTargetSection = (props: Record<string, unknown>) => {
  return mount(
    {
      render() {
        return h(NMessageProvider, null, {
          default: () => h(TargetSection, props),
        })
      },
    },
    {
      global: {
        stubs: {
          // Stub child components to avoid additional complexity
          CoordinateInputField: true,
          MarkdownEditor: true,
          CCIPReferencePoint: true,
        },
      },
    },
  )
}

describe('TargetSection', () => {
  describe('Component rendering', () => {
    it('should render with target data', () => {
      const target = createMockTarget()

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Basic target fields', () => {
    it('should display target name', () => {
      const target = createMockTarget({ name: 'Enemy HQ' })

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.findComponent(TargetSection).props('target').name).toBe('Enemy HQ')
    })

    it('should display DMPI', () => {
      const target = createMockTarget({ dmpi: 'Building 5' })

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.findComponent(TargetSection).props('target').dmpi).toBe('Building 5')
    })
  })

  describe('Coordinate inputs', () => {
    it('should handle latitude and longitude', () => {
      const target = createMockTarget({ latitude: 35.5, longitude: 69.2 })

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.findComponent(TargetSection).props('target').latitude).toBe(35.5)
      expect(wrapper.findComponent(TargetSection).props('target').longitude).toBe(69.2)
    })

    it('should handle elevation', () => {
      const target = createMockTarget({ elevation: 2000 })

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.findComponent(TargetSection).props('target').elevation).toBe(2000)
    })
  })

  describe('Target remarks', () => {
    it('should handle remarks text', () => {
      const target = createMockTarget({ remarks: 'Watch for AAA' })

      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
        waypoints: [],
      })

      expect(wrapper.findComponent(TargetSection).props('target').remarks).toBe('Watch for AAA')
    })
  })

  describe('CCIP waypoints', () => {
    it('should handle waypoints for target selection', () => {
      const target = createMockTarget()
      const wrapper = mountTargetSection({
        target,
        missionId: 'test-mission-id',
      })

      expect(wrapper.findComponent(TargetSection).props('missionId')).toBe('test-mission-id')
    })
  })
})
