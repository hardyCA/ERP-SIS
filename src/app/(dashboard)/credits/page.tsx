import { PageHeader } from '@/shared/components/page-header'
import { CreditsList } from '@/modules/credits/components/credits-list'

export default function CreditsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Créditos" description="Ventas a crédito y pagos" />
      <CreditsList />
    </div>
  )
}
