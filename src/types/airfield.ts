export interface Position {
  latitude: number // Decimal degrees (e.g., 45.039907). Positive = N, Negative = S
  longitude: number // Decimal degrees (e.g., 37.396435). Positive = E, Negative = W
  elevation?: number // Elevation in feet MSL (Mean Sea Level). Optional for ILS positions, required for airfield positions
}

export interface TACAN {
  callsign: string // TACAN callsign (e.g., "BTM", "KTS")
  channel: number // TACAN channel number
  frequency: number // TACAN frequency in MHz
}

export interface ILS {
  name: string // ILS identifier (e.g., "ILU", "IKS")
  frequency: number // ILS frequency in MHz
  channel: number | null // ILS channel (if applicable)
  position: Position // ILS transmitter position
}

export interface Runway {
  name: string // Runway identifier (e.g., "12", "08", "26")
  heading: number // Magnetic heading in degrees
  oppositeHeading: number // Opposite runway magnetic heading
  ils: ILS // ILS information for this runway
}

export interface Frequency {
  band: 'UHF' | 'HF' | 'VHF_HI' | 'VHF_LOW' // Radio band
  modulation: 'AM' | 'FM' // Modulation type
  frequency: number // Frequency in MHz
}

export interface AirfieldRadio {
  roles: Array<'ground' | 'tower' | 'approach'> // ATC roles available
  callsign: string | null // Radio callsign (e.g., "Anapa", "Kobuleti")
  frequencies: Frequency[] // Available frequencies
}

export interface Airfield {
  name: string // Airfield name (e.g., "Anapa-Vityazevo", "Batumi")
  position: Position // Airfield reference position
  tacan: TACAN | null // TACAN navigation aid (null if not available)
  runways: Runway[] // Available runways (empty array if none)
  radio: AirfieldRadio // Radio frequencies and callsigns
}
