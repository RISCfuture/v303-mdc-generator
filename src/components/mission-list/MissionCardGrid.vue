<script setup lang="ts">
import MissionCard from '@/components/mission-list/MissionCard.vue'
import type { Mission } from '@/types'

interface Props {
  missions: Mission[]
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [mission: Mission]
  duplicate: [mission: Mission]
  delete: [mission: Mission]
}>()
</script>

<template>
  <div class="missions-grid">
    <MissionCard
      v-for="mission in missions"
      :key="mission.id"
      :mission="mission"
      @edit="emit('edit', mission)"
      @duplicate="emit('duplicate', mission)"
      @delete="emit('delete', mission)"
    />
  </div>
</template>

<style scoped>
.missions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* Mobile responsive styles */
@media (width <= 768px) {
  .missions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
