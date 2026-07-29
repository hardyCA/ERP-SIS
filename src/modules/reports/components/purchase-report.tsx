'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPurchaseReport, getPurchaseStats } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Card, CardContent } from '@/shared/components/ui/card'
import { CalendarDays, CalendarRange, Calendar, FileSpreadsheet, ShoppingCart, Clock, CheckCircle, XCircle } from 'lucide-react'
import { exportToExcel } from '@/shared/lib/export'

type Period = 'day' | 'month' | 'year' | 'custom'

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calcPeriodDates(period: Period): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (period === 'month') {
    start.setDate(1)
  } else if (period === 'year') {
    start.setMonth(0, 1)
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  }
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  cancelled: 'Cancelado',
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export function PurchaseReport() {
  const { branchId } = useBranch()
  const [period, setPeriod] = useState<Period>('month')

  const today = toDateInput(new Date())
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string }>(() => {
    const d = calcPeriodDates('month')
    return { dateFrom: d.dateFrom, dateTo: d.dateTo }
  })

  const applyPeriod = useCallback((p: Period) => {
    setPeriod(p)
    if (p === 'custom') return
    const d = calcPeriodDates(p)
    setDateFrom(d.dateFrom.slice(0, 10))
    setDateTo(d.dateTo.slice(0, 10))
    setFilters({ dateFrom: d.dateFrom, dateTo: d.dateTo })
  }, [])

  const applyCustom = useCallback(() => {
    setPeriod('custom')
    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999)
    setFilters({ dateFrom: from.toISOString(), dateTo: to.toISOString() })
  }, [dateFrom, dateTo])

  const resetToToday = useCallback(() => {
    setPeriod('day')
    const d = calcPeriodDates('day')
    setDateFrom(d.dateFrom.slice(0, 10))
    setDateTo(d.dateTo.slice(0, 10))
    setFilters({ dateFrom: d.dateFrom, dateTo: d.dateTo })
  }, [])

  const { data: statsResult } = useQuery({
    queryKey: ['purchase-stats', branchId],
    queryFn: () => getPurchaseStats(branchId || undefined),
    staleTime: 0,
  })

  const { data: reportResult, isLoading } = useQuery({
    queryKey: ['purchase-report', branchId, filters],
    queryFn: () => getPurchaseReport(branchId || undefined, filters.dateFrom, filters.dateTo),
    staleTime: 0,
  })

  const stats = statsResult?.success ? statsResult.data : null
  const purchases = (reportResult?.success ? reportResult.data : []) ?? []

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <ShoppingCart className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Totales</p>
              <p className="text-lg font-bold">{stats.approvedCount + stats.pendingCount + stats.cancelledCount}</p>
              <p className="text-[10px] text-muted-foreground">compras</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-bold">{stats.pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Bs {stats.pendingAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <CheckCircle className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Aprobadas</p>
              <p className="text-lg font-bold">{stats.approvedCount}</p>
              <p className="text-[10px] text-muted-foreground">Bs {stats.approvedAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Canceladas</p>
              <p className="text-lg font-bold">{stats.cancelledCount}</p>
              <p className="text-[10px] text-muted-foreground">Bs {stats.cancelledAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/50">
              {([['day', CalendarDays, 'Hoy'] as const, ['month', CalendarRange, 'Este Mes'] as const, ['year', Calendar, 'Este Año'] as const]).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPeriod(key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      period === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={() => {
                  const data = purchases.map((p) => ({
                    '#': p.number.toString().padStart(4, '0'),
                    Sucursal: p.branches?.name ?? '—',
                    Proveedor: p.supplier_name ?? '—',
                    Total: p.total.toFixed(2),
                    Estado: statusLabels[p.status] ?? p.status,
                    Fecha: new Date(p.created_at).toLocaleDateString(),
                  }))
                  exportToExcel(data, `compras-${dateFrom}-${dateTo}`, 'Compras')
                }}>
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
              </Button>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{purchases.length}</span> compra(s) —{' '}
                <span className="font-semibold text-foreground">Bs {purchases.reduce((s, p) => s + p.total, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPeriod('custom') }}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPeriod('custom') }}
                className="h-8"
              />
            </div>
            <Button size="sm" onClick={applyCustom}>Filtrar</Button>
            {period !== 'day' && (
              <Button size="sm" variant="outline" onClick={resetToToday}>Hoy</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">#{p.number.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{p.branches?.name ?? '—'}</TableCell>
                  <TableCell>{p.supplier_name ?? '—'}</TableCell>
                  <TableCell className="font-semibold">Bs {p.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${statusBadge[p.status] ?? ''}`}>
                      {statusLabels[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.created_by_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(p.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    <br />
                    <span className="text-xs">
                      {new Date(p.created_at).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
