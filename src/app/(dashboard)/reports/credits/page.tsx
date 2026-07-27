'use client'

import { PageHeader } from '@/shared/components/page-header'
import { CreditsReport } from '@/modules/reports/components/credits-report'

export default function CreditsReportPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reporte de Créditos" description="Créditos activos, pagados y pendientes" />
      <CreditsReport />
    </div>
  )
}
