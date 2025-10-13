// PDF Generator Constants

// Define colors matching the reference
export const COLORS = {
  headerBlue: [59, 113, 202] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number], // Gray for table headers
  lightBlue: [235, 241, 250] as [number, number, number], // Very light blue for content cells
  v93Blue: [15, 141, 242] as [number, number, number], // v93 FS header background (0.059, 0.552, 0.950)
  v303Tan: [160, 150, 98] as [number, number, number], // v303 FS header background (0.626*255, 0.587*255, 0.383*255)
}

// Page dimensions and margins
export const PAGE_CONFIG = {
  width: 8.5, // inches (letter size)
  height: 11, // inches (letter size)
  margin: 0.1, // inches
  headerHeight: 0.5, // inches
}

// Font sizes - simple and consistent
export const FONT_SIZES = {
  header: 16,
  sectionTitle: 9,
  tableHeader: 7,
  tableBody: 7,
  small: 6,
  footer: 7,
}

// Table styling - unified simple defaults
export const TABLE_STYLES = {
  cellPadding: 0.02,
  outerLineWidth: 0.02, // 2px bold outer border
  innerLineWidth: 0.01, // 1px inner borders
  fontSize: 9,
}

// F-16C specific constants
export const F16_STATIONS = ['1', '2', '3', '4', '5L', '5', '5R', '6', '7', '8', '9']

// Default values
export const DEFAULTS = {
  maxFlightMembers: 4,
  maxWaypointsPage1: 15,
  maxWaypointsPage2: 10,
  maxRadioPresets: 20,
}
