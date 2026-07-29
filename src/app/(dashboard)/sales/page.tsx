import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { SaleList } from '@/modules/sales/components/sale-list'

export default function SalesPage() {
  return (
    <PageContainer>
      <PageHeader title="Ventas" description="Historial de ventas registradas" />
      <SaleList />
    </PageContainer>
  )
}
