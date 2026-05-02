import { type ComputedRef } from 'vue'
import { useMissionsStore } from '@/stores/missions'
import { useDragAndDrop } from '@/utils/useDragAndDrop'
import type { PackageMember } from '@/types'

/**
 * Composable for managing package members (CRUD + reordering)
 */
export function usePackageManagement(
  missionId: ComputedRef<string>,
  packageMembers: ComputedRef<PackageMember[]>,
) {
  const missionsStore = useMissionsStore()
  const packageDragDrop = useDragAndDrop<PackageMember>()

  function addPackageMember() {
    const newMember: PackageMember = {
      callsign: '',
      aircraft: 'F-16C_50', // Default aircraft
      time: '',
      comms: '',
      stn: null,
      aaTacan: '',
      task: '',
    }

    missionsStore.updateMission(missionId.value, {
      packageMembers: [...packageMembers.value, newMember],
    })
  }

  function removePackageMember(index: number) {
    const updated = packageMembers.value.filter((_, i) => i !== index)
    missionsStore.updateMission(missionId.value, { packageMembers: updated })
  }

  function updatePackageMember<K extends keyof PackageMember>(
    index: number,
    field: K,
    value: PackageMember[K],
  ) {
    const updated = [...packageMembers.value]
    updated[index] = { ...updated[index], [field]: value }
    missionsStore.updateMission(missionId.value, { packageMembers: updated })
  }

  function handlePackageDrop(targetIndex: number) {
    packageDragDrop.handleDrop(
      targetIndex,
      packageMembers.value,
      (updated) => {
        missionsStore.updateMission(missionId.value, { packageMembers: updated })
      },
      false,
    )
  }

  function movePackageMemberUp(index: number) {
    if (index === 0) return
    const updated = [...packageMembers.value]
    const current = updated[index]
    const prev = updated[index - 1]
    updated[index] = prev
    updated[index - 1] = current
    missionsStore.updateMission(missionId.value, { packageMembers: updated })
  }

  function movePackageMemberDown(index: number) {
    if (index === packageMembers.value.length - 1) return
    const updated = [...packageMembers.value]
    const current = updated[index]
    const next = updated[index + 1]
    updated[index] = next
    updated[index + 1] = current
    missionsStore.updateMission(missionId.value, { packageMembers: updated })
  }

  return {
    packageDragDrop,
    addPackageMember,
    removePackageMember,
    updatePackageMember,
    handlePackageDrop,
    movePackageMemberUp,
    movePackageMemberDown,
  }
}
