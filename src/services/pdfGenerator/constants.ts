// PDF Generator Constants

// Define colors matching the reference
export const COLORS = {
  headerBlue: [59, 113, 202] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number], // Gray for table headers
  lightBlue: [235, 241, 250] as [number, number, number], // Very light blue for content cells
  v93Blue: [15, 141, 242] as [number, number, number], // v93 FS header background (0.059, 0.552, 0.950)
  v303Red: [210, 9, 32] as [number, number, number], // v303 FS header background (#d20920)
}

// Font sizes (pdfMake points)
export const FONT_SIZES = {
  header: 16,
  content: 10,
  default: 9,
  footer: 7,
}
