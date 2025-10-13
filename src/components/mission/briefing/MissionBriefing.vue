<script setup lang="ts">
import { NCard, NForm, NFormItem, NA } from 'naive-ui'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import type { Mission } from '@/types'

interface Props {
  mission: Mission
  isFieldIncomplete?: (fieldName: string) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:nested-field': [parent: string, field: string, value: string | string[]]
}>()
</script>

<template>
  <NCard title="Mission Briefing">
    <NForm label-placement="top">
      <NFormItem :validation-status="props.isFieldIncomplete?.('remarks') ? 'error' : undefined">
        <template #label>
          Remarks (<NA href="https://www.markdownguide.org/cheat-sheet/" target="_blank"
            >Markdown</NA
          >)
        </template>
        <MarkdownEditor
          :model-value="mission.details.remarks"
          @update:model-value="(v: string) => emit('update:nested-field', 'details', 'remarks', v)"
          @update:image-ids="
            (ids: string[]) => emit('update:nested-field', 'details', 'imageIds', ids)
          "
          :mission-id="mission.id"
          :rows="16"
          placeholder="Enter mission remarks… Drag & drop images or use the toolbar"
        />
      </NFormItem>
    </NForm>
  </NCard>
</template>
