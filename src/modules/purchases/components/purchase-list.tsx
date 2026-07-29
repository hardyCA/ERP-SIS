'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPurchases } from '../actions'
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

export function PurchaseList() {
  const { branchId } = useBranch()
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId])

  const { data: result, isLoading } = useQuery({
    queryKey: ['purchases', branchId, appliedFrom, appliedTo, page],
    queryFn: () => getPurchases({
      branchId: branchId || undefined,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 0,
  })

  const purchases = Array.isArray(result?.data) ? result.data : []
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card p-3 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold sm:hidden">Filtros de Fecha</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground hidden sm:inline">Desde</label>
            <Input type="date" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 w-32 sm:w-36 text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground hidden sm:inline">Hasta</label>
            <Input type="date" value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 w-32 sm:w-36 text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="default" className="h-8 text-xs px-3" onClick={applyFilters}>
              Filtrar
            </Button>
            {hasFilters && (
              <Button size="sm" variant="outline" className="h-8 text-xs px-2.5" onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <Link href="/purchases/new" className="block sm:inline-block">
            <Button size="sm" className="h-9 sm:h-8 text-xs w-full sm:w-auto font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva Compra
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
          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="max-w-28">Proveedor</TableHead>
                    <TableHead className="w-24">Total</TableHead>
                    <TableHead className="w-20">Estado</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="max-w-32">Notas</TableHead>
                    <TableHead className="w-28">Fecha</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {hasFilters ? 'No hay compras en este rango de fechas' : 'No hay compras registradas'}
                    </TableCell>
                  </TableRow>
                )}
                {purchases.map((p: Record<string, unknown>) => (
                  <TableRow key={p.id as string}>
                    <TableCell className="font-mono text-xs font-semibold">#{(p.number as number)?.toString().padStart(4, '0') ?? '—'}</TableCell>
                    <TableCell className="text-sm font-medium">{
                      ((p.branches as Record<string, unknown>)?.name as string) ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-28">
                      {((p.suppliers as Record<string, unknown> | undefined)?.name as string) ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-primary">Bs {Number(p.total).toFixed(2)}</TableCell>
                    <TableCell>{(() => {
                      const status = p.status as string
                      if (status === 'pending') return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pendiente</Badge>
                      if (status === 'approved') return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Aprobado</Badge>
                      if (status === 'cancelled') return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Cancelado</Badge>
                      return <Badge variant="secondary" className="text-[10px]">—</Badge>
                    })()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(p.created_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                      {(p.notes as string) ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at as string).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/purchases/${p.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm pt-1">
            <p className="text-xs text-muted-foreground">
              {total} compra{total !== 1 ? 's' : ''} · Página {page} de {totalPages}
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
