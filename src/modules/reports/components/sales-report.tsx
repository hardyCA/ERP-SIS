'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSalesReport } from '../actions'
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
import { CalendarDays, CalendarRange, Calendar, FileSpreadsheet } from 'lucide-react'
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

export function SalesReport() {
  const { branchId } = useBranch()
  const [period, setPeriod] = useState<Period>('day')

  const today = toDateInput(new Date())
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string }>(() => {
    const d = calcPeriodDates('day')
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

  const { data: result, isLoading } = useQuery({
    queryKey: ['sales-report', branchId, filters],
    queryFn: () => getSalesReport(branchId || undefined, filters.dateFrom, filters.dateTo),
    staleTime: 0,
  })

  const sales = (result?.success ? result.data : []) ?? []
  const totalAmount = sales.reduce((sum, s) => sum + s.total, 0)

  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    qr: 'QR / Transf.',
    mixed: 'Mixto',
    credit: 'Crédito',
  }

  const paymentBadge: Record<string, string> = {
    cash: 'success',
    qr: 'info',
    mixed: 'warning',
    credit: 'pending',
  }

  return (
    <div className="space-y-4">
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
                  const data = sales.map((s) => ({
                    '#': s.number.toString().padStart(4, '0'),
                    Sucursal: s.branches?.name ?? '—',
                    Cliente: s.customer_name ?? '—',
                    Total: s.total.toFixed(2),
                    Descuento: s.discount > 0 ? s.discount.toFixed(2) : '0.00',
                    'Tipo Pago': paymentLabels[s.payment_type] ?? s.payment_type,
                    Fecha: new Date(s.created_at).toLocaleDateString(),
                  }))
                  exportToExcel(data, `ventas-${dateFrom}-${dateTo}`, 'Ventas')
                }}>
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
              </Button>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{sales.length}</span> venta(s) —{' '}
                <span className="font-semibold text-foreground">Bs {totalAmount.toFixed(2)}</span>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">#{s.number.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{s.branches?.name ?? '—'}</TableCell>
                  <TableCell>{s.customer_name ?? '—'}</TableCell>
                  <TableCell>Bs {s.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={paymentBadge[s.payment_type] as never}>
                      {paymentLabels[s.payment_type] ?? s.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(s.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    <br />
                    <span className="text-xs">
                      {new Date(s.created_at).toLocaleTimeString('es-MX', {
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
