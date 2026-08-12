'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSales } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Eye, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'

const PAGE_SIZE = 15

const paymentConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  cash: { label: 'Efectivo', variant: 'default' },
  qr: { label: 'QR / Transf.', variant: 'secondary' },
  mixed: { label: 'Mixto', variant: 'outline' },
  credit: { label: 'Crédito', variant: 'destructive' },
}

export function SaleList() {
  const { branchId } = useBranch()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'active' | 'deleted'>('active')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId])

  const { data: result, isLoading } = useQuery({
    queryKey: ['sales', branchId, status, appliedFrom, appliedTo, page],
    queryFn: () => getSales({
      branchId: branchId || undefined,
      status,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 0,
  })

  const sales = Array.isArray(result?.data) ? result.data : []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const applyFilters = () => {
    setPage(1)
    setAppliedFrom(fromDate)
    setAppliedTo(toDate)
  }

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setAppliedFrom('')
    setAppliedTo('')
    setPage(1)
  }

  const hasFilters = !!appliedFrom || !!appliedTo

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => { setStatus('active'); setPage(1) }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${status === 'active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Activas
          </button>
          <button
            type="button"
            onClick={() => { setStatus('deleted'); setPage(1) }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${status === 'deleted' ? 'bg-background shadow-sm text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Anuladas
          </button>
        </div>
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 w-36 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 w-36 text-xs" />
        </div>
        <Button size="sm" variant="default" className="h-8 text-xs" onClick={applyFilters}>
          Filtrar
        </Button>
        {hasFilters && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={clearFilters}>
            Limpiar
          </Button>
        )}
        <div className="ml-auto">
          <Link href="/sales/new">
            <Button size="sm" className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva Venta
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="w-28">Total</TableHead>
                  <TableHead className="w-28">Pago</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {hasFilters
                        ? 'No hay ventas en este rango de fechas'
                        : status === 'deleted'
                          ? 'No hay ventas anuladas'
                          : 'No hay ventas registradas'}
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s: Record<string, unknown>) => {
                  const pt = (s.payment_type as string) || ''
                  const cfg = paymentConfig[pt] ?? { label: pt, variant: 'outline' as const }
                  const credits = (s.sale_credits as Array<Record<string, unknown>>) || []
                  const activeCredit = credits.find((c: Record<string, unknown>) => (c.balance as number) > 0)
                  const creditBalance = activeCredit ? (activeCredit.balance as number) : 0
                  const isDeleted = !!s.deleted_at
                  return (
                    <TableRow key={s.id as string} className={isDeleted ? 'opacity-60' : ''}>
                      <TableCell className="font-mono text-xs">#{(s.number as number)?.toString().padStart(4, '0') ?? (s.id as string).slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{((s.branches as Record<string, unknown>)?.name as string) ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">Bs {Number(s.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="ml-1.5 text-[10px]">Anulada</Badge>
                        )}
                        {pt === 'credit' && !isDeleted && (
                          <span className="ml-1.5 text-[10px] text-destructive font-medium">
                            {creditBalance > 0 ? `Saldo: Bs ${creditBalance.toFixed(2)}` : 'Pagado'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                        {s.customers
                          ? ((s.customers as Record<string, unknown>)?.name as string) ?? (s.customer_name as string) ?? '—'
                          : (s.customer_name as string) ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(s.created_by_name as string) ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.created_at as string).toLocaleDateString()}
                        {isDeleted && (
                          <span className="block text-[10px] text-destructive">
                            Anulada {new Date(s.deleted_at as string).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/sales/${s.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-xs text-muted-foreground">
              {total} venta{total !== 1 ? 's' : ''} {status === 'deleted' ? 'anulada' : ''} · Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                if (p > totalPages) return null
                return (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(p)}>
                    {p}
                  </Button>
                )
              })}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
