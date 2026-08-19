'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSaleById, deleteSale } from '../actions'
import { registerPayment } from '@/modules/credits/actions'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  ArrowLeft,
  Printer,
  FileDown,
  Building2,
  User,
  CalendarDays,
  UserCircle,
  Hash,
  CreditCard,
  WalletMinimal,
  ScanQrCode,
  ArrowLeftRight,
  DollarSign,
  CheckCircle2,
  Package,
  Receipt,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import { exportSaleInvoice } from '@/shared/lib/export'

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  qr: 'QR / Transf.',
  mixed: 'Mixto',
  credit: 'Crédito',
}

const paymentIcons: Record<string, typeof WalletMinimal> = {
  cash: WalletMinimal,
  qr: ScanQrCode,
  mixed: ArrowLeftRight,
  credit: CreditCard,
}

const paymentColors: Record<string, string> = {
  cash: 'bg-success/10 text-success border-success/20',
  qr: 'bg-info/10 text-info border-info/20',
  mixed: 'bg-warning/10 text-warning border-warning/20',
  credit: 'bg-pending/10 text-pending border-pending/20',
}

interface SaleDetailProps {
  saleId: string
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

export function SaleDetail({ saleId }: SaleDetailProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [payingCreditId, setPayingCreditId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: result, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSaleById(saleId, true),
    staleTime: 0,
  })

  const handlePay = async () => {
    if (!payingCreditId || !payAmount) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set('sale_credit_id', payingCreditId)
    fd.set('amount', payAmount)
    fd.set('payment_type', payType)
    const res = await registerPayment(fd)
    setSubmitting(false)
    if (res.success) {
      toast.success('Pago registrado exitosamente')
      setPayingCreditId(null)
      setPayAmount('')
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleDelete = async () => {
    if (!saleId) return
    setDeleting(true)
    const fd = new FormData()
    fd.set('sale_id', saleId)
    const res = await deleteSale(fd)
    setDeleting(false)
    if (res.success) {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register'] })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
      router.push('/sales')
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

  const sale = result?.success ? result.data : null
  if (!sale) return <div className="text-center text-muted-foreground py-12 text-sm">Venta no encontrada</div>

  const items = (sale.items ?? []) as Array<{
    id: string; product_id: string; quantity: number; price: number; subtotal: number
    products: { name: string; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null
  }>

  const getUnitLabel = (product: (typeof items)[number]['products']): string | null => {
    const u = product?.units_of_measure
    if (!u) return null
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name
  }

  const credits = (sale.sale_credits as Array<Record<string, unknown>>) || []
  const activeCredit = credits.find((c: Record<string, unknown>) => (c.balance as number) > 0)
  const hasCreditPayments = credits.some((c: Record<string, unknown>) =>
    Array.isArray(c.payments) && (c.payments as Array<Record<string, unknown>>).length > 0
  )
  const pt = (sale.payment_type as string) || ''
  const saleNumber = ((sale.number as number)?.toString().padStart(4, '0')) ?? (sale.id as string).slice(0, 8)
  const PaymentIcon = paymentIcons[pt] ?? WalletMinimal
  const isDeleted = !!sale.deleted_at

  return (
    <div id="sale-detail" className="space-y-6">
      {/* Back link */}
      <Link href="/sales" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a ventas
      </Link>

      {isDeleted && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <Trash2 className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Venta anulada</p>
            <p className="text-xs text-destructive/80">
              Esta venta fue anulada el {new Date(sale.deleted_at as string).toLocaleString()}{sale.deleted_by_name ? ` por ${sale.deleted_by_name}` : ''}. El stock se devolvió, la caja se revirtió y el crédito se canceló.
            </p>
          </div>
        </div>
      )}

      {/* === TOP HEADER === */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comprobante de Venta</p>
            <h1 className="text-xl font-bold tracking-tight"># {saleNumber}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={async () => {
              const ptLabel = paymentLabels[pt] ?? pt
              const branchesData = sale.branches as Record<string, unknown> | undefined
              const customersData = sale.customers as Record<string, unknown> | undefined
              const saleCredits = (sale.sale_credits as Array<Record<string, unknown>>) || []
              const allPayments: Array<{ date: string; time: string; amount: number; balance: number }> = []
              let totalPaid = 0
              let currentBalance = 0
              saleCredits.forEach((cr) => {
                currentBalance += Number(cr.balance || 0)
                const pays = (cr.payments as Array<Record<string, unknown>>) || []
                let runningBalance = Number(cr.total || 0)
                pays.forEach((p) => {
                  const d = new Date(p.created_at as string)
                  totalPaid += Number(p.amount || 0)
                  runningBalance -= Number(p.amount || 0)
                  allPayments.push({
                    date: d.toLocaleDateString(),
                    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: Number(p.amount || 0),
                    balance: runningBalance,
                  })
                })
              })
              await exportSaleInvoice({
                number: saleNumber,
                date: new Date(sale.created_at).toLocaleDateString(),
                time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                branch: (branchesData?.name as string) ?? '—',
                branchAddress: (branchesData?.address as string) ?? '',
                branchPhone: (branchesData?.phone as string) ?? '',
                customer: (customersData?.name as string) ?? sale.customer_name ?? '—',
                customerPhone: (customersData?.phone as string) ?? sale.customer_phone ?? '',
                seller: sale.created_by_name ?? '—',
                paymentType: ptLabel,
                total: Number(sale.total),
                discount: Number(sale.discount || 0),
                cashAmount: Number(sale.cash_amount || 0),
                qrAmount: Number(sale.qr_amount || 0),
                creditAnticipo: Number(sale.credit_anticipo || 0),
                notes: sale.notes as string | null,
                items: (sale.items ?? []).map((i: { products: { name: string; units_of_measure: { name: string; abbreviation: string | null } | null } | null; quantity: number; price: number; subtotal: number }) => {
                  const p = i.products
                  return {
                    product_name: p?.name ?? '—',
                    unit: p?.units_of_measure?.abbreviation ?? null,
                    quantity: i.quantity,
                    price: Number(i.price),
                    subtotal: Number(i.subtotal),
                  }
                }),
                creditPayments: allPayments,
                creditBalance: currentBalance,
                creditTotalPaid: totalPaid,
              }, true)
            }}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={async () => {
              const ptLabel = paymentLabels[pt] ?? pt
              const branchesData = sale.branches as Record<string, unknown> | undefined
              const customersData = sale.customers as Record<string, unknown> | undefined
              const saleCredits = (sale.sale_credits as Array<Record<string, unknown>>) || []
              const allPayments: Array<{ date: string; time: string; amount: number; balance: number }> = []
              let totalPaid = 0
              let currentBalance = 0
              saleCredits.forEach((cr) => {
                currentBalance += Number(cr.balance || 0)
                const pays = (cr.payments as Array<Record<string, unknown>>) || []
                let runningBalance = Number(cr.total || 0)
                pays.forEach((p) => {
                  const d = new Date(p.created_at as string)
                  totalPaid += Number(p.amount || 0)
                  runningBalance -= Number(p.amount || 0)
                  allPayments.push({
                    date: d.toLocaleDateString(),
                    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: Number(p.amount || 0),
                    balance: runningBalance,
                  })
                })
              })
              await exportSaleInvoice({
                number: saleNumber,
                date: new Date(sale.created_at).toLocaleDateString(),
                time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                branch: (branchesData?.name as string) ?? '—',
                branchAddress: (branchesData?.address as string) ?? '',
                branchPhone: (branchesData?.phone as string) ?? '',
                customer: (customersData?.name as string) ?? sale.customer_name ?? '—',
                customerPhone: (customersData?.phone as string) ?? sale.customer_phone ?? '',
                seller: sale.created_by_name ?? '—',
                paymentType: ptLabel,
                total: Number(sale.total),
                discount: Number(sale.discount || 0),
                cashAmount: Number(sale.cash_amount || 0),
                qrAmount: Number(sale.qr_amount || 0),
                creditAnticipo: Number(sale.credit_anticipo || 0),
                notes: sale.notes as string | null,
                items: (sale.items ?? []).map((i: { products: { name: string; units_of_measure: { name: string; abbreviation: string | null } | null } | null; quantity: number; price: number; subtotal: number }) => {
                  const p = i.products
                  return {
                    product_name: p?.name ?? '—',
                    unit: p?.units_of_measure?.abbreviation ?? null,
                    quantity: i.quantity,
                    price: Number(i.price),
                    subtotal: Number(i.subtotal),
                  }
                }),
                creditPayments: allPayments,
                creditBalance: currentBalance,
                creditTotalPaid: totalPaid,
              })
            }}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
          {!isDeleted && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive hover:border-destructive/40"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
            </Button>
          )}
          {isDeleted && (
            <Badge variant="destructive" className="h-7 px-3 text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Anulada
            </Badge>
          )}
          <Badge variant={pt === 'cash' ? 'default' : pt === 'qr' ? 'info' : pt === 'mixed' ? 'warning' : 'pending'} className="h-7 px-3 text-xs gap-1.5">
            <PaymentIcon className="h-3.5 w-3.5" />
            {paymentLabels[pt] ?? pt}
          </Badge>
          {activeCredit && (
            <Badge variant="destructive" className="h-7 px-3 text-xs">
              Saldo: Bs {(activeCredit.balance as number).toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* === INFO GRID === */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-3 border-b border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información General</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 px-5 py-1">
          <InfoRow icon={Building2} label="Sucursal" value={sale.branches?.name ?? '—'} />
          <InfoRow icon={User} label="Cliente" value={(sale.customers as Record<string, unknown> | undefined)?.name as string ?? sale.customer_name ?? '—'} />
          <InfoRow icon={CalendarDays} label="Fecha" value={new Date(sale.created_at).toLocaleString()} />
          <InfoRow icon={UserCircle} label="Vendedor" value={sale.created_by_name ?? '—'} />
          <InfoRow icon={Hash} label="Tipo de Pago" value={paymentLabels[pt] ?? pt} />
          {sale.customer_phone && (
            <InfoRow icon={UserCircle} label="Teléfono" value={sale.customer_phone} />
          )}
          {Number(sale.discount || 0) > 0 && (
            <InfoRow icon={WalletMinimal} label="Descuento" value={`Bs ${Number(sale.discount).toFixed(2)}`} />
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
            Total: <span className="font-semibold text-foreground">Bs {Number(sale.total).toFixed(2)}</span>
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
          <div className="flex items-center gap-6">
            {pt === 'credit' && (
              <>
                {Number(sale.cash_amount) > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Efectivo</p>
                    <p className="text-xs font-medium tabular-nums">Bs {Number(sale.cash_amount).toFixed(2)}</p>
                  </div>
                )}
                {Number(sale.qr_amount) > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">QR/Transf.</p>
                    <p className="text-xs font-medium tabular-nums">Bs {Number(sale.qr_amount).toFixed(2)}</p>
                  </div>
                )}
                {Number(sale.credit_anticipo) > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Anticipo</p>
                    <p className="text-xs font-medium tabular-nums">Bs {Number(sale.credit_anticipo).toFixed(2)}</p>
                  </div>
                )}
              </>
            )}
            {Number(sale.discount || 0) > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Descuento</p>
                <p className="text-xs font-medium tabular-nums text-destructive">- Bs {Number(sale.discount).toFixed(2)}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-lg font-bold tabular-nums text-primary">Bs {Number(sale.total).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === NOTES === */}
      {sale.notes && (
        <div className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Observaciones</p>
          <p className="text-sm text-foreground/80">{sale.notes}</p>
        </div>
      )}

      {/* === CREDIT SECTION === */}
      {pt === 'credit' && credits.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalle de Crédito</p>
          </div>
          <div className="px-5 py-4 space-y-6">
            {credits.map((credit) => {
              const balance = credit.balance as number
              const totalCredit = credit.total as number
              const paid = totalCredit - balance
              const payments = (credit.payments as Array<Record<string, unknown>>) || []
              return (
                <div key={credit.id as string}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total Crédito</p>
                      <p className="text-base font-bold tabular-nums">Bs {totalCredit.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Pagado</p>
                      <p className="text-base font-bold tabular-nums text-success">Bs {paid.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Saldo Pendiente</p>
                      <p className={cn('text-base font-bold tabular-nums', balance > 0 ? 'text-destructive' : 'text-success')}>
                        Bs {balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end mb-3">
                    {balance > 0 && (
                      <Button size="sm" className="h-8 text-xs"
                        onClick={() => { setPayingCreditId(credit.id as string); setPayAmount(balance.toFixed(2)) }}>
                        <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Cobrar
                      </Button>
                    )}
                    {balance <= 0 && (
                      <div className="flex items-center gap-2 text-xs text-success font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Crédito pagado completamente
                      </div>
                    )}
                  </div>

                  {payments.length > 0 && (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border/40">
                            <TableHead className="text-[10px] font-medium text-muted-foreground">Fecha</TableHead>
                            <TableHead className="text-[10px] font-medium text-muted-foreground">Hora</TableHead>
                            <TableHead className="text-[10px] font-medium text-muted-foreground text-right">Monto</TableHead>
                            <TableHead className="text-[10px] font-medium text-muted-foreground">Método</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id as string} className="border-b border-border/20">
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(p.created_at as string).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(p.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-right tabular-nums text-green-600">
                                + Bs {Number(p.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {p.payment_type === 'cash' ? 'Efectivo' : 'QR / Transf.'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === PAYMENT DIALOG === */}
      <Dialog open={!!payingCreditId} onOpenChange={(o) => { if (!o) setPayingCreditId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Registrar un pago contra el crédito de esta venta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <Input type="number" step="0.01" min="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Pago</label>
              <Select value={payType} onValueChange={(v) => setPayType(v || 'cash')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="qr">QR / Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePay} disabled={submitting || !payAmount} className="w-full">
              {submitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === DELETE CONFIRMATION === */}
      <AlertDialog open={confirmingDelete} onOpenChange={(o) => { if (!o && !deleting) setConfirmingDelete(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la venta <span className="font-semibold text-foreground">#{saleNumber}</span> permanentemente y no se puede deshacer.
            </AlertDialogDescription>
            <ul className="mt-2 space-y-1.5 text-xs list-disc list-inside">
              <li>El stock de los productos se <span className="font-medium text-foreground">devolverá</span> a la sucursal.</li>
              <li>Los movimientos de caja de esta venta se <span className="font-medium text-foreground">revertirán</span>.</li>
              {pt === 'credit' && (
                <li>
                  El crédito <span className="font-medium text-foreground">se cancelará</span>
                  {hasCreditPayments ? ' y los pagos ya registrados se eliminarán' : ''}.
                </li>
              )}
            </ul>
            {pt === 'credit' && hasCreditPayments && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Esta venta a crédito ya tiene pagos registrados. Al eliminarla, esos cobros desaparecerán del sistema y de la caja.
              </p>
            )}
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
