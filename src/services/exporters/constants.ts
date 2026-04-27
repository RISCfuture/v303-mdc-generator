// Shared constants for MDC exporters.

// --- 1. Mission defaults ----------------------------------------------------

/** Default CARA ALOW / radar floor in feet when the TOLD card omits it. */
export const DEFAULT_MIN_AGL_FEET = 500

/** Default MSL floor / baro warning in feet when the TOLD card omits it. */
export const DEFAULT_MIN_MSL_FEET = 5000

/** Default bullseye steerpoint number (F-16 STPT 25 by squadron convention). */
export const DEFAULT_BULLSEYE_WAYPOINT = 25

/** Default ILS frequency (MHz) when the recovery runway has none. */
export const DEFAULT_ILS_FREQUENCY_MHZ = 108.1

/** Default ILS course (degrees) when the recovery runway has none. */
export const DEFAULT_ILS_COURSE_DEG = 0

/** Seconds the F-16 / F-15E laser fires before weapon impact (squadron default). */
export const LASER_START_TIME_SEC = 8

/** AH-64D fallback laser code for the four channels that are not pilot-set. */
export const AH64D_DEFAULT_LASER_CODE = '1688'

// --- 2. Unit conversions ----------------------------------------------------

/** International nautical mile in feet (exact: 1852 m / 0.3048). */
export const FEET_PER_NAUTICAL_MILE = 6076.12

/** International foot in meters (exact, by definition since 1959). */
export const METERS_PER_FOOT = 0.3048

// --- 3. DCS-DTC RadioMode --------------------------------------------------
// Source: the-paid-actor/dcs-dtc, Base/Systems/RadioSystem.cs

export const RADIO_MODE = {
  FREQUENCY: 1,
  PRESET: 2,
} as const

// --- 4. F/A-18C ILS encoding -----------------------------------------------

/** Hornet ILS channel 1 corresponds to this MHz frequency. */
export const FA18C_ILS_BASE_FREQUENCY_MHZ = 108.1

/** Hornet ILS channels step by 0.2 MHz between adjacent channels. */
export const FA18C_ILS_STEP_MHZ = 0.2

/** Lowest valid Hornet ILS approach channel. */
export const FA18C_ILS_MIN_CHANNEL = 1

/** Highest valid Hornet ILS approach channel. */
export const FA18C_ILS_MAX_CHANNEL = 20

// --- 5. TACAN band encodings (per format) ----------------------------------

/** DCS-DTC encodes the TACAN band as 0 (X) / 1 (Y). */
export const TACAN_BAND_DCS_DTC = { X: 0, Y: 1 } as const

/** F-16/F-15E JAFDTC encodes the TACAN band as 'X' / '' (empty = Y). */
export const TACAN_BAND_JAFDTC_AIRCRAFT = { X: 'X', Y: '' } as const

/** A-10C JAFDTC encodes the TACAN band as '0' (X) / '1' (Y). */
export const TACAN_BAND_JAFDTC_A10 = { X: '0', Y: '1' } as const

// --- 6. JAFDTC F-16 VxP / airframe IDs -------------------------------------

/** JAFDTC F-16 VxP Type field. */
export const JAFDTC_VXP_TYPE = { NONE: 0, OAP: 1, VIP: 2, VRP: 3 } as const

/** JAFDTC airframe ID (file-format identifier per aircraft). */
export const JAFDTC_AIRFRAME = {
  A10C: 1,
  F15E: 4,
  F16C: 5,
  FA18C: 6,
} as const

// --- 7. F-16 DCS-DTC MFD enums ---------------------------------------------
// Source: the-paid-actor/dcs-dtc, F16/Systems/MFDSystem.cs

/** F-16 master mode (DCS-DTC). */
export const F16_DCS_DTC_MASTER_MODE = {
  NAV: 1,
  AA: 2,
  AG: 3,
  DGFT: 4,
  MSL: 5,
} as const

/** F-16 MFD page IDs (DCS-DTC). */
export const F16_DCS_DTC_MFD_PAGE = {
  BLANK: 1,
  FCR: 2,
  HSD: 3,
  SMS: 4,
  TGP: 5,
  WPN: 6,
  HAD: 7,
  FLCS: 8,
  DTE: 9,
  TEST: 10,
  FLIR: 11,
  TFR: 12,
  RCCE: 13,
} as const

/** F-16 Fire Control Radar mode (DCS-DTC). */
export const F16_DCS_DTC_FCR_MODE = {
  RWS: 1,
  VSR: 2,
  TWS: 3,
  GM: 4,
  GMT: 5,
  SEA: 6,
} as const

/** F-16 DCS-DTC datalink mode. */
export const F16_DATALINK_MODE = {
  OFF: 0,
  TNDL: 1,
  SMDL: 2,
} as const

// --- 8. Generic DCS-DTC steerpoint capture mode ----------------------------
// Source: the-paid-actor/dcs-dtc, Base/Systems/WaypointCaptureSystem.cs

export const DCS_DTC_STEERPOINT_CAPTURE_MODE = {
  ADD_TO_END_OF_LIST: 0,
  ADD_TO_END_OF_FIRST_GAP: 1,
  ADD_TO_RANGE: 2,
} as const

// --- 9. DCS Mission Editor waypoint codes ----------------------------------
// The .dtc Mission Editor format is internal to DCS (not in the JAFDTC /
// DCS-DTC source). Values below are observed defaults that DCS accepts.

/** DCS ME radio modulation. */
export const DCSME_RADIO_MODULATION = {
  FM: 0,
  AM: 1,
} as const

/** DCS ME waypoint altitude type code (BARO/MSL). */
export const DCSME_WAYPOINT_ALTITUDE_TYPE_BARO = 1

/** DCS ME waypoint velocity type code (squadron-tested default). */
export const DCSME_WAYPOINT_VELOCITY_TYPE = 3

// --- 10. JAFDTC TACAN / IFF modes ------------------------------------------
// Sources: 51st-Vfw/JAFDTC, Models/{F16C,F15E,A10C}/Misc|UFC/{Misc,UFC}System.cs

/** F-16C JAFDTC TACAN mode. */
export const TACAN_MODE_JAFDTC_F16 = {
  REC: '0',
  TR: '1',
  AA_TR: '2',
} as const

/** F-15E JAFDTC TACAN mode (note: differs from F-16). */
export const TACAN_MODE_JAFDTC_F15E = {
  A2A: '0',
  TR: '1',
  REC: '2',
} as const

/** A-10C JAFDTC TACAN mode. */
export const TACAN_MODE_JAFDTC_A10 = {
  OFF: '0',
  REC: '1',
  TR: '2',
  AA_REC: '3',
  AA_TR: '4',
} as const

/** A-10C JAFDTC IFF master mode. */
export const IFF_MASTER_MODE_JAFDTC_A10 = {
  OFF: '0',
  STBY: '1',
  NORM: '2',
} as const

// --- 11. Format-specific slot counts ---------------------------------------

/** Link 16 / DLNK team size accepted by the F-16 DTC formats. */
export const F16_DATALINK_TEAM_SIZE = 8

/** F-16 JAFDTC requires exactly 6 CMDS programs: MAN1-4, PANIC, BYPASS. */
export const F16_JAFDTC_CMDS_PROGRAM_COUNT = 6

/**
 * F-16 DCS-DTC requires exactly 6 CMS programs (MAN1-4, PANIC, BYPASS).
 * `CMSSystem.AfterLoadFromJson` only resizes Length==5 → 6, so a shorter
 * array silently leaves PROG2-N invisible in both the GUI and the upload.
 */
export const F16_DCS_DTC_CMS_PROGRAM_COUNT = 6

/** F-16 JAFDTC mission record carries 4 pilot/loadout slots. */
export const F16_JAFDTC_MISSION_SLOT_COUNT = 4

/** F/A-18C JAFDTC requires exactly 5 CMS programs: PROG1-5. */
export const FA18C_JAFDTC_CMS_PROGRAM_COUNT = 5

/** AH-64D has 5 radios: COM1 (VHF), COM2 (HF), COM3 (UHF), COM4/5 (FM). */
export const AH64D_RADIO_COUNT = 5
