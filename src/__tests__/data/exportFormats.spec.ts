import { describe, it, expect } from 'vitest'
import {
  getExportFormatsForAirframe,
  exportFormatLabels,
  type ExportFormat,
} from '@/data/exportFormats'

describe('exportFormats', () => {
  describe('getExportFormatsForAirframe', () => {
    it('returns all 3 formats for F-16C_50', () => {
      expect(getExportFormatsForAirframe('F-16C_50')).toEqual(['DCS-DTC', 'JAFDTC', 'DCS-ME'])
    })

    it('returns DCS-DTC and JAFDTC for A-10C_2', () => {
      expect(getExportFormatsForAirframe('A-10C_2')).toEqual(['DCS-DTC', 'JAFDTC'])
    })

    it('returns DCS-DTC only for C-130J-30', () => {
      expect(getExportFormatsForAirframe('C-130J-30')).toEqual(['DCS-DTC'])
    })

    it('returns DCS-DTC only for AH-64D_BLK_II', () => {
      expect(getExportFormatsForAirframe('AH-64D_BLK_II')).toEqual(['DCS-DTC'])
    })

    it('returns DCS-DTC and JAFDTC for FA-18C_hornet', () => {
      expect(getExportFormatsForAirframe('FA-18C_hornet')).toEqual(['DCS-DTC', 'JAFDTC'])
    })

    it('returns DCS-DTC and JAFDTC for F-15ESE', () => {
      expect(getExportFormatsForAirframe('F-15ESE')).toEqual(['DCS-DTC', 'JAFDTC'])
    })

    it('returns DCS-DTC only for AV8BNA', () => {
      expect(getExportFormatsForAirframe('AV8BNA')).toEqual(['DCS-DTC'])
    })

    it('returns DCS-DTC only for CH-47Fbl1', () => {
      expect(getExportFormatsForAirframe('CH-47Fbl1')).toEqual(['DCS-DTC'])
    })

    it('returns empty array for unknown airframe', () => {
      expect(getExportFormatsForAirframe('unknown')).toEqual([])
    })
  })

  describe('exportFormatLabels', () => {
    it('has a label for every ExportFormat value', () => {
      const formats: ExportFormat[] = ['DCS-DTC', 'JAFDTC', 'DCS-ME']
      for (const format of formats) {
        expect(exportFormatLabels[format]).toBeDefined()
        expect(typeof exportFormatLabels[format]).toBe('string')
      }
    })

    it('has correct label values', () => {
      expect(exportFormatLabels['DCS-DTC']).toBe('DCS-DTC')
      expect(exportFormatLabels['JAFDTC']).toBe('JAFDTC')
      expect(exportFormatLabels['DCS-ME']).toBe('DCS Mission Editor')
    })
  })
})
