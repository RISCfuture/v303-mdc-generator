<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard, NSelect, NSpace, NDivider, NFormItem, NSlider } from 'naive-ui'
import { getShortStationLabel } from '@/utils/stationLabels'
import { getLoadoutItemWeight, buildStationLoadoutOptions } from '@/data/munitions'
import { formatWeight } from '@/utils/formatting'
import { getAirframeData } from '@/utils/airframeHelpers'
import type { LoadoutStation } from '@/types'
import type { PrefabLoadout } from '@/data/loadouts'
import type { StationData } from '@/data/airframes'

interface Props {
  airframe: string
  loadout: LoadoutStation[]
  airframeStations: StationData[]
  availableLoadouts: PrefabLoadout[]
  selectedSCL: string | null
  loadoutWeight: number
  fuelWeight: number
  maxFuelCapacity: number
  fuelLoadPercentage: number
  grossWeight: number
  gunAmmoType?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selected-scl': [value: string | null]
  'load-prefab-loadout': [loadoutName: string | null]
  'clear-all-loadout': []
  'update-loadout-station': [stationNumber: number, munition: string]
  'update:gun-ammo-type': [value: string | null]
  'update:fuel-load-percentage': [value: number]
}>()

function handleLoadPrefab(value: string | null) {
  emit('load-prefab-loadout', value)
  emit('update:selected-scl', null)
}

function getMunitionOptionsForStation(stationNum: number | string) {
  return buildStationLoadoutOptions(props.airframe, stationNum)
}

// Get gun ammo options from airframe data
const gunAmmoOptions = computed(() => {
  const airframeData = getAirframeData(props.airframe)
  if (!airframeData || !airframeData.ammoTypes || airframeData.ammoTypes.length === 0) {
    return null
  }

  return {
    label:
      airframeData.guns && airframeData.guns.length === 1 && airframeData.guns[0]
        ? airframeData.guns[0].name
        : 'Gun Ammo',
    options: airframeData.ammoTypes.map((ammoType: string) => ({
      label: ammoType,
      value: ammoType,
    })),
  }
})
</script>

<template>
  <NCard title="Aircraft Loadout">
    <template #header-extra>
      <NSpace>
        <NSelect
          :value="selectedSCL"
          :options="
            availableLoadouts.map((l: PrefabLoadout) => ({
              label: `${l.name} - ${l.description}`,
              value: l.name,
            }))
          "
          placeholder="Load SCL"
          @update:value="handleLoadPrefab"
          style="width: 400px"
          clearable
        />
        <NButton @click="emit('clear-all-loadout')">Clear All</NButton>
      </NSpace>
    </template>

    <div class="loadout-grid">
      <div v-for="station in airframeStations" :key="station.station" class="loadout-station-row">
        <div class="station-label">
          <strong>{{ getShortStationLabel(airframe, station.station) }}</strong>
        </div>
        <NSelect
          :value="
            loadout.find((s: LoadoutStation) => s.station === station.station)?.item || 'EMPTY'
          "
          @update:value="(v: string) => emit('update-loadout-station', station.station, v)"
          :options="getMunitionOptionsForStation(station.station)"
          :aria-label="`Station ${getShortStationLabel(airframe, station.station)} Munition`"
          filterable
          style="flex: 1"
        />
        <div class="station-weight">
          {{
            formatWeight(
              getLoadoutItemWeight(
                loadout.find((s: LoadoutStation) => s.station === station.station)?.item || 'EMPTY',
              ),
            )
          }}
        </div>
      </div>
    </div>

    <NDivider />

    <div v-if="gunAmmoOptions" class="guns-container">
      <h3 class="section-title">Guns</h3>
      <div class="gun-ammo-row">
        <NFormItem :label="gunAmmoOptions.label" label-placement="left" class="gun-ammo-form-item">
          <NSelect
            :value="gunAmmoType || null"
            @update:value="(v: string | null) => emit('update:gun-ammo-type', v)"
            :options="gunAmmoOptions.options"
            placeholder="Select ammunition type"
            clearable
            style="max-width: 300px"
          />
        </NFormItem>
      </div>
    </div>

    <NDivider v-if="gunAmmoOptions" />

    <div class="weights-container">
      <h3 class="section-title">Weights</h3>
      <NSpace vertical>
        <div><strong>Loadout Weight:</strong> {{ formatWeight(loadoutWeight) }}</div>

        <!-- Fuel Weight Slider -->
        <div>
          <div style="display: flex; align-items: center; gap: 12px">
            <strong>Fuel Weight:</strong>
            <div style="width: 300px">
              <NSlider
                :value="fuelLoadPercentage"
                @update:value="(v: number) => emit('update:fuel-load-percentage', v)"
                :min="0"
                :max="100"
                :step="1"
                :tooltip="true"
                :format-tooltip="
                  (v: number) => `${v}% (${formatWeight((maxFuelCapacity * v) / 100)})`
                "
              />
            </div>
            <span style="min-width: 50px; text-align: right">{{ fuelLoadPercentage }}%</span>
            <span style="opacity: 0.6; font-size: 14px"
              >Max: {{ formatWeight(maxFuelCapacity) }}</span
            >
          </div>
          <div style="width: 300px; margin-left: 116px; text-align: center; margin-top: 4px">
            {{ formatWeight(fuelWeight) }}
          </div>
        </div>

        <div><strong>Gross Weight:</strong> {{ formatWeight(grossWeight) }}</div>
      </NSpace>
    </div>
  </NCard>
</template>

<style scoped>
.loadout-grid {
  display: grid;
  gap: 8px;
}

.loadout-station-row {
  display: grid;
  grid-template-columns: 60px 1fr 120px;
  align-items: center;
  gap: 12px;
}

.station-label {
  width: 60px;
}

.station-weight {
  width: 120px;
  text-align: right;
  font-size: 14px;
  opacity: 0.6;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  margin-top: 0;
}

.guns-container,
.weights-container {
  margin: 8px 0;
}

/* Mobile responsive styles */
@media (width <= 768px) {
  .loadout-station-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .station-label {
    width: auto;
    text-align: center;
  }

  .station-weight {
    width: auto;
    text-align: center;
  }
}
</style>
