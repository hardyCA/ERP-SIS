import { TransferDetail } from '@/modules/transfers/components/transfer-detail'
import { PageContainer } from '@/shared/components/page-container'

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageContainer>
      <TransferDetail transferId={id} />
    </PageContainer>
  )
}
