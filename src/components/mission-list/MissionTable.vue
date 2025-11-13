<script setup lang="ts">
import { computed } from 'vue'
import { NDataTable } from 'naive-ui'
import { createMissionTableColumns } from '@/utils/missionTableColumns'
import type { Mission } from '@/types'

interface Props {
  missions: Mission[]
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [mission: Mission]
  duplicate: [mission: Mission]
  delete: [mission: Mission]
  export: [mission: Mission]
}>()

const columns = computed(() =>
  createMissionTableColumns(
    (mission) => emit('edit', mission),
    (mission) => emit('duplicate', mission),
    (mission) => emit('delete', mission),
    (mission) => emit('export', mission),
  ),
)
</script>

<template>
  <div class="table-container">
    <NDataTable
      :columns="columns"
      :data="missions"
      :pagination="{ pageSize: 20 }"
      :bordered="false"
      :scroll-x="1100"
      default-sort-order="descend"
      default-sort-column-key="date"
    />
  </div>
</template>

<style scoped>
.table-container {
  overflow-x: auto;
}
</style>
