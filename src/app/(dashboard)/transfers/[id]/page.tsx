import { TransferDetail } from '@/modules/transfers/components/transfer-detail'

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <TransferDetail transferId={id} />
    </div>
  )
}
