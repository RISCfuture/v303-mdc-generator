import haversine from 'haversine-distance'
import type { Waypoint } from '@/types'

/**
 * Composable for waypoint calculations (distance, time, TOT)
 */

type WaypointPair = {
  from: Waypoint
  to: Waypoint
  distance: number | null // nautical miles
  time: number | null // minutes
}

/**
 * Calculate distance between two waypoints in nautical miles
 */
export function calculateDistance(from: Waypoint, to: Waypoint): number | null {
  if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) {
    return null
  }

  const point1 = { latitude: from.latitude, longitude: from.longitude }
  const point2 = { latitude: to.latitude, longitude: to.longitude }

  // haversine-distance returns meters, convert to nautical miles
  const meters = haversine(point1, point2)
  const nauticalMiles = meters / 1852

  return nauticalMiles
}

/**
 * Calculate time between two waypoints in minutes
 */
export function calculateTime(distance: number, speedKnots: number): number | null {
  if (!distance || !speedKnots || speedKnots <= 0) {
    return null
  }

  // time = distance / speed * 60 (to convert hours to minutes)
  return (distance / speedKnots) * 60
}

/**
 * Parse TOT string to minutes since midnight
 * Supports formats: "HH:MM", "HHMM", "HHMMz"
 */
export function parseTOT(tot: string | undefined): number | null {
  if (!tot) return null

  // Remove 'z' or 'Z' suffix if present
  const cleaned = tot.trim().replace(/[zZ]$/i, '')

  // Try HH:MM format
  const colonMatch = /^(\d{1,2}):(\d{2})$/.exec(cleaned)
  if (colonMatch?.[1] && colonMatch[2]) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes
    }
  }

  // Try HHMM format
  const noColonMatch = /^(\d{2})(\d{2})$/.exec(cleaned)
  if (noColonMatch?.[1] && noColonMatch[2]) {
    const hours = parseInt(noColonMatch[1], 10)
    const minutes = parseInt(noColonMatch[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes
    }
  }

  return null
}

/**
 * Format minutes since midnight to HHMMz format (Zulu time)
 */
export function formatZuluTime(minutesSinceMidnight: number): string {
  const hours = Math.floor(minutesSinceMidnight / 60) % 24
  const minutes = Math.floor(minutesSinceMidnight % 60)
  return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}z`
}

/**
 * @deprecated Use formatZuluTime instead
 */
export const formatTOT = formatZuluTime

/**
 * Calculate TOT placeholders for all waypoints
 * Returns an array where each element is the calculated TOT for that waypoint
 * Returns "----" if TOT cannot be calculated
 */
export function calculateTOTPlaceholders(waypoints: Waypoint[]): string[] {
  const placeholders: string[] = []
  let lastKnownTOT: number | null = null
  let lastKnownIndex: number | null = null

  for (let i = 0; i < waypoints.length; i++) {
    const currentWP = waypoints[i]

    // If this waypoint has a TOT entered, use it as the new reference
    const enteredTOT = parseTOT(currentWP.timeOnTarget)
    if (enteredTOT !== null) {
      lastKnownTOT = enteredTOT
      lastKnownIndex = i
      placeholders.push(formatZuluTime(enteredTOT))
      continue
    }

    // If we have a reference TOT, calculate forward
    if (lastKnownTOT !== null && lastKnownIndex !== null) {
      let calculatedTOT = lastKnownTOT
      let calculationFailed = false

      // Sum up the time from the last known TOT to this waypoint
      for (let j = lastKnownIndex; j < i; j++) {
        const fromWP = waypoints[j]
        const toWP = waypoints[j + 1]

        const distance = calculateDistance(fromWP, toWP)
        if (distance === null || !fromWP.speed) {
          // Cannot calculate, show dashes
          calculationFailed = true
          break
        }

        const time = calculateTime(distance, fromWP.speed)
        if (time === null) {
          calculationFailed = true
          break
        }

        calculatedTOT += time
      }

      if (calculationFailed) {
        placeholders.push('----')
        lastKnownTOT = null
        lastKnownIndex = null
      } else {
        // If we successfully calculated the TOT, add it
        placeholders.push(formatZuluTime(calculatedTOT))
      }
    } else {
      // No reference TOT yet
      placeholders.push('----')
    }
  }

  return placeholders
}

/**
 * Calculate waypoint pairs with distance and time information
 */
export function calculateWaypointPairs(waypoints: Waypoint[]): WaypointPair[] {
  const pairs: WaypointPair[] = []

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]

    const distance = calculateDistance(from, to)
    const time = distance && from.speed ? calculateTime(distance, from.speed) : null

    pairs.push({ from, to, distance, time })
  }

  return pairs
}
