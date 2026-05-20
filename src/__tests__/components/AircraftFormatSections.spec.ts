import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { NInput, NSelect } from 'naive-ui'
import MissionTiming from '@/components/mission/aircraft-formats/MissionTiming.vue'
import MissionWeaponProfiles from '@/components/mission/aircraft-formats/MissionWeaponProfiles.vue'
import MissionDropZone from '@/components/mission/aircraft-formats/MissionDropZone.vue'
import type { Mission } from '@/types'

const baseMission = (overrides: Partial<Mission> = {}): Mission =>
  ({
    id: 'm1',
    name: 'M',
    callsign: 'V',
    date: '2024-01-15',
    missionNumber: '1',
    type: 'CAS',
    squadron: 'v93',
    theater: 'Caucasus',
    crew: [],
    packageMembers: [],
    supportAssets: [],
    waypoints: [],
    loadout: [],
    ecmCmds: { cmdsPrograms: [], chaffBingo: 0, flareBingo: 0 },
    radioPresets: [],
    departureRecovery: {},
    told: {},
    fuel: { takeoff: 0, joker: 0, bingo: 0 },
    details: {},
    createdAt: 'x',
    updatedAt: 'x',
    ...overrides,
  }) as Mission

describe('aircraft-format editor sections', () => {
  it('MissionTiming renders existing values and emits merged missionTiming', () => {
    const wrapper = mount(MissionTiming, {
      props: { mission: baseMission({ missionTiming: { step: '1200' } }) },
    })
    const first = wrapper.findComponent(NInput)
    expect(first.props('value')).toBe('1200')

    first.vm.$emit('update:value', '1230')
    const ev = wrapper.emitted('update:field')
    expect(ev?.[0]?.[0]).toBe('missionTiming')
    expect(ev?.[0]?.[1]).toEqual({ step: '1230' })
  })

  it('MissionWeaponProfiles renders both hard-coded F-16 profiles and emits a length-2 array on edit', () => {
    // Loadout includes a GBU-12 station so the dropdown surfaces it as an
    // option and the on-mount loadout-sync watcher leaves the stored value
    // alone (it only clears weapons that aren't in the loadout).
    const wrapper = mount(MissionWeaponProfiles, {
      props: {
        mission: baseMission({
          weaponProfiles: [{ weapon: 'GBU-12' }],
          loadout: [{ station: 3, item: 'DIS_GBU_12' }],
        }),
      },
    })
    // Both PROFILE 1 and PROFILE 2 are always present, even when stored data
    // only contains the first profile.
    expect(wrapper.text()).toContain('PROFILE 1')
    expect(wrapper.text()).toContain('PROFILE 2')

    // Editing the weapon select emits a 2-element weaponProfiles array with
    // the edit applied to index 0 and PROFILE 2 padded to an empty slot.
    const weapon = wrapper.findAllComponents(NSelect).find((c) => c.props('value') === 'GBU-12')
    if (!weapon) throw new Error('weapon select not found')
    weapon.vm.$emit('update:value', 'CBU-103')
    const ev = wrapper.emitted('update:field')
    expect(ev?.[0]?.[0]).toBe('weaponProfiles')
    const next = ev?.[0]?.[1] as { label?: string; weapon?: string }[]
    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({ label: 'PROFILE 1', weapon: 'CBU-103' })
    expect(next[1]).toMatchObject({ label: 'PROFILE 2' })
  })

  it('MissionWeaponProfiles clears the weapon when the loadout no longer contains it', async () => {
    const wrapper = mount(MissionWeaponProfiles, {
      props: {
        mission: baseMission({
          weaponProfiles: [{ label: 'PROFILE 1', weapon: 'GBU-12' }, { label: 'PROFILE 2' }],
          loadout: [{ station: 3, item: 'DIS_GBU_12' }],
        }),
      },
    })
    // No clearing emit on mount because GBU-12 is in the loadout.
    expect(wrapper.emitted('update:field')).toBeUndefined()

    // Swap the GBU-12 out — the watcher must now clear PROFILE 1's weapon.
    await wrapper.setProps({
      mission: baseMission({
        weaponProfiles: [{ label: 'PROFILE 1', weapon: 'GBU-12' }, { label: 'PROFILE 2' }],
        loadout: [{ station: 3, item: 'EMPTY' }],
      }),
    })
    const ev = wrapper.emitted('update:field')
    expect(ev).toBeDefined()
    expect(ev?.[0]?.[0]).toBe('weaponProfiles')
    const next = ev?.[0]?.[1] as { label?: string; weapon?: string }[]
    expect(next[0]).toMatchObject({ label: 'PROFILE 1', weapon: undefined })
    expect(next[1]).toMatchObject({ label: 'PROFILE 2' })
  })

  it('MissionDropZone renders and emits merged dropZone', () => {
    const wrapper = mount(MissionDropZone, {
      props: { mission: baseMission({ dropZone: { dzName: 'ALPHA' } }) },
    })
    // NInputNumber composes an NInput internally, so locate the dzName field
    // by its rendered value rather than render order.
    const nameInput = wrapper.findAllComponents(NInput).find((c) => c.props('value') === 'ALPHA')
    if (!nameInput) throw new Error('dzName input not found')

    nameInput.vm.$emit('update:value', 'BRAVO')
    const ev = wrapper.emitted('update:field')
    expect(ev?.[0]?.[0]).toBe('dropZone')
    const payload = ev?.[0]?.[1] as { dzName?: string } | undefined
    expect(payload?.dzName).toBe('BRAVO')
  })
})
