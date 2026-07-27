'use client'

import { PageHeader } from '@/shared/components/page-header'
import { SalesReport } from '@/modules/reports/components/sales-report'

export default function SalesReportPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reporte de Ventas" description="Historial de ventas con filtros por fecha" />
      <SalesReport />
    </div>
  )
}
