import { PurchaseReport } from '@/modules/reports/components/purchase-report'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'

export default function PurchaseReportPage() {
  return (
    <PageContainer>
      <PageHeader title="Reporte de Compras" description="Historial de compras, aprobaciones y proveedores" />
      <PurchaseReport />
    </PageContainer>
  )
}
