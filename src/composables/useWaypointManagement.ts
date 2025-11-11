import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import type { Waypoint } from '@/types'

/**
 * Clear VIP/VRP/PUP data from waypoints that are not the first TGT
 * Only the first TGT waypoint should have VIP/VRP/PUP reference points
 */
function clearNonFirstTgtReferencePoints(waypoints: Waypoint[]): Waypoint[] {
  const firstTgtIndex = waypoints.findIndex((wp) => wp.type === 'TGT')

  return waypoints.map((wp, index) => {
    // If this is a TGT waypoint but not the first TGT, clear VIP/VRP/PUP data
    if (wp.type === 'TGT' && index !== firstTgtIndex && wp.ccip) {
      return {
        ...wp,
        ccip: {
          ...wp.ccip,
          referencePointType: undefined,
          vip: undefined,
          vrp: undefined,
          pup: undefined,
        },
      }
    }
    return wp
  })
}

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
    // Get the coordinate format from the last waypoint, if any
    const lastWaypoint = waypoints.value[waypoints.value.length - 1]
    const coordinateFormat = lastWaypoint?.coordinateFormat

    // First steerpoint should default to PARK, all others to NAV
    const isFirstSteerpoint = waypoints.value.length === 0
    const defaultType = isFirstSteerpoint ? 'PARK' : 'NAV'

    const newWaypoint: Waypoint = {
      sequence: waypoints.value.length + 1,
      name: '',
      latitude: null,
      longitude: null,
      altitude: null,
      type: defaultType,
      ...(coordinateFormat && { coordinateFormat }),
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
    // Get the coordinate format from the last waypoint, if any
    const lastWaypoint = waypoints.value[waypoints.value.length - 1]
    const coordinateFormat = lastWaypoint?.coordinateFormat

    // First steerpoint should default to PARK, all others to NAV
    const isFirstSteerpoint = waypoints.value.length === 0
    const defaultType = isFirstSteerpoint ? 'PARK' : 'NAV'

    const newWaypoint: Waypoint = {
      sequence: waypoints.value.length + 1,
      name: navaid.name,
      latitude: navaid.latitude,
      longitude: navaid.longitude,
      elevation: navaid.elevation ? Math.round(navaid.elevation) : undefined, // Elevation already in feet
      altitude: navaid.elevation ? Math.round(navaid.elevation) : 0, // Pre-fill altitude with elevation, or 0 as default
      type: defaultType,
      ...(coordinateFormat && { coordinateFormat }),
    }
    missionsStore.updateMission(missionId.value, {
      waypoints: [...waypoints.value, newWaypoint],
    })
  }

  function removeWaypoint(index: number) {
    let updatedWaypoints = waypoints.value.filter((_, i) => i !== index)
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    // Clear VIP/VRP/PUP from waypoints that are no longer the first TGT
    updatedWaypoints = clearNonFirstTgtReferencePoints(updatedWaypoints)
    missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
  }

  function handleWaypointDrop(targetIndex: number) {
    waypointDragDrop.handleDrop(targetIndex, waypoints.value, (updatedWaypoints) => {
      // Clear VIP/VRP/PUP from waypoints that are no longer the first TGT
      const cleanedWaypoints = clearNonFirstTgtReferencePoints(updatedWaypoints)
      missionsStore.updateMission(missionId.value, { waypoints: cleanedWaypoints })
    })
  }

  function moveWaypointUp(index: number) {
    if (index === 0) return
    let updatedWaypoints = [...waypoints.value]
    const current = updatedWaypoints[index]
    const prev = updatedWaypoints[index - 1]
    if (!current || !prev) return
    updatedWaypoints[index] = prev
    updatedWaypoints[index - 1] = current
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    // Clear VIP/VRP/PUP from waypoints that are no longer the first TGT
    updatedWaypoints = clearNonFirstTgtReferencePoints(updatedWaypoints)
    missionsStore.updateMission(missionId.value, { waypoints: updatedWaypoints })
  }

  function moveWaypointDown(index: number) {
    if (index === waypoints.value.length - 1) return
    let updatedWaypoints = [...waypoints.value]
    const current = updatedWaypoints[index]
    const next = updatedWaypoints[index + 1]
    if (!current || !next) return
    updatedWaypoints[index] = next
    updatedWaypoints[index + 1] = current
    updatedWaypoints.forEach((wp, i) => (wp.sequence = i + 1))
    // Clear VIP/VRP/PUP from waypoints that are no longer the first TGT
    updatedWaypoints = clearNonFirstTgtReferencePoints(updatedWaypoints)
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
