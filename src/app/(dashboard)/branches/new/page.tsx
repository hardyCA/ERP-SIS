import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { BranchForm } from '@/modules/branches/components/branch-form'

export default function NewBranchPage() {
  return (
    <PageContainer>
      <PageHeader title="Nueva Sucursal" />
      <div className="flex justify-center">
        <BranchForm />
      </div>
    </PageContainer>
  )
}
