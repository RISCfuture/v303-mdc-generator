export type ExportFormat = 'DCS-DTC' | 'JAFDTC' | 'DCS-ME'

export const exportFormatLabels: Record<ExportFormat, string> = {
  'DCS-DTC': 'DCS-DTC',
  JAFDTC: 'JAFDTC',
  'DCS-ME': 'DCS Mission Editor',
}

export const airframeExportFormats: Record<string, ExportFormat[]> = {
  'F-16C_50': ['DCS-DTC', 'JAFDTC', 'DCS-ME'],
  'A-10C_2': ['DCS-DTC', 'JAFDTC'],
  'C-130J-30': ['DCS-DTC'],
  'FA-18C_hornet': ['DCS-DTC', 'JAFDTC'],
  'F-15ESE': ['DCS-DTC', 'JAFDTC'],
  AV8BNA: ['DCS-DTC'],
  'CH-47Fbl1': ['DCS-DTC'],
}

export function getExportFormatsForAirframe(airframe: string): ExportFormat[] {
  return airframeExportFormats[airframe] ?? []
}
