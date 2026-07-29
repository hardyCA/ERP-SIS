'use client'

import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { ProfitReport } from '@/modules/reports/components/profit-report'

export default function ProfitReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Utilidades" description="Ingresos, costos y margen de ganancia por período" />
      <ProfitReport />
    </PageContainer>
  )
}
