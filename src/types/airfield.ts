export type Position = {
  latitude: number // Decimal degrees (e.g., 45.039907). Positive = N, Negative = S
  longitude: number // Decimal degrees (e.g., 37.396435). Positive = E, Negative = W
  elevation?: number // Elevation in feet MSL (Mean Sea Level). Optional for ILS positions, required for airfield positions
}

export type TACAN = {
  callsign: string // TACAN callsign (e.g., "BTM", "KTS")
  channel: number // TACAN channel number
  frequency: number // TACAN frequency in MHz
}

export type ILS = {
  name: string // ILS identifier (e.g., "ILU", "IKS")
  frequency: number // ILS frequency in MHz
  channel: number | null // ILS channel (if applicable)
  position: Position // ILS transmitter position
}

export type Runway = {
  name: string // Runway identifier (e.g., "12", "08", "26")
  heading: number // Magnetic heading in degrees
  oppositeHeading: number // Opposite runway magnetic heading
  ils: ILS // ILS information for this runway
  length?: number // Runway length in feet
  width?: number // Runway width in feet
}

/** ATC band (matches keys in BandFrequencies). */
export type RadioBand = 'uhf' | 'vhfAm' | 'vhfFm' | 'hf'

/** Frequencies in MHz keyed by radio band. Bands the facility does not
 *  broadcast on are simply absent (no nulls). */
export type BandFrequencies = Partial<Record<RadioBand, number>>

/** ATC facility role published by DCS `Radio.lua`. Open-ended because some
 *  terrains add roles like "departure" or "atis"; the named literals are the
 *  common ones our PDF builder consumes. The `(string & {})` keeps the union
 *  open while preserving autocomplete on the literals. */
export type RadioFacility =
  | 'ground'
  | 'tower'
  | 'approach'
  | 'departure'
  | 'atis'
  | (string & {})

/** Facility-by-band ATC frequency matrix. Same channel typically appears
 *  under multiple facilities because DCS usually models one ATC frequency
 *  serving ground+tower+approach. Denormalized in storage by design - keeps
 *  the lookup `radio.frequencies[facility]?.[band]` a single hop. */
export type AirfieldRadio = {
  /** Localized ATC callsign from DCS Radio.lua (e.g. "Anapa", "Kobuleti"). */
  callsign?: string
  /** Outer key = facility, inner key = band, value = MHz. */
  frequencies: Partial<Record<RadioFacility, BandFrequencies>>
}

export type Airfield = {
  name: string // Airfield name (e.g., "Anapa-Vityazevo", "Batumi")
  position: Position // Airfield reference position
  tacan: TACAN | null // TACAN navigation aid (null if not available)
  runways: Runway[] // Available runways (empty array if none)
  /** ATC radio matrix extracted from `Mods/terrains/<map>/Radio.lua`. `null`
   *  when the terrain file lacks an entry for this airbase (or has empty
   *  `frequency = {}`, which happens for a handful of airfields). */
  radio: AirfieldRadio | null
}
