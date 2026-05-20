import { describe, it, expect } from 'vitest'
import { isF16, isC130, deriveRadioBands, atcFrequency } from '@/utils/airframeHelpers'
import type { AirfieldRadio } from '@/types/airfield'
import type { Squadron } from '@/data/squadrons'

describe('airframeHelpers capability predicates', () => {
  describe('isF16', () => {
    it('is true for F-16 variants', () => {
      expect(isF16('F-16C_50')).toBe(true)
    })

    it('is false for non-F-16 airframes', () => {
      expect(isF16('A-10C_2')).toBe(false)
      expect(isF16('C-130J-30')).toBe(false)
      expect(isF16('')).toBe(false)
    })
  })

  describe('isC130', () => {
    it('is true for C-130 variants', () => {
      expect(isC130('C-130J-30')).toBe(true)
    })

    it('is false for non-C-130 airframes', () => {
      expect(isC130('F-16C_50')).toBe(false)
      expect(isC130('A-10C_2')).toBe(false)
      expect(isC130('')).toBe(false)
    })
  })
})

describe('deriveRadioBands', () => {
  it('classifies UHF-only military radios (ARC-164)', () => {
    expect(deriveRadioBands({ min: 225, max: 399.975 })).toEqual(['uhf'])
  })

  it('classifies VHF-FM-only ground radios (ARC-186)', () => {
    expect(deriveRadioBands({ min: 30, max: 87.995 })).toEqual(['vhfFm'])
  })

  it('classifies dual VHF aviation radios spanning FM + AM (F-16 ARC-222)', () => {
    expect(deriveRadioBands({ min: 30, max: 173.975 })).toEqual(['vhfAm', 'vhfFm'])
  })

  it('classifies the A-10 ARC-210 multi-band radio', () => {
    expect(deriveRadioBands({ min: 30, max: 399.975 })).toEqual(['uhf', 'vhfAm', 'vhfFm'])
  })

  it('classifies the C-130 VHF radio (30–200 MHz)', () => {
    expect(deriveRadioBands({ min: 30, max: 200.975 })).toEqual(['vhfAm', 'vhfFm'])
  })

  it('returns [] for incomplete radio data', () => {
    expect(deriveRadioBands({ min: null, max: null })).toEqual([])
    expect(deriveRadioBands({})).toEqual([])
  })

  it('returns [] for radios outside aviation bands (intercom, NDB)', () => {
    expect(deriveRadioBands({ min: 0.1, max: 1.7 })).toEqual([])
  })
})

describe('atcFrequency', () => {
  const radio: AirfieldRadio = {
    callsign: 'Batumi',
    frequencies: {
      ground: { uhf: 260.0, vhfAm: 131.0 },
      tower: { uhf: 260.0, vhfAm: 131.0 },
      approach: { uhf: 260.0, vhfAm: 131.0 },
    },
  }
  const v93: Squadron = {
    id: 'v93',
    name: 'v93rd Fighter Squadron',
    displayName: 'v93 FS',
    aircraft: 'F-16C_50',
    radioRoles: ['airToGround', 'airToAir'],
  }
  const v303: Squadron = {
    id: 'v303',
    name: 'v303rd Fighter Squadron',
    displayName: 'v303 FS',
    aircraft: 'A-10C_2',
    radioRoles: ['airToAir', 'airToGround', 'support'],
  }

  it('returns the UHF tower freq for an F-16 (COM 1 is UHF, A/G role)', () => {
    expect(
      atcFrequency({
        airfield: { radio },
        squadron: v93,
        airframe: 'F-16C_50',
        facility: 'tower',
      }),
    ).toBe(260.0)
  })

  it('returns the VHF-AM freq when the A/G radio is VHF-only', () => {
    const vhfOnly: Squadron = {
      ...v93,
      aircraft: 'F-16C_50',
      radioRoles: ['airToAir', 'airToGround'],
    }
    // Slot 1 (COM 2) is the F-16 VHF radio (30-173.975 MHz, no UHF support).
    expect(
      atcFrequency({
        airfield: { radio },
        squadron: vhfOnly,
        airframe: 'F-16C_50',
        facility: 'tower',
      }),
    ).toBe(131.0)
  })

  it('uses the A-10 ARC-164 (COM 2, slot 1) for A/G in v303', () => {
    // v303 radioRoles[1] = airToGround → A-10 COM 2 (UHF-only).
    expect(
      atcFrequency({
        airfield: { radio },
        squadron: v303,
        airframe: 'A-10C_2',
        facility: 'tower',
      }),
    ).toBe(260.0)
  })

  it('returns undefined when the airfield has no radio data', () => {
    expect(
      atcFrequency({
        airfield: { radio: null },
        squadron: v93,
        airframe: 'F-16C_50',
        facility: 'tower',
      }),
    ).toBeUndefined()
  })

  it('returns undefined when the facility is missing from the matrix', () => {
    expect(
      atcFrequency({
        airfield: { radio },
        squadron: v93,
        airframe: 'F-16C_50',
        facility: 'atis',
      }),
    ).toBeUndefined()
  })

  it('falls back to slot 0 when the role is not in radioRoles', () => {
    const noRoles: Squadron = { ...v93, radioRoles: [] }
    expect(
      atcFrequency({
        airfield: { radio },
        squadron: noRoles,
        airframe: 'F-16C_50',
        facility: 'tower',
      }),
    ).toBe(260.0) // COM 1 (UHF) is slot 0
  })
})
