'use client'

import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { CreditsReport } from '@/modules/reports/components/credits-report'

export default function CreditsReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Créditos" description="Créditos activos, pagados y pendientes" />
      <CreditsReport />
    </PageContainer>
  )
}
