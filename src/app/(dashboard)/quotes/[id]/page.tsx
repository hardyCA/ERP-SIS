import { QuoteDetail } from '@/modules/quotes/components/quote-detail'
import { PageContainer } from '@/shared/components/page-container'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PageContainer>
      <QuoteDetail quoteId={id} />
    </PageContainer>
  )
}