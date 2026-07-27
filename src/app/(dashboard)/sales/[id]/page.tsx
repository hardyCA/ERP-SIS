import { SaleDetail } from '@/modules/sales/components/sale-detail'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <SaleDetail saleId={id} />
    </div>
  )
}
