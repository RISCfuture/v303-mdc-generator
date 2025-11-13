<script setup lang="ts">
import { NFormItem, NInput, NInputNumber, NA, NFlex } from 'naive-ui'
import CoordinateField from '@/components/common/CoordinateField.vue'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import { formatInteger, parseInteger } from '@/utils/numberFormatting'
import type { TargetData, CoordinateFormat } from '@/types'

interface Props {
  target: TargetData | undefined
  missionId: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update-field': [field: keyof TargetData, value: TargetData[keyof TargetData]]
}>()
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
        autocorrect="off"
      />
    </NFormItem>
    <NFlex :wrap="false" :size="16">
      <NFormItem label="Coordinate" style="flex: 1; max-width: 600px">
        <CoordinateField
          :latitude="target?.latitude ?? null"
          :longitude="target?.longitude ?? null"
          :format="target?.coordinateFormat ?? 'DDM'"
          @update:latitude="(v: number | null) => emit('update-field', 'latitude', v)"
          @update:longitude="(v: number | null) => emit('update-field', 'longitude', v)"
          @update:format="(v: CoordinateFormat) => emit('update-field', 'coordinateFormat', v)"
          label=""
          style="width: 100%"
        />
      </NFormItem>
      <NFormItem label="Elevation" style="width: 200px">
        <NInputNumber
          :value="target?.elevation"
          @update:value="(v: number | null) => emit('update-field', 'elevation', v ?? undefined)"
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
          style="width: 100%"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>
    </NFlex>
    <NFlex :wrap="false" :size="16">
      <NFormItem label="Attack Heading" style="flex: 1; max-width: 300px">
        <NInputNumber
          :value="target?.attackHeading"
          @update:value="
            (v: number | null) => emit('update-field', 'attackHeading', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
          placeholder="Attack heading"
          style="width: 100%"
        >
          <template #suffix>°</template>
        </NInputNumber>
      </NFormItem>
      <NFormItem label="Ingress Altitude" style="flex: 1; max-width: 300px">
        <NInputNumber
          :value="target?.ingressAltitude"
          @update:value="
            (v: number | null) => emit('update-field', 'ingressAltitude', v ?? undefined)
          "
          :show-button="false"
          :format="formatInteger"
          :parse="parseInteger"
          placeholder="Ingress altitude"
          style="width: 100%"
        >
          <template #suffix>ft</template>
        </NInputNumber>
      </NFormItem>
    </NFlex>
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
