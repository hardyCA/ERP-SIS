'use client'

import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { InventoryReport } from '@/modules/reports/components/inventory-report'

export default function InventoryReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Inventario" description="Stock actual, valorización y alertas" />
      <InventoryReport />
    </PageContainer>
  )
}
