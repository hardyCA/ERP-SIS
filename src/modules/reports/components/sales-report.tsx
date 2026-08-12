'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSalesReport, getSalesSellers } from '../actions'
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CalendarDays, CalendarRange, Calendar, FileSpreadsheet, FileText, Printer, UserCircle } from 'lucide-react'
import { exportToExcel, exportToPdf, printElement } from '@/shared/lib/export'

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
  const [sellerId, setSellerId] = useState('all')

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
    queryKey: ['sales-report', branchId, filters, sellerId],
    queryFn: () => getSalesReport(branchId || undefined, filters.dateFrom, filters.dateTo, sellerId === 'all' ? undefined : sellerId),
    staleTime: 0,
  })

  const { data: sellersResult } = useQuery({
    queryKey: ['sales-sellers', branchId],
    queryFn: () => getSalesSellers(branchId || undefined),
    staleTime: 60_000,
  })

  const sellers = (sellersResult?.success ? sellersResult.data : []) ?? []

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

  const totalDescuento = sales.reduce((sum, s) => sum + s.discount, 0)
  const subtotal = totalAmount + totalDescuento

  const sellerName = sellerId === 'all' ? 'Todos' : (sellers.find(s => s.id === sellerId)?.name ?? '')
  const subtitle = `Desde ${new Date(filters.dateFrom).toLocaleDateString('es-MX')} hasta ${new Date(filters.dateTo).toLocaleDateString('es-MX')} · Vendedor: ${sellerName}`

  const exportSalesPdf = () => {
    exportToPdf(
      'Reporte de Ventas',
      subtitle,
      [
        { header: '#', dataKey: '#' },
        { header: 'Vendedor', dataKey: 'Vendedor' },
        { header: 'Sucursal', dataKey: 'Sucursal' },
        { header: 'Cliente', dataKey: 'Cliente' },
        { header: 'Total', dataKey: 'Total' },
        { header: 'Tipo Pago', dataKey: 'Tipo Pago' },
        { header: 'Fecha', dataKey: 'Fecha' },
      ],
      sales.map((s) => ({
        '#': `#${s.number.toString().padStart(4, '0')}`,
        Vendedor: s.created_by_name ?? '—',
        Sucursal: s.branches?.name ?? '—',
        Cliente: s.customer_name ?? '—',
        Total: s.total.toFixed(2),
        'Tipo Pago': paymentLabels[s.payment_type] ?? s.payment_type,
        Fecha: new Date(s.created_at).toLocaleDateString('es-MX'),
      })),
      [
        { label: 'Ventas', value: sales.length.toString() },
        { label: 'Subtotal', value: `Bs ${subtotal.toFixed(2)}` },
        { label: 'Descuentos', value: `Bs ${totalDescuento.toFixed(2)}` },
        { label: 'Total neto', value: `Bs ${totalAmount.toFixed(2)}` },
      ],
      `reporte-ventas-${dateFrom}-${dateTo}`
    )
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
                    Vendedor: s.created_by_name ?? '—',
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
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={exportSalesPdf}>
                <FileText className="h-3 w-3 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={() => printElement('sales-report-print')}>
                <Printer className="h-3 w-3 mr-1" /> Imprimir
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Vendedor</label>
              <Select value={sellerId} onValueChange={(v) => setSellerId(v ?? 'all')}>
                <SelectTrigger size="sm" className="h-8 min-w-44">
                  <UserCircle className="h-4 w-4" />
                  <SelectValue>
                    {sellerId === 'all'
                      ? 'Todos'
                      : sellers.find(s => s.id === sellerId)?.name ?? 'Seleccionar'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div id="sales-report-print" className="hidden">
              <h1>Reporte de Ventas</h1>
              <h2>{subtitle}</h2>
              <div className="summary">
                <div className="summary-row"><span>Ventas</span><span>{sales.length}</span></div>
                <div className="summary-row"><span>Subtotal</span><span>Bs {subtotal.toFixed(2)}</span></div>
                <div className="summary-row"><span>Descuentos</span><span>Bs {totalDescuento.toFixed(2)}</span></div>
                <div className="summary-row total-row"><span>Total neto</span><span>Bs {totalAmount.toFixed(2)}</span></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendedor</th>
                    <th>Sucursal</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Tipo Pago</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td>#{s.number.toString().padStart(4, '0')}</td>
                      <td>{s.created_by_name ?? '—'}</td>
                      <td>{s.branches?.name ?? '—'}</td>
                      <td>{s.customer_name ?? '—'}</td>
                      <td>Bs {s.total.toFixed(2)}</td>
                      <td>{paymentLabels[s.payment_type] ?? s.payment_type}</td>
                      <td>{new Date(s.created_at).toLocaleDateString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vendedor</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">#{s.number.toString().padStart(4, '0')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.created_by_name ?? '—'}</TableCell>
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
            {sales.length > 0 && (
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell colSpan={4} className="text-right">Total neto</TableCell>
                  <TableCell>Bs {totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  )
}
