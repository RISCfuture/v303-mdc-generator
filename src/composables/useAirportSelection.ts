import { ref, computed, watch, type Ref } from 'vue'
import { getAirfieldsForTheater } from '@/data/airfields'
import type { Theater } from '@/types'
import type { Airfield, Runway } from '@/types/airfield'

/**
 * Composable for managing airport and runway selection.
 * Provides reactive state and computed values for airport/runway selection UI.
 *
 * @param theater - Ref containing the theater (map) to load airfields for
 * @returns Airport selection state and helper functions
 */
export function useAirportSelection(theater: Ref<Theater>) {
  const selectedAirfieldName = ref<string | null>(null)
  const selectedRunwayName = ref<string | null>(null)
  const fieldElevation = ref<number | null>(null)

  // Load airfields for the mission's theater
  const airfields = computed(() => getAirfieldsForTheater(theater.value))

  // Dropdown options for airport selection
  const airfieldOptions = computed(() =>
    airfields.value.map((af) => ({
      label: af.name,
      value: af.name,
    })),
  )

  // Currently selected airfield
  const selectedAirfield = computed<Airfield | null>(() => {
    if (!selectedAirfieldName.value) return null
    return airfields.value.find((af) => af.name === selectedAirfieldName.value) || null
  })

  // Dropdown options for runway selection (based on selected airfield)
  const runwayOptions = computed(() => {
    if (!selectedAirfield.value) return []
    return selectedAirfield.value.runways.map((rw) => ({
      label: rw.name,
      value: rw.name,
    }))
  })

  // Currently selected runway
  const selectedRunway = computed<Runway | null>(() => {
    if (!selectedAirfield.value || !selectedRunwayName.value) return null
    return selectedAirfield.value.runways.find((rw) => rw.name === selectedRunwayName.value) || null
  })

  // Auto-fill field elevation when airfield changes
  watch(selectedAirfield, (airfield) => {
    if (airfield?.position?.elevation) {
      fieldElevation.value = airfield.position.elevation
    } else {
      fieldElevation.value = null
    }
  })

  /**
   * Set the selected airport by name
   * @param airportName - Name of the airport to select
   */
  function setAirport(airportName: string | null) {
    selectedAirfieldName.value = airportName
    selectedRunwayName.value = null // Clear runway when airport changes
  }

  /**
   * Set the selected runway by name
   * @param runwayName - Name of the runway to select
   */
  function setRunway(runwayName: string | null) {
    selectedRunwayName.value = runwayName
  }

  /**
   * Initialize the selection state from existing values
   * @param airportId - Initial airport ID
   * @param runwayName - Initial runway name
   * @param elevation - Initial field elevation
   */
  function initialize(airportId?: string, runwayName?: string, elevation?: number) {
    selectedAirfieldName.value = airportId ?? null
    selectedRunwayName.value = runwayName ?? null
    fieldElevation.value = elevation ?? null
  }

  return {
    // State
    selectedAirfieldName,
    selectedRunwayName,
    fieldElevation,

    // Computed
    airfields,
    airfieldOptions,
    selectedAirfield,
    runwayOptions,
    selectedRunway,

    // Methods
    setAirport,
    setRunway,
    initialize,
  }
}
