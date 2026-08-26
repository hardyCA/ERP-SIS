import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { QuoteList } from '@/modules/quotes/components/quote-list'

export default function QuotesPage() {
  return (
    <PageContainer>
      <PageHeader title="Cotizaciones" description="Historial de cotizaciones registradas" />
      <QuoteList />
    </PageContainer>
  )
}