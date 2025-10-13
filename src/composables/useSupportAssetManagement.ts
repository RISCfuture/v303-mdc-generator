import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import type { SupportAsset } from '@/types'

/**
 * Composable for managing support assets (CRUD + reordering)
 */
export function useSupportAssetManagement(
  missionId: ComputedRef<string>,
  supportAssets: ComputedRef<SupportAsset[]>,
) {
  const missionsStore = useMissionsStore()
  const supportAssetDragDrop = useDragAndDrop<SupportAsset>()

  function addSupportAsset() {
    const newAsset: SupportAsset = {
      callsign: '',
      role: 'TANKER',
      frequency: '',
      preset: null,
      aaTacan: '',
      location: '',
      altitude: 0,
    }

    missionsStore.updateMission(missionId.value, {
      supportAssets: [...supportAssets.value, newAsset],
    })
  }

  function removeSupportAsset(index: number) {
    const updated = supportAssets.value.filter((_, i) => i !== index)
    missionsStore.updateMission(missionId.value, { supportAssets: updated })
  }

  function updateSupportAsset(index: number, field: keyof SupportAsset, value: unknown) {
    const updated = [...supportAssets.value]
    updated[index] = { ...updated[index], [field]: value } as SupportAsset
    missionsStore.updateMission(missionId.value, { supportAssets: updated })
  }

  function handleSupportAssetDrop(targetIndex: number) {
    supportAssetDragDrop.handleDrop(
      targetIndex,
      supportAssets.value,
      (updated) => {
        missionsStore.updateMission(missionId.value, { supportAssets: updated })
      },
      false,
    )
  }

  function moveSupportAssetUp(index: number) {
    if (index === 0) return
    const updated = [...supportAssets.value]
    const current = updated[index]
    const prev = updated[index - 1]
    if (!current || !prev) return
    updated[index] = prev
    updated[index - 1] = current
    missionsStore.updateMission(missionId.value, { supportAssets: updated })
  }

  function moveSupportAssetDown(index: number) {
    if (index === supportAssets.value.length - 1) return
    const updated = [...supportAssets.value]
    const current = updated[index]
    const next = updated[index + 1]
    if (!current || !next) return
    updated[index] = next
    updated[index + 1] = current
    missionsStore.updateMission(missionId.value, { supportAssets: updated })
  }

  return {
    supportAssetDragDrop,
    addSupportAsset,
    removeSupportAsset,
    updateSupportAsset,
    handleSupportAssetDrop,
    moveSupportAssetUp,
    moveSupportAssetDown,
  }
}
