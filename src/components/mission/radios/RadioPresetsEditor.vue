<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NTabs, NTabPane, NSelect, NFormItem, NInput, NInputNumber, NSpace } from 'naive-ui'
import RadioPresetRow from './RadioPresetRow.vue'
import type { RadioPreset, Airframe, RadioDefault } from '@/types'
import { getAirframeData } from '@/utils/airframeHelpers'

const props = defineProps<{
  airframe: Airframe
  radioPresets: RadioPreset[][]
  commLadders?: string[]
  radioDefaults?: RadioDefault[]
}>()

const emit = defineEmits<{
  'update:radioPresets': [presets: RadioPreset[][]]
  'update:commLadders': [ladders: string[]]
  'update:radioDefaults': [defaults: RadioDefault[]]
}>()

// Get airframe data based on airframe type
const airframeData = computed(() => {
  const data = getAirframeData(props.airframe)
  if (!data) throw new Error(`Unknown airframe: ${props.airframe}`)
  return data
})

// Build radio configuration dynamically
const radios = computed(() => {
  return airframeData.value.radios.map((radioConfig, index) => {
    const label = radioConfig.description // Use only description as per requirement
    const presetCount = radioConfig.presetCount
    const currentPresets = props.radioPresets[index] ?? []

    // Create slots for this radio
    const slots: RadioPreset[] = []
    for (let i = 0; i < presetCount; i++) {
      const existing = currentPresets.find((p) => p.number === i + 1)
      slots.push(existing ?? { number: i + 1, frequency: '', description: '' })
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
  const slot = radio.slots[slotNumber - 1]

  // Convert number to string for storage
  const frequencyString = value !== null ? value.toString() : ''

  // Create updated preset
  const updatedPreset: RadioPreset = {
    ...slot,
    frequency: frequencyString,
  }

  // Get current presets for this radio
  const currentPresets = props.radioPresets[radioIndex] ?? []

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
  const slot = radio.slots[slotNumber - 1]

  // Create updated preset
  const updatedPreset: RadioPreset = {
    ...slot,
    description: value,
  }

  // Get current presets for this radio
  const currentPresets = props.radioPresets[radioIndex] ?? []

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

// Comm ladder functions
function updateCommLadder(radioIndex: number, value: string) {
  const updatedLadders = [...(props.commLadders ?? [])]
  updatedLadders[radioIndex] = value
  emit('update:commLadders', updatedLadders)
}

// Radio default functions
const modeOptions = [
  { label: 'Preset', value: 'preset' },
  { label: 'Manual', value: 'manual' },
]

function getPresetOptions(radioIndex: number) {
  const radio = radios.value[radioIndex]

  const options: { label: string; value: number }[] = []
  for (let i = 1; i <= radio.presetCount; i++) {
    options.push({ label: `${i}`, value: i })
  }
  return options
}

function getRadioDefault(radioIndex: number): RadioDefault {
  return props.radioDefaults?.[radioIndex] ?? { mode: 'preset', preset: 1 }
}

function updateRadioDefault(radioIndex: number, updates: Partial<RadioDefault>) {
  const updatedDefaults = [...(props.radioDefaults ?? [])]
  const current = updatedDefaults[radioIndex] ?? { mode: 'preset', preset: 1 }
  updatedDefaults[radioIndex] = { ...current, ...updates }
  emit('update:radioDefaults', updatedDefaults)
}

function updateDefaultMode(radioIndex: number, mode: 'preset' | 'manual') {
  const updates: Partial<RadioDefault> = { mode }
  // Set sensible defaults when switching modes
  if (mode === 'preset') {
    updates.preset = 1
    updates.frequency = undefined
  } else {
    updates.frequency = ''
    updates.preset = undefined
  }
  updateRadioDefault(radioIndex, updates)
}
</script>

<template>
  <NCard title="Radio Configuration">
    <NTabs type="line">
      <!-- Dynamic radio tabs based on airframe -->
      <NTabPane v-for="radio in radios" :key="radio.index" :name="radio.label" :tab="radio.label">
        <NSpace vertical :size="24" class="tab-content">
          <NFormItem label="Comm Ladder" label-placement="left">
            <NInput
              :value="commLadders?.[radio.index] || ''"
              @update:value="(v: string) => updateCommLadder(radio.index, v)"
              placeholder="e.g., 1-2-3-4-12"
            />
          </NFormItem>

          <NSpace vertical :size="8">
            <NFormItem label="Default" label-placement="left">
              <NSpace>
                <NSelect
                  :value="getRadioDefault(radio.index).mode"
                  @update:value="(v: 'preset' | 'manual') => updateDefaultMode(radio.index, v)"
                  :options="modeOptions"
                  style="width: 100px"
                />
                <NSelect
                  v-if="getRadioDefault(radio.index).mode === 'preset'"
                  :value="getRadioDefault(radio.index).preset || 1"
                  @update:value="(v: number) => updateRadioDefault(radio.index, { preset: v })"
                  :options="getPresetOptions(radio.index)"
                  style="width: 80px"
                />
                <NInputNumber
                  v-else
                  :value="
                    getRadioDefault(radio.index).frequency
                      ? parseFloat(getRadioDefault(radio.index).frequency!)
                      : null
                  "
                  @update:value="
                    (v: number | null) =>
                      updateRadioDefault(radio.index, { frequency: v?.toString() || '' })
                  "
                  :min="radio.radioConfig.min || undefined"
                  :max="radio.radioConfig.max || undefined"
                  :step="radio.radioConfig.step"
                  :precision="3"
                  placeholder="Frequency"
                  style="width: 120px"
                />
              </NSpace>
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
          </NSpace>
        </NSpace>
      </NTabPane>
    </NTabs>
  </NCard>
</template>

<style scoped>
.tab-content {
  padding-top: 16px;
}

.presets-grid {
  display: grid;
  gap: 8px;
}
</style>
