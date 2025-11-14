import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import { formatSTN, formatMode3, incrementMode3, formatLaserCode } from '@/utils/crewFormatting'
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

  /**
   * Calculate Mode 3 code for a crew member based on their position
   * Lead gets their own mode3, others get lead's mode3 + position offset
   */
  function calculateMode3ForPosition(index: number, pilotMode3: number): string {
    if (index === 0) {
      // Flight lead uses their own mode3 from database
      return formatMode3(pilotMode3)
    }

    // For other positions, get flight lead's mode3 and increment
    const leadMode3Raw = crew.value[0]?.mode3
    if (!leadMode3Raw) {
      // If no lead exists yet, use pilot's own mode3
      return formatMode3(pilotMode3)
    }

    // Parse lead's mode3 from string (octal) to decimal
    const leadMode3 = parseInt(leadMode3Raw, 8)

    // Increment by position offset (index times)
    let calculatedMode3 = leadMode3
    for (let i = 0; i < index; i++) {
      calculatedMode3 = incrementMode3(calculatedMode3)
    }

    return formatMode3(calculatedMode3)
  }

  /**
   * Recalculate mode-3 codes for all crew members based on current positions
   * Lead gets their original mode3 from database, others get recalculated based on position
   */
  function recalculateMode3Codes(crewList: CrewMember[]): void {
    if (crewList.length === 0) return

    const leadCrew = crewList[0]
    if (!leadCrew) return

    // Get lead's original mode3 from database
    const leadPilot = availableCrew.value.find((p) => p.pilot === leadCrew.pilot)
    if (!leadPilot) return

    // Update lead to their original mode3
    leadCrew.mode3 = formatMode3(leadPilot.mode3)
    const leadMode3 = leadPilot.mode3

    // Update each member's mode3 based on position
    crewList.forEach((member, i) => {
      if (i === 0) {
        // Lead already updated above
        return
      }

      // Calculate mode3 for this position
      let calculatedMode3 = leadMode3
      for (let j = 0; j < i; j++) {
        calculatedMode3 = incrementMode3(calculatedMode3)
      }

      member.mode3 = formatMode3(calculatedMode3)
    })
  }

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
      mode3: calculateMode3ForPosition(index, pilot.mode3),
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
    // Re-assign positions and own numbers
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()
    })
    // Recalculate mode-3 codes based on new positions
    recalculateMode3Codes(updatedCrew)
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
        // Recalculate mode-3 codes based on new positions
        recalculateMode3Codes(updatedCrew)
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
    // Recalculate mode-3 codes based on new positions
    recalculateMode3Codes(updatedCrew)
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
    // Recalculate mode-3 codes based on new positions
    recalculateMode3Codes(updatedCrew)
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
