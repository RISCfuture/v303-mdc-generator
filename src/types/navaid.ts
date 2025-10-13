export interface Navaid {
  name: string
  latitude: number // Decimal degrees (e.g., 31.52044167). Positive = N, Negative = S
  longitude: number // Decimal degrees (e.g., 65.87225945). Positive = E, Negative = W
  elevation?: number // Ground elevation in meters MSL (Mean Sea Level)
  mgrs?: string // WIP: MGRS coordinate
}
