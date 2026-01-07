import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import F16EcmCmds from '@/aircraft/F-16C_50/components/EcmCmds.vue'
import type { Mission, Airframe } from '@/types'

const createMockMission = (overrides = {}): Partial<Mission> => ({
  cmdsProfile: 'PRGM 1',
  ecmProgram: 'XMIT 1',
  htsThreatTables: [],
  ecmCmds: {
    cmdsPrograms: [],
    chaffBingo: 10,
    flareBingo: 10,
    chaffTotal: 60,
    flareTotal: 60,
  },
  ...overrides,
})

describe('F16EcmCmds', () => {
  describe('CMDS Profile', () => {
    it('should display 4 CMDS profile options (PRGM 1-4)', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.cmdsProfileOptions.length).toBe(4)
    })

    it('should emit update:cmds-profile when profile changes', async () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile('PRGM 2')

      expect(wrapper.emitted('update:cmds-profile')).toBeTruthy()
      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual(['PRGM 2'])
    })

    it('should handle null CMDS profile', async () => {
      const mission = createMockMission({ cmdsProfile: null })

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile(null)

      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual([null])
    })
  })

  describe('ECM Program', () => {
    it('should have 3 ECM program options (XMIT 1-3)', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.ecmProgramOptions.length).toBe(3)
    })

    it('should emit update:ecm-program when program changes', async () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateEcmProgram('XMIT 2')

      expect(wrapper.emitted('update:ecm-program')).toBeTruthy()
      expect(wrapper.emitted('update:ecm-program')?.[0]).toEqual(['XMIT 2'])
    })
  })

  describe('HTS Threat Tables', () => {
    it('should have 12 HTS threat table options', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16 has CLASS 1-11 + MAN = 12 options
      expect(wrapper.vm.htsThreatTableOptions.length).toBe(12)
    })

    it('should emit update:hts-threat-tables when tables change', async () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateHtsThreatTables(['CLASS 1', 'CLASS 2'])

      expect(wrapper.emitted('update:hts-threat-tables')).toBeTruthy()
      expect(wrapper.emitted('update:hts-threat-tables')?.[0]).toEqual([['CLASS 1', 'CLASS 2']])
    })
  })

  describe('Countermeasures - Chaff/Flare Sliders', () => {
    it('should display chaff and flare sliders with correct values', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 60,
          flareTotal: 60,
        },
      })

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.chaffTotal).toBe(60)
      expect(wrapper.vm.flareTotal).toBe(60)
    })

    it('should use correct capacity and increments for F-16', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16C_50 has capacity=120, chaffIncrement=30, flareIncrement=30
      expect(wrapper.vm.cmdsCapacity).toBe(120)
      expect(wrapper.vm.chaffIncrement).toBe(30)
      expect(wrapper.vm.flareIncrement).toBe(30)
    })

    it('should emit update:chaff-total when chaff slider changes', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateChaffTotal(90)

      expect(wrapper.emitted('update:chaff-total')).toBeTruthy()
      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([90])
    })

    it('should emit update:flare-total when flare slider changes', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateFlareTotal(90)

      expect(wrapper.emitted('update:flare-total')).toBeTruthy()
      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([90])
    })

    it('should auto-adjust flare when chaff exceeds capacity', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 60,
          flareTotal: 60,
        },
      })

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16C_50 has capacity of 120
      // Setting chaff to 90 with flare at 60 exceeds capacity (150 > 120)
      wrapper.vm.updateChaffTotal(90)

      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([90])
      // Flare should be auto-adjusted to 30 (120 - 90 = 30)
      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([30])
    })

    it('should auto-adjust chaff when flare exceeds capacity', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 60,
          flareTotal: 30,
        },
      })

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16C_50 has capacity of 120
      // Setting flare to 90 with chaff at 60 exceeds capacity (150 > 120)
      wrapper.vm.updateFlareTotal(90)

      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([90])
      // Chaff should be auto-adjusted to 30 (120 - 90 = 30)
      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([30])
    })
  })

  describe('Form layout', () => {
    it('should render with Countermeasures and ECM cards', () => {
      const mission = createMockMission()

      const wrapper = mount(F16EcmCmds, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('Countermeasures')
      expect(wrapper.html()).toContain('ECM')
    })
  })
})
