<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NSelect, NCollapse, NCollapseItem } from 'naive-ui'
import CCIPReferencePoint from '@/components/mission/notes-targets/CCIPReferencePoint.vue'
import type { Waypoint, CCIPData, CCIPReferencePoint as CCIPRefPoint } from '@/types'

interface Props {
  waypoint: Waypoint
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof Waypoint, value: unknown]
  blur: []
}>()

// Helper to check if a reference point has been specified (has bearing AND distance)
const hasReferencePoint = (point?: CCIPRefPoint): boolean => {
  return point?.bearing !== undefined && point?.distance !== undefined
}

// Computed title showing which offsets are specified
const ccipTitle = computed(() => {
  const ccip = props.waypoint.ccip
  if (!ccip) return 'CCIP'

  const specified: string[] = []

  // Check which reference point type is active and if it has data
  const refPointType = ccip.referencePointType ?? 'VRP'
  const refPoint = refPointType === 'VIP' ? ccip.vip : ccip.vrp
  if (hasReferencePoint(refPoint)) {
    specified.push(refPointType)
  }

  // Check OA1, OA2, PUP
  if (hasReferencePoint(ccip.oa1)) specified.push('OA1')
  if (hasReferencePoint(ccip.oa2)) specified.push('OA2')
  if (hasReferencePoint(ccip.pup)) specified.push('PUP')

  if (specified.length === 0) {
    return 'CCIP'
  }

  return `CCIP (${specified.join(', ')})`
})

// Helper to update CCIP field
const updateCCIPField = (field: keyof CCIPData, value: CCIPData[keyof CCIPData]) => {
  const ccip = props.waypoint.ccip || {}
  emit('update-field', 'ccip', { ...ccip, [field]: value })
}

// Helper to update CCIP reference point
const updateCCIPReferencePoint = (
  pointName: keyof CCIPData,
  field: keyof CCIPRefPoint,
  value: CCIPRefPoint[keyof CCIPRefPoint],
) => {
  const ccip = props.waypoint.ccip || {}
  const point = (ccip[pointName] as CCIPRefPoint) || {}
  emit('update-field', 'ccip', { ...ccip, [pointName]: { ...point, [field]: value } })
}
</script>

<template>
  <div class="ccip-section">
    <NCollapse>
      <NCollapseItem :title="ccipTitle" name="ccip">
        <!-- VIP/VRP Fields with dropdown label -->
        <template v-if="(waypoint.ccip?.referencePointType ?? 'VRP') === 'VIP'">
          <NFormItem>
            <template #label>
              <NSelect
                :value="waypoint.ccip?.referencePointType ?? 'VRP'"
                @update:value="(v: 'VIP' | 'VRP') => updateCCIPField('referencePointType', v)"
                :options="[
                  { label: 'VIP (Visual Initial Point)', value: 'VIP' },
                  { label: 'VRP (Visual Reference Point)', value: 'VRP' },
                ]"
                style="width: 280px"
                size="small"
              />
            </template>
            <CCIPReferencePoint
              :point="waypoint.ccip?.vip"
              :target-steerpoint-altitude="waypoint.altitude"
              @update:bearing="(v: number | null) => updateCCIPReferencePoint('vip', 'bearing', v)"
              @update:distance="
                (v: number | null) => updateCCIPReferencePoint('vip', 'distance', v)
              "
              @update:elevation="
                (v: number | null) => updateCCIPReferencePoint('vip', 'elevation', v)
              "
            />
          </NFormItem>
        </template>

        <template v-if="(waypoint.ccip?.referencePointType ?? 'VRP') === 'VRP'">
          <NFormItem>
            <template #label>
              <NSelect
                :value="waypoint.ccip?.referencePointType ?? 'VRP'"
                @update:value="(v: 'VIP' | 'VRP') => updateCCIPField('referencePointType', v)"
                :options="[
                  { label: 'VIP (Visual Initial Point)', value: 'VIP' },
                  { label: 'VRP (Visual Reference Point)', value: 'VRP' },
                ]"
                style="width: 280px"
                size="small"
              />
            </template>
            <CCIPReferencePoint
              :point="waypoint.ccip?.vrp"
              :target-steerpoint-altitude="waypoint.altitude"
              @update:bearing="(v: number | null) => updateCCIPReferencePoint('vrp', 'bearing', v)"
              @update:distance="
                (v: number | null) => updateCCIPReferencePoint('vrp', 'distance', v)
              "
              @update:elevation="
                (v: number | null) => updateCCIPReferencePoint('vrp', 'elevation', v)
              "
            />
          </NFormItem>
        </template>

        <!-- OA1 Fields -->
        <NFormItem label="OA1 (Offset Aimpoint 1)">
          <CCIPReferencePoint
            :point="waypoint.ccip?.oa1"
            :target-steerpoint-altitude="waypoint.altitude"
            @update:bearing="(v: number | null) => updateCCIPReferencePoint('oa1', 'bearing', v)"
            @update:distance="(v: number | null) => updateCCIPReferencePoint('oa1', 'distance', v)"
            @update:elevation="
              (v: number | null) => updateCCIPReferencePoint('oa1', 'elevation', v)
            "
          />
        </NFormItem>

        <!-- OA2 Fields -->
        <NFormItem label="OA2 (Offset Aimpoint 2)">
          <CCIPReferencePoint
            :point="waypoint.ccip?.oa2"
            :target-steerpoint-altitude="waypoint.altitude"
            @update:bearing="(v: number | null) => updateCCIPReferencePoint('oa2', 'bearing', v)"
            @update:distance="(v: number | null) => updateCCIPReferencePoint('oa2', 'distance', v)"
            @update:elevation="
              (v: number | null) => updateCCIPReferencePoint('oa2', 'elevation', v)
            "
          />
        </NFormItem>

        <!-- PUP Fields -->
        <NFormItem label="PUP (Pull-up Point)">
          <CCIPReferencePoint
            :point="waypoint.ccip?.pup"
            :target-steerpoint-altitude="waypoint.altitude"
            @update:bearing="(v: number | null) => updateCCIPReferencePoint('pup', 'bearing', v)"
            @update:distance="(v: number | null) => updateCCIPReferencePoint('pup', 'distance', v)"
            @update:elevation="
              (v: number | null) => updateCCIPReferencePoint('pup', 'elevation', v)
            "
          />
        </NFormItem>
      </NCollapseItem>
    </NCollapse>
  </div>
</template>

<style scoped>
.ccip-section {
  margin-top: 16px;
}
</style>
