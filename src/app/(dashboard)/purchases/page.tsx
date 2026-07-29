import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { PurchaseList } from '@/modules/purchases/components/purchase-list'

export default function PurchasesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Compras"
        description="Historial de compras registradas"
      />
      <PurchaseList />
    </PageContainer>
  )
}
