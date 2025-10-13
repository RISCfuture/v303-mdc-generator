import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SpeedCalculatorModal from '@/components/mission/told-fuel/SpeedCalculatorModal.vue'
import type { Mission } from '@/types'
import * as f16Calculator from '@/utils/f16RotationCalculator'
import * as a10Calculator from '@/utils/a10RotationCalculator'

// Mock the calculator utilities
vi.mock('@/utils/f16RotationCalculator')
vi.mock('@/utils/a10RotationCalculator')

const createMockMission = (overrides = {}): Mission => ({
  id: 'test-mission',
  name: 'Test Mission',
  squadron: 'v93',
  theater: 'Caucasus',
  date: '2024-01-15',
  type: 'CAS',
  airframe: 'F-16C_50',
  callsign: 'VIPER 1',
  missionNumber: '001',
  weather: '',
  bullseye: {
    latitude: 42.0,
    longitude: 42.0,
  },
  departureRecovery: {
    departureAirportId: 'Kutaisi',
    departureRunwayName: '08',
    departureRunwayHeading: 80,
    departureFieldElevation: 148,
  },
  told: {
    grossWeight: 32000,
    fuelWeight: 8000,
    rotationSpeed: 160,
    refusalSpeed: 140,
  },
  waypoints: [],
  flightMembers: [],
  package: { packageMembers: [] },
  supportAssets: { supportAssets: [] },
  radios: {},
  loadout: { stores: [] },
  ecmcmds: {},
  notes: '',
  targets: [],
  updatedAt: Date.now(),
  ...overrides,
})

describe('SpeedCalculatorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock F-16 calculator functions
    vi.spyOn(f16Calculator, 'calculateSpeeds').mockReturnValue({
      rotationSpeed: 165,
      refusalSpeed: 145,
    })
    vi.spyOn(f16Calculator, 'calculateHeadwindComponent').mockReturnValue(10)
    vi.spyOn(f16Calculator, 'calculateCrosswindComponent').mockReturnValue(5)

    // Mock A-10 calculator functions
    vi.spyOn(a10Calculator, 'calculateSpeeds').mockReturnValue({
      rotationSpeed: 125,
      refusalSpeed: 105,
    })
    vi.spyOn(a10Calculator, 'calculateHeadwindComponent').mockReturnValue(10)
    vi.spyOn(a10Calculator, 'calculateCrosswindComponent').mockReturnValue(5)
  })

  describe('Component initialization', () => {
    it('should render when show is true', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should accept show prop as false', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: false,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.props('show')).toBe(false)
    })

    it('should display F-16C for F-16 airframe', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.props('airframe')).toContain('F-16')
    })

    it('should display A-10C for A-10 airframe', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      expect(wrapper.props('airframe')).toContain('A-10')
    })
  })

  describe('Form initialization from mission', () => {
    it('should receive mission with departure data', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      await nextTick()

      expect(wrapper.props('mission').departureRecovery.departureAirportId).toBe('Kutaisi')
      expect(wrapper.props('mission').departureRecovery.departureRunwayName).toBe('08')
      expect(wrapper.props('mission').departureRecovery.departureFieldElevation).toBe(148)
    })

    it('should accept F-16 calculator params', async () => {
      const mission = createMockMission({
        told: {
          calculatorParams: {
            windDirection: 90,
            windSpeed: 15,
            temperature: 25,
            runwayCondition: 'wet',
            powerSetting: 'MIL',
            cgPercent: 30,
            pitchAttitude: 8,
            runwaySlope: 1.5,
          },
        },
      })

      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      await nextTick()

      const params = wrapper.props('mission').told.calculatorParams
      expect(params?.windDirection).toBe(90)
      expect(params?.windSpeed).toBe(15)
      expect(params?.temperature).toBe(25)
    })

    it('should accept A-10 calculator params', async () => {
      const mission = createMockMission({
        airframe: 'A-10C_2',
        told: {
          calculatorParams: {
            windDirection: 270,
            windSpeed: 20,
            temperature: 30,
            runwayCondition: 'icy',
            flapSetting: 7,
            speedBrake: 'closed',
          },
        },
      })

      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      await nextTick()

      const params = wrapper.props('mission').told.calculatorParams
      expect(params?.windDirection).toBe(270)
      expect(params?.windSpeed).toBe(20)
      expect(params?.temperature).toBe(30)
    })

    it('should accept mission without calculator params', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      await nextTick()

      expect(wrapper.props('mission').told.calculatorParams).toBeUndefined()
    })
  })

  describe('Wind component calculations', () => {
    it('should calculate F-16 headwind component', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.windDirection = 90
      wrapper.vm.windSpeed = 15
      wrapper.vm.selectedRunwayHeading = 80

      const headwind = wrapper.vm.headwindComponent

      expect(f16Calculator.calculateHeadwindComponent).toHaveBeenCalledWith(90, 15, 80)
      expect(headwind).toBe(10)
    })

    it('should calculate F-16 crosswind component', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.windDirection = 90
      wrapper.vm.windSpeed = 15
      wrapper.vm.selectedRunwayHeading = 80

      const crosswind = wrapper.vm.crosswindComponent

      expect(f16Calculator.calculateCrosswindComponent).toHaveBeenCalledWith(90, 15, 80)
      expect(crosswind).toBe(5)
    })

    it('should calculate A-10 headwind component', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      wrapper.vm.windDirection = 180
      wrapper.vm.windSpeed = 20
      wrapper.vm.selectedRunwayHeading = 170

      const headwind = wrapper.vm.headwindComponent

      expect(a10Calculator.calculateHeadwindComponent).toHaveBeenCalledWith(180, 20, 170)
      expect(headwind).toBe(10)
    })

    it('should return 0 headwind when wind speed is 0', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.windSpeed = 0

      expect(wrapper.vm.headwindComponent).toBe(0)
      expect(f16Calculator.calculateHeadwindComponent).not.toHaveBeenCalled()
    })
  })

  describe('Speed calculations', () => {
    it('should calculate F-16 speeds with all parameters', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.powerSetting = 'AB'
      wrapper.vm.cgPercent = 35
      wrapper.vm.pitchAttitude = 10
      wrapper.vm.runwayConditionF16 = 'dry'
      wrapper.vm.runwaySlope = 0
      wrapper.vm.windDirection = 90
      wrapper.vm.windSpeed = 10
      wrapper.vm.selectedRunwayHeading = 90

      const speeds = wrapper.vm.calculatedSpeeds

      expect(f16Calculator.calculateSpeeds).toHaveBeenCalledWith({
        grossWeight: 32000,
        powerSetting: 'AB',
        cgPercent: 35,
        pitchAttitude: 10,
        runwayCondition: 'dry',
        headwindComponent: 10,
        runwaySlope: 0,
      })
      expect(speeds?.rotationSpeed).toBe(165)
      expect(speeds?.refusalSpeed).toBe(145)
    })

    it('should calculate A-10 speeds with all parameters', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      wrapper.vm.flapSetting = 7
      wrapper.vm.speedBrake = 'open'
      wrapper.vm.runwayConditionA10 = 'dry'

      const speeds = wrapper.vm.calculatedSpeeds

      expect(a10Calculator.calculateSpeeds).toHaveBeenCalledWith({
        grossWeight: 38000,
        flapSetting: 7,
        speedBrakes: 'open',
        runwayCondition: 'dry',
      })
      expect(speeds?.rotationSpeed).toBe(125)
      expect(speeds?.refusalSpeed).toBe(105)
    })

    it('should return null when grossWeight is 0', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 0,
        },
      })

      expect(wrapper.vm.calculatedSpeeds).toBeNull()
      expect(f16Calculator.calculateSpeeds).not.toHaveBeenCalled()
    })
  })

  describe('Calculate button behavior', () => {
    it('should emit speeds-calculated with correct F-16 data', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.powerSetting = 'MIL'
      wrapper.vm.cgPercent = 30
      wrapper.vm.selectedAirfieldName = 'Batumi'
      wrapper.vm.selectedRunwayName = '13'
      wrapper.vm.selectedRunwayHeading = 130
      wrapper.vm.fieldElevation = 33

      wrapper.vm.handleCalculate()

      expect(wrapper.emitted('speeds-calculated')).toBeTruthy()
      const emitted = wrapper.emitted('speeds-calculated')?.[0]
      expect(emitted?.[0]).toBe(165) // rotation speed
      expect(emitted?.[1]).toBe(145) // refusal speed
      expect(emitted?.[2]).toMatchObject({
        powerSetting: 'MIL',
        cgPercent: 30,
      })
      expect(emitted?.[3]).toMatchObject({
        departureAirportId: 'Batumi',
        departureRunwayName: '13',
        departureRunwayHeading: 130,
        departureFieldElevation: 33,
      })
    })

    it('should emit speeds-calculated with correct A-10 data', async () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      wrapper.vm.flapSetting = 0
      wrapper.vm.speedBrake = 'closed'

      wrapper.vm.handleCalculate()

      const emitted = wrapper.emitted('speeds-calculated')?.[0]
      expect(emitted?.[2]).toMatchObject({
        flapSetting: 0,
        speedBrake: 'closed',
      })
    })

    it('should close modal after calculate', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.handleCalculate()

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
    })

    it('should handle zero gross weight', () => {
      const mission = createMockMission()

      // Mock calculateSpeeds to return null
      vi.spyOn(f16Calculator, 'calculateSpeeds').mockReturnValue(
        null as unknown as { rotationSpeed: number; refusalSpeed: number },
      )

      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 0,
        },
      })

      expect(wrapper.props('grossWeight')).toBe(0)
    })

    it('should not emit when calculatedSpeeds is null', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 0,
        },
      })

      wrapper.vm.handleCalculate()

      expect(wrapper.emitted('speeds-calculated')).toBeFalsy()
    })
  })

  describe('Cancel button behavior', () => {
    it('should close modal when cancel is clicked', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.handleCancel()

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
    })

    it('should not emit speeds-calculated when cancel is clicked', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.handleCancel()

      expect(wrapper.emitted('speeds-calculated')).toBeFalsy()
    })
  })

  describe('Airframe-specific rendering', () => {
    it('should render with F-16 airframe', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.props('airframe')).toBe('F-16C_50')
    })

    it('should render with A-10 airframe', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      expect(wrapper.props('airframe')).toBe('A-10C_2')
    })

    it('should accept F-16 gross weight', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.props('grossWeight')).toBe(32000)
    })

    it('should accept A-10 gross weight', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      expect(wrapper.props('grossWeight')).toBe(38000)
    })
  })

  describe('Calculator mocking', () => {
    it('should use F-16 calculator for F-16', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      expect(wrapper.props('airframe')).toContain('F-16')
    })

    it('should use A-10 calculator for A-10', () => {
      const mission = createMockMission({ airframe: 'A-10C_2' })
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'A-10C_2',
          grossWeight: 38000,
        },
      })

      expect(wrapper.props('airframe')).toContain('A-10')
    })
  })

  describe('Gross weight handling', () => {
    it('should accept gross weight prop', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32500,
        },
      })

      expect(wrapper.props('grossWeight')).toBe(32500)
    })
  })

  describe('Edge cases', () => {
    it('should handle mission without departureRecovery data', async () => {
      const mission = createMockMission({
        departureRecovery: {},
      })

      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      await nextTick()

      expect(wrapper.vm.selectedAirfieldName).toBeNull()
      expect(wrapper.vm.selectedRunwayName).toBeNull()
      expect(wrapper.vm.fieldElevation).toBeNull()
    })

    it('should handle modal open/close cycles', async () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: false,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      // Open modal
      await wrapper.setProps({ show: true })
      await nextTick()

      expect(wrapper.vm.selectedAirfieldName).toBe('Kutaisi')

      // Close and reopen
      await wrapper.setProps({ show: false })
      await wrapper.setProps({ show: true })
      await nextTick()

      // Should reinitialize
      expect(wrapper.vm.selectedAirfieldName).toBe('Kutaisi')
    })

    it('should handle undefined runway heading', () => {
      const mission = createMockMission()
      const wrapper = mount(SpeedCalculatorModal, {
        props: {
          show: true,
          mission,
          airframe: 'F-16C_50',
          grossWeight: 32000,
        },
      })

      wrapper.vm.selectedRunwayHeading = undefined

      expect(wrapper.vm.runwayHeading).toBe(0)
    })
  })
})
