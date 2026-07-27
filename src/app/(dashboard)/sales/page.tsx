import { PageHeader } from '@/shared/components/page-header'
import { SaleList } from '@/modules/sales/components/sale-list'

export default function SalesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Ventas" description="Historial de ventas registradas" />
      <SaleList />
    </div>
  )
}
