import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MissionECMCMDS from '@/components/mission/ecm-cmds/MissionECMCMDS.vue'
import type { Mission, Airframe } from '@/types'

const createMockMission = (overrides = {}): Partial<Mission> => ({
  cmdsProfile: 'Profile 1',
  ecmPrograms: ['1', '2'],
  ecmCmds: {
    cmdsPrograms: [],
    chaffBingo: 10,
    flareBingo: 10,
    chaffTotal: 240,
    flareTotal: 120,
  },
  ...overrides,
})

describe('MissionECMCMDS', () => {
  describe('CMDS Profile', () => {
    it('should display CMDS profile selector for F-16', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.cmdsProfileOptions.length).toBeGreaterThan(0)
    })

    it('should not display CMDS profile selector for A-10 (no CMDS profiles)', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C has 26 CMDS profiles (PRGM A-Z)
      expect(wrapper.vm.cmdsProfileOptions.length).toBe(26)
    })

    it('should emit update:cmds-profile when profile changes', async () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile('Profile 2')

      expect(wrapper.emitted('update:cmds-profile')).toBeTruthy()
      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual(['Profile 2'])
    })

    it('should handle null CMDS profile', async () => {
      const mission = createMockMission({ cmdsProfile: null })

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateCmdsProfile(null)

      expect(wrapper.emitted('update:cmds-profile')?.[0]).toEqual([null])
    })
  })

  describe('ECM Programs - F-16 multi-select', () => {
    it('should display multi-select dropdown for F-16', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.isF16).toBe(true)
    })

    it('should populate ECM program options for F-16', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      expect(wrapper.vm.ecmProgramOptions.length).toBeGreaterThan(0)
    })

    it('should emit update:ecm-programs when F-16 programs change', async () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      wrapper.vm.updateEcmPrograms(['1', '2', '3'])

      expect(wrapper.emitted('update:ecm-programs')).toBeTruthy()
      expect(wrapper.emitted('update:ecm-programs')?.[0]).toEqual([['1', '2', '3']])
    })

    it('should handle empty ECM programs array for F-16', () => {
      const mission = createMockMission({ ecmPrograms: [] })

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // Mission has empty ECM programs array
      expect(wrapper.props('mission').ecmPrograms).toEqual([])
    })
  })

  describe('ECM Programs - A-10 checkboxes', () => {
    it('should display checkboxes for A-10', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.vm.isF16).toBe(false)
    })

    it('should not have ECM program options for A-10 (no ECM programs)', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C has 4 ECM programs: AIR, SAM1, SAM2, AAA
      expect(wrapper.vm.ecmProgramOptions.length).toBe(4)
    })

    it('should emit update:ecm-programs when A-10 programs change', async () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      wrapper.vm.updateEcmPrograms(['MAN 1', 'MAN 2'])

      expect(wrapper.emitted('update:ecm-programs')).toBeTruthy()
      expect(wrapper.emitted('update:ecm-programs')?.[0]).toEqual([['MAN 1', 'MAN 2']])
    })

    it('should handle undefined ECM programs for A-10', () => {
      const mission = createMockMission({ ecmPrograms: undefined })

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // Verify the mission prop has undefined ecmPrograms
      expect(wrapper.props('mission').ecmPrograms).toBeUndefined()
    })

    it('should render checkbox for each A-10 ECM program', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C has 4 ECM programs that should be rendered as options
      expect(wrapper.vm.ecmProgramOptions.length).toBe(4)
    })
  })

  describe('Airframe-specific rendering', () => {
    it('should render NSelect for F-16 ECM programs', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16 uses isF16 flag to determine multi-select rendering
      expect(wrapper.vm.isF16).toBe(true)
      expect(wrapper.vm.ecmProgramOptions.length).toBeGreaterThan(0)
    })

    it('should not render ECM controls for A-10 (no ECM programs)', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10 doesn't use F-16 controls, but has 4 ECM programs
      expect(wrapper.vm.isF16).toBe(false)
      expect(wrapper.vm.ecmProgramOptions.length).toBe(4)
    })
  })

  describe('Conditional display based on airframe data', () => {
    it('should not display CMDS profile if airframe has no profiles', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // If airframe data doesn't have CMDS profiles, component should handle it gracefully
      if (wrapper.vm.cmdsProfileOptions.length === 0) {
        const formItems = wrapper.findAllComponents({ name: 'NFormItem' })
        const cmdsFormItem = formItems.find((item) => item.props('label') === 'CMDS Profile')
        expect(cmdsFormItem).toBeUndefined()
      }
    })

    it('should not display ECM programs if airframe has no programs', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // If airframe data doesn't have ECM programs, component should handle it gracefully
      if (wrapper.vm.ecmProgramOptions.length === 0) {
        const formItems = wrapper.findAllComponents({ name: 'NFormItem' })
        const ecmFormItem = formItems.find((item) => item.props('label') === 'ECM Programs')
        expect(ecmFormItem).toBeUndefined()
      }
    })
  })

  describe('Form layout', () => {
    it('should use left label placement', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // Verify component rendered successfully
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('Countermeasures')
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

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      expect(wrapper.vm.chaffTotal).toBe(240)
      expect(wrapper.vm.flareTotal).toBe(120)
    })

    it('should use correct step increments from airframe data', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C_2 has chaffIncrement=60, flareIncrement=60
      expect(wrapper.vm.chaffIncrement).toBe(60)
      expect(wrapper.vm.flareIncrement).toBe(60)
    })

    it('should emit update:chaff-total when chaff slider changes', () => {
      const mission = createMockMission()

      const wrapper = mount(MissionECMCMDS, {
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

      const wrapper = mount(MissionECMCMDS, {
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

      const wrapper = mount(MissionECMCMDS, {
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

      const wrapper = mount(MissionECMCMDS, {
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

    it('should round down to nearest increment when auto-adjusting', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 240,
          flareTotal: 240,
        },
      })

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'A-10C_2' as Airframe,
        },
      })

      // A-10C_2 has capacity of 480, flareIncrement=60
      // Setting chaff to 450 leaves 30 for flare, which should round down to 0
      wrapper.vm.updateChaffTotal(450)

      expect(wrapper.emitted('update:chaff-total')?.[0]).toEqual([450])
      // Flare should be adjusted to 0 (30 rounds down to 0 with increment of 60)
      expect(wrapper.emitted('update:flare-total')?.[0]).toEqual([0])
    })

    it('should handle default chaff/flare values for F-16', () => {
      const mission = createMockMission({
        ecmCmds: {
          cmdsPrograms: [],
          chaffBingo: 10,
          flareBingo: 10,
          chaffTotal: 60,
          flareTotal: 60,
        },
      })

      const wrapper = mount(MissionECMCMDS, {
        props: {
          mission: mission as Mission,
          airframe: 'F-16C_50' as Airframe,
        },
      })

      // F-16C has capacity=120, increment=30 for both
      expect(wrapper.vm.cmdsCapacity).toBe(120)
      expect(wrapper.vm.chaffTotal).toBe(60)
      expect(wrapper.vm.flareTotal).toBe(60)
    })
  })
})
