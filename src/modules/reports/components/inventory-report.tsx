'use client'

import { useQuery } from '@tanstack/react-query'
import { getInventoryReport } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { useShowCost } from '@/shared/lib/use-role'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { exportToExcel } from '@/shared/lib/export'

export function InventoryReport() {
  const showCost = useShowCost()
  const { branchId } = useBranch()

  const { data: result, isLoading } = useQuery({
    queryKey: ['inventory-report', branchId],
    queryFn: () => getInventoryReport(branchId || undefined),
    staleTime: 0,
  })

  const items = (result?.success ? result.data : []) ?? []

  const totalValue = items.reduce((sum, i) => sum + i.cost * i.quantity, 0)
  const totalPotential = items.reduce((sum, i) => sum + i.sale_price * i.quantity, 0)
  const lowStock = items.filter(i => i.quantity <= 5)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Productos en inventario</div>
          <div className="text-2xl font-bold">{items.length}</div>
        </div>
        {showCost && (
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Valor inventario (costo)</div>
            <div className="text-2xl font-bold">Bs {totalValue.toFixed(2)}</div>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Valor venta potencial</div>
          <div className="text-2xl font-bold">Bs {totalPotential.toFixed(2)}</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-destructive/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            {lowStock.length} producto(s) con stock bajo
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 text-[11px]"
          onClick={() => {
            const data = items.map((i) => ({
              Producto: i.product_name,
              Marca: i.brand_name,
              Categoría: i.category_name,
              Stock: i.quantity,
              ...(showCost ? { Costo: i.cost.toFixed(2) } : {}),
              'Precio Venta': i.sale_price.toFixed(2),
              ...(showCost ? { 'Valor Total': (i.cost * i.quantity).toFixed(2) } : {}),
            }))
            exportToExcel(data, 'inventario', 'Inventario')
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
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                {showCost && <TableHead>Costo</TableHead>}
                <TableHead>Precio Venta</TableHead>
                {showCost && <TableHead>Valor Total</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showCost ? 7 : 5} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {items.map((i) => (
                <TableRow key={i.product_id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {i.quantity <= 5 && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                    {i.product_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.brand_name}</TableCell>
                  <TableCell className="text-muted-foreground">{i.category_name}</TableCell>
                  <TableCell>
                    <Badge variant={i.quantity <= 5 ? 'destructive' : 'default'}>{i.quantity}</Badge>
                  </TableCell>
                  {showCost && <TableCell>Bs {i.cost.toFixed(2)}</TableCell>}
                  <TableCell>Bs {i.sale_price.toFixed(2)}</TableCell>
                  {showCost && <TableCell className="font-mono">Bs {(i.cost * i.quantity).toFixed(2)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
