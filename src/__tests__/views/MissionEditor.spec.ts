import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRoute, useRouter } from 'vue-router'
import MissionEditor from '@/views/MissionEditor.vue'
import { useMissionsStore } from '@/stores/missions'
import type { Mission } from '@/types'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}))

// Mock Naive UI components
vi.mock('naive-ui', async () => {
  const actual = await vi.importActual('naive-ui')
  return {
    ...actual,
    useMessage: vi.fn(() => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })),
    useDialog: vi.fn(() => ({
      warning: vi.fn(() => ({
        then: vi.fn(),
      })),
    })),
  }
})

// Mock composables that might cause issues in tests
vi.mock('@/composables/useMissionExport', () => ({
  useMissionExport: vi.fn(() => ({
    exportMission: vi.fn(),
    isMissionComplete: vi.fn(() => true),
    validationErrors: [],
  })),
}))

describe('MissionEditor - Auto-create Steerpoint 1', () => {
  let mockRoute: ReturnType<typeof vi.fn>
  let mockRouter: ReturnType<typeof vi.fn>
  let missionsStore: ReturnType<typeof useMissionsStore>

  const createMockMission = (overrides = {}): Mission => ({
    id: 'mission-1',
    name: 'Test Mission',
    callsign: 'Viper 1',
    flightCallsignOverride: '',
    link16PrefixOverride: '',
    type: 'CAS',
    date: '2024-01-15',
    missionNumber: 'M-001',
    squadron: 'v303',
    theater: 'Afghanistan',
    crew: [],
    packageMembers: [],
    supportAssets: [],
    waypoints: [],
    bullseye: undefined,
    loadout: [],
    ecmCmds: {
      cmdsPrograms: [],
      chaffBingo: 10,
      flareBingo: 10,
      chaffTotal: 240,
      flareTotal: 120,
    },
    radioPresets: [],
    departureRecovery: {},
    told: {},
    fuel: {
      takeoff: 10000,
      joker: 3000,
      bingo: 2000,
      fuelLoadPercentage: 100,
    },
    weather: '',
    details: {
      remarks: '',
    },
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  })

  const mountComponent = (mockMission: Mission) => {
    return mount(MissionEditor, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              missions: {
                missions: [mockMission],
                currentMissionId: 'mission-1',
              },
            },
          }),
        ],
        stubs: {
          NButton: true,
          NPageHeader: true,
          NSpace: true,
          NTabs: true,
          NTabPane: true,
          NDropdown: true,
          NIcon: true,
          NPopover: true,
          MissionBasicInfo: true,
          MissionSteerpoints: true,
          MissionFlightMembers: true,
          MissionLoadout: true,
          RadioPresetsEditor: true,
          MissionTOLDFuel: true,
          MissionTargets: true,
          MissionBriefing: true,
          MissionECMCMDS: true,
          SpeedCalculatorModal: true,
          BingoCalculatorModal: true,
          MissionPackage: true,
          MissionSupportAssets: true,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup router mocks
    mockRoute = vi.fn(() => ({
      params: { id: 'mission-1' },
      path: '/missions/mission-1',
    }))
    mockRouter = vi.fn(() => ({
      push: vi.fn(),
      back: vi.fn(),
    }))

    vi.mocked(useRoute).mockReturnValue(mockRoute() as ReturnType<typeof useRoute>)
    vi.mocked(useRouter).mockReturnValue(mockRouter() as ReturnType<typeof useRouter>)
  })

  describe('Auto-creating steerpoint 1 from departure airfield', () => {
    it('should auto-create steerpoint 1 when departure airfield is set and no waypoints exist', async () => {
      const mockMission = createMockMission({
        theater: 'Afghanistan',
        waypoints: [], // No waypoints initially
      })

      const wrapper = mount(MissionEditor, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                missions: {
                  missions: [mockMission],
                  currentMissionId: 'mission-1',
                },
              },
              stubActions: false, // Important: don't stub actions so updateMission works
            }),
          ],
          stubs: {
            NButton: true,
            NPageHeader: true,
            NSpace: true,
            NTabs: true,
            NTabPane: true,
            NDropdown: true,
            NIcon: true,
            NPopover: true,
            MissionBasicInfo: true,
            MissionSteerpoints: true,
            MissionFlightMembers: true,
            MissionLoadout: true,
            RadioPresetsEditor: true,
            MissionTOLDFuel: true,
            MissionTargets: true,
            MissionBriefing: true,
            MissionECMCMDS: true,
            SpeedCalculatorModal: true,
            BingoCalculatorModal: true,
            MissionPackage: true,
            MissionSupportAssets: true,
          },
        },
      })

      // Get the store instance
      missionsStore = useMissionsStore()

      // Spy on updateMission to track calls
      const updateMissionSpy = vi.spyOn(missionsStore, 'updateMission')

      // Simulate setting departure airfield
      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'Kandahar')
      await flushPromises()

      // Get all calls to updateMission
      const updateCalls = updateMissionSpy.mock.calls

      // Find the call that includes waypoints
      const waypointCall = updateCalls.find((call) => call[1].waypoints !== undefined)

      // Verify that a waypoint was created
      expect(waypointCall).toBeDefined()
      expect(waypointCall![1].waypoints).toHaveLength(1)
      expect(waypointCall![1].waypoints![0]).toMatchObject({
        sequence: 1,
        name: 'Kandahar',
        type: 'PARK',
      })
      expect(waypointCall![1].waypoints![0].latitude).toBeTypeOf('number')
      expect(waypointCall![1].waypoints![0].longitude).toBeTypeOf('number')
      expect(waypointCall![1].waypoints![0].elevation).toBeDefined()
      expect(waypointCall![1].waypoints![0].altitude).toBeTypeOf('number')
    })

    it('should update steerpoint 1 when exactly one waypoint exists', async () => {
      const mockMission = createMockMission({
        theater: 'Afghanistan',
        waypoints: [
          {
            sequence: 1,
            name: 'Old Waypoint',
            latitude: 31.5,
            longitude: 65.8,
            elevation: 3000,
            altitude: 3000,
            type: 'STPT',
            timeOnTarget: '12:00:00',
          },
        ],
      })

      const wrapper = mount(MissionEditor, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                missions: {
                  missions: [mockMission],
                  currentMissionId: 'mission-1',
                },
              },
              stubActions: false,
            }),
          ],
          stubs: {
            NButton: true,
            NPageHeader: true,
            NSpace: true,
            NTabs: true,
            NTabPane: true,
            NDropdown: true,
            NIcon: true,
            NPopover: true,
            MissionBasicInfo: true,
            MissionSteerpoints: true,
            MissionFlightMembers: true,
            MissionLoadout: true,
            RadioPresetsEditor: true,
            MissionTOLDFuel: true,
            MissionTargets: true,
            MissionBriefing: true,
            MissionECMCMDS: true,
            SpeedCalculatorModal: true,
            BingoCalculatorModal: true,
            MissionPackage: true,
            MissionSupportAssets: true,
          },
        },
      })

      missionsStore = useMissionsStore()
      const updateMissionSpy = vi.spyOn(missionsStore, 'updateMission')

      // Simulate setting departure airfield
      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'Kandahar')
      await flushPromises()

      // Get all calls to updateMission
      const updateCalls = updateMissionSpy.mock.calls

      // Find the call that includes waypoints
      const waypointCall = updateCalls.find((call) => call[1].waypoints !== undefined)

      // Verify that the waypoint was updated with new airport data
      expect(waypointCall).toBeDefined()
      expect(waypointCall![1].waypoints).toHaveLength(1)
      expect(waypointCall![1].waypoints![0]).toMatchObject({
        sequence: 1,
        name: 'Kandahar',
        type: 'STPT', // Type should be preserved
        timeOnTarget: '12:00:00', // Other properties should be preserved
      })
      expect(waypointCall![1].waypoints![0].latitude).toBeTypeOf('number')
      expect(waypointCall![1].waypoints![0].longitude).toBeTypeOf('number')
      expect(waypointCall![1].waypoints![0].elevation).toBeDefined()
      expect(waypointCall![1].waypoints![0].altitude).toBeTypeOf('number')
    })

    it('should NOT modify waypoints when more than one waypoint exists', async () => {
      const mockMission = createMockMission({
        theater: 'Afghanistan',
        waypoints: [
          {
            sequence: 1,
            name: 'Waypoint 1',
            latitude: 31.5,
            longitude: 65.8,
            elevation: 3000,
            altitude: 3000,
            type: 'STPT',
          },
          {
            sequence: 2,
            name: 'Waypoint 2',
            latitude: 32.0,
            longitude: 66.0,
            elevation: 3500,
            altitude: 3500,
            type: 'NAV',
          },
        ],
      })

      const wrapper = mountComponent(mockMission)
      missionsStore = useMissionsStore()

      // Clear any calls from initialization
      vi.clearAllMocks()

      // Simulate setting departure airfield
      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'Kandahar')
      await flushPromises()

      // Verify that updateMission was NOT called to modify waypoints
      // (only the departureAirportId field should be updated)
      const updateCalls = vi.mocked(missionsStore.updateMission).mock.calls
      const waypointUpdateCalls = updateCalls.filter((call) => call[1].waypoints !== undefined)

      expect(waypointUpdateCalls).toHaveLength(0)
    })

    it('should NOT auto-create steerpoint 1 when departure airfield is not found', async () => {
      const mockMission = createMockMission({
        theater: 'Afghanistan',
        waypoints: [],
      })

      const wrapper = mountComponent(mockMission)
      missionsStore = useMissionsStore()

      // Clear any calls from initialization
      vi.clearAllMocks()

      // Simulate setting a non-existent departure airfield
      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'NonExistentAirfield')
      await flushPromises()

      // Verify that updateMission was NOT called to add a waypoint
      const updateCalls = vi.mocked(missionsStore.updateMission).mock.calls
      const waypointUpdateCalls = updateCalls.filter((call) => call[1].waypoints !== undefined)

      expect(waypointUpdateCalls).toHaveLength(0)
    })

    it('should use airfield elevation for waypoint altitude', async () => {
      const mockMission = createMockMission({
        theater: 'GermanyCW',
        waypoints: [],
      })

      const wrapper = mount(MissionEditor, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                missions: {
                  missions: [mockMission],
                  currentMissionId: 'mission-1',
                },
              },
              stubActions: false,
            }),
          ],
          stubs: {
            NButton: true,
            NPageHeader: true,
            NSpace: true,
            NTabs: true,
            NTabPane: true,
            NDropdown: true,
            NIcon: true,
            NPopover: true,
            MissionBasicInfo: true,
            MissionSteerpoints: true,
            MissionFlightMembers: true,
            MissionLoadout: true,
            RadioPresetsEditor: true,
            MissionTOLDFuel: true,
            MissionTargets: true,
            MissionBriefing: true,
            MissionECMCMDS: true,
            SpeedCalculatorModal: true,
            BingoCalculatorModal: true,
            MissionPackage: true,
            MissionSupportAssets: true,
          },
        },
      })

      missionsStore = useMissionsStore()
      const updateMissionSpy = vi.spyOn(missionsStore, 'updateMission')

      // Simulate setting Spangdahlem airfield
      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'Spangdahlem')
      await flushPromises()

      // Get all calls to updateMission
      const updateCalls = updateMissionSpy.mock.calls

      // Find the call that includes waypoints
      const waypointCall = updateCalls.find((call) => call[1].waypoints !== undefined)

      // Verify the waypoint has correct elevation/altitude
      expect(waypointCall).toBeDefined()
      expect(waypointCall![1].waypoints).toHaveLength(1)

      const waypoint = waypointCall![1].waypoints![0]
      expect(waypoint).toMatchObject({
        sequence: 1,
        name: 'Spangdahlem',
      })

      // Altitude should equal elevation (or 0 if elevation is undefined)
      expect(waypoint.altitude).toBe(waypoint.elevation ?? 0)
    })

    it('should set waypoint type to PARK', async () => {
      const mockMission = createMockMission({
        theater: 'Afghanistan',
        waypoints: [],
      })

      const wrapper = mount(MissionEditor, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                missions: {
                  missions: [mockMission],
                  currentMissionId: 'mission-1',
                },
              },
              stubActions: false,
            }),
          ],
          stubs: {
            NButton: true,
            NPageHeader: true,
            NSpace: true,
            NTabs: true,
            NTabPane: true,
            NDropdown: true,
            NIcon: true,
            NPopover: true,
            MissionBasicInfo: true,
            MissionSteerpoints: true,
            MissionFlightMembers: true,
            MissionLoadout: true,
            RadioPresetsEditor: true,
            MissionTOLDFuel: true,
            MissionTargets: true,
            MissionBriefing: true,
            MissionECMCMDS: true,
            SpeedCalculatorModal: true,
            BingoCalculatorModal: true,
            MissionPackage: true,
            MissionSupportAssets: true,
          },
        },
      })

      missionsStore = useMissionsStore()
      const updateMissionSpy = vi.spyOn(missionsStore, 'updateMission')

      wrapper.vm.updateNestedField('departureRecovery', 'departureAirportId', 'Kandahar')
      await flushPromises()

      // Get all calls to updateMission
      const updateCalls = updateMissionSpy.mock.calls

      // Find the call that includes waypoints
      const waypointCall = updateCalls.find((call) => call[1].waypoints !== undefined)

      // Verify waypoint type is PARK
      expect(waypointCall).toBeDefined()
      expect(waypointCall![1].waypoints![0].type).toBe('PARK')
    })
  })
})
