import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { BranchForm } from '@/modules/branches/components/branch-form'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditBranchPage({ params }: Props) {
  const { id } = await params
  return (
    <PageContainer>
      <PageHeader
        title="Editar Sucursal"
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/branches" />}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        }
      />
      <div className="flex justify-center">
        <BranchForm branchId={id} />
      </div>
    </PageContainer>
  )
}
