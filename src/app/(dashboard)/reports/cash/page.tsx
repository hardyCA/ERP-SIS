'use client'

import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { CashReport } from '@/modules/reports/components/cash-report'

export default function CashReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Caja" description="Movimientos y saldo de caja" />
      <CashReport />
    </PageContainer>
  )
}
