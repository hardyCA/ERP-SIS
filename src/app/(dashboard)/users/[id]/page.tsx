import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { UserPermissions } from '@/modules/users/components/user-permissions'
import { UserDetail } from '@/modules/users/components/user-detail'
import { getUser } from '@/modules/users/actions'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getUser(id)

  if (!result.success || !result.data) {
    return (
      <PageContainer>
        <PageHeader
          title="Usuario no encontrado"
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/users" />}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={result.data.name}
        description="Administra los permisos y accesos del usuario a las sucursales"
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/users" />}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        }
      />
      <UserDetail user={result.data} />
      <UserPermissions userId={id} />
    </PageContainer>
  )
}
