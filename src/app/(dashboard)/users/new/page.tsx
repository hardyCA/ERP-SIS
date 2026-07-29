import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { UserForm } from '@/modules/users/components/user-form'

export default function NewUserPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Nuevo Usuario"
        description="Crea un nuevo usuario para que pueda acceder al sistema"
      />
      <div className="flex justify-center">
        <UserForm />
      </div>
    </PageContainer>
  )
}
