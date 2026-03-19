<script setup lang="ts">
import { ref, watch } from 'vue'
import { NInput } from 'naive-ui'
import {
  decimalToDDMString,
  ddmStringToDecimal,
  isValidDecimal,
  type CoordinateType,
} from '@/utils/coordinates'

const props = withDefaults(
  defineProps<{
    /** Model value in decimal degrees (e.g., 36.2057583) */
    modelValue: number | null
    type: CoordinateType
    placeholder?: string
    size?: 'small' | 'medium' | 'large'
    ariaLabel?: string
  }>(),
  {
    placeholder: '',
    size: 'medium',
    modelValue: null,
    ariaLabel: '',
  },
)

const emit = defineEmits<{
  /** Emits decimal degrees */
  'update:modelValue': [value: number | null]
  blur: []
}>()

const displayValue = ref('')
const isValid = ref(true)

// Get valid hemispheres for this coordinate type
function getHemispheres(): string[] {
  return props.type === 'latitude' ? ['N', 'S'] : ['E', 'W']
}

// Format coordinate as user types
function formatCoordinateInput(input: string): string {
  const validHemispheres = getHemispheres()

  // First pass: remove all non-alphanumeric characters except dots and hemisphere letters
  const cleaned = input.toUpperCase().replace(/[^\dNSEW.]/g, '')

  // Extract components
  let hemisphere = ''
  let numbers = cleaned

  // Check for hemisphere at start
  const firstChar = cleaned[0]
  if (firstChar && validHemispheres.includes(firstChar)) {
    hemisphere = firstChar
    numbers = cleaned.slice(1)
  }

  // Remove ALL hemisphere letters from the numbers portion (they should only be at the start)
  // Also remove invalid hemisphere letters from anywhere
  numbers = numbers.replace(/[NSEW]/g, '')

  // Split numbers by dots to handle decimal points
  const parts = numbers.split('.')
  const integers = parts[0] || ''
  const hasDecimal = parts.length > 1
  const decimal = hasDecimal ? parts.slice(1).join('') : ''

  // Build formatted string based on how much has been typed
  let formatted = hemisphere

  if (integers.length > 0) {
    // Degrees (2-3 digits depending on type)
    const maxDegreesDigits = props.type === 'latitude' ? 2 : 3
    const degreesRaw = integers.slice(0, maxDegreesDigits)

    formatted = formatted ? `${formatted} ${degreesRaw}` : degreesRaw

    if (degreesRaw.length === maxDegreesDigits || integers.length > maxDegreesDigits) {
      formatted += '°'

      // Minutes (2 digits)
      if (integers.length > maxDegreesDigits) {
        const minutesRaw = integers.slice(maxDegreesDigits, maxDegreesDigits + 2)
        formatted += ` ${minutesRaw}`

        // Add decimal point and decimal part if present
        if (hasDecimal) {
          formatted += `.${decimal.slice(0, 3)}′` // Limit to 3 decimal places, use proper prime
        } else if (minutesRaw.length === 2) {
          formatted += '′'
        }
      }
    }
  }

  return formatted
}

// Handle input changes
function handleInput(value: string) {
  const formatted = formatCoordinateInput(value)
  displayValue.value = formatted

  // Try to convert to decimal degrees
  const decimal = ddmStringToDecimal(formatted)
  if (decimal !== null) {
    isValid.value = isValidDecimal(decimal, props.type)
    emit('update:modelValue', decimal)
  } else {
    // If not fully formed yet, still show partial input
    isValid.value = false
    // Don't emit until we have a valid coordinate
  }
}

// Handle blur event
function handleBlur() {
  // Try to parse and validate final value
  const decimal = ddmStringToDecimal(displayValue.value)
  if (decimal !== null) {
    isValid.value = isValidDecimal(decimal, props.type)
  } else {
    isValid.value = false
  }
  emit('blur')
}

// Initialize display value from model (convert decimal to DMS string)
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== null) {
      const dmsString = decimalToDDMString(newValue, props.type)
      if (dmsString !== displayValue.value) {
        displayValue.value = dmsString
        isValid.value = isValidDecimal(newValue, props.type)
      }
    } else {
      displayValue.value = ''
      isValid.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <NInput
    :value="displayValue"
    :placeholder="placeholder"
    :size="size"
    :status="!isValid && displayValue.length > 0 ? 'error' : undefined"
    :aria-label="ariaLabel"
    @input="handleInput"
    @blur="handleBlur"
  />
</template>
