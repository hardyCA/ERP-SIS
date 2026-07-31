import { SaleDetail } from '@/modules/sales/components/sale-detail'
import { PageContainer } from '@/shared/components/page-container'
import { assertAdmin } from '@/modules/users/service'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let isAdmin = false
  try {
    await assertAdmin()
    isAdmin = true
  } catch {
    isAdmin = false
  }

  return (
    <PageContainer>
      <SaleDetail saleId={id} isAdmin={isAdmin} />
    </PageContainer>
  )
}
