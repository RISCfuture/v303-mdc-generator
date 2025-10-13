// Internationalized formatting utilities using system locale

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const weightFormatter = new Intl.NumberFormat(undefined, {
  style: 'unit',
  unit: 'pound',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
})

// Knot is not a standard Intl unit, so we'll manually format with 'kts'
const speedNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

// Nautical mile is not a standard Intl unit, so we'll manually format with 'NMi'
const distanceNumberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const altitudeFormatter = new Intl.NumberFormat(undefined, {
  style: 'unit',
  unit: 'foot',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-'
  return numberFormatter.format(value)
}

export function formatDecimal(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-'
  return decimalFormatter.format(value)
}

export function formatWeight(pounds: number | undefined | null): string {
  if (pounds === undefined || pounds === null) return '-'
  return weightFormatter.format(pounds)
}

export function formatSpeed(knots: number | undefined | null): string {
  if (knots === undefined || knots === null) return '-'
  return `${speedNumberFormatter.format(knots)} kts`
}

export function formatDistance(nauticalMiles: number | undefined | null): string {
  if (nauticalMiles === undefined || nauticalMiles === null) return '-'
  return `${distanceNumberFormatter.format(nauticalMiles)} NMi`
}

export function formatAltitude(feet: number | undefined | null): string {
  if (feet === undefined || feet === null) return '-'
  return altitudeFormatter.format(feet)
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return dateFormatter.format(d)
}

export function formatTime(time: string | Date | undefined | null): string {
  if (!time) return '-'
  const t = typeof time === 'string' ? new Date(time) : time
  return timeFormatter.format(t)
}

export function formatDateTime(dateTime: string | Date | undefined | null): string {
  if (!dateTime) return '-'
  const dt = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  return dateTimeFormatter.format(dt)
}

/**
 * Format a date for storage in YYYY-MM-DD format (ISO 8601 date only)
 */
export function formatDateForStorage(date: Date | number | undefined | null): string {
  if (!date) return ''
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toISOString().split('T')[0] || ''
}

/**
 * Parse a date string to timestamp for NDatePicker
 */
export function parseDateToTimestamp(date: string | undefined | null): number | null {
  if (!date) return null
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d.getTime()
}
