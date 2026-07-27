'use client'

import { PageHeader } from '@/shared/components/page-header'
import { InventoryReport } from '@/modules/reports/components/inventory-report'

export default function InventoryReportPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Reporte de Inventario" description="Stock actual, valorización y alertas" />
      <InventoryReport />
    </div>
  )
}
