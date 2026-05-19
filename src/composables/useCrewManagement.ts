import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import { formatMode3, incrementMode3, formatLaserCode } from '@/utils/crewFormatting'
import { getCrewPositionLabel } from '@/data/constants'
import { airframeDatabase } from '@/data/airframes'
import { getDatalinkType, getCrewMemberSTN, formatSTNForDatalink } from '@/utils/datalinkHelpers'
import type { CrewMember } from '@/types'

export type CrewDatabaseEntry = {
  pilot: string
  callsign: string[]
  link16Prefix: string
  stn: number
  mode3?: number | null
  aaTacan: number
  freq: string
  laserCode?: number | null
  tailNumber?: string
}

/**
 * Composable for managing crew members (CRUD + reordering)
 */
export function useCrewManagement(
  missionId: ComputedRef<string>,
  crew: ComputedRef<CrewMember[]>,
  availableCrew: ComputedRef<CrewDatabaseEntry[]>,
  airframe: ComputedRef<string>,
) {
  const missionsStore = useMissionsStore()
  const crewDragDrop = useDragAndDrop<CrewMember>()

  /**
   * Calculate Mode 3 code for a crew member based on their position
   * Lead gets their own mode3, others get lead's mode3 + position offset
   * Returns empty string if mode3 is not applicable (null/undefined)
   */
  function calculateMode3ForPosition(index: number, pilotMode3: number | null | undefined): string {
    if (pilotMode3 == null) {
      // Mode 3 not applicable for this crew member
      return ''
    }

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
   * Skips recalculation if lead's mode3 is not applicable (null/undefined)
   */
  function recalculateMode3Codes(crewList: CrewMember[]): void {
    if (crewList.length === 0) return

    const leadCrew = crewList[0]

    // Get lead's original mode3 from database
    const leadPilot = availableCrew.value.find((p) => p.pilot === leadCrew.pilot)
    if (!leadPilot) return

    // If lead's mode3 is not applicable, clear all mode3 values
    if (leadPilot.mode3 == null) {
      crewList.forEach((member) => {
        member.mode3 = ''
      })
      return
    }

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
    const aircraftData = airframeDatabase[airframe.value]
    const datalinkType = getDatalinkType(aircraftData)

    // Get the lead's STN for SADL calculation
    const leadSTN =
      crew.value.length > 0 && crew.value[0] ? parseInt(crew.value[0].stn) || pilot.stn : pilot.stn

    // Calculate STN based on datalink type
    const stn = getCrewMemberSTN(pilot.stn, leadSTN, index, datalinkType)
    const stnFormatted = stn != null ? formatSTNForDatalink(stn, datalinkType) : ''

    const crewMember: CrewMember = {
      position: getCrewPositionLabel(index),
      pilot: pilot.pilot,
      callsign: pilot.link16Prefix,
      own: (index + 1).toString(),
      stn: stnFormatted,
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
    const aircraftData = airframeDatabase[airframe.value]
    const datalinkType = getDatalinkType(aircraftData)

    // Re-assign positions and STNs
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()

      // For SADL, recalculate STNs based on new positions
      if (datalinkType === 'sadl' && updatedCrew.length > 0 && updatedCrew[0]) {
        const leadSTN = parseInt(updatedCrew[0].stn) || 1134 // Default if parsing fails
        const stn = getCrewMemberSTN(null, leadSTN, i, datalinkType)
        if (stn != null) {
          member.stn = formatSTNForDatalink(stn, datalinkType)
        }
      }
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
        const aircraftData = airframeDatabase[airframe.value]
        const datalinkType = getDatalinkType(aircraftData)

        // Re-assign positions, own numbers, and STNs
        updatedCrew.forEach((member, i) => {
          member.position = getCrewPositionLabel(i)
          member.own = (i + 1).toString()

          // For SADL, recalculate STNs based on new positions
          if (datalinkType === 'sadl' && updatedCrew.length > 0 && updatedCrew[0]) {
            const leadSTN = parseInt(updatedCrew[0].stn) || 1134
            const stn = getCrewMemberSTN(null, leadSTN, i, datalinkType)
            if (stn != null) {
              member.stn = formatSTNForDatalink(stn, datalinkType)
            }
          }
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
    updatedCrew[index] = prev
    updatedCrew[index - 1] = current

    const aircraftData = airframeDatabase[airframe.value]
    const datalinkType = getDatalinkType(aircraftData)

    // Re-assign positions, own numbers, and STNs
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()

      // For SADL, recalculate STNs based on new positions
      if (datalinkType === 'sadl' && updatedCrew.length > 0 && updatedCrew[0]) {
        const leadSTN = parseInt(updatedCrew[0].stn) || 1134
        const stn = getCrewMemberSTN(null, leadSTN, i, datalinkType)
        if (stn != null) {
          member.stn = formatSTNForDatalink(stn, datalinkType)
        }
      }
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
    updatedCrew[index] = next
    updatedCrew[index + 1] = current

    const aircraftData = airframeDatabase[airframe.value]
    const datalinkType = getDatalinkType(aircraftData)

    // Re-assign positions, own numbers, and STNs
    updatedCrew.forEach((member, i) => {
      member.position = getCrewPositionLabel(i)
      member.own = (i + 1).toString()

      // For SADL, recalculate STNs based on new positions
      if (datalinkType === 'sadl' && updatedCrew.length > 0 && updatedCrew[0]) {
        const leadSTN = parseInt(updatedCrew[0].stn) || 1134
        const stn = getCrewMemberSTN(null, leadSTN, i, datalinkType)
        if (stn != null) {
          member.stn = formatSTNForDatalink(stn, datalinkType)
        }
      }
    })
    // Recalculate mode-3 codes based on new positions
    recalculateMode3Codes(updatedCrew)
    missionsStore.updateMission(missionId.value, { crew: updatedCrew })
  }

  /**
   * Update editable (non-database-derived) fields on a single crew member,
   * e.g. copilot / copilotCallsign for two-crew airframes.
   */
  function updateCrewMember(index: number, patch: Partial<CrewMember>) {
    const updatedCrew = crew.value.map((member, i) =>
      i === index ? { ...member, ...patch } : member,
    )
    missionsStore.updateMission(missionId.value, { crew: updatedCrew })
  }

  return {
    crewDragDrop,
    addCrewMember,
    removeCrewMember,
    handleCrewDrop,
    moveCrewMemberUp,
    moveCrewMemberDown,
    updateCrewMember,
  }
}
