import { PageHeader } from '@/shared/components/page-header'
import { PurchaseList } from '@/modules/purchases/components/purchase-list'

export default function PurchasesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Compras"
        description="Historial de compras registradas"
      />
      <PurchaseList />
    </div>
  )
}
