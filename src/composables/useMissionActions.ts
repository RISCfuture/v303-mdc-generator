import { useRouter } from 'vue-router'
import { useDialog, useMessage } from 'naive-ui'
import * as Sentry from '@sentry/vue'
import { useMissionsStore } from '@/stores/missions'
import type { Mission, Squadron, Theater } from '@/types'

/**
 * Composable for mission CRUD operations
 */
export function useMissionActions() {
  const router = useRouter()
  const missionsStore = useMissionsStore()
  const dialog = useDialog()
  const message = useMessage()

  function handleCreate(squadron: Squadron, theater: Theater) {
    const mission = missionsStore.createMission(squadron, theater)
    message.success('Mission created')
    Sentry.metrics.count('mission.created', 1, {
      attributes: { squadron },
    })
    router.push(`/mission/${mission.id}`)
    return mission
  }

  function handleEdit(mission: Mission) {
    router.push(`/mission/${mission.id}`)
  }

  function handleDelete(mission: Mission) {
    dialog.warning({
      title: 'Delete Mission',
      content: `Are you sure you want to delete "${mission.name}"? This action cannot be undone.`,
      positiveText: 'Delete',
      negativeText: 'Cancel',
      onPositiveClick: () => {
        missionsStore.deleteMission(mission.id)
        message.success('Mission deleted')
      },
    })
  }

  function handleDuplicate(mission: Mission) {
    const duplicate = missionsStore.duplicateMission(mission.id)
    if (duplicate) {
      message.success('Mission duplicated')
    }
  }

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleDuplicate,
  }
}
