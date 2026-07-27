'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getTransfers, sendTransfer, completeTransfer, cancelTransfer } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
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
import { Eye, Plus, ChevronLeft, ChevronRight, Send, Check, X } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'

const PAGE_SIZE = 15

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  sent: { label: 'Enviado', variant: 'default' },
  received: { label: 'Recibido', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export function TransferList() {
  const queryClient = useQueryClient()
  const { branchId } = useBranch()
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [branchId])

  const { data: result, isLoading } = useQuery({
    queryKey: ['transfers', branchId, page],
    queryFn: () => getTransfers({ branchId: branchId || undefined, page, pageSize: PAGE_SIZE }),
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
