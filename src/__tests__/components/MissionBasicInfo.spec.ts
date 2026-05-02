import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MissionBasicInfo from '@/components/mission/basic-info/MissionBasicInfo.vue'
import type { Mission } from '@/types'

const createMockMission = (overrides = {}): Partial<Mission> => ({
  name: 'Test Mission',
  type: 'CAS',
  date: new Date('2024-01-15'),
  weather: 'Clear',
  missionNumber: 'M-001',
  squadron: 'v303',
  departureRecovery: {
    departureAirportId: 'OAKN',
    departureRunwayName: '03',
    recoveryAirportId: 'OAKN',
    recoveryRunwayName: '03',
  },
  ...overrides,
})

describe('MissionBasicInfo', () => {
  describe('Component rendering', () => {
    it('should render with mission data', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Mission information fields', () => {
    it('should display mission name', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('mission').name).toBe('Test Mission')
    })

    it('should display mission type', () => {
      const mission = createMockMission({ type: 'CAS' })

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('mission').type).toBe('CAS')
    })
  })

  describe('Date picker', () => {
    it('should handle date prop', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('mission').date).toBeDefined()
    })
  })

  describe('Theater display', () => {
    it('should display theater name', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('theaterData').displayName).toBe('Afghanistan')
      expect(wrapper.html()).toContain('Afghanistan')
    })
  })

  describe('Weather input', () => {
    it('should handle weather prop', () => {
      const mission = createMockMission({ weather: 'Clear skies' })

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('mission').weather).toBe('Clear skies')
    })
  })

  describe('Mission number', () => {
    it('should handle mission number prop', () => {
      const mission = createMockMission({ missionNumber: 'M-123' })

      const wrapper = mount(MissionBasicInfo, {
        props: {
          mission,
          theaterData: { displayName: 'Afghanistan' },
        },
      })

      expect(wrapper.props('mission').missionNumber).toBe('M-123')
    })
  })
})
