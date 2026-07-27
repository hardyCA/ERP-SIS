import { PageHeader } from '@/shared/components/page-header'
import { PurchaseForm } from '@/modules/purchases/components/purchase-form'

export default function NewPurchasePage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Nueva Compra" />
      <PurchaseForm />
    </div>
  )
}
