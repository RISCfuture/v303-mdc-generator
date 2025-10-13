import { describe, it, expect } from 'vitest'
import { loadTemplateForSquadron } from '@/services/mdcTemplateService'

describe('mdcTemplateService', () => {
  describe('loadTemplateForSquadron', () => {
    it('should load v93 template for v93 squadron', () => {
      const template = loadTemplateForSquadron('v93')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('MFD')
      expect(template).toHaveProperty('Misc')
      expect(template).toHaveProperty('Radios')
      expect(template).toHaveProperty('Datalink')
    })

    it('should load v303 template for v303 squadron', () => {
      const template = loadTemplateForSquadron('v303')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('DSMS')
      expect(template).toHaveProperty('HMCS')
      expect(template).toHaveProperty('IFFCC')
      expect(template).toHaveProperty('TAD')
    })

    it('should have correct MFD configurations for v93', () => {
      const template = loadTemplateForSquadron('v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations).toHaveLength(5)
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('Mode', 1)
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('LeftMFD')
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('RightMFD')
    })

    it('should have correct radio defaults for v93', () => {
      const template = loadTemplateForSquadron('v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('EnableGuard', false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('Mode', 1)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('EnableGuard', false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('Mode', 1)
    })

    it('should have correct misc settings for v93', () => {
      const template = loadTemplateForSquadron('v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.LaserStartTime).toBe(8)

      // Mission-specific fields should NOT be in template (calculated by exporter)
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.CARAALOW).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.MSLFloor).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.ILSFrequency).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.ILSCourse).toBeUndefined()
    })

    it('should have correct datalink settings for v93', () => {
      const template = loadTemplateForSquadron('v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Datalink?.DatalinkMode).toBe(1) // TNDL
    })

    it('should have squadron-standard DSMS settings for v303', () => {
      const template = loadTemplateForSquadron('v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.MunitionSettings).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.ProfileOrder).toEqual([6, 9, 8, 7, 5, 1, 2, 3, 4, 10, 11, 12])

      // Mission-specific fields should NOT be in template
      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.LaserCode).toBeUndefined()
    })

    it('should have squadron-standard HMCS settings for v303', () => {
      const template = loadTemplateForSquadron('v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.HMCS).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.HMCS?.ProfileSettings).toBeDefined()
    })

    it('should have squadron-standard Misc settings for v303', () => {
      const template = loadTemplateForSquadron('v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.IFFMasterMode).toBe('2') // Squadron standard
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.IFFMode4On).toBe('True')
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.CoordSystem).toBe('1')

      // Mission-specific fields should NOT be in template
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.TACANMode).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.TACANBand).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.TACANChannel).toBeUndefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.IFFMode3Code).toBeUndefined()
    })

    it('should have squadron-standard Radio settings for v303', () => {
      const template = loadTemplateForSquadron('v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.Radio?.IsCOMM1StatusOnHUD).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radio?.IsMonitorGuard).toEqual([true, true, false])
      // @ts-expect-error - accessing nested property for test
      expect(template.Radio?.IsDefault).toBe(false)

      // Mission-specific fields should NOT be in template
      // @ts-expect-error - accessing nested property for test
      expect(template.Radio?.Presets).toBeUndefined()
    })

    it('should have correct version and airframe for v303', () => {
      const template = loadTemplateForSquadron('v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.Version).toBe('A10C-1.0')
      // @ts-expect-error - accessing nested property for test
      expect(template.Airframe).toBe(1)
    })

    it('should throw error for unknown squadron ID', () => {
      expect(() => loadTemplateForSquadron('unknown')).toThrow('Unknown squadron ID: unknown')
    })

    it('should throw error for empty squadron ID', () => {
      expect(() => loadTemplateForSquadron('')).toThrow('Unknown squadron ID: ')
    })
  })
})
