import { h } from 'vue'
import { NTag, NSpace, NButton, NIcon } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { CreateOutline, CopyOutline, TrashOutline, ShareOutline } from '@vicons/ionicons5'
import { getSquadronDisplayName } from '@/data/squadrons'
import { theaterDatabase } from '@/data/theaters'
import { formatDate, formatDateTime } from '@/utils/formatting'
import { serializeMission } from '@/utils/missionStorage'
import { validateMissionStorage } from '@/utils/validateMissionStorage'
import type { Mission } from '@/types'

/**
 * Check if a mission is complete (ready for export)
 */
function isMissionComplete(mission: Mission): boolean {
  try {
    const serialized = serializeMission(mission)
    const result = validateMissionStorage({
      version: 2,
      missions: [serialized],
    })

    // Schema validation must pass
    if (!result.valid) return false

    // Check all waypoints have non-null coordinates and altitude
    const hasInvalidWaypoints = mission.waypoints.some(
      (wp) => wp.latitude === null || wp.longitude === null || wp.altitude === null,
    )
    if (hasInvalidWaypoints) return false

    return true
  } catch (_error) {
    return false
  }
}

export function createMissionTableColumns(
  onEdit: (mission: Mission) => void,
  onDuplicate: (mission: Mission) => void,
  onDelete: (mission: Mission) => void,
  onExport: (mission: Mission) => void,
): DataTableColumns<Mission> {
  return [
    {
      title: 'Date',
      key: 'date',
      width: 110,
      render: (row) => formatDate(row.date),
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: 'State',
      key: 'state',
      width: 90,
      render: (row) => {
        const isComplete = isMissionComplete(row)
        return h(
          NTag,
          {
            type: isComplete ? 'success' : 'warning',
            size: 'small',
          },
          { default: () => (isComplete ? 'Ready' : 'Draft') },
        )
      },
    },
    {
      title: 'Name',
      key: 'name',
      width: 200,
      ellipsis: {
        tooltip: true,
      },
      render: (row) => row.name || 'Untitled Mission',
      sorter: (a, b) => (a.name || 'Untitled Mission').localeCompare(b.name || 'Untitled Mission'),
    },
    {
      title: 'Squadron',
      key: 'squadron',
      width: 100,
      render: (row) => getSquadronDisplayName(row.squadron),
    },
    {
      title: 'Theater',
      key: 'theater',
      width: 140,
      render: (row) => theaterDatabase[row.theater]?.displayName || row.theater,
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (row) => row.type || '-',
    },
    {
      title: 'Updated',
      key: 'updatedAt',
      width: 160,
      render: (row) => formatDateTime(row.updatedAt),
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (row) => {
        return h(
          NSpace,
          { wrap: false, size: 'small' },
          {
            default: () => [
              h(
                NButton,
                {
                  size: 'small',
                  onClick: () => onEdit(row),
                  quaternary: true,
                  circle: true,
                  'aria-label': 'Edit mission',
                },
                { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
              ),
              h(
                NButton,
                {
                  size: 'small',
                  onClick: () => onDuplicate(row),
                  quaternary: true,
                  circle: true,
                  'aria-label': 'Duplicate mission',
                },
                { icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
              ),
              h(
                NButton,
                {
                  size: 'small',
                  onClick: () => onExport(row),
                  quaternary: true,
                  circle: true,
                  'aria-label': 'Export mission',
                },
                { icon: () => h(NIcon, null, { default: () => h(ShareOutline) }) },
              ),
              h(
                NButton,
                {
                  size: 'small',
                  type: 'error',
                  onClick: () => onDelete(row),
                  quaternary: true,
                  circle: true,
                  'aria-label': 'Delete mission',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            ],
          },
        )
      },
    },
  ]
}
