import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import { formatSTN, formatMode3, formatLaserCode } from '@/utils/crewFormatting'
import { getCrewPositionLabel } from '@/data/constants'
import type { CrewMember } from '@/types'

export interface CrewDatabaseEntry {
  pilot: string
  callsign: string[]
  link16Prefix: string
  stn: number
  mode3: number
  aaTacan: number
  freq: string
  laserCode: number
  tailNumber: string
}

/**
 * Composable for managing crew members (CRUD + reordering)
 */
export function useCrewManagement(
  missionId: ComputedRef<string>,
  crew: ComputedRef<CrewMember[]>,
  availableCrew: ComputedRef<CrewDatabaseEntry[]>,
) {
  const missionsStore = useMissionsStore()
  const crewDragDrop = useDragAndDrop<CrewMember>()

  function addCrewMember(pilotName: string) {
    const pilot = availableCrew.value.find((p) => p.pilot === pilotName)
    if (!pilot) return

    const index = crew.value.length
    const crewMember: CrewMember = {
      position: getCrewPositionLabel(index),
      pilot: pilot.pilot,
      callsign: pilot.link16Prefix,
      own: (index + 1).toString(),
      stn: formatSTN(pilot.stn),
      mode3: formatMode3(pilot.mode3),
      aaTcn: `${pilot.aaTacan}Y`, // Store only the pilot's own TACAN
      intraflight: pilot.freq,
      laser: formatLaserCode(pilot.laserCode),
      tailNumber: pilot.tailNumber,
    }

    missionsStore.updateMission(missionId.value, {
      crew: [...crew.value, crewMember],
    })
  }

  function removeCrewMember(index: number) {
    const updatedCrew = crew.value.filter((_, i) => i !== index)
    // Re-assign positions
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()
    })
    missionsStore.updateMission(missionId.value, { crew: updatedCrew })
  }

  function handleCrewDrop(targetIndex: number) {
    crewDragDrop.handleDrop(
      targetIndex,
      crew.value,
      (updatedCrew) => {
        // Re-assign positions and own numbers
        updatedCrew.forEach((member, i) => {
          member.position = getCrewPositionLabel(i)
          member.own = (i + 1).toString()
        })
        missionsStore.updateMission(missionId.value, { crew: updatedCrew })
      },
      false, // Don't use automatic sequencing since we handle positions manually
    )
  }

  function moveCrewMemberUp(index: number) {
    if (index === 0) return
    const updatedCrew = [...crew.value]
    const current = updatedCrew[index]
    const prev = updatedCrew[index - 1]
    if (!current || !prev) return
    updatedCrew[index] = prev
    updatedCrew[index - 1] = current
    // Re-assign positions and own numbers
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()
    })
    missionsStore.updateMission(missionId.value, { crew: updatedCrew })
  }

  function moveCrewMemberDown(index: number) {
    if (index === crew.value.length - 1) return
    const updatedCrew = [...crew.value]
    const current = updatedCrew[index]
    const next = updatedCrew[index + 1]
    if (!current || !next) return
    updatedCrew[index] = next
    updatedCrew[index + 1] = current
    // Re-assign positions and own numbers
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()
    })
    missionsStore.updateMission(missionId.value, { crew: updatedCrew })
  }

  return {
    crewDragDrop,
    addCrewMember,
    removeCrewMember,
    handleCrewDrop,
    moveCrewMemberUp,
    moveCrewMemberDown,
  }
}
