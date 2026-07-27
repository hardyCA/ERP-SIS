import { PageHeader } from '@/shared/components/page-header'
import { SaleForm } from '@/modules/sales/components/sale-form'

export default function NewSalePage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Nueva Venta" description="Registrar una venta" />
      <SaleForm />
    </div>
  )
}
