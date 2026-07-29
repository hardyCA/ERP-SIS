import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { TransferList } from '@/modules/transfers/components/transfer-list'

export default function TransfersPage() {
  return (
    <PageContainer>
      <PageHeader title="Traspasos" description="Gestión de traspasos entre sucursales" />
      <TransferList />
    </PageContainer>
  )
}
