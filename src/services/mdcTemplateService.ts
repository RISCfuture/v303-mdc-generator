import type { ExportFormat } from '@/data/exportFormats'
import type { DeepPartial } from './exporters/helpers'
import v93DcsDtcTemplate from '@/data/json/dtc/v93-dcsdtc.json'
import v93JafdtcTemplate from '@/data/json/dtc/v93-jafdtc.json'
import v93DcsMeTemplate from '@/data/json/dtc/v93-dcsme.json'
import v303JafdtcTemplate from '@/data/json/dtc/v303-jafdtc.json'
import v303DcsDtcTemplate from '@/data/json/dtc/v303-dcsdtc.json'

const templateMap: Record<string, unknown> = {
  'DCS-DTC:v93': v93DcsDtcTemplate,
  'JAFDTC:v93': v93JafdtcTemplate,
  'DCS-ME:v93': v93DcsMeTemplate,
  'JAFDTC:v303': v303JafdtcTemplate,
  'DCS-DTC:v303': v303DcsDtcTemplate,
}

/**
 * Load DTC template for a given format and squadron
 * Templates contain non-mission-specific settings that are standard for each squadron
 *
 * @param format - The export format ('DCS-DTC', 'JAFDTC', or 'DCS-ME')
 * @param squadronId - The squadron ID (e.g., 'v93', 'v303')
 * @returns Template data to be merged with mission export, or empty object if no template exists
 */
export function loadTemplateForFormat<T>(format: ExportFormat, squadronId: string): DeepPartial<T> {
  const key = `${format}:${squadronId}`
  const template = templateMap[key]
  if (template) {
    return template
  }
  return {}
}
