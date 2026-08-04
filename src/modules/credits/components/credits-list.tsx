'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCredits, registerPayment } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
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
import { DollarSign, ChevronLeft, ChevronRight, WalletMinimal, ScanQrCode, Timer } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function daysBadge(days: number) {
  if (days <= 7) return 'text-success'
  if (days <= 15) return 'text-warning'
  if (days <= 30) return 'text-pending'
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
                            <Button size="sm" onClick={() => { setPayingCreditId(credit.id); setPayAmount(credit.balance.toFixed(2)) }}>
                              <DollarSign className="h-4 w-4 mr-1" /> Cobrar
                            </Button>
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
                        <TableCell><Badge variant="outline" className="text-green-600 border-green-600">Pagado</Badge></TableCell>
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
    </div>
  )
}
