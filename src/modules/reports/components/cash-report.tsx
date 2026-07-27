'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCashReport } from '../actions'
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

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  cash_sale: { label: 'Venta Contado', variant: 'default' },
  credit_payment: { label: 'Pago Crédito', variant: 'secondary' },
  manual_income: { label: 'Ingreso Manual', variant: 'outline' },
  manual_expense: { label: 'Gasto Manual', variant: 'destructive' },
  owner_withdrawal: { label: 'Retiro Propietario', variant: 'destructive' },
}

export function CashReport() {
  const { branchId } = useBranch()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string }>({})

  const { data: result, isLoading } = useQuery({
    queryKey: ['cash-report', branchId, filters],
    queryFn: () => getCashReport(branchId || undefined, filters.dateFrom, filters.dateTo),
    staleTime: 0,
  })

  const movements = (result?.success ? result.data : []) ?? []

  const positiveTypes = new Set(['cash_sale', 'credit_payment', 'manual_income'])
  const balance = movements.reduce((acc, m) => positiveTypes.has(m.type) ? acc + m.amount : acc - m.amount, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8" />
          </div>
          <Button size="sm" onClick={() => setFilters({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })}>
            Filtrar
          </Button>
          {(filters.dateFrom || filters.dateTo) && (
            <Button size="sm" variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); setFilters({}) }}>
              Limpiar
            </Button>
          )}
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
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {movements.map((m) => {
                const typeInfo = typeLabels[m.type] ?? { label: m.type, variant: 'secondary' as const }
                const isPositive = positiveTypes.has(m.type)

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">#{m.number}</TableCell>
                    <TableCell>
                      <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className={`font-mono font-medium ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
                      {isPositive ? '+' : '-'}Bs {Math.abs(m.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-60 truncate">{m.description ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Saldo calculado</span>
            <span className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              Bs {balance.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
