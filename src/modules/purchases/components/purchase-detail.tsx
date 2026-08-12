'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPurchaseById, approvePurchase, cancelPurchase, deletePurchase } from '../actions'
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/shared/components/ui/alert-dialog'
import { useShowCost } from '@/shared/lib/use-role'
import { Package, Printer, FileDown, Truck, CheckCircle, XCircle, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { exportPurchasePdf, printElement } from '@/shared/lib/export'

interface PurchaseDetailProps {
  purchaseId: string
  canManage?: boolean
  isAdmin?: boolean
}

export function PurchaseDetail({ purchaseId, canManage = false, isAdmin = false }: PurchaseDetailProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<'approve' | 'cancel' | 'delete' | null>(null)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'cancel' | 'delete' | null>(null)
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
    products: { name: string; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null
  }>

  const getUnitLabel = (product: (typeof items)[number]['products']): string | null => {
    const u = product?.units_of_measure
    if (!u) return null
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name
  }

  const purchaseData = purchase as Record<string, unknown>
  const expenses = (purchaseData.expenses ?? []) as Array<{ id: string; description: string; cost: number }>

  const runAction = async (action: 'approve' | 'cancel' | 'delete') => {
    setActionLoading(action)
    let res: { success: boolean; message: string }
    if (action === 'delete') {
      const fd = new FormData()
      fd.set('purchase_id', purchaseId)
      res = await deletePurchase(fd)
    } else {
      res = action === 'approve'
        ? await approvePurchase(purchaseId)
        : await cancelPurchase(purchaseId)
    }
    setActionLoading(null)

    if (res.success) {
      if (action === 'delete') {
        toast.success(res.message)
        queryClient.invalidateQueries({ queryKey: ['purchases'] })
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        router.push('/purchases')
        return
      }
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setConfirmAction(null)
    } else {
      toast.error(res.message)
      setConfirmAction(null)
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
              {purchase.status === 'pending' && canManage && (
                <>
                  <Link href={`/purchases/${purchaseId}/edit`}>
                    <Button variant="outline" size="sm" className="h-7 text-[11px]">
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  </Link>
                  <Button variant="default" size="sm" className="h-7 text-[11px]"
                    onClick={() => setConfirmAction('approve')} disabled={actionLoading === 'approve'}>
                    <CheckCircle className="h-3 w-3 mr-1" /> {actionLoading === 'approve' ? 'Aprobando...' : 'Aprobar'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setConfirmAction('cancel')} disabled={actionLoading === 'cancel'}>
                    <XCircle className="h-3 w-3 mr-1" /> {actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar'}
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmAction('delete')} disabled={actionLoading === 'delete'}>
                  <Trash2 className="h-3 w-3 mr-1" /> {actionLoading === 'delete' ? 'Eliminando...' : 'Eliminar'}
                </Button>
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
                    items: (purchase.items ?? []).map((i: { products: { name: string; units_of_measure: { name: string; abbreviation: string | null } | null } | null; quantity: number; unit_cost: number; subtotal: number }) => ({
                      product_name: (() => {
                        const p = i.products
                        const u = p?.units_of_measure
                        const unitLabel = u ? (u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name) : null
                        return p?.name ? `${p.name}${unitLabel ? ` (${unitLabel})` : ''}` : '—'
                      })(),
                      quantity: i.quantity,
                      unit_cost: Number(i.unit_cost),
                      subtotal: Number(i.subtotal),
                    })),
                    expenses: expenses.map(e => ({
                      description: e.description,
                      cost: Number(e.cost),
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
                    <TableCell className="font-medium">
                      {item.products?.name ?? '—'}
                      {getUnitLabel(item.products) && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({getUnitLabel(item.products)})</span>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}{getUnitLabel(item.products) ? ` ${getUnitLabel(item.products)}` : ''}</TableCell>
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

      {/* === CONFIRM ACTION === */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o && !actionLoading) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' && '¿Aprobar esta compra?'}
              {confirmAction === 'cancel' && '¿Cancelar esta compra?'}
              {confirmAction === 'delete' && '¿Eliminar esta compra?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve' && (
                <>
                  La compra <span className="font-semibold text-foreground">#{purchase.number?.toString().padStart(4, '0') ?? '—'}</span> pasará a estado aprobado.
                </>
              )}
              {confirmAction === 'cancel' && (
                <>
                  La compra <span className="font-semibold text-foreground">#{purchase.number?.toString().padStart(4, '0') ?? '—'}</span> pasará a estado cancelado. No afecta el stock (aún no aprobada).
                </>
              )}
              {confirmAction === 'delete' && (
                <>
                  Esta acción eliminará la compra <span className="font-semibold text-foreground">#{purchase.number?.toString().padStart(4, '0') ?? '—'}</span> permanentemente y no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
            {confirmAction === 'approve' && (
              <ul className="space-y-1.5 text-xs list-disc list-inside">
                <li>El stock de los productos se <span className="font-medium text-foreground">incrementará</span> en la sucursal.</li>
                <li>El costo promedio ponderado de los productos se <span className="font-medium text-foreground">actualizará</span>.</li>
              </ul>
            )}
            {confirmAction === 'delete' && purchase.status === 'approved' && (
              <ul className="space-y-1.5 text-xs list-disc list-inside">
                <li>El stock que aumentó esta compra se <span className="font-medium text-foreground">devolverá</span> a la sucursal.</li>
                <li>El costo promedio de los productos se <span className="font-medium text-foreground">recalculará</span>.</li>
              </ul>
            )}
            {confirmAction === 'delete' && purchase.status !== 'approved' && (
              <p className="text-xs">Es una proforma sin afectar stock, se elimina sin efectos en inventario.</p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancelar</AlertDialogCancel>
            <Button
              variant={confirmAction === 'cancel' ? 'outline' : 'destructive'}
              className={confirmAction === 'cancel' ? 'text-destructive border-destructive/30' : ''}
              disabled={!!actionLoading}
              onClick={() => confirmAction && runAction(confirmAction)}
            >
              {actionLoading === 'approve' && 'Aprobando...'}
              {actionLoading === 'cancel' && 'Cancelando...'}
              {actionLoading === 'delete' && 'Eliminando...'}
              {!actionLoading && (confirmAction === 'approve' ? 'Sí, aprobar' : confirmAction === 'cancel' ? 'Sí, cancelar' : 'Sí, eliminar')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
