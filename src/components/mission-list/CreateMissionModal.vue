<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NSelect, NSpace, NButton } from 'naive-ui'
import squadronsData from '@/data/json/squadrons.json'
import { theaterDatabase } from '@/data/theaters'
import type { Theater, Squadron } from '@/types'

type Props = {
  show: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  create: [squadron: Squadron, theater: Theater]
}>()

const selectedSquadron = ref<string>('v93')
const selectedTheater = ref<Theater>('Afghanistan')

const squadronOptions = Object.values(squadronsData).map((sq) => ({
  label: sq.displayName,
  value: sq.id,
}))

const theaterOptions = Object.values(theaterDatabase).map((th) => ({
  label: th.displayName,
  value: th.name,
}))

function handleCreate() {
  emit('create', selectedSquadron.value as Squadron, selectedTheater.value)
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
    title="Create New Mission"
    style="width: 500px"
  >
    <NSpace vertical>
      <div>
        <label>Squadron</label>
        <NSelect v-model:value="selectedSquadron" :options="squadronOptions" />
      </div>
      <div>
        <label>Theater</label>
        <NSelect v-model:value="selectedTheater" :options="theaterOptions" />
      </div>
    </NSpace>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">Cancel</NButton>
        <NButton type="primary" @click="handleCreate">Create Mission</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}
</style>
