// JSON MDC Exporter for DCS
// Generates MDC files compatible with the DCS MDC loader
//
// Re-export all types and functions from sub-modules
export type { DeepPartial } from './helpers'
export type {
  DCSF16MDC,
  DCSGenericMDC,
  DCSFA18CMDC,
  DCSF15EMDC,
  DCSAV8BMDC,
} from './dcsDtc'
export type { JAFDTCA10MDC, JAFDTCF16MDC, JAFDTCFA18CMDC, JAFDTCF15EMDC } from './jafdtc'
export type { DCSMissionEditorDTC } from './dcsME'
export {
  exportF16MDC,
  exportA10DCSDTC,
  exportC130DCSDTC,
  exportFA18CDCSDTC,
  exportF15EDCSDTC,
  exportAV8BDCSDTC,
  exportCH47FDCSDTC,
} from './dcsDtc'
export { exportA10MDC, exportF16JAFDTC, exportFA18CJAFDTC, exportF15EJAFDTC } from './jafdtc'
export { exportF16DCSME } from './dcsME'

import type { Mission } from '@/types'
import type { ExportFormat } from '@/data/exportFormats'
import { loadTemplateForFormat } from '../mdcTemplateService'
import { getSquadronAirframe } from '@/data/squadrons'
import type {
  DCSF16MDC,
  DCSGenericMDC,
  DCSFA18CMDC,
  DCSF15EMDC,
  DCSAV8BMDC,
} from './dcsDtc'
import type { JAFDTCA10MDC, JAFDTCF16MDC, JAFDTCFA18CMDC, JAFDTCF15EMDC } from './jafdtc'
import type { DCSMissionEditorDTC } from './dcsME'
import {
  exportF16MDC,
  exportA10DCSDTC,
  exportC130DCSDTC,
  exportFA18CDCSDTC,
  exportF15EDCSDTC,
  exportAV8BDCSDTC,
  exportCH47FDCSDTC,
} from './dcsDtc'
import { exportA10MDC, exportF16JAFDTC, exportFA18CJAFDTC, exportF15EJAFDTC } from './jafdtc'
import { exportF16DCSME } from './dcsME'

/**
 * Download MDC file in the specified format
 */
export function downloadMDC(
  mission: Mission,
  crewMemberIndex = 0,
  exportFormat: ExportFormat = 'DCS-DTC',
) {
  let json: string
  let filename: string

  // Get crew member pilot name for filename
  const crewMember = mission.crew[crewMemberIndex]
  const pilotSuffix = `_${crewMember.pilot.replace(/\s+/g, '_')}`
  const airframe = getSquadronAirframe(mission.squadron)

  switch (exportFormat) {
    case 'DCS-DTC': {
      if (airframe === 'F-16C_50') {
        const template = loadTemplateForFormat<DCSF16MDC>(exportFormat, mission.squadron)
        const mdc = exportF16MDC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'A-10C_2') {
        const template = loadTemplateForFormat<DCSGenericMDC>(exportFormat, mission.squadron)
        const mdc = exportA10DCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'C-130J-30') {
        const template = loadTemplateForFormat<DCSGenericMDC>(exportFormat, mission.squadron)
        const mdc = exportC130DCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'FA-18C_hornet') {
        const template = loadTemplateForFormat<DCSFA18CMDC>(exportFormat, mission.squadron)
        const mdc = exportFA18CDCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'F-15ESE') {
        const template = loadTemplateForFormat<DCSF15EMDC>(exportFormat, mission.squadron)
        const mdc = exportF15EDCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'AV8BNA') {
        const template = loadTemplateForFormat<DCSAV8BMDC>(exportFormat, mission.squadron)
        const mdc = exportAV8BDCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'CH-47Fbl1') {
        const template = loadTemplateForFormat<DCSGenericMDC>(exportFormat, mission.squadron)
        const mdc = exportCH47FDCSDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else {
        throw new Error(`DCS-DTC export not supported for airframe: ${airframe}`)
      }
      filename = `${mission.name}${pilotSuffix}.json`
      break
    }
    case 'JAFDTC': {
      if (airframe === 'F-16C_50') {
        const template = loadTemplateForFormat<JAFDTCF16MDC>(exportFormat, mission.squadron)
        const mdc = exportF16JAFDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'A-10C_2') {
        const template = loadTemplateForFormat<JAFDTCA10MDC>(exportFormat, mission.squadron)
        const mdc = exportA10MDC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'FA-18C_hornet') {
        const template = loadTemplateForFormat<JAFDTCFA18CMDC>(exportFormat, mission.squadron)
        const mdc = exportFA18CJAFDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else if (airframe === 'F-15ESE') {
        const template = loadTemplateForFormat<JAFDTCF15EMDC>(exportFormat, mission.squadron)
        const mdc = exportF15EJAFDTC(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else {
        throw new Error(`JAFDTC export not supported for airframe: ${airframe}`)
      }
      filename = `${mission.name}${pilotSuffix}.jafdtc`
      break
    }
    case 'DCS-ME': {
      if (airframe === 'F-16C_50') {
        const template = loadTemplateForFormat<DCSMissionEditorDTC>(exportFormat, mission.squadron)
        const mdc = exportF16DCSME(mission, crewMemberIndex, template)
        json = JSON.stringify(mdc, null, 2)
      } else {
        throw new Error(`DCS ME export not supported for airframe: ${airframe}`)
      }
      filename = `${mission.name}${pilotSuffix}.dtc`
      break
    }
    default:
      throw new Error(`Unknown export format: ${String(exportFormat)}`)
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
