/**
 * Mission helper utilities
 */

import type { Mission, Airframe } from '@/types'
import { getSquadronAirframe } from '@/data/squadrons'

/**
 * Get the airframe for a mission based on its squadron
 */
export function getMissionAirframe(mission: Mission): Airframe {
  return getSquadronAirframe(mission.squadron)
}
