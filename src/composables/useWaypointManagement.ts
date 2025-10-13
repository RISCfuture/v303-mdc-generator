import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import type { Waypoint } from '@/types'

/**
 * Composable for managing waypoints (CRUD + reordering)
 */
export function useWaypointManagement(
  missionId: ComputedRef<string>,
  waypoints: ComputedRef<Waypoint[]>,
) {
  const missionsStore = useMissionsStore()
  const waypointDragDrop = useDragAndDrop<Waypoint>()

  function addWaypoint() {
    const newWaypoint: Waypoint = {
      sequence: waypoints.value.length + 1,
      name: '',
      latitude: null,
      longitude: null,
      altitude: null,
      type: 'NAV',
    }
    missionsStore.updateMission(missionId.value, {
      waypoints: [...waypoints.value, newWaypoint],
    })
  }

  function addWaypointFromNavaid(navaid: {
    name: string
    latitude: number
    longitude: number
    elevation?: number
  }) {
    const newWaypoint: Waypoint = {
      sequence: waypoints.value.length + 1,
      name: navaid.name,
      latitude: navaid.latitude,
      longitude: navaid.longitude,
      elevation: navaid.elevation ? Math.round(navaid.elevation) : undefined, // Elevation already in feet
      altitude: navaid.elevation ? Math.round(navaid.elevation) : 0, // Pre-fill altitude with elevation, or 0 as default
      type: 'NAV',
    }
    missionsStore.updateMission(missionId.value, {
      waypoints: [...waypoints.value, newWaypoint],
    })
  }

  function removeWaypoint(index: number) {
    const updatedWaypoints = waypoints.value.filter((_, i) => i !== index)
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
  }

  function handleWaypointDrop(targetIndex: number) {
    waypointDragDrop.handleDrop(targetIndex, waypoints.value, (updatedWaypoints) => {
      missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
    })
  }

  function moveWaypointUp(index: number) {
    if (index === 0) return
    const updatedWaypoints = [...waypoints.value]
    const current = updatedWaypoints[index]
    const prev = updatedWaypoints[index - 1]
    if (!current || !prev) return
    updatedWaypoints[index] = prev
    updatedWaypoints[index - 1] = current
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
  }

  function moveWaypointDown(index: number) {
    if (index === waypoints.value.length - 1) return
    const updatedWaypoints = [...waypoints.value]
    const current = updatedWaypoints[index]
    const next = updatedWaypoints[index + 1]
    if (!current || !next) return
    updatedWaypoints[index] = next
    updatedWaypoints[index + 1] = current
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
  }

  return {
    waypointDragDrop,
    addWaypoint,
    addWaypointFromNavaid,
    removeWaypoint,
    handleWaypointDrop,
    moveWaypointUp,
    moveWaypointDown,
  }
}
