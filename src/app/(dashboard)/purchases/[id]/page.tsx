import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { PurchaseDetail } from '@/modules/purchases/components/purchase-detail'
import { assertAdmin, assertAdminOrManager } from '@/modules/users/service'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PurchaseDetailPage({ params }: Props) {
  const { id } = await params

  let canManage = false
  try {
    await assertAdminOrManager()
    canManage = true
  } catch {
    canManage = false
  }

  let isAdmin = false
  if (canManage) {
    try {
      await assertAdmin()
      isAdmin = true
    } catch {
      isAdmin = false
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Detalle de Compra" />
      <PurchaseDetail purchaseId={id} canManage={canManage} isAdmin={isAdmin} />
    </PageContainer>
  )
}
