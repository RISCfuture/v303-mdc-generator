import { describe, it, expect } from 'vitest'
import { crewBySquadron, crewDatabase } from '@/data/crew'

describe('crew', () => {
  describe('crewBySquadron', () => {
    it('should be a non-empty object', () => {
      expect(typeof crewBySquadron).toBe('object')
      expect(Object.keys(crewBySquadron).length).toBeGreaterThan(0)
    })

    it('should have squadron keys that are strings', () => {
      Object.keys(crewBySquadron).forEach((squadronId) => {
        expect(typeof squadronId).toBe('string')
        expect(squadronId.length).toBeGreaterThan(0)
      })
    })

    it('should have arrays of pilots for each squadron', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        expect(Array.isArray(pilots)).toBe(true)
        expect(pilots.length).toBeGreaterThan(0)
      })
    })

    it('should have pilots with required properties', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          expect(pilot).toHaveProperty('pilot')
          expect(pilot).toHaveProperty('callsign')
          expect(pilot).toHaveProperty('link16Prefix')
          expect(pilot).toHaveProperty('stn')
          expect(pilot).toHaveProperty('freq')
          expect(pilot).toHaveProperty('aaTacan')
          // mode3, laserCode, and tailNumber are optional
        })
      })
    })

    it('should have pilots with valid data types', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          expect(typeof pilot.pilot).toBe('string')
          expect(Array.isArray(pilot.callsign)).toBe(true)
          expect(typeof pilot.link16Prefix).toBe('string')
          expect(typeof pilot.stn).toBe('number')
          expect(typeof pilot.freq).toBe('string')
          expect(typeof pilot.aaTacan).toBe('number')
          // mode3 is optional (number, null, or undefined)
          if (pilot.mode3 != null) {
            expect(typeof pilot.mode3).toBe('number')
          }
          // laserCode is optional (number, null, or undefined)
          if (pilot.laserCode != null) {
            expect(typeof pilot.laserCode).toBe('number')
          }
          // tailNumber is optional
          if (pilot.tailNumber !== undefined) {
            expect(typeof pilot.tailNumber).toBe('string')
          }
        })
      })
    })

    it('should have valid STN values', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          // STN should be a positive number (can be 4-5 digits)
          expect(pilot.stn).toBeGreaterThan(0)
          expect(pilot.stn).toBeLessThanOrEqual(99999)
        })
      })
    })

    it('should have valid Mode 3 values (octal 0000-7777) when present', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          if (pilot.mode3 != null) {
            expect(pilot.mode3).toBeGreaterThanOrEqual(0)
            expect(pilot.mode3).toBeLessThanOrEqual(parseInt('7777', 8))
          }
        })
      })
    })

    it('should have valid TACAN channels (1-126)', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          expect(pilot.aaTacan).toBeGreaterThanOrEqual(1)
          expect(pilot.aaTacan).toBeLessThanOrEqual(126)
        })
      })
    })

    it('should have valid laser codes when present', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          // Laser codes are optional but when present should be positive numbers
          // They are stored as decimal representations of octal values (e.g., 383 decimal)
          if (pilot.laserCode != null) {
            expect(pilot.laserCode).toBeGreaterThan(0)
            expect(pilot.laserCode).toBeLessThanOrEqual(10000) // Reasonable upper bound
          }
        })
      })
    })

    it('should have non-empty callsign arrays', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          expect(pilot.callsign.length).toBeGreaterThan(0)
          pilot.callsign.forEach((cs) => {
            expect(typeof cs).toBe('string')
            expect(cs.length).toBeGreaterThan(0)
          })
        })
      })
    })

    it('should have 2-letter Link16 prefixes', () => {
      Object.values(crewBySquadron).forEach((pilots) => {
        pilots.forEach((pilot) => {
          expect(pilot.link16Prefix.length).toBe(2)
          expect(pilot.link16Prefix).toMatch(/^[A-Z]{2}$/)
        })
      })
    })
  })

  describe('crewDatabase', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(crewDatabase)).toBe(true)
      expect(crewDatabase.length).toBeGreaterThan(0)
    })

    it('should contain all pilots from all squadrons', () => {
      const totalPilots = Object.values(crewBySquadron).reduce(
        (sum, pilots) => sum + pilots.length,
        0,
      )
      expect(crewDatabase.length).toBe(totalPilots)
    })

    it('should have pilots with required properties', () => {
      crewDatabase.forEach((pilot) => {
        expect(pilot).toHaveProperty('pilot')
        expect(pilot).toHaveProperty('callsign')
        expect(pilot).toHaveProperty('link16Prefix')
        expect(pilot).toHaveProperty('stn')
        expect(pilot).toHaveProperty('freq')
        expect(pilot).toHaveProperty('aaTacan')
        // mode3, laserCode, and tailNumber are optional
      })
    })

    it('should have unique STN values', () => {
      const stns = crewDatabase.map((pilot) => pilot.stn)
      const uniqueStns = new Set(stns)
      expect(uniqueStns.size).toBe(stns.length)
    })

    it('should have unique Mode 3 values among pilots that have them', () => {
      const mode3s = crewDatabase.map((pilot) => pilot.mode3).filter((m): m is number => m != null)
      const uniqueMode3s = new Set(mode3s)
      expect(uniqueMode3s.size).toBe(mode3s.length)
    })

    it('should have valid TACAN channels', () => {
      crewDatabase.forEach((pilot) => {
        expect(pilot.aaTacan).toBeGreaterThanOrEqual(1)
        expect(pilot.aaTacan).toBeLessThanOrEqual(126)
      })
    })

    it('should have valid laser codes among pilots that have them', () => {
      crewDatabase.forEach((pilot) => {
        if (pilot.laserCode != null) {
          expect(pilot.laserCode).toBeGreaterThanOrEqual(0)
          expect(pilot.laserCode).toBeLessThanOrEqual(383)
        }
      })
    })
  })
})
