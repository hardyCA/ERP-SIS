import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { Button } from '@/shared/components/ui/button'
import { UserList } from '@/modules/users/components/user-list'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function UsersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios del sistema y sus permisos por sucursal"
        action={
          <Button nativeButton={false} render={<Link href="/users/new" />}>
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        }
      />
      <UserList />
    </PageContainer>
  )
}
