import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { QuoteForm } from '@/modules/quotes/components/quote-form'

export default function NewQuotePage() {
  return (
    <PageContainer>
      <PageHeader title="Nueva Cotización" description="Registrar una cotización" />
      <QuoteForm />
    </PageContainer>
  )
}