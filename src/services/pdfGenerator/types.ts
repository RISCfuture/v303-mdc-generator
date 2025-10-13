// Type definitions for PDF Generator
import type jsPDF from 'jspdf'
import type { CellDef } from 'jspdf-autotable'

export interface PDFDocumentExtended extends jsPDF {
  lastAutoTable?: {
    finalY: number
  }
}

export interface MarkdownRenderOptions {
  x: number
  y: number
  maxWidth: number
  fontSize: number
  lineHeight: number
}

export interface MarkdownRenderResult {
  finalY: number
}

// AutoTable types
export type TableRow = (string | number | CellDef)[]
