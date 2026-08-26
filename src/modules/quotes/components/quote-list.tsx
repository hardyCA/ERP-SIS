'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQuotes } from '../actions'
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
import { Plus, ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { quoteStatusConfig } from '../types'

const PAGE_SIZE = 15

export function QuoteList() {
  const { branchId } = useBranch()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'expired' | 'converted'>('draft')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  useEffect(() => { setPage(1) }, [branchId])

  const { data: result, isLoading } = useQuery({
    queryKey: ['quotes', branchId, status, appliedFrom, appliedTo, page],
    queryFn: () => getQuotes({
      branchId: branchId || undefined,
      status,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 0,
  })

  const quotes = Array.isArray(result?.data) ? result.data : []
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

  const statusTabs = [
    { value: 'draft' as const, label: 'Borrador' },
    { value: 'sent' as const, label: 'Enviada' },
    { value: 'accepted' as const, label: 'Aceptada' },
    { value: 'expired' as const, label: 'Expirada' },
    { value: 'converted' as const, label: 'Convertida' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === tab.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
          <Link href="/quotes/new">
            <Button size="sm" className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva Cotización
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-28">Vence</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {hasFilters
                        ? 'No hay cotizaciones en este rango de fechas'
                        : 'No hay cotizaciones registradas'}
                    </TableCell>
                  </TableRow>
                )}
                {quotes.map((q: Record<string, unknown>) => {
                  const cfg = quoteStatusConfig[q.status as string] ?? { label: q.status as string, variant: 'outline' as const }
                  const isConverted = q.status === 'converted'
                  return (
                    <TableRow key={q.id as string} className={isConverted ? 'opacity-60' : ''}>
                      <TableCell className="font-mono text-xs">#{(q.number as number)?.toString().padStart(4, '0') ?? (q.id as string).slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{((q.branches as Record<string, unknown>)?.name as string) ?? '—'}</TableCell>
                      <TableCell className="font-mono text-sm">Bs {Number(q.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                        {isConverted && (q.converted_to_sale_id as string) && (
                          <Badge variant="default" className="ml-1.5 text-[10px]">
                            Venta #{(q.converted_to_sale_id as string).slice(0, 8)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                        {q.customers
                          ? ((q.customers as Record<string, unknown>)?.name as string) ?? (q.customer_name as string) ?? '—'
                          : (q.customer_name as string) ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(q.created_by_name as string) ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(q.created_at as string).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {q.expires_at ? new Date(q.expires_at as string).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Link href={`/quotes/${q.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
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
              {total} cotización{total !== 1 ? 'es' : ''} · Página {page} de {totalPages}
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