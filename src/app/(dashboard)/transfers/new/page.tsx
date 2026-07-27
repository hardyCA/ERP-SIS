import { PageHeader } from '@/shared/components/page-header'
import { TransferForm } from '@/modules/transfers/components/transfer-form'

export default function NewTransferPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Nuevo Traspaso" description="Transfiere inventario entre sucursales" />
      <TransferForm />
    </div>
  )
}
