import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { BranchList } from '@/modules/branches/components/branch-list'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function BranchesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Sucursales"
        description="Administra las sucursales del negocio"
        action={
          <Button nativeButton={false} render={<Link href="/branches/new" />}>
            <Plus className="h-4 w-4" />
            Nueva Sucursal
          </Button>
        }
      />
      <BranchList />
    </PageContainer>
  )
}
