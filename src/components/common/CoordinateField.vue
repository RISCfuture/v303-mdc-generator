<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { NInput, NSelect, NFlex } from 'naive-ui'
import type { CoordinateFormat } from '@/types'
import { formatCoordinate, parseCoordinate } from '@/utils/coordinateFormatter'
import { detectMGRSPrecision } from '@/utils/mgrs'
import { isValidDecimal } from '@/utils/coordinates'

const props = withDefaults(
  defineProps<{
    /** Latitude in decimal degrees */
    latitude: number | null
    /** Longitude in decimal degrees */
    longitude: number | null
    /** Current coordinate format */
    format: CoordinateFormat
    /** Input size */
    size?: 'small' | 'medium' | 'large'
    /** Placeholder text */
    placeholder?: string
    /** Label for the field */
    label?: string
  }>(),
  {
    size: 'medium',
    placeholder: '',
    label: 'Coordinate',
    format: 'DDM',
  },
)

const emit = defineEmits<{
  'update:latitude': [value: number | null]
  'update:longitude': [value: number | null]
  'update:format': [value: CoordinateFormat]
}>()

const displayValue = ref('')
const isValid = ref(true)
const mgrsPrecision = ref(5)
const isUserTyping = ref(false) // Track if user is actively typing

// Format-specific placeholder examples
const placeholderText = computed(() => {
  if (props.placeholder) return props.placeholder

  switch (props.format) {
    case 'DD':
      return '36.2057583, -115.1234567'
    case 'DDM':
      return 'N 36° 12.345′, W 115° 07.407′'
    case 'DMS':
      return 'N 36° 12′ 21″, W 115° 07′ 24″'
    case 'MGRS':
      return '11S PA 44000 84000'
    default:
      return `Enter ${String(props.format)} coordinate`
  }
})

// Format options for the dropdown
const formatOptions = [
  { label: 'DD', value: 'DD' as CoordinateFormat },
  { label: 'DDM', value: 'DDM' as CoordinateFormat },
  { label: 'DMS', value: 'DMS' as CoordinateFormat },
  { label: 'MGRS', value: 'MGRS' as CoordinateFormat },
]

// Computed to check if we have valid coordinates (unused but may be needed in future)
// const hasValidCoordinates = computed(() => {
//   return (
//     props.latitude !== null &&
//     props.longitude !== null &&
//     !isNaN(props.latitude) &&
//     !isNaN(props.longitude)
//   )
// })

// Update display value when lat/lon or format changes
watch(
  () => [props.latitude, props.longitude, props.format] as const,
  ([lat, lon, format], oldValues) => {
    // Don't update display value if user is actively typing
    if (isUserTyping.value) {
      return
    }

    // Check if this is the initial call (oldValues is undefined on first immediate run)
    if (!oldValues) {
      // Initial mount - just format if we have valid coordinates
      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        displayValue.value = formatCoordinate(lat, lon, format, mgrsPrecision.value)
      } else {
        displayValue.value = ''
      }
      isValid.value = true
      return
    }

    const [oldLat, oldLon, oldFormat] = oldValues
    const formatChanged = format !== oldFormat
    const coordsChanged = lat !== oldLat || lon !== oldLon

    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
      // Have valid coordinates - format them
      const formatted = formatCoordinate(lat, lon, format, mgrsPrecision.value)
      if (formatted !== displayValue.value) {
        displayValue.value = formatted
        isValid.value = true
      }
    } else if (formatChanged && !coordsChanged && displayValue.value) {
      // Format changed but coordinates stayed null/invalid - try to convert display value
      // Try to parse current display value using old format, then format with new format
      const parsed = parseCoordinate(displayValue.value, oldFormat)
      if (parsed) {
        const latValid = isValidDecimal(parsed.lat, 'latitude')
        const lonValid = isValidDecimal(parsed.lon, 'longitude')
        if (latValid && lonValid) {
          // Successfully parsed - format with new format
          const formatted = formatCoordinate(parsed.lat, parsed.lon, format, mgrsPrecision.value)
          displayValue.value = formatted
          isValid.value = true
        }
      }
      // If parsing failed, keep the current display value (don't clear it)
    } else if (!formatChanged) {
      // Coordinates changed (not format) and are now null - clear the field
      displayValue.value = ''
      isValid.value = true
    }
  },
  { immediate: true },
)

// Format input based on coordinate type
function formatInputByType(input: string, format: CoordinateFormat): string {
  if (!input) return ''

  switch (format) {
    case 'DD':
      return formatDDInput(input)
    case 'DDM':
      return formatDDMInput(input)
    case 'DMS':
      return formatDMSInput(input)
    case 'MGRS':
      return formatMGRSInput(input)
    default:
      return input
  }
}

// Format DD input (e.g., "36.2057583, -115.1234567")
function formatDDInput(input: string): string {
  // Allow digits, dots, minus signs, commas, and spaces
  let cleaned = input.replace(/[^\d.,\s-]/gu, '')

  // Ensure only one comma
  const parts = cleaned.split(',')
  if (parts.length > 2) {
    // Join extra parts without commas, but preserve one space after comma
    const remaining = parts.slice(1).join('').replace(/\s/gu, '')
    cleaned = parts[0] + ', ' + remaining
  }

  return cleaned
}

// Format DDM input (e.g., "N 36° 12.345′, W 115° 07.407′")
function formatDDMInput(input: string): string {
  // Capitalize and remove invalid characters
  let cleaned = input.toUpperCase().replace(/[^NSEW\d.,\s°′]/gu, '')

  // Remove leading digits before any hemisphere letter (must start with hemisphere)
  cleaned = cleaned.replace(/^[\d°′.\s]+(?<hemisphere>[NSEW])/u, '$<hemisphere>')

  // Auto-insert comma when transitioning from lat hemisphere (N/S) to lon hemisphere (E/W)
  // Match: hemisphere + digits (with optional symbols) + another hemisphere
  // This catches: "N3622354W" or "N 36° 12.354′ W" etc.
  cleaned = cleaned.replace(/(?<lat>[NS][\d°′.\s]+)(?<lon>[EW])/gu, '$<lat>, $<lon>')
  // Also handle the reverse: lon to lat
  cleaned = cleaned.replace(/(?<lon>[EW][\d°′.\s]+)(?<lat>[NS])/gu, '$<lon>, $<lat>')

  // Split by comma to handle lat and lon separately
  const parts = cleaned.split(',')
  const formatted: string[] = []

  for (let i = 0; i < Math.min(parts.length, 2); i++) {
    const part = parts[i]
    if (!part) continue
    const trimmedPart = part.trim()
    if (!trimmedPart) continue

    // Extract components: hemisphere, degrees, minutes
    const numbers = trimmedPart.replace(/[NSEW°′\s]/gu, '')
    let hemisphere = ''

    // Find hemisphere letter
    const firstChar = trimmedPart[0]
    if (firstChar && ['N', 'S', 'E', 'W'].includes(firstChar)) {
      hemisphere = firstChar
    }

    // Determine if this is latitude or longitude based on hemisphere
    // If no hemisphere specified, assume latitude for first coordinate, longitude for second
    const isLat = hemisphere ? hemisphere === 'N' || hemisphere === 'S' : i === 0
    const maxDegrees = isLat ? 2 : 3

    // Build formatted string
    let result = hemisphere

    if (numbers.length > 0) {
      // Degrees (2-3 digits)
      const degreesEnd = Math.min(numbers.length, maxDegrees)
      const degrees = numbers.slice(0, degreesEnd)
      result = result ? `${result} ${degrees}` : degrees

      // Add degree symbol if:
      // 1. We have started entering minutes (numbers.length > maxDegrees), OR
      // 2. We have exactly the right number of degree digits (complete degrees, no minutes yet)
      const hasMinutes = numbers.length > maxDegrees
      const hasCompleteDegrees = degrees.length === maxDegrees

      if (hasMinutes || hasCompleteDegrees) {
        result += '°'
      }

      if (hasMinutes) {
        // Minutes (decimal allowed)
        const minutesPart = numbers.slice(maxDegrees)
        const hasDot = trimmedPart.includes('.')

        if (hasDot) {
          // Has decimal point in minutes - extract before and after dot from numbers
          const dotPosInNumbers = numbers.indexOf('.')
          const minutesBeforeDot = numbers.slice(maxDegrees, dotPosInNumbers)
          const minutesAfterDot = numbers.slice(dotPosInNumbers + 1)

          const beforeDot = minutesBeforeDot.padEnd(2, '0').slice(0, 2)
          const afterDot = minutesAfterDot.slice(0, 3) // Limit to 3 decimal places

          result += ` ${beforeDot}`
          if (afterDot || numbers.endsWith('.')) {
            result += `.${afterDot}`
          }
          if (afterDot.length > 0 || (numbers.endsWith('.') && beforeDot.length >= 2)) {
            result += '′'
          }
        } else {
          // No decimal point - but if more than 2 digits, treat extras as decimal
          const minutes = minutesPart.slice(0, 2)
          const extraDigits = minutesPart.slice(2, 5) // Max 3 decimal places

          result += ` ${minutes}`
          if (extraDigits) {
            result += `.${extraDigits}`
          }
          if (minutes.length === 2) {
            result += '′'
          }
        }
      }
    }

    formatted.push(result)
  }

  return formatted.join(', ')
}

// Format DMS input (e.g., "N 36° 12′ 21″, W 115° 07′ 24″")
function formatDMSInput(input: string): string {
  // Capitalize and remove invalid characters
  let cleaned = input.toUpperCase().replace(/[^NSEW\d.,\s°′″]/gu, '')

  // Remove leading digits before any hemisphere letter (must start with hemisphere)
  cleaned = cleaned.replace(/^[\d°′″.\s]+(?<hemisphere>[NSEW])/u, '$<hemisphere>')

  // Auto-insert comma when transitioning from lat hemisphere (N/S) to lon hemisphere (E/W)
  cleaned = cleaned.replace(/(?<lat>[NS][\d°′″.\s]+)(?<lon>[EW])/gu, '$<lat>, $<lon>')
  // Also handle the reverse: lon to lat
  cleaned = cleaned.replace(/(?<lon>[EW][\d°′″.\s]+)(?<lat>[NS])/gu, '$<lon>, $<lat>')

  // Split by comma to handle lat and lon separately
  const parts = cleaned.split(',')
  const formatted: string[] = []

  for (let i = 0; i < Math.min(parts.length, 2); i++) {
    const part = parts[i]
    if (!part) continue
    const trimmedPart = part.trim()
    if (!trimmedPart) continue

    // Extract components
    const numbers = trimmedPart.replace(/[NSEW°′″\s]/gu, '')
    let hemisphere = ''

    const firstChar = trimmedPart[0]
    if (firstChar && ['N', 'S', 'E', 'W'].includes(firstChar)) {
      hemisphere = firstChar
    }

    // Determine if this is latitude or longitude based on hemisphere
    // If no hemisphere specified, assume latitude for first coordinate, longitude for second
    const isLat = hemisphere ? hemisphere === 'N' || hemisphere === 'S' : i === 0
    const maxDegrees = isLat ? 2 : 3

    let result = hemisphere

    if (numbers.length > 0) {
      // Degrees
      const degreesEnd = Math.min(numbers.length, maxDegrees)
      const degrees = numbers.slice(0, degreesEnd)
      result = result ? `${result} ${degrees}` : degrees

      // Add degree symbol if:
      // 1. We have started entering minutes (numbers.length > maxDegrees), OR
      // 2. We have exactly the right number of degree digits (complete degrees, no minutes yet)
      const hasMinutes = numbers.length > maxDegrees
      const hasCompleteDegrees = degrees.length === maxDegrees

      if (hasMinutes || hasCompleteDegrees) {
        result += '°'
      }

      if (hasMinutes) {
        // Minutes
        const minutes = numbers.slice(maxDegrees, maxDegrees + 2)
        result += ` ${minutes}`

        if (minutes.length === 2 || numbers.length > maxDegrees + 2) {
          result += '′'

          // Seconds
          if (numbers.length > maxDegrees + 2) {
            const hasDot = trimmedPart.includes('.')

            if (hasDot) {
              // Has decimal point in seconds
              const dotPosInNumbers = numbers.indexOf('.')
              const secondsBeforeDot = numbers.slice(maxDegrees + 2, dotPosInNumbers)
              const secondsAfterDot = numbers.slice(dotPosInNumbers + 1)

              const beforeDot = secondsBeforeDot.padEnd(2, '0').slice(0, 2)
              const afterDot = secondsAfterDot.slice(0, 2) // Limit to 2 decimal places

              result += ` ${beforeDot}`
              if (afterDot || numbers.endsWith('.')) {
                result += `.${afterDot}`
              }
              if (afterDot.length > 0 || (numbers.endsWith('.') && beforeDot.length >= 2)) {
                result += '″'
              }
            } else {
              const seconds = numbers.slice(maxDegrees + 2, maxDegrees + 4)
              result += ` ${seconds}`
              if (seconds.length === 2) {
                result += '″'
              }
            }
          }
        }
      }
    }

    formatted.push(result)
  }

  return formatted.join(', ')
}

// Format MGRS input (e.g., "11S PA 44000 84000")
function formatMGRSInput(input: string): string {
  // Uppercase and remove invalid characters (allow only digits, letters, spaces)
  let cleaned = input.toUpperCase().replace(/[^A-Z0-9\s]/gu, '')

  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/gu, ' ').trim()

  // MGRS format: [Grid Zone 2-3 chars][100km Square 2 chars][Easting digits][Northing digits]
  // Example: 11S PA 44000 84000

  // Extract parts
  const parts = cleaned.split(' ')
  if (parts.length === 0) return cleaned

  const formatted: string[] = []
  let remaining = cleaned.replace(/\s/gu, '')

  // Grid zone (1-2 digits + 1 letter)
  const gridZoneMatch = /^(?<gridZone>\d{1,2}[A-Z])/u.exec(remaining)
  if (gridZoneMatch?.groups?.gridZone) {
    const gridZone = gridZoneMatch.groups.gridZone
    formatted.push(gridZone)
    remaining = remaining.slice(gridZone.length)
  }

  // 100km square identifier (2 letters)
  if (remaining.length >= 1 && formatted.length > 0) {
    const square = remaining.slice(0, 2)
    if (square.length > 0) {
      formatted.push(square)
      remaining = remaining.slice(square.length)
    }
  }

  // Coordinates (split into easting and northing)
  if (remaining.length > 0 && formatted.length >= 2) {
    // Split remaining digits in half for easting and northing
    // For lengths < 4, keep as single (partial easting)
    // For odd lengths, keep as single (partial easting)
    if (remaining.length < 4 || remaining.length % 2 === 1) {
      formatted.push(remaining)
    } else {
      const halfLength = Math.floor(remaining.length / 2)
      const easting = remaining.slice(0, halfLength)
      const northing = remaining.slice(halfLength)

      if (easting) formatted.push(easting)
      if (northing) formatted.push(northing)
    }
  }

  return formatted.join(' ')
}

// Handle input changes - minimal formatting while typing
function handleInput(value: string) {
  isUserTyping.value = true

  // Apply only basic character filtering, no structural changes
  let cleaned = value

  switch (props.format) {
    case 'DD':
      // Allow digits, dots, minus, comma, spaces
      cleaned = value.replace(/[^\d.,\s-]/gu, '')
      break
    case 'DDM':
      // Allow hemisphere letters, digits, comma, spaces, and coordinate symbols
      cleaned = value.toUpperCase().replace(/[^NSEW\d.,\s°′]/gu, '')
      // Don't allow leading digits before first hemisphere
      cleaned = cleaned.replace(/^[\d°′.\s]+(?<hemisphere>[NSEW])/u, '$<hemisphere>')
      break
    case 'DMS':
      // Allow hemisphere letters, digits, comma, spaces, and coordinate symbols
      cleaned = value.toUpperCase().replace(/[^NSEW\d.,\s°′″]/gu, '')
      // Don't allow leading digits before first hemisphere
      cleaned = cleaned.replace(/^[\d°′″.\s]+(?<hemisphere>[NSEW])/u, '$<hemisphere>')
      break
    case 'MGRS':
      // Allow uppercase letters, digits, spaces
      cleaned = value.toUpperCase().replace(/[^A-Z0-9\s]/gu, '')
      break
  }

  displayValue.value = cleaned

  // If empty, clear coordinates
  if (!cleaned || cleaned.trim() === '') {
    emit('update:latitude', null)
    emit('update:longitude', null)
    isValid.value = true
    return
  }

  // Try to parse - use formatter to normalize for parsing
  const formatted = formatInputByType(cleaned, props.format)
  const parsed = parseCoordinate(formatted, props.format)

  if (parsed) {
    const latValid = isValidDecimal(parsed.lat, 'latitude')
    const lonValid = isValidDecimal(parsed.lon, 'longitude')

    if (latValid && lonValid) {
      // Valid and complete - emit coordinates
      // Don't mark as invalid while typing - wait for blur
      isValid.value = true
      emit('update:latitude', parsed.lat)
      emit('update:longitude', parsed.lon)

      if (props.format === 'MGRS') {
        const precision = detectMGRSPrecision(formatted)
        if (precision !== null) {
          mgrsPrecision.value = precision
        }
      }
    }
    // If parsed but invalid range, don't change isValid (keep it valid while typing)
  }
  // If can't parse, don't change isValid (keep it valid while typing, allow partial input)
}

// Handle format change
function handleFormatChange(newFormat: CoordinateFormat) {
  // Allow watch to update display value when format changes
  isUserTyping.value = false

  emit('update:format', newFormat)

  // If we have valid coordinates, they will be auto-converted via the watch
  // If the field is empty or invalid, just switch the format
}

// Handle blur - apply full formatting when user finishes editing
function handleBlur() {
  isUserTyping.value = false

  if (displayValue.value && displayValue.value.trim() !== '') {
    // Try to format and parse
    const formatted = formatInputByType(displayValue.value, props.format)
    const parsed = parseCoordinate(formatted, props.format)

    if (parsed) {
      const latValid = isValidDecimal(parsed.lat, 'latitude')
      const lonValid = isValidDecimal(parsed.lon, 'longitude')

      if (latValid && lonValid) {
        // Valid and complete - apply formatting
        displayValue.value = formatted
        isValid.value = true
        emit('update:latitude', parsed.lat)
        emit('update:longitude', parsed.lon)
      } else {
        // Parsed but invalid range - don't format, mark invalid
        isValid.value = false
      }
    } else {
      // Can't parse at all - check if we can at least partially parse
      // This allows formatting of partial but structurally valid input like "N 36" or compact "N32E121"
      const hasValidStructure =
        ((props.format === 'DDM' || props.format === 'DMS') &&
          /^[NSEW][\d°′″.\s]+/u.test(displayValue.value.trim())) ||
        (props.format === 'MGRS' && /^\d{1,2}[A-Z]/u.test(displayValue.value.trim())) ||
        (props.format === 'DD' && /^-?\d/u.test(displayValue.value.trim()))

      if (hasValidStructure && formatted !== displayValue.value) {
        // Has valid structure but incomplete - apply formatting
        displayValue.value = formatted
      }
      // Mark as invalid since we can't fully parse it
      isValid.value = false
    }
  }
}
</script>

<template>
  <NFlex vertical :size="4" class="coordinate-field">
    <label v-if="label" class="field-label">{{ label }}</label>
    <NFlex :size="8" class="input-group">
      <NSelect
        :value="format"
        :options="formatOptions"
        :size="size"
        class="format-select"
        @update:value="handleFormatChange"
      />
      <NInput
        :value="displayValue"
        :placeholder="placeholderText"
        :size="size"
        :status="!isValid && displayValue.length > 0 ? 'error' : undefined"
        class="coordinate-input"
        @input="handleInput"
        @blur="handleBlur"
        autocorrect="off"
      />
    </NFlex>
    <div v-if="!isValid && displayValue.length > 0" class="error-message">
      Invalid {{ format }} coordinate format
    </div>
  </NFlex>
</template>

<style scoped>
.coordinate-field {
  width: 100%;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.input-group {
  width: 100%;
}

.format-select {
  flex: 0 0 80px;
  min-width: 80px;
}

.coordinate-input {
  flex: 1;
  min-width: 0;
}

.error-message {
  font-size: 12px;
  color: #d03050;
  margin-top: 2px;
}
</style>
