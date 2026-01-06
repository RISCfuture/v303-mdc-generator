<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NSelect,
  NSpace,
  NButton,
  NInput,
  NCard,
  NSwitch,
  NText,
  NGrid,
  NGridItem,
} from 'naive-ui'
import type { Mission, F16BingoCalculatorParams } from '@/types'
import { calculateBingoFuel } from '@/aircraft/F-16C_50'
import { calculateDistance } from '@/composables/useWaypointCalculations'
import type { Waypoint } from '@/types'

interface Props {
  show: boolean
  mission: Mission
  numberOfPilots: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'bingo-calculated': [bingo: number, params: F16BingoCalculatorParams]
}>()

// Calculator parameters
const aarExpected = ref<boolean>(false)
const approachType = ref<'VFR' | 'IFR'>('VFR')
const altitudeProfile = ref<'medium' | 'low'>('medium')

// Get recovery airport location
const recoveryLocation = computed(() => {
  const recoveryAirportId = props.mission.departureRecovery.recoveryAirportId
  if (!recoveryAirportId) return null

  // We'll need to look up the airport coordinates from the airports database
  // For now, we'll try to find it in waypoints as a fallback
  const waypoint = props.mission.waypoints.find(
    (wp) => wp.name && wp.name.toLowerCase() === recoveryAirportId.toLowerCase(),
  )
  if (waypoint && waypoint.latitude !== null && waypoint.longitude !== null) {
    return { latitude: waypoint.latitude, longitude: waypoint.longitude }
  }

  return null
})

// Get target waypoint location (waypoint with type === 'TGT')
const targetLocation = computed(() => {
  const targetWaypoint = props.mission.waypoints.find((wp) => wp.type === 'TGT')
  if (!targetWaypoint || targetWaypoint.latitude === null || targetWaypoint.longitude === null) {
    return null
  }
  return { latitude: targetWaypoint.latitude, longitude: targetWaypoint.longitude }
})

// Get alternate airport location
const alternateLocation = computed(() => {
  const alternateAirportId = props.mission.departureRecovery.alternateAirportId
  if (!alternateAirportId) return null

  // Similar to recovery location, try to find in waypoints
  const waypoint = props.mission.waypoints.find(
    (wp) => wp.name && wp.name.toLowerCase() === alternateAirportId.toLowerCase(),
  )
  if (waypoint && waypoint.latitude !== null && waypoint.longitude !== null) {
    return { latitude: waypoint.latitude, longitude: waypoint.longitude }
  }

  return null
})

// Calculate distances for display
const distanceHomeToTarget = computed(() => {
  if (!recoveryLocation.value || !targetLocation.value) return null
  const fromWP: Waypoint = {
    sequence: 0,
    name: 'Home',
    latitude: recoveryLocation.value.latitude,
    longitude: recoveryLocation.value.longitude,
    altitude: null,
    speed: null,
  }
  const toWP: Waypoint = {
    sequence: 0,
    name: 'Target',
    latitude: targetLocation.value.latitude,
    longitude: targetLocation.value.longitude,
    altitude: null,
    speed: null,
  }
  return calculateDistance(fromWP, toWP)
})

const distanceHomeToAlternate = computed(() => {
  if (!recoveryLocation.value || !alternateLocation.value) return null
  const fromWP: Waypoint = {
    sequence: 0,
    name: 'Home',
    latitude: recoveryLocation.value.latitude,
    longitude: recoveryLocation.value.longitude,
    altitude: null,
    speed: null,
  }
  const toWP: Waypoint = {
    sequence: 0,
    name: 'Alternate',
    latitude: alternateLocation.value.latitude,
    longitude: alternateLocation.value.longitude,
    altitude: null,
    speed: null,
  }
  return calculateDistance(fromWP, toWP)
})

// Calculated bingo fuel preview
const calculatedBingo = computed(() => {
  return calculateBingoFuel({
    aarExpected: aarExpected.value,
    approachType: approachType.value,
    altitudeProfile: altitudeProfile.value,
    numberOfPilots: props.numberOfPilots,
    recoveryLocation: recoveryLocation.value,
    targetLocation: targetLocation.value,
    alternateLocation: alternateLocation.value,
  })
})

// Initialize form with existing bingo calculator params
watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      // Load calculator params if available
      const params = props.mission.fuel.bingoCalculatorParams
      if (params) {
        aarExpected.value = params.aarExpected
        approachType.value = params.approachType
        altitudeProfile.value = params.altitudeProfile
      } else {
        // Set defaults
        aarExpected.value = false
        approachType.value = 'VFR'
        altitudeProfile.value = 'medium'
      }
    }
  },
)

function handleCalculate() {
  const params: F16BingoCalculatorParams = {
    aarExpected: aarExpected.value,
    approachType: approachType.value,
    altitudeProfile: altitudeProfile.value,
  }

  emit('bingo-calculated', calculatedBingo.value, params)
  emit('update:show', false)
}

function handleCancel() {
  emit('update:show', false)
}
</script>

<template>
  <NModal
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    title="Calculate Bingo Fuel - F-16C"
    style="width: 600px; max-height: 85vh; overflow-y: auto"
  >
    <NSpace vertical>
      <!-- Mission Info Section -->
      <NCard title="Mission Info" size="small">
        <NGrid :cols="1" :y-gap="12">
          <NGridItem>
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Flight Size</NText
            >
            <NInput :value="`${numberOfPilots} pilot${numberOfPilots !== 1 ? 's' : ''}`" disabled />
          </NGridItem>
          <NGridItem v-if="distanceHomeToTarget !== null">
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Distance: Home → Target</NText
            >
            <NInput :value="`${distanceHomeToTarget.toFixed(1)} nm`" disabled />
          </NGridItem>
          <NGridItem v-if="distanceHomeToAlternate !== null">
            <NText tag="label" depth="2" style="display: block; margin-bottom: 8px"
              >Distance: Home → Alternate</NText
            >
            <NInput :value="`${distanceHomeToAlternate.toFixed(1)} nm`" disabled />
          </NGridItem>
          <NGridItem v-if="!recoveryLocation">
            <NText type="warning"> ⚠️ Recovery airport not specified or location not found </NText>
          </NGridItem>
          <NGridItem v-if="!targetLocation">
            <NText type="warning"> ⚠️ No target waypoint found (waypoint with target flag) </NText>
          </NGridItem>
        </NGrid>
      </NCard>

      <!-- Configuration Section -->
      <NCard title="Configuration" size="small">
        <NGrid :cols="1" :y-gap="12">
          <NGridItem>
            <NText tag="label" strong style="display: block; margin-bottom: 8px"
              >AAR Expected</NText
            >
            <NSwitch v-model:value="aarExpected" />
          </NGridItem>

          <!-- Show these fields only if AAR is NOT expected -->
          <NGridItem v-if="!aarExpected">
            <NText tag="label" strong style="display: block; margin-bottom: 8px"
              >Approach Type</NText
            >
            <NSelect
              v-model:value="approachType"
              :options="[
                { label: 'VFR (Visual)', value: 'VFR' },
                { label: 'IFR (Instrument)', value: 'IFR' },
              ]"
            />
          </NGridItem>

          <NGridItem>
            <NText tag="label" strong style="display: block; margin-bottom: 8px"
              >Altitude Profile</NText
            >
            <NSelect
              v-model:value="altitudeProfile"
              :options="[
                { label: 'Medium Altitude', value: 'medium' },
                { label: 'Low Altitude', value: 'low' },
              ]"
            />
          </NGridItem>
        </NGrid>
      </NCard>
    </NSpace>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">Cancel</NButton>
        <NButton type="primary" @click="handleCalculate">Calculate</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
