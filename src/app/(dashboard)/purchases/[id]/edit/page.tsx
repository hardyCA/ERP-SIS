import { redirect } from 'next/navigation'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { PurchaseForm } from '@/modules/purchases/components/purchase-form'
import { assertAdminOrManager } from '@/modules/users/service'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPurchasePage({ params }: Props) {
  const { id } = await params

  let canManage = false
  try {
    await assertAdminOrManager()
    canManage = true
  } catch {
    canManage = false
  }

  if (!canManage) redirect('/purchases')

  return (
    <PageContainer>
      <PageHeader title="Editar Compra" />
      <PurchaseForm purchaseId={id} />
    </PageContainer>
  )
}
