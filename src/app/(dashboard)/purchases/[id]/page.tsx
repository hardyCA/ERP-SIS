import { PageHeader } from '@/shared/components/page-header'
import { PurchaseDetail } from '@/modules/purchases/components/purchase-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PurchaseDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Detalle de Compra" />
      <PurchaseDetail purchaseId={id} />
    </div>
  )
}
