'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPurchaseById, approvePurchase, cancelPurchase } from '../actions'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
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
import { Package, Printer, FileDown, Truck, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { exportPurchasePdf, printElement } from '@/shared/lib/export'

interface PurchaseDetailProps {
  purchaseId: string
}

export function PurchaseDetail({ purchaseId }: PurchaseDetailProps) {
  const queryClient = useQueryClient()
  const [actionLoading, setActionLoading] = useState<'approve' | 'cancel' | null>(null)
  const showCost = useShowCost()

  const { data: result, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => getPurchaseById(purchaseId),
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const purchase = result?.success ? result.data : null
  if (!purchase) {
    return <div className="text-center text-muted-foreground py-12">Compra no encontrada</div>
  }

  const items = (purchase.items ?? []) as Array<{
    id: string
    product_id: string
    quantity: number
    unit_cost: number
    subtotal: number
    products: { name: string; image_url: string | null } | null
  }>

  const purchaseData = purchase as Record<string, unknown>
  const expenses = (purchaseData.expenses ?? []) as Array<{ id: string; description: string; cost: number }>

  const handleApprove = async () => {
    setActionLoading('approve')
    const res = await approvePurchase(purchaseId)
    setActionLoading(null)
    if (res.success) {
      toast.success('Compra aprobada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleCancel = async () => {
    setActionLoading('cancel')
    const res = await cancelPurchase(purchaseId)
    setActionLoading(null)
    if (res.success) {
      toast.success('Compra cancelada')
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    } else {
      toast.error(res.message)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div id="purchase-detail" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <CardTitle>Compra #{purchase.number?.toString().padStart(4, '0') ?? '—'}</CardTitle>
              <Badge variant="outline" className={`text-[11px] ${statusColors[purchase.status] ?? ''}`}>
                {purchase.status === 'pending' ? 'Pendiente' : purchase.status === 'approved' ? 'Aprobado' : 'Cancelado'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {purchase.status === 'pending' && (
                <>
                  <Button variant="default" size="sm" className="h-7 text-[11px]"
                    onClick={handleApprove} disabled={actionLoading === 'approve'}>
                    <CheckCircle className="h-3 w-3 mr-1" /> {actionLoading === 'approve' ? 'Aprobando...' : 'Aprobar'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleCancel} disabled={actionLoading === 'cancel'}>
                    <XCircle className="h-3 w-3 mr-1" /> {actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar'}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                onClick={() => printElement('purchase-detail')}>
                <Printer className="h-3 w-3 mr-1" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px]"
                  onClick={() => {
                  const number = purchase.number?.toString().padStart(4, '0') ?? '—'
                  const branchesData = purchase.branches as Record<string, unknown> | undefined
                  exportPurchasePdf({
                    number,
                    date: new Date(purchase.created_at).toLocaleString(),
                    branch: branchesData?.name as string ?? '—',
                    branchAddress: (branchesData?.address as string) ?? '',
                    branchPhone: (branchesData?.phone as string) ?? '',
                    responsible: purchase.created_by_name ?? '—',
                    total: Number(purchase.total),
                    notes: purchase.notes as string | null,
                    items: (purchase.items ?? []).map((i: { products: { name: string } | null; quantity: number; unit_cost: number; subtotal: number }) => ({
                      product_name: i.products?.name ?? '—',
                      quantity: i.quantity,
                      unit_cost: Number(i.unit_cost),
                      subtotal: Number(i.subtotal),
                    })),
                  }, showCost)
                }}>
                <FileDown className="h-3 w-3 mr-1" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sucursal</span>
            <span className="font-medium">{purchase.branches?.name ?? '—'}</span>
          </div>
          {(() => {
            const s = purchaseData.suppliers as Record<string, unknown> | undefined
            return s?.name ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Proveedor</span>
                <span className="font-medium">{s.name as string}{s.document_id ? ` (ID: ${s.document_id as string})` : ''}</span>
              </div>
            ) : null
          })()}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Responsable</span>
            <span className="font-medium">{purchase.created_by_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span>{new Date(purchase.created_at).toLocaleString()}</span>
          </div>
          {purchase.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notas</span>
              <span>{purchase.notes}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">Bs {Number(purchase.total).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  {showCost && <TableHead>Costo Unit.</TableHead>}
                  {showCost && <TableHead>Subtotal</TableHead>}
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
                    <TableCell className="font-medium">{item.products?.name ?? '—'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    {showCost && <TableCell>Bs {Number(item.unit_cost).toFixed(2)}</TableCell>}
                    {showCost && <TableCell>Bs {Number(item.subtotal).toFixed(2)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showCost && expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos Operativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="w-32 text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-right font-mono">Bs {Number(exp.cost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
