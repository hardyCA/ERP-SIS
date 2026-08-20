'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCredits, registerPayment, deleteCreditPayment } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { useIsAdminOrManager, useCurrentUserId } from '@/shared/lib/use-role'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { DollarSign, ChevronLeft, ChevronRight, WalletMinimal, ScanQrCode, Timer, History, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
}

function daysBadge(days: number) {
  if (days <= 15) return 'text-success'
  return 'text-destructive font-semibold'
}

const PAGE_SIZE = 10

export function CreditsList() {
  const queryClient = useQueryClient()
  const { branchId } = useBranch()
  const [payingCreditId, setPayingCreditId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [activePage, setActivePage] = useState(1)
  const [paidPage, setPaidPage] = useState(1)
  const [viewCreditId, setViewCreditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; amount: number } | null>(null)
  const isAdminOrManager = useIsAdminOrManager()
  const currentUserId = useCurrentUserId()

  const { data, isLoading } = useQuery({
    queryKey: ['credits', branchId],
    queryFn: () => getCredits(branchId || undefined),
    staleTime: 0,
  })

  const credits = data?.success ? (data.data ?? []) : []

  const handlePay = async () => {
    if (!payingCreditId || !payAmount) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set('sale_credit_id', payingCreditId)
    fd.set('amount', payAmount)
    fd.set('payment_type', payType)
    const result = await registerPayment(fd)
    setSubmitting(false)
    if (result.success) {
      toast.success('Pago registrado exitosamente')
      setPayingCreditId(null)
      setPayAmount('')
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    } else {
      toast.error(result.message)
    }
  }

  const handleDeletePayment = async () => {
    if (!deleteTarget) return
    const fd = new FormData()
    fd.set('payment_id', deleteTarget.id)
    const result = await deleteCreditPayment(fd)
    setDeleteTarget(null)
    if (result.success) {
      toast.success('Cobro eliminado correctamente')
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    } else {
      toast.error(result.message)
    }
  }

  const viewCredit = credits.find((c: Record<string, unknown>) => (c as { id: string }).id === viewCreditId) as
    | {
        id: string
        total: number
        balance: number
        sale: { number: number; customer_name?: string }
        payments: Array<{ id: string; amount: number; payment_type?: string; created_at: string; created_by?: string }>
      }
    | undefined

  const viewPayments = viewCredit
    ? [...(viewCredit.payments ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const activeCredits = credits.filter((c: Record<string, unknown>) => (c as { balance: number }).balance > 0)
  const paidCredits = credits.filter((c: Record<string, unknown>) => (c as { balance: number }).balance <= 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Créditos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Bs {credits.reduce((s: number, c: Record<string, unknown>) => s + ((c as { total: number }).total || 0), 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo Pendiente</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              Bs {activeCredits.reduce((s: number, c: Record<string, unknown>) => s + ((c as { balance: number }).balance || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pagado</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              Bs {(credits.reduce((s: number, c: Record<string, unknown>) => s + ((c as { total: number }).total || 0), 0) -
                activeCredits.reduce((s: number, c: Record<string, unknown>) => s + ((c as { balance: number }).balance || 0), 0)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active credits */}
      <Card>
        <CardHeader><CardTitle>Créditos Activos ({activeCredits.length})</CardTitle></CardHeader>
        <CardContent>
          {activeCredits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay créditos pendientes</p>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCredits.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE).map((c: Record<string, unknown>) => {
                      const credit = c as { id: string; created_at: string; sale_id: string; total: number; balance: number; sale: { number: number; created_at: string; customer_name?: string; customer_phone?: string }; payments: Array<{ id: string; amount: number }> }
                      const paid = credit.total - credit.balance
                      return (
                        <TableRow key={credit.id}>
                          <TableCell className="font-mono">#{String(credit.sale?.number || '').padStart(4, '0')}</TableCell>
                          <TableCell>{credit.sale?.customer_name || '—'}</TableCell>
                          <TableCell className="font-mono">Bs {credit.total.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-destructive font-medium">Bs {credit.balance.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-green-600">Bs {paid.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums', daysBadge(getDaysAgo(credit.sale?.created_at || credit.created_at)))}>
                              <Timer className="h-3 w-3" />
                              {getDaysAgo(credit.sale?.created_at || credit.created_at)}d
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setViewCreditId(credit.id)}>
                                <History className="h-4 w-4 mr-1" /> Pagos
                              </Button>
                              <Button size="sm" onClick={() => { setPayingCreditId(credit.id); setPayAmount(credit.balance.toFixed(2)) }}>
                                <DollarSign className="h-4 w-4 mr-1" /> Cobrar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {activeCredits.length > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-1 mt-2">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    disabled={activePage <= 1} onClick={() => setActivePage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground mx-1">
                    {activePage} / {Math.ceil(activeCredits.length / PAGE_SIZE)}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    disabled={activePage >= Math.ceil(activeCredits.length / PAGE_SIZE)} onClick={() => setActivePage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Paid credits */}
      {paidCredits.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Créditos Pagados ({paidCredits.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidCredits.slice((paidPage - 1) * PAGE_SIZE, paidPage * PAGE_SIZE).map((c: Record<string, unknown>) => {
                    const credit = c as { id: string; created_at: string; total: number; balance: number; sale: { number: number; created_at: string; customer_name?: string } }
                    return (
                      <TableRow key={credit.id}>
                        <TableCell className="font-mono">#{String(credit.sale?.number || '').padStart(4, '0')}</TableCell>
                        <TableCell>{credit.sale?.customer_name || '—'}</TableCell>
                        <TableCell className="font-mono">Bs {credit.total.toFixed(2)}</TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-600 border-green-600">Pagado</Badge>
                          <Button size="sm" variant="outline" onClick={() => setViewCreditId(credit.id)}>
                            <History className="h-4 w-4 mr-1" /> Pagos
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {paidCredits.length > PAGE_SIZE && (
              <div className="flex items-center justify-end gap-1 mt-2">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                  disabled={paidPage <= 1} onClick={() => setPaidPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground mx-1">
                  {paidPage} / {Math.ceil(paidCredits.length / PAGE_SIZE)}
                </span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                  disabled={paidPage >= Math.ceil(paidCredits.length / PAGE_SIZE)} onClick={() => setPaidPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment dialog */}
      <Dialog open={!!payingCreditId} onOpenChange={(o) => { if (!o) setPayingCreditId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>Registrar un pago contra este crédito</DialogDescription>
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
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'cash', label: 'Efectivo', icon: WalletMinimal, activeColor: 'border-success bg-success/10 text-success' },
                  { value: 'qr', label: 'QR / Transf.', icon: ScanQrCode, activeColor: 'border-info bg-info/10 text-info' },
                ] as const).map(({ value, label, icon: Icon, activeColor }) => (
                  <button key={value} type="button"
                    onClick={() => setPayType(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-xs font-medium transition-all',
                      payType === value ? activeColor : 'border-border hover:bg-accent text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handlePay} disabled={submitting || !payAmount} className="w-full">
              {submitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment history dialog */}
      <Dialog open={!!viewCreditId} onOpenChange={(o) => { if (!o) setViewCreditId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagos del crédito</DialogTitle>
            <DialogDescription>
              {viewCredit ? `Venta #${String(viewCredit.sale?.number || '').padStart(4, '0')} · ${viewCredit.sale?.customer_name || 'Sin cliente'} · Saldo: Bs ${viewCredit.balance.toFixed(2)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-auto">
            {viewPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay cobros registrados</p>
            ) : viewPayments.map((p) => {
              const canDelete = isAdminOrManager || p.created_by === currentUserId
              return (
                <div key={p.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold font-mono">Bs {p.amount.toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{p.payment_type === 'qr' ? 'QR' : 'Efectivo'}</Badge>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Eliminar cobro"
                        onClick={() => setDeleteTarget({ id: p.id, amount: p.amount })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDeletePayment}
        title="Eliminar cobro"
        description={deleteTarget ? `¿Eliminar el cobro de Bs ${deleteTarget.amount.toFixed(2)}? Se restituirá el saldo del crédito y se revertirá el ingreso en caja.` : ''}
      />
    </div>
  )
}
