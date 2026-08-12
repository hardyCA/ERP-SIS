'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getTransfers, getTransferById, sendTransfer, completeTransfer, cancelTransfer } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Eye, Plus, Printer, ChevronLeft, ChevronRight, Send, Check, X, Search, CalendarDays, CalendarRange, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { useShowCost } from '@/shared/lib/use-role'
import { exportTransferPdf, exportToPdf, printElement } from '@/shared/lib/export'
import { cn } from '@/shared/lib/utils'

const PAGE_SIZE = 15

type Period = 'day' | 'month' | 'year'

function calcPeriod(period: Period): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  if (period === 'month') start.setDate(1)
  else if (period === 'year') start.setMonth(0, 1)
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  sent: { label: 'Enviado', variant: 'default' },
  received: { label: 'Recibido', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export function TransferList() {
  const queryClient = useQueryClient()
  const { branchId } = useBranch()
  const showCost = useShowCost()
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period | 'all'>('all')
  const [search, setSearch] = useState('')

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId])

  const filters: { dateFrom?: string; dateTo?: string } = period === 'all' ? {} : calcPeriod(period)

  const { data: result, isLoading } = useQuery({
    queryKey: ['transfers', branchId, page, filters, search],
    queryFn: () =>
      getTransfers({
        branchId: branchId || undefined,
        page,
        pageSize: PAGE_SIZE,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: search || undefined,
      }),
    staleTime: 0,
  })

  const transfers = Array.isArray(result?.data) ? result.data : []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleSend = async (id: string) => {
    const res = await sendTransfer(id)
    if (res.success) {
      toast.success('Traspaso enviado')
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    } else toast.error(res.message)
  }

  const handleReceive = async (id: string) => {
    const res = await completeTransfer(id)
    if (res.success) {
      toast.success('Traspaso recibido')
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    } else toast.error(res.message)
  }

  const handleCancel = async (id: string) => {
    setCancelTarget(null)
    const res = await cancelTransfer(id)
    if (res.success) {
      toast.success('Traspaso cancelado')
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
    } else toast.error(res.message)
  }

  const handlePrint = async (id: string) => {
    const res = await getTransferById(id)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    const t = res.data as Record<string, unknown>
    const items = (t.items ?? []) as Array<{ quantity: number; unit_cost: number; products: { name: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null }>
    const statusLabel: Record<string, string> = {
      pending: 'Pendiente',
      sent: 'Enviado',
      received: 'Recibido',
      cancelled: 'Cancelado',
    }
    const from = (t.from_branch as Record<string, unknown>) ?? {}
    const to = (t.to_branch as Record<string, unknown>) ?? {}
    exportTransferPdf({
      number: (t.number as number)?.toString().padStart(4, '0') ?? id.slice(0, 8),
      date: new Date(t.created_at as string).toLocaleString(),
      fromBranch: (from.name as string) ?? '—',
      fromBranchAddress: (from.address as string) ?? '',
      fromBranchPhone: (from.phone as string) ?? '',
      toBranch: (to.name as string) ?? '—',
      toBranchAddress: (to.address as string) ?? '',
      toBranchPhone: (to.phone as string) ?? '',
      createdBy: (t.created_by_name as string) ?? '—',
      sentBy: (t.sent_by_name as string) ?? '—',
      receivedBy: (t.received_by_name as string) ?? '—',
      statusLabel: statusLabel[t.status as string] ?? (t.status as string),
      notes: (t.notes as string) ?? null,
      items: items.map(i => {
        const p = i.products
        const u = p?.units_of_measure
        const unitLabel = u ? (u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name) : null
        return {
          product_name: p?.name ? `${p.name}${unitLabel ? ` (${unitLabel})` : ''}` : '—',
          quantity: Number(i.quantity),
          unit_cost: Number(i.unit_cost),
        }
      }),
    }, showCost)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {branchId ? 'Mostrando traspasos relacionados a la sucursal seleccionada' : 'Todos los traspasos'}
        </div>
        <Link href="/transfers/new">
          <Button><Plus className="h-4 w-4" /> Nuevo Traspaso</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/50">
              {([['all', null, 'Todos'] as const, ['day', CalendarDays, 'Hoy'] as const, ['month', CalendarRange, 'Este Mes'] as const, ['year', Calendar, 'Este Año'] as const]).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setPeriod(key); setPage(1) }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      period === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {label}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={() => {
                  exportToPdf(
                    'Traspasos',
                    'Reporte de traspasos entre sucursales',
                    [
                      { header: 'N°', dataKey: '#' },
                      { header: 'Origen', dataKey: 'Origen' },
                      { header: 'Destino', dataKey: 'Destino' },
                      { header: 'Estado', dataKey: 'Estado' },
                      { header: 'Envía', dataKey: 'Envía' },
                      { header: 'Recibe', dataKey: 'Recibe' },
                      { header: 'Fecha', dataKey: 'Fecha' },
                    ],
                    transfers.map((t: Record<string, unknown>) => ({
                      '#': '#' + ((t.number as number)?.toString().padStart(4, '0') ?? (t.id as string).slice(0, 8)),
                      Origen: ((t.from_branch as Record<string, unknown>)?.name as string) ?? '—',
                      Destino: ((t.to_branch as Record<string, unknown>)?.name as string) ?? '—',
                      Estado: statusLabels[(t.status as string) ?? '']?.label ?? (t.status as string),
                      'Envía': (t.sent_by_name as string) ?? '—',
                      'Recibe': (t.received_by_name as string) ?? '—',
                      Fecha: new Date(t.created_at as string).toLocaleDateString(),
                    })),
                    [
                      { label: 'Traspasos', value: total.toString() },
                    ],
                    'traspasos'
                  )
                }}>
                <FileText className="h-3 w-3 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={() => printElement('transfers-print')}>
                <Printer className="h-3 w-3 mr-1" /> Imprimir
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por número, sucursal o estado..."
              className="h-8 pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Envía</TableHead>
                <TableHead>Recibe</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay traspasos registrados</TableCell>
                </TableRow>
              )}
              {transfers.map((t: Record<string, unknown>) => {
                const status = statusLabels[(t.status as string) ?? ''] ?? { label: t.status as string, variant: 'secondary' as const }
                return (
                  <TableRow key={t.id as string}>
                    <TableCell className="font-mono">#{(t.number as number)?.toString().padStart(4, '0') ?? (t.id as string).slice(0, 8)}</TableCell>
                    <TableCell>{((t.from_branch as Record<string, unknown>)?.name as string) ?? '—'}</TableCell>
                    <TableCell>{((t.to_branch as Record<string, unknown>)?.name as string) ?? '—'}</TableCell>
                    <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{(t.sent_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{(t.received_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(t.created_at as string).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/transfers/${t.id}`}>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(t.id as string)} title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        {t.status === 'pending' && (
                          <Button variant="ghost" size="icon" onClick={() => handleSend(t.id as string)} title="Enviar">
                            <Send className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {t.status === 'sent' && (
                          <Button variant="ghost" size="icon" onClick={() => handleReceive(t.id as string)} title="Recibir">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {(t.status === 'pending' || t.status === 'sent') && (
                          <Button variant="ghost" size="icon" onClick={() => setCancelTarget(t.id as string)} title="Cancelar">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            {total} traspaso{total !== 1 ? 's' : ''} · Página {page} de {totalPages}
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
      )}

      <div id="transfers-print" className="hidden">
        <h1>Traspasos</h1>
        <h2>Reporte de traspasos entre sucursales</h2>
        <div className="summary">
          <div className="summary-row"><span>Traspasos</span><span>{total}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Envía</th>
              <th>Recibe</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t: Record<string, unknown>) => (
              <tr key={t.id as string}>
                <td>#{(t.number as number)?.toString().padStart(4, '0') ?? (t.id as string).slice(0, 8)}</td>
                <td>{((t.from_branch as Record<string, unknown>)?.name as string) ?? '—'}</td>
                <td>{((t.to_branch as Record<string, unknown>)?.name as string) ?? '—'}</td>
                <td>{statusLabels[(t.status as string) ?? '']?.label ?? (t.status as string)}</td>
                <td>{(t.sent_by_name as string) ?? '—'}</td>
                <td>{(t.received_by_name as string) ?? '—'}</td>
                <td>{new Date(t.created_at as string).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
        title="Cancelar traspaso"
        description="¿Cancelar este traspaso?"
      />
    </div>
  )
}
