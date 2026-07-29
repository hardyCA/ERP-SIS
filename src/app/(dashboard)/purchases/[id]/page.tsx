import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { PurchaseDetail } from '@/modules/purchases/components/purchase-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PurchaseDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <PageContainer>
      <PageHeader title="Detalle de Compra" />
      <PurchaseDetail purchaseId={id} />
    </PageContainer>
  )
}
