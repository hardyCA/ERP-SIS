'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getQuoteById, convertQuoteToSale, updateQuoteStatus, deleteQuote } from '../actions'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/shared/components/ui/alert-dialog'
import {
  ArrowLeft,
  Printer,
  FileDown,
  Building2,
  User,
  CalendarDays,
  UserCircle,
  Hash,
  Package,
  FileText,
  RotateCcw,
  Trash2,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import { exportSaleInvoice } from '@/shared/lib/export'
import { quoteStatusConfig } from '../types'

const statusIcons: Record<string, typeof FileText> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle2,
  expired: XCircle,
  converted: RotateCcw,
}

interface QuoteDetailProps {
  quoteId: string
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-medium leading-tight truncate">{value}</p>
      </div>
    </div>
  )
}

export function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [changingStatus, setChangingStatus] = useState<string | null>(null)

  const { data: result, isLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuoteById(quoteId),
    staleTime: 0,
  })

  const handleConvert = async () => {
    setConverting(true)
    const res = await convertQuoteToSale(quoteId)
    setConverting(false)
    if (res.success && res.data) {
      toast.success('Cotización convertida a venta')
      router.push(`/sales/${res.data.saleId}`)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const handleStatusChange = async (newStatus: 'draft' | 'sent' | 'accepted' | 'expired') => {
    setChangingStatus(newStatus)
    const res = await updateQuoteStatus(quoteId, newStatus)
    setChangingStatus(null)
    if (res.success) {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleDelete = async () => {
    if (!quoteId) return
    setDeleting(true)
    const fd = new FormData()
    fd.set('quote_id', quoteId)
    const res = await deleteQuote(fd)
    setDeleting(false)
    if (res.success) {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      router.push('/quotes')
    } else {
      toast.error(res.message)
      setConfirmingDelete(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const quote = result?.success ? result.data : null
  if (!quote) return <div className="text-center text-muted-foreground py-12 text-sm">Cotización no encontrada</div>

  const items = (quote.items ?? []) as Array<{
    id: string; product_id: string; quantity: number; price: number; subtotal: number
    products: { name: string; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null
  }>

  const getUnitLabel = (product: (typeof items)[number]['products']): string | null => {
    const u = product?.units_of_measure
    if (!u) return null
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name
  }

  const status = quote.status as string
  const cfg = quoteStatusConfig[status] ?? { label: status, variant: 'outline' }
  const StatusIcon = statusIcons[status] ?? FileText
  const quoteNumber = ((quote.number as number)?.toString().padStart(4, '0')) ?? (quote.id as string).slice(0, 8)
  const canEdit = status === 'draft'
  const canConvert = ['draft', 'sent', 'accepted'].includes(status)
  const isExpired = status === 'expired' && quote.expires_at && new Date(quote.expires_at) < new Date()

  return (
    <div id="quote-detail" className="space-y-6">
      {/* Back link */}
      <Link href="/quotes" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a cotizaciones
      </Link>

      {/* === TOP HEADER === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cotización</p>
            <h1 className="text-xl font-bold tracking-tight"># {quoteNumber}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={async () => {
              const branchesData = quote.branches as Record<string, unknown> | undefined
              const customersData = quote.customers as Record<string, unknown> | undefined
              await exportSaleInvoice({
                number: quoteNumber,
                date: new Date(quote.created_at).toLocaleDateString(),
                time: new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                branch: (branchesData?.name as string) ?? '—',
                branchAddress: (branchesData?.address as string) ?? '',
                branchPhone: (branchesData?.phone as string) ?? '',
                customer: (customersData?.name as string) ?? quote.customer_name ?? '—',
                customerPhone: (customersData?.phone as string) ?? quote.customer_phone ?? '',
                seller: quote.created_by_name ?? '—',
                paymentType: 'Cotización',
                total: Number(quote.total),
                discount: Number(quote.discount || 0),
                cashAmount: 0,
                qrAmount: 0,
                creditAnticipo: 0,
                notes: quote.notes as string | null,
                items: (quote.items ?? []).map((i: { products: { name: string; units_of_measure: { name: string; abbreviation: string | null } | null } | null; quantity: number; price: number; subtotal: number }) => {
                  const p = i.products
                  return {
                    product_name: p?.name ?? '—',
                    unit: p?.units_of_measure?.abbreviation ?? null,
                    quantity: i.quantity,
                    price: Number(i.price),
                    subtotal: Number(i.subtotal),
                  }
                }),
                creditPayments: [],
                creditBalance: 0,
                creditTotalPaid: 0,
              }, true)
            }}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={async () => {
              const branchesData = quote.branches as Record<string, unknown> | undefined
              const customersData = quote.customers as Record<string, unknown> | undefined
              await exportSaleInvoice({
                number: quoteNumber,
                date: new Date(quote.created_at).toLocaleDateString(),
                time: new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                branch: (branchesData?.name as string) ?? '—',
                branchAddress: (branchesData?.address as string) ?? '',
                branchPhone: (branchesData?.phone as string) ?? '',
                customer: (customersData?.name as string) ?? quote.customer_name ?? '—',
                customerPhone: (customersData?.phone as string) ?? quote.customer_phone ?? '',
                seller: quote.created_by_name ?? '—',
                paymentType: 'Cotización',
                total: Number(quote.total),
                discount: Number(quote.discount || 0),
                cashAmount: 0,
                qrAmount: 0,
                creditAnticipo: 0,
                notes: quote.notes as string | null,
                items: (quote.items ?? []).map((i: { products: { name: string; units_of_measure: { name: string; abbreviation: string | null } | null } | null; quantity: number; price: number; subtotal: number }) => {
                  const p = i.products
                  return {
                    product_name: p?.name ?? '—',
                    unit: p?.units_of_measure?.abbreviation ?? null,
                    quantity: i.quantity,
                    price: Number(i.price),
                    subtotal: Number(i.subtotal),
                  }
                }),
                creditPayments: [],
                creditBalance: 0,
                creditTotalPaid: 0,
              })
            }}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(`/quotes/${quoteId}/edit`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
            </Button>
          )}

          {canConvert && (
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90"
              onClick={handleConvert}
              disabled={converting}
            >
              {converting ? 'Convirtiendo...' : 'Convertir a Venta'}
            </Button>
          )}

          {!canEdit && status !== 'converted' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:border-destructive/40"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={cfg.variant} className="h-7 px-3 text-xs gap-1.5">
              <StatusIcon className="h-3.5 w-3.5" />
              {cfg.label}
            </Badge>
            {status === 'converted' && quote.converted_to_sale_id && (
              <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => router.push(`/sales/${quote.converted_to_sale_id}`)}>
                Ver Venta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status actions for draft/sent/accepted */}
      {['draft', 'sent', 'accepted'].includes(status) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3">
          <span className="text-xs text-muted-foreground">Cambiar estado:</span>
          {status !== 'sent' && (
            <Button size="sm" variant={status === 'draft' ? 'default' : 'outline'} className="h-8 text-xs"
              onClick={() => handleStatusChange('sent')} disabled={changingStatus === 'sent'}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar
            </Button>
          )}
          {status !== 'accepted' && (
            <Button size="sm" variant={status === 'accepted' ? 'default' : 'outline'} className="h-8 text-xs"
              onClick={() => handleStatusChange('accepted')} disabled={changingStatus === 'accepted'}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Aceptar
            </Button>
          )}
          {status !== 'expired' && (
            <Button size="sm" variant={status === 'expired' ? 'default' : 'outline'} className="h-8 text-xs"
              onClick={() => handleStatusChange('expired')} disabled={changingStatus === 'expired'}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Expirar
            </Button>
          )}
          {status === 'draft' && (
            <Button size="sm" variant="outline" className="h-8 text-xs"
              onClick={() => handleStatusChange('draft')} disabled={changingStatus === 'draft'}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Volver a borrador
            </Button>
          )}
        </div>
      )}

      {/* Expired warning */}
      {isExpired && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Cotización expirada</p>
            <p className="text-xs text-destructive/80">
              Esta cotización venció el {new Date(quote.expires_at as string).toLocaleDateString()}.
            </p>
          </div>
        </div>
      )}

      {/* === INFO GRID === */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-3 border-b border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información General</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 px-5 py-1">
          <InfoRow icon={Building2} label="Sucursal" value={quote.branches?.name ?? '—'} />
          <InfoRow icon={User} label="Cliente" value={(quote.customers as Record<string, unknown> | undefined)?.name as string ?? quote.customer_name ?? '—'} />
          <InfoRow icon={CalendarDays} label="Fecha" value={new Date(quote.created_at).toLocaleString()} />
          <InfoRow icon={UserCircle} label="Vendedor" value={quote.created_by_name ?? '—'} />
          <InfoRow icon={Hash} label="Estado" value={cfg.label} />
          {quote.customer_phone && (
            <InfoRow icon={UserCircle} label="Teléfono" value={quote.customer_phone} />
          )}
          {quote.expires_at && (
            <InfoRow icon={CalendarDays} label="Vence" value={new Date(quote.expires_at as string).toLocaleDateString()} />
          )}
          {Number(quote.discount || 0) > 0 && (
            <InfoRow icon={Package} label="Descuento" value={`Bs ${Number(quote.discount).toFixed(2)}`} />
          )}
        </div>
      </div>

      {/* === PRODUCTS TABLE === */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Productos <span className="text-foreground font-medium normal-case">({items.length})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">Bs {Number(quote.total).toFixed(2)}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40">
                <TableHead className="w-10" />
                <TableHead className="text-xs font-medium text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-center">Cantidad</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Precio</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-b border-border/20">
                  <TableCell className="w-10">
                    {item.products?.image_url ? (
                      <Image src={item.products.image_url} alt={item.products.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover border" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center border">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{item.products?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-center tabular-nums">{item.quantity}{getUnitLabel(item.products) ? ` ${getUnitLabel(item.products)}` : ''}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">Bs {Number(item.price).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-right font-medium tabular-nums">Bs {Number(item.subtotal).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-5 py-3 border-t border-border/40 flex justify-between items-center bg-muted/30">
          <p className="text-xs text-muted-foreground">{items.length} producto(s)</p>
          <div className="text-right">
            {Number(quote.discount || 0) > 0 && (
              <div className="mb-1">
                <p className="text-[10px] text-muted-foreground">Descuento</p>
                <p className="text-xs font-medium tabular-nums text-destructive">- Bs {Number(quote.discount).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-lg font-bold tabular-nums text-primary">Bs {Number(quote.total).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === NOTES === */}
      {quote.notes && (
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Observaciones</p>
          <p className="text-sm text-foreground/80">{quote.notes}</p>
        </div>
      )}

      {/* === DELETE CONFIRMATION === */}
      <AlertDialog open={confirmingDelete} onOpenChange={(o) => { if (!o && !deleting) setConfirmingDelete(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la cotización <span className="font-semibold text-foreground">#{quoteNumber}</span> permanentemente y no se puede deshacer.
            </AlertDialogDescription>
            <ul className="mt-2 space-y-1.5 text-xs list-disc list-inside">
              <li>Solo se pueden eliminar cotizaciones en estado <span className="font-medium text-foreground">Borrador</span>.</li>
            </ul>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}