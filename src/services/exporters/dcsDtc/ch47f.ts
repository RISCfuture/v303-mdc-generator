// DCS-DTC exporter for CH-47F
import type { Mission } from '@/types'
import type { DeepPartial } from '../helpers'
import type { DCSGenericMDC } from './generic'
import { exportGenericDCSDTC } from './generic'

/**
 * Export mission to CH-47F DCS-DTC (.json) format
 */
export function exportCH47FDCSDTC(
  mission: Mission,
  crewMemberIndex = 0,
  template?: DeepPartial<DCSGenericMDC>,
): DCSGenericMDC {
  return exportGenericDCSDTC(mission, crewMemberIndex, 'CH47F', template)
}
