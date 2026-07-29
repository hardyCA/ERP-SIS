import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { SaleForm } from '@/modules/sales/components/sale-form'

export default function NewSalePage() {
  return (
    <PageContainer>
      <PageHeader title="Nueva Venta" description="Registrar una venta" />
      <SaleForm />
    </PageContainer>
  )
}
