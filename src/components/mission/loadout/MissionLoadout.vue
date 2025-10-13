<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard, NSelect, NSpace, NDivider, NFormItem } from 'naive-ui'
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
}>()

function handleLoadPrefab(value: string | null) {
  emit('load-prefab-loadout', value)
  emit('update:selected-scl', null)
}

function getMunitionOptionsForStation(stationNum: number | string) {
  return buildStationLoadoutOptions(props.airframe, stationNum)
}

// Get available gun ammo types for this airframe
const gunAmmoTypeOptions = computed(() => {
  const airframeData = getAirframeData(props.airframe)
  if (!airframeData || !airframeData.gunAmmoTypes) return []
  return airframeData.gunAmmoTypes.map((type: string) => ({ label: type, value: type }))
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

    <NFormItem v-if="gunAmmoTypeOptions.length > 0" label="Gun Ammo Type" label-placement="left">
      <NSelect
        :value="gunAmmoType"
        @update:value="(v: string | null) => emit('update:gun-ammo-type', v)"
        :options="gunAmmoTypeOptions"
        placeholder="Select gun ammunition type"
        clearable
        style="max-width: 300px"
      />
    </NFormItem>

    <NDivider v-if="gunAmmoTypeOptions.length > 0" />

    <NSpace vertical>
      <div><strong>Loadout Weight:</strong> {{ formatWeight(loadoutWeight) }}</div>
      <div><strong>Fuel Weight:</strong> {{ formatWeight(fuelWeight) }}</div>
      <div><strong>Gross Weight:</strong> {{ formatWeight(grossWeight) }}</div>
    </NSpace>
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
