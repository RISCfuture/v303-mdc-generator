import { describe, it, expect } from 'vitest'
import { loadTemplateForFormat } from '@/services/mdcTemplateService'

describe('mdcTemplateService', () => {
  describe('loadTemplateForFormat', () => {
    // v93 DCS-DTC template
    it('should load v93 DCS-DTC template', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('MFD')
      expect(template).toHaveProperty('Misc')
      expect(template).toHaveProperty('Radios')
      expect(template).toHaveProperty('Datalink')
    })

    it('should have correct MFD configurations for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations).toHaveLength(5)
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('Mode', 1)
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('LeftMFD')
      // @ts-expect-error - accessing nested property for test
      expect(template.MFD?.Configurations[0]).toHaveProperty('RightMFD')
    })

    it('should have correct radio defaults for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('EnableGuard', false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('Mode', 1)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('EnableGuard', false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('Mode', 1)
    })

    it('should have correct misc settings for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.LaserStartTime).toBe(8)
      // Squadron-default ToBeUpdated flags (Skilty's feedback, forum 5420#13293).
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.LaserSettingsToBeUpdated).toBe(false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.TACANToBeUpdated).toBe(false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.ILSToBeUpdated).toBe(false)

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

    it('should have squadron-default Upload flags for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.Waypoints).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.CMS).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.Radios).toBe(false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.MFDs).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.Datalink).toBe(false)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.Misc).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.Kneeboard).toBe(false)
    })

    it('should set MSL master-mode FCR to TWS for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      const mslConfig = template.MFD?.Configurations.find((c) => c.Mode === 5)
      // FCRMode 3 = TWS per F16_DCS_DTC_FCR_MODE
      expect(mslConfig?.LeftMFD.FCRMode).toBe(3)
    })

    it('should have correct datalink settings for v93 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Datalink?.DatalinkMode).toBe(1) // TNDL
    })

    // v93 JAFDTC template
    it('should load v93 JAFDTC template', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v93')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('MFD')
      expect(template).toHaveProperty('Misc')
      expect(template).toHaveProperty('Radio')
    })

    it('should have correct misc settings for v93 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v93')

      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.LaserStartTime).toBe('8')
    })

    // v93 DCS-ME template
    it('should load v93 DCS-ME template', () => {
      const template = loadTemplateForFormat('DCS-ME', 'v93')

      expect(template).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.COMM?.mirror_COMM1).toBe(false)
      // @ts-expect-error - accessing nested property for test
      expect(template.COMM?.mirror_COMM2).toBe(false)
    })

    // v303 JAFDTC template
    it('should load v303 JAFDTC template', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('DSMS')
      expect(template).toHaveProperty('HMCS')
      expect(template).toHaveProperty('IFFCC')
      expect(template).toHaveProperty('TAD')
    })

    it('should have squadron-standard DSMS settings for v303 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.MunitionSettings).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.ProfileOrder).toEqual([6, 9, 8, 7, 5, 1, 2, 3, 4, 10, 11, 12])

      // Mission-specific fields should NOT be in template
      // @ts-expect-error - accessing nested property for test
      expect(template.DSMS?.LaserCode).toBeUndefined()
    })

    it('should have squadron-standard HMCS settings for v303 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.HMCS).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.HMCS?.ProfileSettings).toBeDefined()
    })

    it('should have squadron-standard Misc settings for v303 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.IFFMasterMode).toBe('2')
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.IFFMode4On).toBe('True')
      // @ts-expect-error - accessing nested property for test
      expect(template.Misc?.CoordSystem).toBe('1')
    })

    it('should have squadron-standard Radio settings for v303 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

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

    it('should have correct version and airframe for v303 JAFDTC', () => {
      const template = loadTemplateForFormat('JAFDTC', 'v303')

      // @ts-expect-error - accessing nested property for test
      expect(template.Version).toBe('A10C-1.0')
      // @ts-expect-error - accessing nested property for test
      expect(template.Airframe).toBe(1)
    })

    // v303 DCS-DTC template
    it('should load v303 DCS-DTC template', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v303')

      expect(template).toBeDefined()
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('EnableGuard', true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio1).toHaveProperty('Mode', 0)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('EnableGuard', true)
      // @ts-expect-error - accessing nested property for test
      expect(template.Radios?.Radio2).toHaveProperty('Mode', 0)
    })

    // v1-151 DCS-DTC template (AH-64D)
    it('should load v1-151 DCS-DTC template', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v1-151')

      expect(template).toBeDefined()
      expect(template).toHaveProperty('TSD')
      expect(template).toHaveProperty('Upload')
    })

    it('should have TSD display settings for v1-151 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v1-151')

      // @ts-expect-error - accessing nested property for test
      expect(template.TSD?.ShowPresentPosition).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.TSD?.ShowASEThreats).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.TSD?.ShowThreatRings).toBe(true)
      // @ts-expect-error - accessing nested property for test
      expect(template.TSD?.MapShowGrid).toBe(true)
    })

    it('should enable TSD upload for v1-151 DCS-DTC', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'v1-151')

      // @ts-expect-error - accessing nested property for test
      expect(template.Upload?.TSD).toBe(true)
    })

    // Unknown/missing templates
    it('should return empty object for unknown squadron', () => {
      const template = loadTemplateForFormat('DCS-DTC', 'unknown')
      expect(template).toEqual({})
    })

    it('should return empty object for squadron with no template for format', () => {
      const template = loadTemplateForFormat('DCS-ME', 'v303')
      expect(template).toEqual({})
    })
  })
})
