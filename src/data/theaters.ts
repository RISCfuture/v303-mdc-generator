import type { Theater, SupportAsset } from '@/types'
import theaterDataJson from '@/data/json/theaters.json'

export interface TheaterData {
  name: Theater
  displayName: string
  navaidsUrl: string
  ifgUrl?: string
  defaultAirfield?: string | null
  defaultSupportAssets?: SupportAsset[]
}

// Theater data imported from JSON
export const theaterDatabase: Record<Theater, TheaterData> = theaterDataJson as Record<
  Theater,
  TheaterData
>
