import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import A10CEcmCmds from '@/aircraft/A-10C/components/EcmCmds.vue'
import type { Mission, Airframe } from '@/types'

const createMockMission = (overrides = {}): Partial<Mission> => ({
  cmdsProfile: 'PRGM A',
  ecmProgram: 'AIR',
  ecmCmds: {
    cmdsPrograms: [],
    chaffBingo: 10,
    flareBingo: 10,
    chaffTotal: 240,
    flareTotal: 240,
  },
  ...overrides,
})

describe('A10CEcmCmds', () => {
  describe('CMDS Profile', () => {
    it('should display 26 CMDS profile options (PRGM A-Z)', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.vm.cmdsProfileOptions.length).toBe(26)
    })

    it('should emit update:cmds-profile when profile changes', async () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile('PRGM B')

      expect(wrapper.emitted('update:cmds-profile')).toBeTruthy()
      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual(['PRGM B'])
    })

    it('should handle null CMDS profile', async () => {
      const mission = createMockMission({ cmdsProfile: null })

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile(null)

      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual([null])
    })
  })

  describe('ECM Program', () => {
    it('should have 4 ECM program options (AIR, SAM1, SAM2, AAA)', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.vm.ecmProgramOptions.length).toBe(4)
    })

    it('should emit update:ecm-program when program changes', async () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateEcmProgram('SAM1')

      expect(wrapper.emitted('update:ecm-program')).toBeTruthy()
      expect(wrapper.emitted('update:ecm-program')?.[0]).toEqual(['SAM1'])
    })
  })

  describe('Countermeasures - Chaff/Flare Sliders', () => {
    it('should display chaff and flare sliders with correct values', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 240,
          flareTotal: 120,
        },
      })

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.vm.chaffTotal).toBe(240)
      expect(wrapper.vm.flareTotal).toBe(120)
    })

    it('should use correct capacity and increments for A-10', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C_2 has capacity=480, chaffIncrement=60, flareIncrement=60
      expect(wrapper.vm.cmdsCapacity).toBe(480)
      expect(wrapper.vm.chaffIncrement).toBe(60)
      expect(wrapper.vm.flareIncrement).toBe(60)
    })

    it('should emit update:chaff-total when chaff slider changes', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateChaffTotal(300)

      expect(wrapper.emitted('update:chaff-total')).toBeTruthy()
      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([300])
    })

    it('should emit update:flare-total when flare slider changes', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateFlareTotal(180)

      expect(wrapper.emitted('update:flare-total')).toBeTruthy()
      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([180])
    })

    it('should auto-adjust flare when chaff exceeds capacity', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 240,
          flareTotal: 240,
        },
      })

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C_2 has capacity of 480
      // Setting chaff to 420 with flare at 240 exceeds capacity (660 > 480)
      wrapper.vm.updateChaffTotal(420)

      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([420])
      // Flare should be auto-adjusted to 60 (480 - 420 = 60)
      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([60])
    })

    it('should auto-adjust chaff when flare exceeds capacity', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 240,
          flareTotal: 120,
        },
      })

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C_2 has capacity of 480
      // Setting flare to 360 with chaff at 240 exceeds capacity (600 > 480)
      wrapper.vm.updateFlareTotal(360)

      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([360])
      // Chaff should be auto-adjusted to 120 (480 - 360 = 120)
      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([120])
    })
  })

  describe('Form layout', () => {
    it('should render with Countermeasures and ECM cards', () => {
      const mission = createMockMission()

      const wrapper = mount(A10CEcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('Countermeasures')
      expect(wrapper.html()).toContain('ECM')
    })
  })
})
