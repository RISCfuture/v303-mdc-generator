// DCS-DTC exporter for A-10C
import type { Mission } from '@/types'
import type { DeepPartial } from '../helpers'
import type { DCSGenericMDC } from './generic'
import { exportGenericDCSDTC } from './generic'

/**
 * Export mission to A-10C DCS-DTC (.json) format
 */
export function exportA10DCSDTC(
  mission: Mission,
  crewMemberIndex: number = 0,
  template?: DeepPartial<DCSGenericMDC>,
): DCSGenericMDC {
  return exportGenericDCSDTC(mission, crewMemberIndex, 'A10', template)
}
