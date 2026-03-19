import { useMessage, useLoadingBar } from 'naive-ui'
import * as Sentry from '@sentry/vue'
import { generatePdfMakeBriefingCard } from '@/services/pdfGenerator/pdfMakeBriefingCard'
import { downloadMDC } from '@/services/exporters'
import type { ExportFormat } from '@/data/exportFormats'
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
      Sentry.metrics.count('mission.exported', 1, {
        attributes: { type: 'pdf', squadron: mission.squadron },
      })
    } catch (error) {
      loadingBar.error()
      message.error(`Failed to generate PDF: ${String(error)}`)
      console.error(error)
    }
  }

  function handleExportMDC(
    mission: Mission,
    crewMemberIndex = 0,
    format: ExportFormat = 'DCS-DTC',
  ) {
    try {
      downloadMDC(mission, crewMemberIndex, format)
      message.success('MDC exported')
      Sentry.metrics.count('mission.exported', 1, {
        attributes: { type: 'mdc', format, squadron: mission.squadron },
      })
    } catch (error) {
      message.error(`Failed to export MDC: ${String(error)}`)
      console.error(error)
    }
  }

  return {
    handleExportPDF,
    handleExportMDC,
  }
}
