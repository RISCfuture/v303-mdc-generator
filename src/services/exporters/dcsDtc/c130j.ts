// DCS-DTC exporter for C-130J
import type { Mission } from '@/types'
import type { DeepPartial } from '../helpers'
import type { DCSGenericMDC } from './generic'
import { exportGenericDCSDTC } from './generic'

/**
 * Export mission to C-130J DCS-DTC (.json) format
 */
export function exportC130DCSDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<DCSGenericMDC>,
): DCSGenericMDC {
  return exportGenericDCSDTC(mission, crewMemberIndex, 'C130', template)
}
