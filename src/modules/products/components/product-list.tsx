'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getProductsByCategory, deleteProduct, toggleProductStatus } from '../actions'
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
import { Pencil, Power, Trash2, Package, DollarSign, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Image from 'next/image'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { ProductPricesDialog } from './product-prices-dialog'
import { useShowCost } from '@/shared/lib/use-role'
import { useBranch } from '@/shared/contexts/branch-context'

interface ProductListProps {
  brandId: string
  categoryId: string
  onEdit: (id: string) => void
}

const PAGE_SIZE = 15

export function ProductList({ brandId, categoryId, onEdit }: ProductListProps) {
  const showCost = useShowCost()
  const { branchId } = useBranch()
  const queryClient = useQueryClient()
  const [pricesProduct, setPricesProduct] = useState<{ id: string; name: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [brandId, categoryId, searchQuery])

  const { data: result, isLoading } = useQuery({
    queryKey: ['products', brandId, categoryId, branchId],
    queryFn: () => getProductsByCategory(brandId, categoryId),
    staleTime: 0,
  })

  const handleDelete = async (id: string, name: string) => {
    const res = await deleteProduct(id, brandId, categoryId)
    setDeleteTarget(null)
    if (res.success) {
      toast.success(`Producto "${name}" eliminado`)
      queryClient.invalidateQueries({ queryKey: ['products', brandId, categoryId] })
    } else {
      toast.error(res.message)
    }
  }

  const handleToggle = async (id: string) => {
    await toggleProductStatus(id, brandId, categoryId)
    queryClient.invalidateQueries({ queryKey: ['products', brandId, categoryId] })
  }

  const products = (result?.success ? (result.data ?? []) : []) as Array<{
    id: string
    name: string
    cost: number
    image_url: string | null
    is_active: boolean
    inventory_items: Array<{ branch_id: string; sale_price: number }>
  }>

  const getBranchPrice = (product: (typeof products)[number]): number | null => {
    if (!branchId) return null
    const item = product.inventory_items?.find(i => i.branch_id === branchId)
    return item ? Number(item.sale_price) : null
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [products, searchQuery])

  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input for Products */}
      {products.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-card/60"
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden sm:block rounded-xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-14" />
              <TableHead>Producto</TableHead>
              {showCost && <TableHead className="w-28">Costo Base</TableHead>}
              <TableHead className="w-28">Precio</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-36 text-right pr-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={showCost ? 6 : 5} className="text-center text-muted-foreground py-10">
                  {searchQuery ? `No se encontraron productos para "${searchQuery}"` : 'No hay productos en esta categoría. Crea el primero.'}
                </TableCell>
              </TableRow>
            )}
            {paginatedProducts.map((product) => (
              <TableRow key={product.id} className="hover:bg-accent/40 transition-colors">
                <TableCell>
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover border border-border/60"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border/40">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-semibold text-sm text-foreground">{product.name}</TableCell>
                {showCost && <TableCell className="font-mono text-sm">Bs {Number(product.cost).toFixed(2)}</TableCell>}
                <TableCell className="font-mono text-sm">
                  {getBranchPrice(product) !== null ? `Bs ${getBranchPrice(product)!.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5 font-medium">
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(product.id)} title="Editar producto">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleToggle(product.id)} title="Activar / Desactivar">
                      <Power className={`h-3.5 w-3.5 ${product.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => setPricesProduct({ id: product.id, name: product.name })} title="Precios por sucursal">
                      <DollarSign className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({ id: product.id, name: product.name })} title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Responsive Cards */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filteredProducts.length === 0 && (
          <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl bg-card">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay productos en esta categoría.'}
            </p>
          </div>
        )}

        {paginatedProducts.map((product) => (
          <div key={product.id} className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3">
            <div className="flex items-start gap-3">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover border border-border/60 shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground break-words">{product.name}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-[10px] px-2">
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {getBranchPrice(product) !== null && (
                    <span className="text-xs font-mono font-semibold text-primary">
                      Bs {getBranchPrice(product)!.toFixed(2)}
                    </span>
                  )}
                  {showCost && (
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      Costo: Bs {Number(product.cost).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium gap-1 text-primary border-primary/30"
                onClick={() => setPricesProduct({ id: product.id, name: product.name })}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Precios por Sucursal
              </Button>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(product.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(product.id)}>
                  <Power className={`h-3.5 w-3.5 ${product.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ id: product.id, name: product.name })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filteredProducts.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1 text-xs">
          <p className="text-muted-foreground">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} · Página {page} de {totalPages}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.name)}
        title="Eliminar producto"
        description={deleteTarget ? `¿Eliminar el producto "${deleteTarget.name}"? Esta acción no se puede deshacer.` : ''}
      />

      {pricesProduct && (
        <ProductPricesDialog
          productId={pricesProduct.id}
          productName={pricesProduct.name}
          open={!!pricesProduct}
          onOpenChange={(open) => { if (!open) setPricesProduct(null) }}
        />
      )}
    </div>
  )
}

