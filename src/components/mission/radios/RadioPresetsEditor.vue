<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NTabs, NTabPane, NSelect, NFormItem } from 'naive-ui'
import RadioPresetRow from './RadioPresetRow.vue'
import type { RadioPreset, Airframe } from '@/types'
import { getAirframeData } from '@/utils/airframeHelpers'

const props = defineProps<{
  airframe: Airframe
  radioPresets: RadioPreset[][]
  commLadders?: number[][]
}>()

const emit = defineEmits<{
  'update:radioPresets': [presets: RadioPreset[][]]
  'update:commLadders': [ladders: number[][]]
}>()

// Get airframe data based on airframe type
const airframeData = computed(() => getAirframeData(props.airframe)!)

// Build radio configuration dynamically
const radios = computed(() => {
  return airframeData.value.radios.map((radioConfig, index) => {
    const label = radioConfig.description // Use only description as per requirement
    const presetCount = radioConfig.presetCount
    const currentPresets = props.radioPresets[index] || []

    // Create slots for this radio
    const slots: RadioPreset[] = []
    for (let i = 0; i < presetCount; i++) {
      const existing = currentPresets.find((p) => p.number === i + 1)
      slots.push(existing || { number: i + 1, frequency: '', description: '' })
    }

    return {
      index,
      label,
      slots,
      presetCount,
      radioConfig,
    }
  })
})

function updatePresetFrequency(radioIndex: number, slotNumber: number, value: number | null) {
  const radio = radios.value[radioIndex]
  if (!radio) return

  const slot = radio.slots[slotNumber - 1]
  if (!slot) return

  // Convert number to string for storage
  const frequencyString = value !== null ? value.toString() : ''

  // Create updated preset
  const updatedPreset: RadioPreset = {
    ...slot,
    frequency: frequencyString,
  }

  // Get current presets for this radio
  const currentPresets = props.radioPresets[radioIndex] || []

  // Filter out empty presets and update/add the changed one
  const filteredPresets = currentPresets.filter((p) => p.number !== slotNumber)

  // Only include non-empty presets (either frequency or description has content)
  if (updatedPreset.frequency.trim() || updatedPreset.description.trim()) {
    filteredPresets.push(updatedPreset)
  }

  // Sort by preset number
  filteredPresets.sort((a, b) => a.number - b.number)

  // Update the entire radioPresets array
  const newRadioPresets = [...props.radioPresets]
  newRadioPresets[radioIndex] = filteredPresets
  emit('update:radioPresets', newRadioPresets)
}

function updatePresetDescription(radioIndex: number, slotNumber: number, value: string) {
  const radio = radios.value[radioIndex]
  if (!radio) return

  const slot = radio.slots[slotNumber - 1]
  if (!slot) return

  // Create updated preset
  const updatedPreset: RadioPreset = {
    ...slot,
    description: value,
  }

  // Get current presets for this radio
  const currentPresets = props.radioPresets[radioIndex] || []

  // Filter out empty presets and update/add the changed one
  const filteredPresets = currentPresets.filter((p) => p.number !== slotNumber)

  // Only include non-empty presets (either frequency or description has content)
  if (updatedPreset.frequency.trim() || updatedPreset.description.trim()) {
    filteredPresets.push(updatedPreset)
  }

  // Sort by preset number
  filteredPresets.sort((a, b) => a.number - b.number)

  // Update the entire radioPresets array
  const newRadioPresets = [...props.radioPresets]
  newRadioPresets[radioIndex] = filteredPresets
  emit('update:radioPresets', newRadioPresets)
}

// Comm ladder options - dynamic based on radio preset count
const getCommLadderOptions = (radioIndex: number) => {
  const radio = radios.value[radioIndex]
  if (!radio) return []

  const options: { label: string; value: number }[] = []
  for (let i = 1; i <= radio.presetCount; i++) {
    options.push({ label: `Preset ${i}`, value: i })
  }
  return options
}

// Validate comm ladder input (presets or frequencies)
// Returns a select option object if valid, or false to reject the input
function validateCommLadderInput(
  radioIndex: number,
  inputValue: string,
): { label: string; value: number } | false {
  const radio = radios.value[radioIndex]
  if (!radio) return false

  const numValue = parseFloat(inputValue)
  if (isNaN(numValue)) return false

  // Check if it's an integer (preset number)
  if (Number.isInteger(numValue)) {
    if (numValue >= 1 && numValue <= radio.presetCount) {
      return { label: `Preset ${numValue}`, value: numValue }
    }
    return false
  }

  // It's a decimal (frequency)
  // Validate against radio's frequency range
  const minFreq = radio.radioConfig.min
  const maxFreq = radio.radioConfig.max

  if (minFreq !== null && maxFreq !== null && numValue >= minFreq && numValue <= maxFreq) {
    return { label: numValue.toString(), value: numValue }
  }

  return false
}

function updateCommLadder(radioIndex: number, value: number[] | null) {
  const updatedLadders = [...(props.commLadders || [])]
  updatedLadders[radioIndex] = value || []
  emit('update:commLadders', updatedLadders)
}
</script>

<template>
  <NCard title="Radio Configuration">
    <NTabs type="line">
      <!-- Dynamic radio tabs based on airframe -->
      <NTabPane v-for="radio in radios" :key="radio.index" :name="radio.label" :tab="radio.label">
        <NFormItem label="Comm Ladder" label-placement="left" style="margin-bottom: 16px">
          <NSelect
            :value="commLadders?.[radio.index] || []"
            @update:value="(v: number[] | null) => updateCommLadder(radio.index, v)"
            :options="getCommLadderOptions(radio.index)"
            multiple
            tag
            placeholder="Select presets or enter frequencies (30-400 MHz)"
            :max-tag-count="10"
            filterable
            :on-create="(label: string) => validateCommLadderInput(radio.index, label)"
          />
        </NFormItem>
        <div class="presets-grid">
          <RadioPresetRow
            v-for="preset in radio.slots"
            :key="preset.number"
            :preset-number="preset.number"
            :frequency="preset.frequency"
            :description="preset.description"
            :radio-config="radio.radioConfig"
            @update:frequency="
              (v: number | null) => updatePresetFrequency(radio.index, preset.number, v)
            "
            @update:description="
              (v: string) => updatePresetDescription(radio.index, preset.number, v)
            "
          />
        </div>
      </NTabPane>
    </NTabs>
  </NCard>
</template>

<style scoped>
.presets-grid {
  display: grid;
  gap: 8px;
}
</style>
