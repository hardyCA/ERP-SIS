import { PageHeader } from '@/shared/components/page-header'
import { TransferList } from '@/modules/transfers/components/transfer-list'

export default function TransfersPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Traspasos" description="Gestión de traspasos entre sucursales" />
      <TransferList />
    </div>
  )
}
