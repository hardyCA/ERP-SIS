'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInventoryReport } from '../actions'
import type { InventoryReportItem } from '../types'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { useShowCost, useCurrentUser } from '@/shared/lib/use-role'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { AlertTriangle, FileSpreadsheet, FileText, Printer, UserCircle } from 'lucide-react'
import { exportToExcel, exportInventoryPdf, printElement, type InventoryPdfBrand } from '@/shared/lib/export'

interface GroupedCategory {
  name: string
  items: InventoryReportItem[]
}

interface GroupedBrand {
  brand: string
  categories: GroupedCategory[]
}

export function InventoryReport() {
  const showCost = useShowCost()
  const { branchId, branchName } = useBranch()
  const { name: currentUser } = useCurrentUser()

  const { data: result, isLoading } = useQuery({
    queryKey: ['inventory-report', branchId],
    queryFn: () => getInventoryReport(branchId || undefined),
    staleTime: 0,
  })

  const items = useMemo(
    () => (result?.success ? result.data : []) ?? [],
    [result]
  )

  const grouped = useMemo<GroupedBrand[]>(() => {
    const brands = new Map<string, Map<string, InventoryReportItem[]>>()
    for (const item of items) {
      const brandKey = item.brand_name || 'Sin marca'
      const catKey = item.category_name || 'Sin categoría'
      if (!brands.has(brandKey)) brands.set(brandKey, new Map())
      const cats = brands.get(brandKey)!
      if (!cats.has(catKey)) cats.set(catKey, [])
      cats.get(catKey)!.push(item)
    }
    return [...brands.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, cats]) => ({
        brand,
        categories: [...cats.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, its]) => ({ name, items: its })),
      }))
  }, [items])

  const totalValue = items.reduce((sum, i) => sum + i.cost * i.quantity, 0)
  const totalPotential = items.reduce((sum, i) => sum + i.sale_price * i.quantity, 0)
  const lowStock = items.filter(i => i.quantity <= 5)

  const generatedAt = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  const buildPdfBrands = (): InventoryPdfBrand[] =>
    grouped.map((b) => ({
      brand: b.brand,
      categories: b.categories.map((c) => ({
        name: c.name,
        items: c.items.map((i) => ({
          name: `${i.product_name}${i.unit ? ` (${i.unit})` : ''}`,
          quantity: i.quantity,
          cost: i.cost,
          sale_price: i.sale_price,
        })),
      })),
    }))

  const exportPdf = () => {
    exportInventoryPdf({
      title: 'Reporte de Inventario',
      subtitle: `Stock actual por marca y categoría`,
      brands: buildPdfBrands(),
      showCost,
      generatedBy: currentUser,
      generatedAt,
      branchName: branchName || 'Todas',
      signatures: [
        { label: 'Elaborado por', name: currentUser },
        { label: 'Revisado por' },
        { label: 'Autorizado por' },
      ],
      filename: `inventario-por-marca-${generatedAt.replace(/ /g, '-')}`,
    })
  }

  const exportExcel = () => {
    const groupedForExcel: Record<string, unknown>[] = []
    for (const b of grouped) {
      for (const c of b.categories) {
        for (const i of c.items) {
          groupedForExcel.push({
            Marca: b.brand,
            Categoría: c.name,
            Producto: `${i.product_name}${i.unit ? ` (${i.unit})` : ''}`,
            Stock: i.quantity,
            ...(showCost ? { Costo: i.cost.toFixed(2) } : {}),
            'Precio Venta': i.sale_price.toFixed(2),
            ...(showCost ? { 'Valor Total': (i.cost * i.quantity).toFixed(2) } : {}),
          })
        }
      }
    }
    exportToExcel(groupedForExcel, 'inventario-por-marca', 'Inventario')
  }

  const subtitle = `Sucursal: ${branchName || 'Todas'} · Generado por: ${currentUser} · Fecha: ${generatedAt}`

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

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={exportExcel}>
          <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={exportPdf}>
          <FileText className="h-3 w-3 mr-1" /> PDF
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px]"
          onClick={() => printElement('inventory-report-print')}>
          <Printer className="h-3 w-3 mr-1" /> Imprimir
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
                <TableHead>Marca / Categoría</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Stock</TableHead>
                {showCost && <TableHead>Costo</TableHead>}
                <TableHead>Precio Venta</TableHead>
                {showCost && <TableHead>Valor Total</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showCost ? 6 : 4} className="text-center text-muted-foreground py-8">Sin resultados</TableCell>
                </TableRow>
              )}
              {grouped.map((b) => (
                <GroupRows key={b.brand} brand={b} showCost={showCost} />
              ))}
            </TableBody>
          </Table>

          <div className="border-t px-4 py-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marcas</span>
              <span className="font-semibold">{grouped.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categorías</span>
              <span className="font-semibold">{grouped.reduce((s, b) => s + b.categories.length, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidades totales</span>
              <span className="font-semibold">{items.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            {showCost && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor inventario (costo)</span>
                <span className="font-semibold">Bs {totalValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor venta potencial</span>
              <span className="font-semibold">Bs {totalPotential.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            {subtitle}
          </div>
        </div>
      )}

      <div id="inventory-report-print" className="hidden">
        <h1>Reporte de Inventario</h1>
        <h2>{subtitle}</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              {showCost && <th>Costo</th>}
              <th>Precio Venta</th>
              {showCost && <th>Valor Total</th>}
            </tr>
          </thead>
          <tbody>
            {grouped.map((b) => (
              <PrintGroup key={b.brand} brand={b} showCost={showCost} />
            ))}
          </tbody>
        </table>
        <div className="summary">
          <div className="summary-row"><span>Marcas</span><span>{grouped.length}</span></div>
          <div className="summary-row"><span>Categorías</span><span>{grouped.reduce((s, b) => s + b.categories.length, 0)}</span></div>
          <div className="summary-row"><span>Unidades totales</span><span>{items.reduce((s, i) => s + i.quantity, 0)}</span></div>
          {showCost && <div className="summary-row"><span>Valor inventario (costo)</span><span>Bs {totalValue.toFixed(2)}</span></div>}
          <div className="summary-row"><span>Valor venta potencial</span><span>Bs {totalPotential.toFixed(2)}</span></div>
        </div>
        <div className="footer-info">
          Reporte generado por: <strong>{currentUser}</strong> · {generatedAt}
        </div>
        <div className="signature">
          <div className="signature-box">
            <div className="signature-line">Elaborado por<br />{currentUser}</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">Revisado por</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">Autorizado por</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GroupRows({ brand, showCost }: { brand: GroupedBrand; showCost: boolean }) {
  return (
    <>
      <TableRow className="bg-primary/10">
        <TableCell colSpan={showCost ? 6 : 4} className="py-2">
          <span className="text-sm font-semibold text-primary">{brand.brand}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {brand.categories.reduce((s, c) => s + c.items.length, 0)} producto(s)
          </span>
        </TableCell>
      </TableRow>
      {brand.categories.map((c) => {
        const catValue = c.items.reduce((s, i) => s + i.cost * i.quantity, 0)
        return (
          <GroupCategoryRows key={c.name} category={c} showCost={showCost} catValue={catValue} />
        )
      })}
      <TableRow>
        <TableCell colSpan={showCost ? 5 : 3} className="text-right text-xs font-medium text-muted-foreground">
          Total {brand.brand}
        </TableCell>
        {showCost && (
          <TableCell className="font-semibold text-xs">
            Bs {brand.categories.reduce((s, c) => s + c.items.reduce((x, i) => x + i.cost * i.quantity, 0), 0).toFixed(2)}
          </TableCell>
        )}
      </TableRow>
    </>
  )
}

function GroupCategoryRows({ category, showCost, catValue }: {
  category: GroupedCategory
  showCost: boolean
  catValue: number
}) {
  return (
    <>
      <TableRow className="bg-muted/40">
        <TableCell className="py-1.5 pl-10 text-xs font-medium text-muted-foreground" colSpan={showCost ? 6 : 4}>
          {category.name}
        </TableCell>
      </TableRow>
      {category.items.map((i) => (
        <TableRow key={i.product_id}>
          <TableCell className="pl-10">
            <span className="flex items-center gap-1.5">
              {i.quantity <= 5 && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              {i.product_name}
              {i.unit && <span className="text-[10px] text-muted-foreground font-normal">({i.unit})</span>}
            </span>
          </TableCell>
          <TableCell>
            <Badge variant={i.quantity <= 5 ? 'destructive' : 'default'}>{i.quantity}{i.unit ? ` ${i.unit}` : ''}</Badge>
          </TableCell>
          {showCost && <TableCell>Bs {i.cost.toFixed(2)}</TableCell>}
          <TableCell>Bs {i.sale_price.toFixed(2)}</TableCell>
          {showCost && <TableCell className="font-mono">Bs {(i.cost * i.quantity).toFixed(2)}</TableCell>}
        </TableRow>
      ))}
      {showCost && (
        <TableRow className="bg-muted/10">
          <TableCell className="text-right text-xs italic text-muted-foreground" colSpan={5}>
            Subtotal {category.name}
          </TableCell>
          <TableCell className="text-xs font-medium">Bs {catValue.toFixed(2)}</TableCell>
        </TableRow>
      )}
    </>
  )
}

function PrintGroup({ brand, showCost }: { brand: GroupedBrand; showCost: boolean }) {
  return (
    <>
      <tr className="group-brand">
        <td colSpan={showCost ? 5 : 3}>{brand.brand}</td>
      </tr>
      {brand.categories.map((c) => (
        <PrintCategory key={c.name} category={c} showCost={showCost} />
      ))}
    </>
  )
}

function PrintCategory({ category, showCost }: { category: GroupedCategory; showCost: boolean }) {
  return (
    <>
      <tr className="group-category">
        <td colSpan={showCost ? 5 : 3}>{category.name}</td>
      </tr>
      {category.items.map((i) => (
        <tr key={i.product_id}>
          <td>{i.product_name}{i.unit ? ` (${i.unit})` : ''}</td>
          <td style={{ textAlign: 'center' }}>{i.quantity}{i.unit ? ` ${i.unit}` : ''}</td>
          {showCost && <td style={{ textAlign: 'right' }}>Bs {i.cost.toFixed(2)}</td>}
          <td style={{ textAlign: 'right' }}>Bs {i.sale_price.toFixed(2)}</td>
          {showCost && <td style={{ textAlign: 'right' }}>Bs {(i.cost * i.quantity).toFixed(2)}</td>}
        </tr>
      ))}
    </>
  )
}