import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { PurchaseForm } from '@/modules/purchases/components/purchase-form'

export default function NewPurchasePage() {
  return (
    <PageContainer>
      <PageHeader title="Nueva Compra" />
      <PurchaseForm />
    </PageContainer>
  )
}
