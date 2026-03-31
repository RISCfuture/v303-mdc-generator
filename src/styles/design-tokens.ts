/**
 * Design tokens for the V303 MDC Generator
 * All spacing and sizing values are based on a 1rem (16px) baseline
 */

// Base unit (1rem = 16px at default browser settings)
const BASE_UNIT = 1 // rem

// Spacing scale (based on rem)
export const SPACING = {
  /** 0.25rem = 4px */
  xs: `${BASE_UNIT * 0.25}rem`,
  /** 0.5rem = 8px */
  sm: `${BASE_UNIT * 0.5}rem`,
  /** 0.75rem = 12px */
  md: `${BASE_UNIT * 0.75}rem`,
  /** 1rem = 16px */
  lg: `${BASE_UNIT}rem`,
  /** 1.25rem = 20px */
  xl: `${BASE_UNIT * 1.25}rem`,
  /** 1.5rem = 24px */
  '2xl': `${BASE_UNIT * 1.5}rem`,
  /** 2rem = 32px */
  '3xl': `${BASE_UNIT * 2}rem`,
  /** 2.5rem = 40px */
  '4xl': `${BASE_UNIT * 2.5}rem`,
  /** 3.75rem = 60px */
  '5xl': `${BASE_UNIT * 3.75}rem`,
} as const

// Form-specific constants
export const FORM = {
  /** 8.75rem = 140px - Standard label width for forms */
  labelWidth: `${BASE_UNIT * 8.75}rem`,
  /** 37.5rem = 600px - Maximum form width for better readability */
  maxWidth: `${BASE_UNIT * 37.5}rem`,
} as const

// Component widths
export const WIDTH = {
  /** 15.625rem = 250px - Dropdown/select width */
  dropdown: `${BASE_UNIT * 15.625}rem`,
  /** 17.5rem = 280px - Link16 prefix field width */
  link16Prefix: `${BASE_UNIT * 17.5}rem`,
  /** 18.75rem = 300px - Small input field */
  inputSmall: `${BASE_UNIT * 18.75}rem`,
  /** 25rem = 400px - Medium input field */
  inputMedium: `${BASE_UNIT * 25}rem`,
  /** 31.25rem = 500px - Modal width (small) */
  modalSmall: `${BASE_UNIT * 31.25}rem`,
  /** 37.5rem = 600px - Modal width (medium) */
  modalMedium: `${BASE_UNIT * 37.5}rem`,
  /** 87.5rem = 1400px - Maximum content width */
  contentMax: `${BASE_UNIT * 87.5}rem`,
} as const

// Grid-specific values
export const GRID = {
  /** 1.5rem = 24px - Grid item drag handle width */
  dragHandle: `${BASE_UNIT * 1.5}rem`,
  /** 1.875rem = 30px - Grid position indicator width */
  position: `${BASE_UNIT * 1.875}rem`,
  /** 3.75rem = 60px - Grid station number column width */
  station: `${BASE_UNIT * 3.75}rem`,
  /** 5.625rem = 90px - Small column width */
  columnSmall: `${BASE_UNIT * 5.625}rem`,
  /** 6.875rem = 110px - TOT column width */
  columnTOT: `${BASE_UNIT * 6.875}rem`,
  /** 7.5rem = 120px - Medium column width */
  columnMedium: `${BASE_UNIT * 7.5}rem`,
  /** 9.375rem = 150px - Radio preset number width */
  radioPreset: `${BASE_UNIT * 9.375}rem`,
  /** 12.5rem = 200px - Waypoint autocomplete width */
  waypointAutocomplete: `${BASE_UNIT * 12.5}rem`,
  /** 18.75rem = 300px - Card minimum width for auto-fill */
  cardMinWidth: `${BASE_UNIT * 18.75}rem`,
} as const

// Font sizes
export const FONT_SIZE = {
  /** 0.75rem = 12px */
  xs: `${BASE_UNIT * 0.75}rem`,
  /** 0.875rem = 14px */
  sm: `${BASE_UNIT * 0.875}rem`,
  /** 1rem = 16px */
  md: `${BASE_UNIT}rem`,
  /** 1.125rem = 18px */
  lg: `${BASE_UNIT * 1.125}rem`,
} as const

// Heights
export const HEIGHT = {
  /** 2rem = 32px - Minimum input height (small) */
  inputSmall: `${BASE_UNIT * 2}rem`,
  /** 3.875rem = 62px - Maximum form item height (label + input) */
  formItemMax: `${BASE_UNIT * 3.875}rem`,
} as const

// Responsive breakpoints
// Mobile breakpoint: 768px
// Note: CSS media queries can't reference JS constants, so components
// hardcode these values with cross-reference comments.
