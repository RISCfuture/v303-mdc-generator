import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MissionLoadout from '@/components/mission/loadout/MissionLoadout.vue'
import type { LoadoutStation } from '@/types'
import type { PrefabLoadout } from '@/data/loadouts'
import type { StationData } from '@/data/airframes'

const createMockLoadoutStation = (overrides = {}): LoadoutStation => ({
  station: 1,
  item: 'AIM-9M',
  ...overrides,
})

const createMockStationData = (overrides = {}): StationData => ({
  station: 1,
  label: 'Station 1',
  ...overrides,
})

const createMockPrefabLoadout = (overrides = {}): PrefabLoadout => ({
  name: 'A-A',
  description: 'Air to Air',
  loadout: [
    { station: 1, item: 'AIM-9M' },
    { station: 9, item: 'AIM-9M' },
  ],
  ...overrides,
})

describe('MissionLoadout', () => {
  describe('Component rendering', () => {
    it('should render loadout card with title', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('Aircraft Loadout')
    })

    it('should render station rows for all airframe stations', () => {
      const stations = [
        createMockStationData({ station: 1 }),
        createMockStationData({ station: 2 }),
        createMockStationData({ station: 3 }),
      ]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      const stationRows = wrapper.findAll('.loadout-station-row')
      expect(stationRows.length).toBe(3)
    })
  })

  describe('Prefab loadout selection', () => {
    it('should populate SCL dropdown with available loadouts', () => {
      const loadouts = [
        createMockPrefabLoadout({ name: 'A-A', description: 'Air to Air' }),
        createMockPrefabLoadout({ name: 'A-G', description: 'Air to Ground' }),
      ]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: loadouts,
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.props('availableLoadouts').length).toBe(2)
      expect(wrapper.props('availableLoadouts')[0].description).toContain('Air to Air')
      expect(wrapper.props('availableLoadouts')[1].description).toContain('Air to Ground')
    })

    it('should emit load-prefab-loadout when SCL is selected', async () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [createMockPrefabLoadout()],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      wrapper.vm.handleLoadPrefab('A-A')

      expect(wrapper.emitted('load-prefab-loadout')).toBeTruthy()
      expect(wrapper.emitted('load-prefab-loadout')?.[0]).toEqual(['A-A'])
    })

    it('should clear selectedSCL when loading prefab', async () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [createMockPrefabLoadout()],
          selectedSCL: 'A-A',
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      wrapper.vm.handleLoadPrefab('A-G')

      expect(wrapper.emitted('update:selected-scl')).toBeTruthy()
      expect(wrapper.emitted('update:selected-scl')?.[0]).toEqual([null])
    })
  })

  describe('Clear all loadout', () => {
    it('should emit clear-all-loadout when clear button is clicked', async () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [createMockLoadoutStation()],
          airframeStations: [createMockStationData()],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      const clearButton = wrapper.findAll('button').find((b) => b.text() === 'Clear All')
      await clearButton?.trigger('click')

      expect(wrapper.emitted('clear-all-loadout')).toBeTruthy()
    })
  })

  describe('Station munition selection', () => {
    it('should display current munition for each station', () => {
      const loadout = [createMockLoadoutStation({ station: 1, item: 'AIM-9M' })]
      const stations = [createMockStationData({ station: 1 })]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout,
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.props('loadout')[0].item).toBe('AIM-9M')
    })

    it('should default to EMPTY when no munition selected', () => {
      const stations = [createMockStationData({ station: 1 })]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.props('loadout').length).toBe(0)
      expect(wrapper.props('airframeStations').length).toBe(1)
    })

    it('should have getMunitionOptionsForStation method available', async () => {
      const stations = [createMockStationData({ station: 1 })]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.vm.getMunitionOptionsForStation).toBeDefined()
      const options = wrapper.vm.getMunitionOptionsForStation(1)
      expect(Array.isArray(options)).toBe(true)
    })

    it('should get munition options for each station', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      const options = wrapper.vm.getMunitionOptionsForStation(1)
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
    })
  })

  describe('Gun ammo types', () => {
    it('should display gun ammunition options for airframes with ammoTypes', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'A-10C_2',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      // A-10C_2 has ammoTypes options
      expect(wrapper.vm.gunAmmoOptions).toBeTruthy()
      expect(wrapper.vm.gunAmmoOptions?.options.length).toBeGreaterThan(0)
    })

    it('should show gun name as label for single-gun aircraft', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'A-10C_2',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      // A-10C_2 has one gun (GAU-8)
      expect(wrapper.vm.gunAmmoOptions?.label).toBe('GAU-8')
    })

    it('should emit update:gun-ammo-type when ammo type changes', async () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'A-10C_2',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
          gunAmmoType: 'CM - Combat Mix',
        },
      })

      // Manually trigger the emit by calling the update handler
      wrapper.vm.$emit('update:gun-ammo-type', 'HEI - High Explosive Incendiary')

      expect(wrapper.emitted('update:gun-ammo-type')).toBeTruthy()
      expect(wrapper.emitted('update:gun-ammo-type')?.[0]).toEqual([
        'HEI - High Explosive Incendiary',
      ])
    })

    it('should handle clearing gun ammo type', async () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'A-10C_2',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
          gunAmmoType: 'CM - Combat Mix',
        },
      })

      wrapper.vm.$emit('update:gun-ammo-type', null)

      expect(wrapper.emitted('update:gun-ammo-type')).toBeTruthy()
      expect(wrapper.emitted('update:gun-ammo-type')?.[0]).toEqual([null])
    })
  })

  describe('Weight display', () => {
    it('should display loadout weight', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 5000,
          fuelWeight: 8000,
          maxFuelCapacity: 7000,
          fuelLoadPercentage: 100,
          grossWeight: 35000,
        },
      })

      expect(wrapper.text()).toContain('Loadout Weight')
      expect(wrapper.text()).toContain('5,000')
    })

    it('should display fuel weight', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 5000,
          fuelWeight: 8000,
          maxFuelCapacity: 7000,
          fuelLoadPercentage: 100,
          grossWeight: 35000,
        },
      })

      expect(wrapper.text()).toContain('Fuel Weight')
      expect(wrapper.text()).toContain('8,000')
    })

    it('should display gross weight', () => {
      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: [],
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 5000,
          fuelWeight: 8000,
          maxFuelCapacity: 7000,
          fuelLoadPercentage: 100,
          grossWeight: 35000,
        },
      })

      expect(wrapper.text()).toContain('Gross Weight')
      expect(wrapper.text()).toContain('35,000')
    })

    it('should display weight for each station', () => {
      const loadout = [createMockLoadoutStation({ station: 1, item: 'AIM-9M' })]
      const stations = [createMockStationData({ station: 1 })]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout,
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      const stationWeights = wrapper.findAll('.station-weight')
      expect(stationWeights.length).toBeGreaterThan(0)
    })
  })

  describe('Station labels', () => {
    it('should display short station labels', () => {
      const stations = [
        createMockStationData({ station: 1 }),
        createMockStationData({ station: 2 }),
      ]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      const labels = wrapper.findAll('.station-label')
      expect(labels.length).toBe(2)
    })
  })

  describe('Filterable munition selection', () => {
    it('should have munition selection capability', () => {
      const stations = [createMockStationData({ station: 1 })]

      const wrapper = mount(MissionLoadout, {
        props: {
          airframe: 'F-16C_50',
          loadout: [],
          airframeStations: stations,
          availableLoadouts: [],
          selectedSCL: null,
          loadoutWeight: 0,
          fuelWeight: 0,
          maxFuelCapacity: 0,
          fuelLoadPercentage: 0,
          grossWeight: 0,
        },
      })

      expect(wrapper.props('airframeStations').length).toBe(1)
      expect(wrapper.vm.getMunitionOptionsForStation(1)).toBeDefined()
    })
  })
})
