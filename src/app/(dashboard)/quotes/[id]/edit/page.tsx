import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { QuoteForm } from '@/modules/quotes/components/quote-form'
import { getQuoteById } from '@/modules/quotes/actions'

interface EditQuotePageProps {
  params: Promise<{ id: string }>
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params
  const result = await getQuoteById(id)

  if (!result.success || !result.data) {
    return (
      <PageContainer>
        <PageHeader title="Cotización no encontrada" description="La cotización no existe o no tienes acceso" />
        <div className="text-center py-12 text-muted-foreground">No se pudo cargar la cotización</div>
      </PageContainer>
    )
  }

  const quote = result.data
  const items = (quote.items ?? []).map((i: { id: string; product_id: string; quantity: number; price: number; subtotal: number; products: { name: string; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null }) => ({
    product_id: i.product_id,
    product_name: i.products?.name ?? '—',
    image_url: i.products?.image_url ?? null,
    quantity: i.quantity,
    price: i.price,
    stock: 999999,
    unit: i.products?.units_of_measure?.abbreviation ?? i.products?.units_of_measure?.name ?? null,
  }))

  const initialData = {
    branchId: quote.branch_id,
    customer: quote.customer_id ? { id: quote.customer_id, name: quote.customers?.name ?? quote.customer_name ?? '', phone: quote.customers?.phone ?? quote.customer_phone ?? null } : null,
    discount: quote.discount,
    notes: quote.notes ?? '',
    expiresAt: quote.expires_at ? new Date(quote.expires_at).toISOString().split('T')[0] : '',
    items,
  }

  return (
    <PageContainer>
      <PageHeader title="Editar Cotización" description={`Modificar cotización #${String((quote.number as number) ?? quote.id.slice(0, 8)).padStart(4, '0')}`} />
      <QuoteForm initialData={initialData} quoteId={id} />
    </PageContainer>
  )
}