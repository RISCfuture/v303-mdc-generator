import { describe, it, expect } from 'vitest'
import {
  squadronDatabase,
  getSquadronAirframe,
  getSquadronDisplayName,
  getSquadronOptions,
} from '@/data/squadrons'
import type { SquadronId } from '@/data/squadrons'

describe('squadrons', () => {
  describe('squadronDatabase', () => {
    it('should be a non-empty object', () => {
      expect(typeof squadronDatabase).toBe('object')
      expect(Object.keys(squadronDatabase).length).toBeGreaterThan(0)
    })

    it('should have squadrons with required properties', () => {
      Object.values(squadronDatabase).forEach((squadron) => {
        expect(squadron).toHaveProperty('id')
        expect(squadron).toHaveProperty('name')
        expect(squadron).toHaveProperty('displayName')
        expect(squadron).toHaveProperty('aircraft')
      })
    })

    it('should have valid property types', () => {
      Object.values(squadronDatabase).forEach((squadron) => {
        expect(typeof squadron.id).toBe('string')
        expect(typeof squadron.name).toBe('string')
        expect(typeof squadron.displayName).toBe('string')
        expect(typeof squadron.aircraft).toBe('string')

        expect(squadron.id.length).toBeGreaterThan(0)
        expect(squadron.name.length).toBeGreaterThan(0)
        expect(squadron.displayName.length).toBeGreaterThan(0)
        expect(squadron.aircraft.length).toBeGreaterThan(0)
      })
    })

    it('should have matching id property with object key', () => {
      Object.entries(squadronDatabase).forEach(([key, squadron]) => {
        expect(squadron.id).toBe(key)
      })
    })

    it('should include v303 FS and v93 FS squadrons', () => {
      const squadronIds = Object.keys(squadronDatabase)
      // Based on CLAUDE.md, there should be v303 FS (A-10C) and v93 FS (F-16C)
      expect(squadronIds.length).toBeGreaterThanOrEqual(2)
    })

    it('should have valid defaultGunAmmo when present', () => {
      const squadronsWithGunAmmo = Object.values(squadronDatabase).filter(
        (s) => s.defaultGunAmmo !== undefined,
      )
      squadronsWithGunAmmo.forEach((squadron) => {
        expect(squadron.defaultGunAmmo).toHaveProperty('training')
        expect(squadron.defaultGunAmmo).toHaveProperty('combat')
        expect(typeof squadron.defaultGunAmmo!.training).toBe('string')
        expect(typeof squadron.defaultGunAmmo!.combat).toBe('string')
      })
    })
  })

  describe('getSquadronAirframe', () => {
    it('should return the correct airframe for a squadron', () => {
      const squadronIds = Object.keys(squadronDatabase) as SquadronId[]
      expect(squadronIds.length).toBeGreaterThan(0)
      const squadronId = squadronIds[0]
      const airframe = getSquadronAirframe(squadronId)
      expect(airframe).toBe(squadronDatabase[squadronId].aircraft)
    })

    it('should return non-empty airframe strings', () => {
      const squadronIds = Object.keys(squadronDatabase) as SquadronId[]
      squadronIds.forEach((squadronId) => {
        const airframe = getSquadronAirframe(squadronId)
        expect(typeof airframe).toBe('string')
        expect(airframe.length).toBeGreaterThan(0)
      })
    })

    it('should return A-10C variant for v303 FS', () => {
      const v303Squadron = Object.entries(squadronDatabase).find(
        ([, squadron]) =>
          squadron.name.includes('303') && squadron.name.toLowerCase().includes('fighter squadron'),
      )

      expect(v303Squadron).toBeDefined()
      const airframe = getSquadronAirframe(v303Squadron![0] as SquadronId)
      expect(airframe).toMatch(/A-10C/u)
    })

    it('should return F-16C variant for v93 FS', () => {
      const v93Squadron = Object.entries(squadronDatabase).find(
        ([, squadron]) =>
          squadron.name.includes('93') && squadron.name.toLowerCase().includes('fighter squadron'),
      )

      expect(v93Squadron).toBeDefined()
      const airframe = getSquadronAirframe(v93Squadron![0] as SquadronId)
      expect(airframe).toMatch(/F-16C/u)
    })
  })

  describe('getSquadronDisplayName', () => {
    it('should return the correct display name for a squadron', () => {
      const squadronIds = Object.keys(squadronDatabase) as SquadronId[]
      expect(squadronIds.length).toBeGreaterThan(0)
      const squadronId = squadronIds[0]
      const displayName = getSquadronDisplayName(squadronId)
      expect(displayName).toBe(squadronDatabase[squadronId].displayName)
    })

    it('should return non-empty display names', () => {
      const squadronIds = Object.keys(squadronDatabase) as SquadronId[]
      squadronIds.forEach((squadronId) => {
        const displayName = getSquadronDisplayName(squadronId)
        expect(typeof displayName).toBe('string')
        expect(displayName.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getSquadronOptions', () => {
    it('should return an array of options', () => {
      const options = getSquadronOptions()
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
    })

    it('should return options with label and value properties', () => {
      const options = getSquadronOptions()
      options.forEach((option) => {
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('value')
        expect(typeof option.label).toBe('string')
        expect(typeof option.value).toBe('string')
        expect(option.label.length).toBeGreaterThan(0)
        expect(option.value.length).toBeGreaterThan(0)
      })
    })

    it('should have labels matching squadron display names', () => {
      const options = getSquadronOptions()
      options.forEach((option) => {
        const squadron = squadronDatabase[option.value]
        expect(squadron).toBeDefined()
        expect(option.label).toBe(squadron.displayName)
      })
    })

    it('should have values matching squadron IDs', () => {
      const options = getSquadronOptions()
      const squadronIds = Object.keys(squadronDatabase)

      options.forEach((option) => {
        expect(squadronIds).toContain(option.value)
      })
    })

    it('should have same length as squadron database', () => {
      const options = getSquadronOptions()
      expect(options.length).toBe(Object.keys(squadronDatabase).length)
    })

    it('should have unique values', () => {
      const options = getSquadronOptions()
      const values = options.map((o) => o.value)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })
  })
})
