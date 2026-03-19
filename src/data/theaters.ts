import type { Theater, SupportAsset, Bullseye } from '@/types'
import theaterDataJson from '@/data/json/theaters.json'

export type TheaterData = {
  name: Theater
  displayName: string
  navaidsUrl: string
  ifgUrl?: string
  defaultAirfield?: string | null
  defaultSupportAssets?: SupportAsset[]
  defaultBullseye?: Bullseye
  isTraining: boolean // Whether this theater is used for training missions
}

// Theater data imported from JSON
export const theaterDatabase: Record<Theater, TheaterData> = theaterDataJson as Record<
  Theater,
  TheaterData
>
