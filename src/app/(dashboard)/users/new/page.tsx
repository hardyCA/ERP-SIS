import { PageHeader } from '@/shared/components/page-header'
import { UserForm } from '@/modules/users/components/user-form'

export default function NewUserPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Nuevo Usuario"
        description="Crea un nuevo usuario para que pueda acceder al sistema"
      />
      <div className="flex justify-center">
        <UserForm />
      </div>
    </div>
  )
}
