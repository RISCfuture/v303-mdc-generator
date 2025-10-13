import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateMissionModal from '@/components/mission-list/CreateMissionModal.vue'
import { theaterDatabase } from '@/data/theaters'

describe('CreateMissionModal', () => {
  describe('Default selections', () => {
    it('should initialize with v93 squadron and Afghanistan theater as defaults', () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      expect(wrapper.vm.selectedSquadron).toBe('v93')
      expect(wrapper.vm.selectedTheater).toBe('Afghanistan')
    })
  })

  describe('Squadron options', () => {
    it('should populate squadron options including v93 and v303', () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      expect(wrapper.vm.squadronOptions.length).toBeGreaterThan(0)

      const squadronValues = wrapper.vm.squadronOptions.map((o) => o.value)
      expect(squadronValues).toContain('v93')
      expect(squadronValues).toContain('v303')
    })
  })

  describe('Theater options', () => {
    it('should populate theater options from database', () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      expect(wrapper.vm.theaterOptions.length).toBeGreaterThan(0)

      const theaterNames = Object.values(theaterDatabase).map((t) => t.name)
      wrapper.vm.theaterOptions.forEach((option) => {
        expect(theaterNames).toContain(option.value)
      })
    })

    it('should use displayName for theater labels', () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.theaterOptions.forEach((option) => {
        const theater = Object.values(theaterDatabase).find((t) => t.name === option.value)
        expect(option.label).toBe(theater?.displayName)
      })
    })
  })

  describe('Create behavior', () => {
    it('should emit create event with selected squadron and theater', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.selectedSquadron = 'v303'
      wrapper.vm.selectedTheater = 'Syria'

      wrapper.vm.handleCreate()

      expect(wrapper.emitted('create')).toBeTruthy()
      expect(wrapper.emitted('create')?.[0]).toEqual(['v303', 'Syria'])
    })

    it('should close modal after creating mission', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.handleCreate()

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
    })

    it('should create with default values when no changes made', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.handleCreate()

      expect(wrapper.emitted('create')?.[0]).toEqual(['v93', 'Afghanistan'])
    })
  })

  describe('Cancel behavior', () => {
    it('should close modal when cancel is clicked', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.handleCancel()

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
    })

    it('should not emit create event when cancelled', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.handleCancel()

      expect(wrapper.emitted('create')).toBeFalsy()
    })
  })

  describe('State persistence', () => {
    it('should maintain selections when modal is reopened', async () => {
      const wrapper = mount(CreateMissionModal, {
        props: {
          show: true,
        },
      })

      wrapper.vm.selectedSquadron = 'v303'
      wrapper.vm.selectedTheater = 'Syria'

      await wrapper.setProps({ show: false })
      await wrapper.setProps({ show: true })

      expect(wrapper.vm.selectedSquadron).toBe('v303')
      expect(wrapper.vm.selectedTheater).toBe('Syria')
    })
  })
})
