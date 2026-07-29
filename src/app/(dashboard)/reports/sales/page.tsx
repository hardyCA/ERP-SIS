'use client'

import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { SalesReport } from '@/modules/reports/components/sales-report'

export default function SalesReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Ventas" description="Historial de ventas con filtros por fecha" />
      <SalesReport />
    </PageContainer>
  )
}
