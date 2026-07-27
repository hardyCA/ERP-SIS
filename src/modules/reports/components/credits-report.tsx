'use client'

import { useQuery } from '@tanstack/react-query'
import { getCreditReport } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { Timer, FileSpreadsheet } from 'lucide-react'
import { exportToExcel } from '@/shared/lib/export'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'

function daysBadge(days: number) {
  if (days <= 7) return 'text-success'
  if (days <= 15) return 'text-warning'
  if (days <= 30) return 'text-pending'
  return 'text-destructive font-semibold'
}

export function CreditsReport() {
  const { branchId } = useBranch()

  const { data: result, isLoading } = useQuery({
    queryKey: ['credit-report', branchId],
    queryFn: () => getCreditReport(branchId || undefined),
    staleTime: 0,
  })

  const credits = (result?.success ? result.data : []) ?? []

  const activeCredits = credits.filter(c => c.balance > 0)
  const totalPending = activeCredits.reduce((sum, c) => sum + c.balance, 0)
  const totalPaid = credits.filter(c => c.balance === 0).reduce((sum, c) => sum + c.total, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Créditos activos</div>
          <div className="text-2xl font-bold">{activeCredits.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Pendiente de cobro</div>
          <div className="text-2xl font-bold text-destructive">Bs {totalPending.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total pagado</div>
          <div className="text-2xl font-bold text-green-600">Bs {totalPaid.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 text-[11px]"
          onClick={() => {
            const data = credits.map((c) => ({
              '#': c.sale_number.toString().padStart(4, '0'),
              Cliente: c.customer_name ?? '—',
              Total: c.total.toFixed(2),
              Saldo: c.balance.toFixed(2),
              Pagos: c.payment_count,
              Estado: c.balance === 0 ? 'Pagado' : 'Pendiente',
              Días: c.days,
              Fecha: new Date(c.created_at).toLocaleDateString(),
            }))
            exportToExcel(data, 'creditos', 'Créditos')
          }}>
          <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venta #</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Pagos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {credits.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">#{c.sale_number.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{c.customer_name ?? '—'}</TableCell>
                  <TableCell>Bs {c.total.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">Bs {c.balance.toFixed(2)}</TableCell>
                  <TableCell>{c.payment_count}</TableCell>
                  <TableCell>
                    <Badge variant={c.balance === 0 ? 'secondary' : 'default'}>
                      {c.balance === 0 ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums', daysBadge(c.days))}>
                      <Timer className="h-3 w-3" />
                      {c.days}d
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
