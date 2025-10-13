<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NInput, NInputNumber, NA } from 'naive-ui'
import CoordinateInputField from '@/components/common/CoordinateInputField.vue'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import { latLonToMGRS } from '@/utils/mgrs'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import type { TargetData } from '@/types'

interface Props {
  target: TargetData | undefined
  missionId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof TargetData, value: TargetData[keyof TargetData]]
}>()

// Calculate MGRS for target
const targetMGRS = computed(() => {
  const lat = props.target?.latitude
  const lon = props.target?.longitude
  if (lat === null || lat === undefined || lon === null || lon === undefined) return ''
  return latLonToMGRS(lat, lon, 5)
})
</script>

<template>
  <div>
    <NFormItem label="Target Name">
      <NInput
        :value="target?.name"
        @update:value="(v: string) => emit('update-field', 'name', v)"
      />
    </NFormItem>
    <NFormItem label="DMPI">
      <NInput
        :value="target?.dmpi"
        @update:value="(v: string) => emit('update-field', 'dmpi', v)"
      />
    </NFormItem>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px">
      <NFormItem label="Latitude">
        <CoordinateInputField
          :model-value="target?.latitude ?? null"
          type="latitude"
          @update:model-value="(v: number | null) => emit('update-field', 'latitude', v)"
          placeholder="N --° --.---′"
        />
      </NFormItem>
      <NFormItem label="Longitude">
        <CoordinateInputField
          :model-value="target?.longitude ?? null"
          type="longitude"
          @update:model-value="(v: number | null) => emit('update-field', 'longitude', v)"
          placeholder="E ---° --.---′"
        />
      </NFormItem>
      <NFormItem label="Elevation">
        <NInputNumber
          :value="target?.elevation"
          @update:value="(v: number | null) => emit('update-field', 'elevation', v ?? undefined)"
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>
    </div>
    <NFormItem label="MGRS" v-if="targetMGRS">
      <NInput :value="targetMGRS" readonly style="width: 300px; font-family: monospace" />
    </NFormItem>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
      <NFormItem label="Attack Heading">
        <NInputNumber
          :value="target?.attackHeading"
          @update:value="
            (v: number | null) => emit('update-field', 'attackHeading', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
          placeholder="Attack heading"
        >
          <template #suffix>°</template>
        </NInputNumber>
      </NFormItem>
      <NFormItem label="Ingress Altitude">
        <NInputNumber
          :value="target?.ingressAltitude"
          @update:value="
            (v: number | null) => emit('update-field', 'ingressAltitude', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
          placeholder="Ingress altitude"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>
    </div>
    <NFormItem>
      <template #label>
        Target Remarks (<NA href="https://www.markdownguide.org/cheat-sheet/" target="_blank"
          >Markdown</NA
        >)
      </template>
      <MarkdownEditor
        :model-value="target?.remarks"
        @update:model-value="(v: string) => emit('update-field', 'remarks', v)"
        @update:image-ids="(ids: string[]) => emit('update-field', 'imageIds', ids)"
        :mission-id="missionId"
        :rows="6"
        placeholder="Enter target-specific remarks… Drag & drop images or use the toolbar"
      />
    </NFormItem>
  </div>
</template>

<style scoped>
/* Mobile responsive styles */
@media (width <= 768px) {
  div[style*='grid-template-columns: 1fr 1fr 1fr'],
  div[style*='grid-template-columns: 1fr 1fr'] {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
}
</style>
