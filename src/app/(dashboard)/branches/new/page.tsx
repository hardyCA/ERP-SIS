import { PageHeader } from '@/shared/components/page-header'
import { BranchForm } from '@/modules/branches/components/branch-form'

export default function NewBranchPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Nueva Sucursal" />
      <div className="flex justify-center">
        <BranchForm />
      </div>
    </div>
  )
}
