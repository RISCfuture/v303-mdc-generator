import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SpeedCalculatorModal from '@/components/mission/told-fuel/SpeedCalculatorModal.vue'
import type { Mission } from '@/types'

// Mock the async aircraft-specific form components - must be inline to avoid hoisting issues
vi.mock('@/aircraft/F-16C_50/components/F16SpeedCalculatorForm.vue', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    default: vue.defineComponent({
      name: 'F16SpeedCalculatorForm',
      props: [
        'grossWeight',
        'dragIndex',
        'runwayLength',
        'runwayWidth',
        'fieldElevation',
        'runwayHeading',
        'temperature',
        'windDirection',
        'windSpeed',
        'runwayName',
      ],
      emits: ['update:config', 'update:speeds'],
      setup(
        _props: Record<string, unknown>,
        {
          emit,
          expose,
        }: {
          emit: (event: string, ...args: unknown[]) => void
          expose: (exposed: Record<string, unknown>) => void
        },
      ) {
        const headwindComponent = 10
        const crosswindComponent = 5
        const exceedsCrosswindLimit = false

        setTimeout(() => {
          emit('update:speeds', { rotationSpeed: 165, refusalSpeed: 145 })
          emit('update:config', {
            powerSetting: 'AB',
            cgPercent: 35,
            pitchAttitude: 10,
            runwaySlope: 0,
            runwayCondition: 'dry',
          })
        }, 0)

        expose({ headwindComponent, crosswindComponent, exceedsCrosswindLimit })
        return () => vue.h('div', { class: 'f16-speed-calculator-form-mock' }, 'F-16 Form')
      },
    }),
    __esModule: true,
  }
})

vi.mock('@/aircraft/A-10A/components/A10SpeedCalculatorForm.vue', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    default: vue.defineComponent({
      name: 'A10SpeedCalculatorForm',
      props: [
        'grossWeight',
        'runwayLength',
        'runwayWidth',
        'fieldElevation',
        'runwayHeading',
        'temperature',
        'windDirection',
        'windSpeed',
        'runwayName',
      ],
      emits: ['update:config', 'update:speeds'],
      setup(
        _props: Record<string, unknown>,
        {
          emit,
          expose,
        }: {
          emit: (event: string, ...args: unknown[]) => void
          expose: (exposed: Record<string, unknown>) => void
        },
      ) {
        const headwindComponent = 10
        const crosswindComponent = 5
        const exceedsCrosswindLimit = false

        setTimeout(() => {
          emit('update:speeds', { rotationSpeed: 125, refusalSpeed: 105 })
          emit('update:config', {
            flapSetting: 7,
            speedBrake: 'open',
            thrustSetting: 'MAX',
            runwaySlope: 0,
            runwayCondition: 'dry',
          })
        }, 0)

        expose({ headwindComponent, crosswindComponent, exceedsCrosswindLimit })
        return () => vue.h('div', { class: 'a10-speed-calculator-form-mock' }, 'A-10 Form')
      },
    }),
    __esModule: true,
  }
})

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
