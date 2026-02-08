import { getLoadoutOnlyWeight, getFuelCapacity } from '@/data/munitions'
import { getAirframeData } from '@/utils/airframeHelpers'
import { getMissionAirframe } from '@/utils/missionHelpers'
import type { Mission } from '@/types'

/**
 * Calculate takeoff fuel weight.
 * The fuel load percentage slider only controls internal fuel.
 * External tanks are always considered full.
 */
export function calculateTakeoffFuel(mission: Mission): number {
  const airframe = getMissionAirframe(mission)
  const airframeData = getAirframeData(airframe)
  const internalFuel = airframeData?.internalFuel || 0

  const externalFuel = mission.loadout.reduce((total, station) => {
    const fuelCapacity = getFuelCapacity(station.item)
    return total + (fuelCapacity > 0 ? fuelCapacity : 0)
  }, 0)

  const fuelLoadPercentage = mission.fuel.fuelLoadPercentage ?? 100
  return (internalFuel * fuelLoadPercentage) / 100 + externalFuel
}

/**
 * Calculate mission gross weight (empty weight + loadout + fuel).
 */
export function calculateMissionGrossWeight(mission: Mission): number {
  const airframe = getMissionAirframe(mission)
  const airframeData = getAirframeData(airframe)
  const emptyWeight = airframeData?.emptyWeight || 0

  const loadoutWeight = mission.loadout.reduce((total, station) => {
    return total + getLoadoutOnlyWeight(station.item)
  }, 0)

  return emptyWeight + loadoutWeight + calculateTakeoffFuel(mission)
}
