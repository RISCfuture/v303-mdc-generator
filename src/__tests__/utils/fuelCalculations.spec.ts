import { describe, it, expect } from 'vitest'
import { calculateTakeoffFuel, calculateMissionGrossWeight } from '@/utils/fuelCalculations'
import type { Mission } from '@/types'

/**
 * F-16C_50: internalFuel = 7163, emptyWeight = 19899
 * A-10C_2: internalFuel = 11087, emptyWeight = 25629
 * Fuel_Tank_FT600: additionalFuel = 4001
 * {8A0BE8AE-58D4-4572-9263-3144C0D06364}: FT300, additionalFuel = 2006
 */

function makeMission(overrides: {
  squadron?: string
  loadout?: { station: number; item: string }[]
  fuelLoadPercentage?: number
}): Mission {
  return {
    squadron: overrides.squadron ?? 'v93',
    loadout: overrides.loadout ?? [
      { station: 1, item: 'EMPTY' },
      { station: 2, item: 'EMPTY' },
      { station: 3, item: 'EMPTY' },
      { station: 4, item: 'EMPTY' },
      { station: 5, item: 'EMPTY' },
      { station: 6, item: 'EMPTY' },
      { station: 7, item: 'EMPTY' },
      { station: 8, item: 'EMPTY' },
      { station: 9, item: 'EMPTY' },
    ],
    fuel: {
      takeoff: 0,
      joker: 0,
      bingo: 0,
      fuelLoadPercentage: overrides.fuelLoadPercentage,
    },
  } as unknown as Mission
}

describe('calculateTakeoffFuel', () => {
  it('returns internal fuel at 100% with no external tanks', () => {
    const mission = makeMission({ fuelLoadPercentage: 100 })
    // F-16C_50 internal fuel = 7163
    expect(calculateTakeoffFuel(mission)).toBe(7163)
  })

  it('returns internal + external fuel at 100%', () => {
    const mission = makeMission({
      fuelLoadPercentage: 100,
      loadout: [
        { station: 4, item: 'Fuel_Tank_FT600' }, // 4001 lbs fuel
        { station: 5, item: 'EMPTY' },
        { station: 6, item: 'Fuel_Tank_FT600' }, // 4001 lbs fuel
      ],
    })
    // 7163 internal + 4001 + 4001 external = 15165
    expect(calculateTakeoffFuel(mission)).toBe(7163 + 4001 + 4001)
  })

  it('applies slider percentage only to internal fuel (no external tanks)', () => {
    const mission = makeMission({ fuelLoadPercentage: 50 })
    // 50% of 7163 = 3581.5
    expect(calculateTakeoffFuel(mission)).toBe(7163 * 0.5)
  })

  it('applies slider percentage only to internal fuel, external tanks always full', () => {
    const mission = makeMission({
      fuelLoadPercentage: 50,
      loadout: [
        { station: 4, item: 'Fuel_Tank_FT600' }, // 4001 lbs fuel
        { station: 5, item: 'EMPTY' },
        { station: 6, item: 'Fuel_Tank_FT600' }, // 4001 lbs fuel
      ],
    })
    // 50% of 7163 internal + 100% of (4001 + 4001) external
    expect(calculateTakeoffFuel(mission)).toBe(7163 * 0.5 + 4001 + 4001)
  })

  it('defaults fuelLoadPercentage to 100 when undefined', () => {
    const mission = makeMission({ fuelLoadPercentage: undefined })
    expect(calculateTakeoffFuel(mission)).toBe(7163)
  })

  it('returns 0 fuel at 0% with no external tanks', () => {
    const mission = makeMission({ fuelLoadPercentage: 0 })
    expect(calculateTakeoffFuel(mission)).toBe(0)
  })

  it('returns only external fuel at 0% with external tanks', () => {
    const mission = makeMission({
      fuelLoadPercentage: 0,
      loadout: [
        { station: 4, item: 'Fuel_Tank_FT600' }, // 4001 lbs
        { station: 5, item: 'EMPTY' },
      ],
    })
    expect(calculateTakeoffFuel(mission)).toBe(4001)
  })
})

describe('calculateMissionGrossWeight', () => {
  it('includes empty weight, loadout, and fuel', () => {
    const mission = makeMission({
      fuelLoadPercentage: 100,
      loadout: [
        { station: 4, item: 'Fuel_Tank_FT600' }, // tank empty weight + fuel
        { station: 5, item: 'EMPTY' },
      ],
    })
    // emptyWeight (19899) + loadout weight of FT600 empty tank + fuel
    // FT600: total weight 4244, additionalFuel 4001, so empty tank = 4244 - 4001 = 243
    // fuel = 7163 internal + 4001 external = 11164
    const expected = 19899 + 243 + 7163 + 4001
    expect(calculateMissionGrossWeight(mission)).toBe(expected)
  })

  it('respects fuel load percentage in gross weight', () => {
    const mission = makeMission({ fuelLoadPercentage: 50 })
    // emptyWeight (19899) + 0 loadout + 50% of 7163 internal
    const expected = 19899 + 7163 * 0.5
    expect(calculateMissionGrossWeight(mission)).toBe(expected)
  })
})
