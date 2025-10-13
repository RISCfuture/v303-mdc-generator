import { useMessage, useLoadingBar } from 'naive-ui'
import { generatePdfMakeBriefingCard } from '@/services/pdfGenerator/pdfMakeBriefingCard'
import { downloadMDC } from '@/services/mdcExporter'
import type { Mission } from '@/types'

/**
 * Composable for exporting mission data (PDF, MDC)
 */
export function useMissionExport() {
  const message = useMessage()
  const loadingBar = useLoadingBar()

  async function handleExportPDF(mission: Mission) {
    loadingBar.start()
    try {
      message.info('Generating PDF briefing card...')
      await generatePdfMakeBriefingCard(mission)
      loadingBar.finish()
      message.success('PDF briefing card generated')
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to generate PDF: ${error}`)
      console.error(error)
    }
  }

  function handleExportMDC(mission: Mission, crewMemberIndex: number = 0) {
    try {
      downloadMDC(mission, crewMemberIndex)
      message.success('JSON MDC exported')
    } catch (error) {
      message.error(`Failed to export MDC: ${error}`)
      console.error(error)
    }
  }

  return {
    handleExportPDF,
    handleExportMDC,
  }
}
