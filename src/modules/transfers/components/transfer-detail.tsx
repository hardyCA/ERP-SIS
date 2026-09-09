'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getTransferById, sendTransfer, completeTransfer, cancelTransfer } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { useShowCost } from '@/shared/lib/use-role'
import { Package, Send, Check, X, ArrowLeft, Printer } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { Switch } from '@/shared/components/ui/switch'
import { exportTransferPdf } from '@/shared/lib/export'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  sent: { label: 'Enviado', variant: 'default' },
  received: { label: 'Recibido', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

interface TransferDetailProps {
  transferId: string
}

export function TransferDetail({ transferId }: TransferDetailProps) {
  const queryClient = useQueryClient()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const isAdmin = useShowCost()
  const [showCost, setShowCost] = useState(true)

  const { data: result, isLoading } = useQuery({
    queryKey: ['transfer', transferId],
    queryFn: () => getTransferById(transferId),
    staleTime: 0,
  })

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
  }

  const transfer = result?.success ? result.data : null
  if (!transfer) return <div className="text-center text-muted-foreground py-12">Traspaso no encontrado</div>

  const items = (transfer.items ?? []) as Array<{
    id: string
    product_id: string
    quantity: number
    unit_cost: number
    products: { name: string; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null
  }>

  const getUnitLabel = (product: (typeof items)[number]['products']): string | null => {
    const u = product?.units_of_measure
    if (!u) return null
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name
  }

  const statusInfo = statusLabels[transfer.status as string] ?? { label: transfer.status as string, variant: 'secondary' as const }

  const handleSend = async () => {
    const res = await sendTransfer(transferId)
    if (res.success) {
      toast.success('Traspaso enviado')
      queryClient.invalidateQueries({ queryKey: ['transfer', transferId] })
    } else toast.error(res.message)
  }

  const handleReceive = async () => {
    const res = await completeTransfer(transferId)
    if (res.success) {
      toast.success('Traspaso recibido')
      queryClient.invalidateQueries({ queryKey: ['transfer', transferId] })
    } else toast.error(res.message)
  }

  const handleCancel = async () => {
    setShowCancelConfirm(false)
    const res = await cancelTransfer(transferId)
    if (res.success) {
      toast.success('Traspaso cancelado')
      queryClient.invalidateQueries({ queryKey: ['transfer', transferId] })
    } else toast.error(res.message)
  }

  return (
    <div className="space-y-6">
      <Link href="/transfers" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a traspasos
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Traspaso #{((transfer.number as number)?.toString().padStart(4, '0')) ?? (transfer.id as string).slice(0, 8)}</CardTitle>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={showCost}
                    onCheckedChange={setShowCost}
                    className="h-4 w-7"
                  />
                  <span>Costos</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await getTransferById(transferId)
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
                  await exportTransferPdf({
                    number: (t.number as number)?.toString().padStart(4, '0') ?? transferId.slice(0, 8),
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
                      return {
                        product_name: p?.name ?? '—',
                        unit: p?.units_of_measure?.abbreviation ?? null,
                        quantity: Number(i.quantity),
                        unit_cost: Number(i.unit_cost),
                      }
                    }),
                  }, showCost)
                }}
              >
                <Printer className="h-4 w-4" /> PDF
              </Button>
              <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">{statusInfo.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origen</span>
            <span className="font-medium">{transfer.from_branch?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destino</span>
            <span className="font-medium">{transfer.to_branch?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Creado por</span>
            <span className="font-medium">{transfer.created_by_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Enviado por</span>
            <span className="font-medium">{transfer.sent_by_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recibido por</span>
            <span className="font-medium">{transfer.received_by_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{new Date(transfer.created_at).toLocaleString()}</span>
          </div>
          {transfer.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notas</span>
              <span>{transfer.notes}</span>
            </div>
          )}
          {(transfer.status === 'pending' || transfer.status === 'sent') && (
            <div className="flex gap-2 pt-4 border-t">
              {transfer.status === 'pending' && (
                <Button onClick={handleSend}><Send className="h-4 w-4" /> Enviar</Button>
              )}
              {transfer.status === 'sent' && (
                <Button onClick={handleReceive}><Check className="h-4 w-4" /> Recibir</Button>
              )}
              <Button variant="outline" onClick={() => setShowCancelConfirm(true)}><X className="h-4 w-4" /> Cancelar</Button>
            </div>
          )}

          <ConfirmDialog
            open={showCancelConfirm}
            onOpenChange={setShowCancelConfirm}
            onConfirm={handleCancel}
            title="Cancelar traspaso"
            description="¿Cancelar este traspaso?"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Productos ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  {showCost && <TableHead>Costo Unit.</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="w-10">
                      {item.products?.image_url ? (
                        <Image src={item.products.image_url} alt={item.products.name} width={32} height={32} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.products?.name ?? '—'}{getUnitLabel(item.products) && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">({getUnitLabel(item.products)})</span>
                    )}</TableCell>
                    <TableCell>{item.quantity}{getUnitLabel(item.products) ? ` ${getUnitLabel(item.products)}` : ''}</TableCell>
                    {showCost && <TableCell>Bs {Number(item.unit_cost).toFixed(2)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
