import { computed, type ComputedRef } from 'vue'
import { getLoadoutOnlyWeight, getFuelCapacity } from '@/data/munitions'
import { getAirframeData } from '@/utils/airframeHelpers'
import {
  calculateStandardSpeeds,
  calculateSpeeds as calculateF16Speeds,
  calculateHeadwindComponent,
  calculateTotalDragIndex,
  calculateBingoFuel,
  calculateDefaultBingo,
} from '@/aircraft/F-16C_50'
import {
  calculateStandardSpeeds as calculateA10Speeds,
  calculateSpeeds as calculateA10SpeedsAdvanced,
} from '@/aircraft/A-10A'
import { getMissionAirframe } from '@/utils/missionHelpers'
import type { Mission } from '@/types'

/**
 * Composable for calculating mission weights and performance data
 */
export function useMissionWeights(mission: ComputedRef<Mission | undefined>) {
  // Calculate total loadout weight (weapons + empty fuel tanks, no fuel)
  const loadoutWeight = computed(() => {
    if (!mission.value) return 0
    return mission.value.loadout.reduce((total, station) => {
      return total + getLoadoutOnlyWeight(station.item)
    }, 0)
  })

  // Calculate fuel weight (internal + external tanks)
  const fuelWeight = computed(() => {
    if (!mission.value) return 0

    const airframe = getMissionAirframe(mission.value)
    const airframeData = getAirframeData(airframe)
    const internalFuel = airframeData?.internalFuel || 0

    // External fuel from tanks in loadout (fuel capacity, not tank weight)
    const externalFuel = mission.value.loadout.reduce((total, station) => {
      const item = station.item
      const fuelCapacity = getFuelCapacity(item)
      if (fuelCapacity > 0) {
        return total + fuelCapacity
      }
      return total
    }, 0)

    const maxFuel = internalFuel + externalFuel

    // Apply fuel load percentage (defaults to 100%)
    const fuelLoadPercentage = mission.value.fuel.fuelLoadPercentage ?? 100
    return (maxFuel * fuelLoadPercentage) / 100
  })

  // Calculate gross weight (empty + loadout + fuel)
  const grossWeight = computed(() => {
    if (!mission.value) return 0
    const airframe = getMissionAirframe(mission.value)
    const airframeData = getAirframeData(airframe)
    const emptyWeight = airframeData?.emptyWeight || 0
    return emptyWeight + loadoutWeight.value + fuelWeight.value
  })

  // Calculate rotation and refusal speeds (F-16C and A-10C)
  const calculatedSpeeds = computed(() => {
    if (!mission.value) return null
    if (grossWeight.value === 0) return null

    const airframe = getMissionAirframe(mission.value)
    const calculatorParams = mission.value.told.calculatorParams

    if (airframe === 'F-16C_50') {
      // Use stored calculator params if available, otherwise use standard speeds
      if (calculatorParams && 'powerSetting' in calculatorParams) {
        // Calculate headwind component if wind and runway data are available
        let headwindComponent = 0
        if (
          calculatorParams.windDirection !== undefined &&
          calculatorParams.windSpeed !== undefined &&
          mission.value.departureRecovery.departureRunwayHeading !== undefined
        ) {
          headwindComponent = calculateHeadwindComponent(
            calculatorParams.windDirection,
            calculatorParams.windSpeed,
            mission.value.departureRecovery.departureRunwayHeading,
          )
        }

        return calculateF16Speeds({
          grossWeight: grossWeight.value,
          powerSetting: calculatorParams.powerSetting,
          cgPercent: calculatorParams.cgPercent,
          pitchAttitude: calculatorParams.pitchAttitude,
          runwayCondition: calculatorParams.runwayCondition,
          headwindComponent: headwindComponent,
          runwaySlope: calculatorParams.runwaySlope,
        })
      } else {
        // Fallback: Assume AB takeoff for F-16C
        return calculateStandardSpeeds(grossWeight.value, 'AB')
      }
    } else if (airframe === 'A-10C_2') {
      // Use stored calculator params if available, otherwise use standard speeds
      if (calculatorParams && 'flapSetting' in calculatorParams) {
        return calculateA10SpeedsAdvanced({
          grossWeight: grossWeight.value,
          flapSetting: calculatorParams.flapSetting,
          speedBrakes: calculatorParams.speedBrake,
          runwayCondition: calculatorParams.runwayCondition,
        })
      } else {
        // Fallback: Assume flaps 0 for A-10C
        return calculateA10Speeds(grossWeight.value, 0)
      }
    }

    return null
  })

  // Calculate bingo fuel (F-16C only)
  const calculatedBingo = computed(() => {
    if (!mission.value) return null
    const airframe = getMissionAirframe(mission.value)
    if (airframe !== 'F-16C_50') return null

    // Get required mission data
    const numberOfPilots = mission.value.crew.length
    if (numberOfPilots === 0) return null

    // Get recovery airport location
    const recoveryAirportId = mission.value.departureRecovery.recoveryAirportId
    if (!recoveryAirportId) return null

    // Try to find recovery airport in waypoints
    const recoveryWaypoint = mission.value.waypoints.find(
      (wp) => wp.name && wp.name.toLowerCase() === recoveryAirportId.toLowerCase(),
    )
    if (
      !recoveryWaypoint ||
      recoveryWaypoint.latitude === null ||
      recoveryWaypoint.longitude === null
    ) {
      return null
    }
    const recoveryLocation = {
      latitude: recoveryWaypoint.latitude,
      longitude: recoveryWaypoint.longitude,
    }

    // Get target waypoint location (waypoint with type === 'TGT')
    const targetWaypoint = mission.value.waypoints.find((wp) => wp.type === 'TGT')
    if (!targetWaypoint || targetWaypoint.latitude === null || targetWaypoint.longitude === null) {
      return null
    }
    const targetLocation = {
      latitude: targetWaypoint.latitude,
      longitude: targetWaypoint.longitude,
    }

    // Get alternate airport location (optional)
    let alternateLocation: { latitude: number; longitude: number } | null = null
    const alternateAirportId = mission.value.departureRecovery.alternateAirportId
    if (alternateAirportId) {
      const alternateWaypoint = mission.value.waypoints.find(
        (wp) => wp.name && wp.name.toLowerCase() === alternateAirportId.toLowerCase(),
      )
      if (
        alternateWaypoint &&
        alternateWaypoint.latitude !== null &&
        alternateWaypoint.longitude !== null
      ) {
        alternateLocation = {
          latitude: alternateWaypoint.latitude,
          longitude: alternateWaypoint.longitude,
        }
      }
    }

    // Use stored calculator params if available, otherwise use defaults
    const bingoParams = mission.value.fuel.bingoCalculatorParams
    if (bingoParams) {
      return calculateBingoFuel({
        aarExpected: bingoParams.aarExpected,
        approachType: bingoParams.approachType,
        altitudeProfile: bingoParams.altitudeProfile,
        numberOfPilots,
        recoveryLocation,
        targetLocation,
        alternateLocation,
      })
    } else {
      // Use default params (no AAR, VFR, medium)
      return calculateDefaultBingo(
        numberOfPilots,
        recoveryLocation,
        targetLocation,
        alternateLocation,
      )
    }
  })

  // Calculate total drag index from loadout (F-16C only)
  const calculatedDragIndex = computed(() => {
    if (!mission.value) return 0
    const airframe = getMissionAirframe(mission.value)
    if (airframe !== 'F-16C_50') return 0

    // Map loadout stations to the format expected by calculateTotalDragIndex
    const stores = mission.value.loadout.map((station) => ({
      clsid: station.item || 'EMPTY',
    }))

    return calculateTotalDragIndex(stores)
  })

  // Calculate max fuel capacity (for fuel load slider)
  const maxFuelCapacity = computed(() => {
    if (!mission.value) return 0

    const airframe = getMissionAirframe(mission.value)
    const airframeData = getAirframeData(airframe)
    const internalFuel = airframeData?.internalFuel || 0

    // External fuel from tanks in loadout
    const externalFuel = mission.value.loadout.reduce((total, station) => {
      const item = station.item
      const fuelCapacity = getFuelCapacity(item)
      if (fuelCapacity > 0) {
        return total + fuelCapacity
      }
      return total
    }, 0)

    return internalFuel + externalFuel
  })

  return {
    loadoutWeight,
    fuelWeight,
    maxFuelCapacity,
    grossWeight,
    calculatedSpeeds,
    calculatedBingo,
    calculatedDragIndex,
  }
}
