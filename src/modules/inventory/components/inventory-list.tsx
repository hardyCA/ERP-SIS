'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { getInventory, updateSalePrice } from '../actions'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { AlertTriangle, ChevronLeft, ChevronRight, Search, Pencil, Check, X, Warehouse } from 'lucide-react'
import { useShowCost } from '@/shared/lib/use-role'

const PAGE_SIZE = 15

interface InventoryListProps {
  onAdjust: (productId: string, productName: string, currentQty: number, branchId: string) => void
  branchId: string
  brandId?: string
  categoryId?: string
}

export function InventoryList({ onAdjust, branchId, brandId, categoryId }: InventoryListProps) {
  const showCost = useShowCost()
  const queryClient = useQueryClient()
  const [editPrice, setEditPrice] = useState<{ productId: string; value: string } | null>(null)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const hasFilters = !!brandId && !!categoryId

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [brandId, categoryId, searchQuery])

  const { data: result, isLoading } = useQuery({
    queryKey: ['inventory', branchId, brandId, categoryId],
    queryFn: () => getInventory(branchId, brandId, categoryId),
    enabled: !!branchId && hasFilters,
    staleTime: 0,
  })

  const handleSavePrice = async (productId: string) => {
    if (!editPrice || !branchId) return
    const formData = new FormData()
    formData.set('product_id', productId)
    formData.set('branch_id', branchId)
    formData.set('sale_price', editPrice.value)
    const res = await updateSalePrice(formData)
    if (res.success) {
      toast.success('Precio de venta actualizado')
      queryClient.invalidateQueries({ queryKey: ['inventory', branchId, brandId, categoryId] })
      setEditPrice(null)
    } else {
      toast.error(res.message)
    }
  }

  const items = (Array.isArray(result?.data) ? result.data : []) as Array<Record<string, unknown>>

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return items.filter((item) => {
      const product = item.products as Record<string, unknown> | undefined
      const productName = (product?.name as string) ?? ''
      return productName.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [items, searchQuery])

  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))

  return (
    <div className="space-y-4">
      {!branchId && (
        <div className="text-center text-muted-foreground py-12 border border-dashed rounded-2xl bg-muted/20">
          <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Selecciona una sucursal para ver su inventario</p>
        </div>
      )}

      {branchId && !hasFilters && (
        <div className="rounded-2xl border border-dashed p-8 text-center bg-card/60">
          <div className="text-muted-foreground mb-4 text-sm font-medium">Selecciona una marca y una categoría para consultar inventario</div>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              Marca
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
              Categoría
            </span>
          </div>
        </div>
      )}

      {isLoading && branchId && hasFilters && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {branchId && hasFilters && !isLoading && (
        <div className="space-y-4">
          {/* Buscador de Producto en Inventario */}
          {items.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-card/60"
              />
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Stock Actual</TableHead>
                  {showCost && <TableHead>Costo Base</TableHead>}
                  <TableHead>Precio de Venta</TableHead>
                  <TableHead className="w-28 text-right pr-4">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showCost ? 7 : 6} className="text-center text-muted-foreground py-10">
                      {searchQuery ? `No se encontraron productos para "${searchQuery}"` : 'No hay inventario registrado en esta categoría.'}
                    </TableCell>
                  </TableRow>
                )}
                {paginatedItems.map((item: Record<string, unknown>) => {
                  const product = item.products as Record<string, unknown> | undefined
                  const productName = (product?.name as string) ?? '—'
                  const productId = item.product_id as string
                  const qty = item.quantity as number
                  const price = item.sale_price as number
                  const isLowStock = qty <= 5

                  return (
                    <TableRow key={productId} className="hover:bg-accent/40 transition-colors">
                      <TableCell className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        {productName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {((product?.brands as Record<string, unknown> | undefined)?.name as string) ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {((product?.categories as Record<string, unknown> | undefined)?.name as string) ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isLowStock ? 'destructive' : 'default'} className="font-mono text-xs px-2.5">
                          {qty} unidades
                        </Badge>
                      </TableCell>
                      {showCost && <TableCell className="font-mono text-xs">Bs {Number(product?.cost ?? 0).toFixed(2)}</TableCell>}
                      <TableCell>
                        {editPrice?.productId === productId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Bs</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-7 w-20 text-xs font-mono"
                              value={editPrice.value}
                              onChange={(e) => setEditPrice({ productId, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(productId)
                                if (e.key === 'Escape') setEditPrice(null)
                              }}
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleSavePrice(productId)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditPrice(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="hover:text-primary transition-colors font-mono text-xs font-semibold cursor-pointer inline-flex items-center gap-1 group"
                            onClick={() => setEditPrice({ productId, value: String(price) })}
                            title="Haz clic para editar el precio de venta"
                          >
                            <span>{price > 0 ? `Bs ${Number(price).toFixed(2)}` : <span className="text-muted-foreground italic font-normal">Establecer precio</span>}</span>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium border-border/80"
                          onClick={() => onAdjust(productId, productName, qty, branchId)}
                        >
                          Ajustar Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredItems.length === 0 && (
              <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl bg-card">
                <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">
                  {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay productos en este filtro.'}
                </p>
              </div>
            )}

            {paginatedItems.map((item: Record<string, unknown>) => {
              const product = item.products as Record<string, unknown> | undefined
              const productName = (product?.name as string) ?? '—'
              const productId = item.product_id as string
              const qty = item.quantity as number
              const price = item.sale_price as number
              const isLowStock = qty <= 5

              return (
                <div key={productId} className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-bold text-sm text-foreground break-words flex items-center gap-1.5">
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        <span>{productName}</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {((product?.brands as Record<string, unknown> | undefined)?.name as string) ?? '-'} • {((product?.categories as Record<string, unknown> | undefined)?.name as string) ?? '-'}
                      </p>
                    </div>
                    <Badge variant={isLowStock ? 'destructive' : 'default'} className="font-mono text-xs shrink-0">
                      Stock: {qty}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Precio Venta</span>
                      {editPrice?.productId === productId ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 w-20 text-xs font-mono"
                            value={editPrice.value}
                            onChange={(e) => setEditPrice({ productId, value: e.target.value })}
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleSavePrice(productId)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="font-mono font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                          onClick={() => setEditPrice({ productId, value: String(price) })}
                        >
                          <span>{price > 0 ? `Bs ${Number(price).toFixed(2)}` : 'Sin precio'}</span>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium"
                      onClick={() => onAdjust(productId, productName, qty, branchId)}
                    >
                      Ajustar Stock
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {filteredItems.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-1 text-xs pt-1">
              <p className="text-muted-foreground">
                {filteredItems.length} producto{filteredItems.length !== 1 ? 's' : ''} · Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                  disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground mx-1">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                  disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}