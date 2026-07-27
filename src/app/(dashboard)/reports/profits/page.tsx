'use client'

import { PageHeader } from '@/shared/components/page-header'
import { ProfitReport } from '@/modules/reports/components/profit-report'

export default function ProfitReportPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reporte de Utilidades" description="Ingresos, costos y margen de ganancia por período" />
      <ProfitReport />
    </div>
  )
}
