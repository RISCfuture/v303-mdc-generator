import { computed, watch, type ComputedRef } from 'vue'
import { crewDatabase } from '@/data/crew'
import { useMissionsStore } from '@/stores/missions'
import type { Mission } from '@/types'

/**
 * Composable for managing flight callsign and Link16 prefix generation
 */
export function useMissionCallsigns(
  missionId: ComputedRef<string>,
  mission: ComputedRef<Mission | undefined>,
) {
  const missionsStore = useMissionsStore()

  // Get effective flight callsign (now always uses the override field which is required)
  const effectiveFlightCallsign = computed(() => {
    if (!mission.value) return ''
    return mission.value.flightCallsignOverride ?? ''
  })

  // Get effective Link16 prefix (now always uses the override field which is required)
  const effectiveLink16Prefix = computed(() => {
    if (!mission.value) return ''
    return mission.value.link16PrefixOverride ?? ''
  })

  // Get available callsign options from flight lead
  const availableCallsignOptions = computed(() => {
    if (!mission.value || mission.value.crew.length === 0) return []
    const flightLead = mission.value.crew[0]

    const pilot = crewDatabase.find((p) => p.pilot === flightLead.pilot)
    if (!pilot?.callsign) return []

    // Return callsign options as autocomplete options
    return pilot.callsign.map((cs) => ({ label: cs, value: cs }))
  })

  // Watch flight lead for callsign updates
  watch(
    () => mission.value?.crew[0],
    (flightLead) => {
      if (flightLead && mission.value) {
        // Extract callsign from crew database
        const pilot = crewDatabase.find((p) => p.pilot === flightLead.pilot)
        if (pilot) {
          const baseCallsign = pilot.link16Prefix
          missionsStore.updateMission(missionId.value, { callsign: baseCallsign })

          // Auto-update flight callsign and Link16 prefix when lead changes
          if (pilot.callsign.length > 0 && pilot.callsign[0]) {
            const defaultCallsign = pilot.callsign[0]
            missionsStore.updateMission(missionId.value, {
              flightCallsignOverride: defaultCallsign,
            })

            // Auto-generate Link16 prefix from the callsign
            generateLink16Prefix(defaultCallsign)
          }
        }
      }
    },
  )

  // Generate Link16 prefix from callsign
  function generateLink16Prefix(callsign: string) {
    if (!callsign) return

    const letters = callsign.replace(/[^A-Za-z]/g, '')
    if (letters.length >= 2) {
      const firstLetter = letters.charAt(0)
      const lastLetter = letters.charAt(letters.length - 1)
      const link16Prefix = (firstLetter + lastLetter).toUpperCase()
      missionsStore.updateMission(missionId.value, { link16PrefixOverride: link16Prefix })
    } else if (letters.length === 1) {
      const letter = letters.charAt(0)
      const link16Prefix = (letter + letter).toUpperCase()
      missionsStore.updateMission(missionId.value, { link16PrefixOverride: link16Prefix })
    }
  }

  // Update flight callsign and automatically derive Link16 prefix
  function updateFlightCallsign(value: string) {
    if (!mission.value) return

    // Update the callsign
    missionsStore.updateMission(missionId.value, { flightCallsignOverride: value })

    // Auto-generate Link16 prefix
    generateLink16Prefix(value)
  }

  return {
    effectiveFlightCallsign,
    effectiveLink16Prefix,
    availableCallsignOptions,
    updateFlightCallsign,
  }
}
