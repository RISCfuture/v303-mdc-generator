import { describe, it, expect } from 'vitest'
import {
  getDatalinkType,
  getDatalinkLabel,
  formatSTNForDatalink,
  generateSADLSTN,
  getCrewMemberSTN,
  isSTNEditingAllowed,
  shouldShowSTN,
  getSTNMaxDigits,
  isValidSTN,
} from '@/utils/datalinkHelpers'
import type { AirframeData } from '@/data/airframes'

describe('datalinkHelpers', () => {
  const mockLink16Aircraft: AirframeData = {
    aircraft: 'F-16C_50',
    displayName: 'F-16CM bl.50',
    datalinkType: 'link16',
    emptyWeight: 19899,
    maxTakeoffWeight: 42300,
    internalFuel: 7163,
    cmdsCapacity: 120,
    chaffIncrement: 30,
    flareIncrement: 30,
    defaultChaff: 60,
    defaultFlare: 60,
    defaultJoker: 3000,
    defaultBingo: 2000,
    radios: [],
    stations: [],
  }

  const mockSADLAircraft: AirframeData = {
    aircraft: 'A-10C',
    displayName: 'A-10C',
    datalinkType: 'sadl',
    emptyWeight: 25629,
    maxTakeoffWeight: 46476,
    internalFuel: 11087,
    cmdsCapacity: 480,
    chaffIncrement: 60,
    flareIncrement: 30,
    defaultChaff: 240,
    defaultFlare: 120,
    defaultJoker: 4000,
    defaultBingo: 2500,
    radios: [],
    stations: [],
  }

  const mockNoDataLinkAircraft: AirframeData = {
    aircraft: 'TEST',
    displayName: 'Test Aircraft',
    datalinkType: null,
    emptyWeight: 10000,
    maxTakeoffWeight: 20000,
    internalFuel: 5000,
    cmdsCapacity: 100,
    chaffIncrement: 10,
    flareIncrement: 10,
    defaultChaff: 50,
    defaultFlare: 50,
    defaultJoker: 2000,
    defaultBingo: 1000,
    radios: [],
    stations: [],
  }

  describe('getDatalinkType', () => {
    it('should return link16 for F-16', () => {
      expect(getDatalinkType(mockLink16Aircraft)).toBe('link16')
    })

    it('should return sadl for A-10', () => {
      expect(getDatalinkType(mockSADLAircraft)).toBe('sadl')
    })

    it('should return null for aircraft without datalink', () => {
      expect(getDatalinkType(mockNoDataLinkAircraft)).toBe(null)
    })

    it('should return null for undefined aircraft', () => {
      expect(getDatalinkType(undefined)).toBe(null)
    })

    it('should return null when datalinkType is not defined', () => {
      const aircraftWithoutField = { ...mockLink16Aircraft }
      delete aircraftWithoutField.datalinkType
      expect(getDatalinkType(aircraftWithoutField)).toBe(null)
    })
  })

  describe('getDatalinkLabel', () => {
    it('should return Link16 for link16 type', () => {
      expect(getDatalinkLabel('link16')).toBe('Link16')
    })

    it('should return SADL for sadl type', () => {
      expect(getDatalinkLabel('sadl')).toBe('SADL')
    })

    it('should return empty string for null', () => {
      expect(getDatalinkLabel(null)).toBe('')
    })
  })

  describe('formatSTNForDatalink', () => {
    it('should format Link16 STN as 5 digits', () => {
      expect(formatSTNForDatalink(3600, 'link16')).toBe('03600')
      expect(formatSTNForDatalink(123, 'link16')).toBe('00123')
    })

    it('should format SADL STN as 4 digits', () => {
      expect(formatSTNForDatalink(1134, 'sadl')).toBe('1134')
      expect(formatSTNForDatalink(234, 'sadl')).toBe('0234')
    })

    it('should return empty string for null datalink type', () => {
      expect(formatSTNForDatalink(1234, null)).toBe('')
    })

    it('should return empty string for null STN', () => {
      expect(formatSTNForDatalink(null, 'link16')).toBe('')
      expect(formatSTNForDatalink(undefined, 'sadl')).toBe('')
    })
  })

  describe('generateSADLSTN', () => {
    it('should return lead STN for position 0', () => {
      expect(generateSADLSTN(1134, 0)).toBe(1134)
    })

    it('should increment second digit for wing (position 1)', () => {
      expect(generateSADLSTN(1134, 1)).toBe(1234)
    })

    it('should increment second digit for element lead (position 2)', () => {
      expect(generateSADLSTN(1134, 2)).toBe(1334)
    })

    it('should increment second digit for element wing (position 3)', () => {
      expect(generateSADLSTN(1134, 3)).toBe(1434)
    })

    it('should continue pattern for positions 4-7', () => {
      expect(generateSADLSTN(1134, 4)).toBe(1534)
      expect(generateSADLSTN(1134, 5)).toBe(1634)
      expect(generateSADLSTN(1134, 6)).toBe(1734)
      expect(generateSADLSTN(1134, 7)).toBe(1834)
    })

    it('should work with different lead STNs', () => {
      expect(generateSADLSTN(2050, 0)).toBe(2050)
      expect(generateSADLSTN(2050, 1)).toBe(2150)
      expect(generateSADLSTN(2050, 2)).toBe(2250)
    })
  })

  describe('getCrewMemberSTN', () => {
    it('should return null for null datalink type', () => {
      expect(getCrewMemberSTN(3600, 1134, 0, null)).toBe(null)
    })

    it('should use pilot STN for Link16', () => {
      expect(getCrewMemberSTN(3600, 1134, 0, 'link16')).toBe(3600)
      expect(getCrewMemberSTN(3605, 1134, 1, 'link16')).toBe(3605)
    })

    it('should calculate STN for SADL based on position', () => {
      expect(getCrewMemberSTN(3600, 1134, 0, 'sadl')).toBe(1134)
      expect(getCrewMemberSTN(3600, 1134, 1, 'sadl')).toBe(1234)
      expect(getCrewMemberSTN(3600, 1134, 2, 'sadl')).toBe(1334)
      expect(getCrewMemberSTN(3600, 1134, 3, 'sadl')).toBe(1434)
    })

    it('should return null for SADL when leadSTN is null', () => {
      expect(getCrewMemberSTN(3600, null, 1, 'sadl')).toBe(null)
      expect(getCrewMemberSTN(3600, undefined, 2, 'sadl')).toBe(null)
    })

    it('should return null for Link16 when pilotSTN is null', () => {
      expect(getCrewMemberSTN(null, 1134, 0, 'link16')).toBe(null)
      expect(getCrewMemberSTN(undefined, 1134, 1, 'link16')).toBe(null)
    })
  })

  describe('isSTNEditingAllowed', () => {
    it('should allow editing for Link16', () => {
      expect(isSTNEditingAllowed('link16')).toBe(true)
    })

    it('should not allow editing for SADL', () => {
      expect(isSTNEditingAllowed('sadl')).toBe(false)
    })

    it('should not allow editing for null datalink', () => {
      expect(isSTNEditingAllowed(null)).toBe(false)
    })
  })

  describe('shouldShowSTN', () => {
    it('should show STN for Link16', () => {
      expect(shouldShowSTN('link16')).toBe(true)
    })

    it('should show STN for SADL', () => {
      expect(shouldShowSTN('sadl')).toBe(true)
    })

    it('should not show STN for null datalink', () => {
      expect(shouldShowSTN(null)).toBe(false)
    })
  })

  describe('getSTNMaxDigits', () => {
    it('should return 5 for Link16', () => {
      expect(getSTNMaxDigits('link16')).toBe(5)
    })

    it('should return 4 for SADL', () => {
      expect(getSTNMaxDigits('sadl')).toBe(4)
    })

    it('should return 0 for null datalink', () => {
      expect(getSTNMaxDigits(null)).toBe(0)
    })
  })

  describe('isValidSTN', () => {
    it('should validate Link16 STN (5 digits max)', () => {
      expect(isValidSTN(0, 'link16')).toBe(true)
      expect(isValidSTN(99999, 'link16')).toBe(true)
      expect(isValidSTN(100000, 'link16')).toBe(false)
      expect(isValidSTN(-1, 'link16')).toBe(false)
    })

    it('should validate SADL STN (4 digits max)', () => {
      expect(isValidSTN(0, 'sadl')).toBe(true)
      expect(isValidSTN(9999, 'sadl')).toBe(true)
      expect(isValidSTN(10000, 'sadl')).toBe(false)
      expect(isValidSTN(-1, 'sadl')).toBe(false)
    })

    it('should return false for null datalink', () => {
      expect(isValidSTN(1234, null)).toBe(false)
    })
  })
})
