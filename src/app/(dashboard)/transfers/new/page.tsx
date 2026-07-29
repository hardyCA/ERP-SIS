import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { TransferForm } from '@/modules/transfers/components/transfer-form'

export default function NewTransferPage() {
  return (
    <PageContainer>
      <PageHeader title="Nuevo Traspaso" description="Transfiere inventario entre sucursales" />
      <TransferForm />
    </PageContainer>
  )
}
