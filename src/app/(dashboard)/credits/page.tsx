import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { CreditsList } from '@/modules/credits/components/credits-list'

export default function CreditsPage() {
  return (
    <PageContainer>
      <PageHeader title="Créditos" description="Ventas a crédito y pagos" />
      <CreditsList />
    </PageContainer>
  )
}
