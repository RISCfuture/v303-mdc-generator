import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { computed } from 'vue'
import { useWaypointManagement } from '@/composables/useWaypointManagement'
import { useMissionsStore } from '@/stores/missions'

describe('useWaypointManagement', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should create custom waypoint with null lat/lon', () => {
    const missionsStore = useMissionsStore()
    // Use Nevada which has no default airfield, so starts with 0 waypoints
    const mission = missionsStore.createMission('v93', 'Nevada')

    const missionId = computed(() => mission.id)
    const waypoints = computed(() => missionsStore.getMission(mission.id)?.waypoints ?? [])

    const { addWaypoint } = useWaypointManagement(missionId, waypoints)

    // Add a custom waypoint
    addWaypoint()

    // Verify the waypoint was added
    const updatedMission = missionsStore.getMission(mission.id)
    expect(updatedMission?.waypoints).toHaveLength(1)

    const newWaypoint = updatedMission?.waypoints[0]
    expect(newWaypoint).toBeDefined()
    expect(newWaypoint?.sequence).toBe(1)
    expect(newWaypoint?.name).toBe('')
    expect(newWaypoint?.latitude).toBe(null)
    expect(newWaypoint?.longitude).toBe(null)
    expect(newWaypoint?.altitude).toBe(null)
  })

  it('should create waypoint from navaid with valid coordinates', () => {
    const missionsStore = useMissionsStore()
    // Use Nevada which has no default airfield, so starts with 0 waypoints
    const mission = missionsStore.createMission('v93', 'Nevada')

    const missionId = computed(() => mission.id)
    const waypoints = computed(() => missionsStore.getMission(mission.id)?.waypoints ?? [])

    const { addWaypointFromNavaid } = useWaypointManagement(missionId, waypoints)

    // Add a waypoint from navaid
    const navaid = {
      name: 'KANDAHAR',
      latitude: 31.5058,
      longitude: 65.8478,
      elevation: 3337,
    }
    addWaypointFromNavaid(navaid)

    // Verify the waypoint was added with proper coordinates
    const updatedMission = missionsStore.getMission(mission.id)
    expect(updatedMission?.waypoints).toHaveLength(1)

    const newWaypoint = updatedMission?.waypoints[0]
    expect(newWaypoint).toBeDefined()
    expect(newWaypoint?.name).toBe('KANDAHAR')
    expect(newWaypoint?.latitude).toBe(31.5058)
    expect(newWaypoint?.longitude).toBe(65.8478)
    expect(newWaypoint?.elevation).toBe(3337)
    expect(newWaypoint?.altitude).toBe(3337)
  })

  it('should handle distance calculation with null coordinates', async () => {
    const missionsStore = useMissionsStore()
    // Use Nevada which has no default airfield, so starts with 0 waypoints
    const mission = missionsStore.createMission('v93', 'Nevada')

    const missionId = computed(() => mission.id)
    const waypoints = computed(() => missionsStore.getMission(mission.id)?.waypoints ?? [])

    const { addWaypoint } = useWaypointManagement(missionId, waypoints)

    // Add two custom waypoints with null coordinates
    addWaypoint()
    addWaypoint()

    const updatedMission = missionsStore.getMission(mission.id)
    const wps = updatedMission?.waypoints ?? []

    // Import the calculation function
    const { calculateDistance } = await import('@/composables/useWaypointCalculations')

    // Distance should be null when coordinates are null
    const distance = calculateDistance(wps[0], wps[1])
    expect(distance).toBe(null)
  })
})
