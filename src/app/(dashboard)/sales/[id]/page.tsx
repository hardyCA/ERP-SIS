import { SaleDetail } from '@/modules/sales/components/sale-detail'
import { PageContainer } from '@/shared/components/page-container'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageContainer>
      <SaleDetail saleId={id} />
    </PageContainer>
  )
}
