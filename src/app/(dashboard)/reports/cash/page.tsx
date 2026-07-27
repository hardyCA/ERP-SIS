'use client'

import { PageHeader } from '@/shared/components/page-header'
import { CashReport } from '@/modules/reports/components/cash-report'

export default function CashReportPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reporte de Caja" description="Movimientos y saldo de caja" />
      <CashReport />
    </div>
  )
}
