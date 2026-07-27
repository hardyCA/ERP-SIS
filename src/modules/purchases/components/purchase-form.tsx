'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBrands } from '@/modules/brands/actions'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { getProductsByCategory } from '@/modules/products/actions'
import { createPurchase } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Package, Plus, ShoppingCart, Check, Folder, FolderOpen, Minus, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'

interface LineItem {
  product_id: string
  product_name: string
  image_url: string | null
  quantity: number
  unit_cost: number
}

interface ProductToAdd {
  id: string
  name: string
  image_url: string | null
  cost: number
}

export function PurchaseForm() {
  const router = useRouter()
  const { branchId } = useBranch()
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({})
  const [pendingCost, setPendingCost] = useState<Record<string, string>>({})

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 60000,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', selectedBrand],
    queryFn: () => getCategoriesByBrand(selectedBrand!),
    enabled: !!selectedBrand,
    staleTime: 60000,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-for-purchase', selectedBrand, selectedCategory],
    queryFn: () => getProductsByCategory(selectedBrand!, selectedCategory!),
    enabled: !!selectedBrand && !!selectedCategory,
    staleTime: 60000,
  })

  const brands = (brandsData?.success ? (brandsData.data ?? []) : []) as Array<{ id: string; name: string }>
  const categories = (categoriesData?.success ? (categoriesData.data ?? []) : []) as Array<{ id: string; name: string }>
  const allProducts = (productsData?.success ? (productsData.data ?? []) : []) as Array<{ id: string; name: string; cost: number; image_url: string | null; is_active: boolean }>

  const products = allProducts.filter(p => p.is_active && !items.some(i => i.product_id === p.id))

  const addItem = useCallback((product: ProductToAdd, qtyStr: string, costStr: string) => {
    const qty = parseInt(qtyStr) || 0
    const cost = parseFloat(costStr) || 0
    if (qty < 1) { toast.error('La cantidad debe ser mayor a 0'); return }
    if (cost <= 0) { toast.error('El costo debe ser mayor a 0'); return }
    setItems(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      quantity: qty,
      unit_cost: cost,
    }])
    setPendingQty(prev => { const n = { ...prev }; delete n[product.id]; return n })
    setPendingCost(prev => { const n = { ...prev }; delete n[product.id]; return n })
    toast.success(`${product.name} agregado`)
  }, [])

  const updateItem = (productId: string, field: 'quantity' | 'unit_cost', value: number) => {
    setItems(items.map(i => i.product_id === productId ? { ...i, [field]: value } : i))
  }

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId))
  }

  const total = items.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0)

  const handleSubmit = async () => {
    if (!branchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (items.some(i => i.unit_cost <= 0)) { toast.error('Todos los productos deben tener un costo mayor a 0'); return }

    setSubmitting(true)
    const formData = new FormData()
    formData.set('branch_id', branchId)
    formData.set('notes', notes)
    formData.set('items', JSON.stringify(items.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }))))

    const result = await createPurchase(formData)
    setSubmitting(false)

    if (result.success) {
      toast.success('Compra registrada exitosamente')
      router.push('/purchases')
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: Product Browser */}
      <div className="w-full lg:flex-[6] min-w-0 space-y-2">
        {/* Step 1: Brand chips */}
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
            <span className="text-xs font-semibold">Marca</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => { setSelectedBrand(brand.id); setSelectedCategory(null) }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-all',
                  selectedBrand === brand.id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'hover:border-primary/50 hover:bg-accent text-muted-foreground'
                )}
              >
                <Folder className={cn('h-3 w-3', selectedBrand === brand.id ? 'text-primary' : 'text-muted-foreground')} />
                {brand.name}
                {selectedBrand === brand.id && <Check className="h-2.5 w-2.5" />}
              </button>
            ))}
            {brands.length === 0 && <p className="text-[11px] text-muted-foreground py-2">No hay marcas</p>}
          </div>
        </div>

        {/* Step 2: Category chips */}
        {selectedBrand && (
          <div className="rounded-lg border bg-card px-3 py-2 animate-in fade-in-0 slide-in-from-left-2 duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                <span className="text-xs font-semibold">Categoría</span>
              </div>
              <button type="button" onClick={() => setSelectedBrand(null)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                Cambiar marca
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-all',
                    selectedCategory === cat.id
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'hover:border-primary/50 hover:bg-accent text-muted-foreground'
                  )}
                >
                  <FolderOpen className={cn('h-3 w-3', selectedCategory === cat.id ? 'text-primary' : 'text-amber-500')} />
                  {cat.name}
                  {selectedCategory === cat.id && <Check className="h-2.5 w-2.5" />}
                </button>
              ))}
              {categories.length === 0 && <p className="text-[11px] text-muted-foreground py-2">No hay categorías</p>}
            </div>
          </div>
        )}

        {/* Step 3: Product list */}
        {selectedBrand && selectedCategory && (
          <div className="rounded-lg border bg-card animate-in fade-in-0 slide-in-from-left-2 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                <span className="text-xs font-semibold">Productos</span>
                <span className="text-[10px] text-muted-foreground">{products.length} disponibles</span>
              </div>
              <button type="button" onClick={() => setSelectedCategory(null)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                Cambiar categoría
              </button>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                <p className="text-[11px] text-muted-foreground">Todos los productos están en el carrito</p>
              </div>
            ) : (
              <div>
                {/* Column headers desktop */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 border-b bg-muted/30">
                  <div className="w-7 shrink-0" />
                  <p className="flex-1 text-[10px] text-muted-foreground font-medium">Producto</p>
                  <p className="w-20 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Costo Bs</p>
                  <p className="w-16 shrink-0 text-[10px] text-muted-foreground font-medium text-center">Cant</p>
                  <div className="w-[65px] shrink-0" />
                </div>
                <div className="divide-y">
                  {products.map((product) => {
                    const qtyStr = pendingQty[product.id] ?? '1'
                    const costStr = pendingCost[product.id] ?? (Number(product.cost) ? String(Number(product.cost)) : '0')
                    return (
                      <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 sm:py-1.5 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="shrink-0">
                            {product.image_url ? (
                              <Image src={product.image_url} alt={product.name} width={32} height={32} className="h-8 w-8 sm:h-7 sm:w-7 rounded object-cover" />
                            ) : (
                              <div className="h-8 w-8 sm:h-7 sm:w-7 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-semibold sm:font-medium text-foreground leading-snug break-words sm:truncate flex-1 min-w-0">{product.name}</p>
                        </div>

                        {/* Controls (Costo + Cant + Agregar) */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground sm:hidden">Costo:</span>
                            <div className="w-20 sm:w-20 shrink-0">
                              <Input type="text" inputMode="decimal"
                                value={costStr}
                                onChange={(e) => setPendingCost(prev => ({ ...prev, [product.id]: e.target.value }))}
                                className="h-8 sm:h-7 text-xs sm:text-[11px] font-mono text-right" />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground sm:hidden">Cant:</span>
                            <div className="w-14 sm:w-16 shrink-0">
                              <Input type="text" inputMode="numeric"
                                value={qtyStr}
                                onChange={(e) => setPendingQty(prev => ({ ...prev, [product.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') addItem(product, qtyStr, costStr) }}
                                className="h-8 sm:h-7 text-xs sm:text-[11px] font-mono text-center" />
                            </div>
                          </div>

                          <Button size="sm" className="h-8 sm:h-7 text-xs sm:text-[11px] px-3 sm:px-2.5 shrink-0"
                            onClick={() => addItem(product, qtyStr, costStr)}>
                            <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3 mr-1 sm:mr-0.5" /> Agregar
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!selectedBrand && brands.length > 0 && (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Selecciona una marca para ver productos</p>
          </div>
        )}
      </div>

      {/* Right: Cart sidebar */}
      <div className="w-full lg:flex-[4] shrink-0">
        <div className="lg:sticky lg:top-4">
          <Card>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className={cn('h-4 w-4', items.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-semibold">Carrito de Compras</span>
              </div>
              <Badge variant={items.length > 0 ? 'default' : 'secondary'} className="text-[10px] h-5 px-2">
                {items.length}
              </Badge>
            </div>
            <CardContent className="px-3 pb-3 space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-5">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Agrega productos</p>
                  <p className="text-[10px] text-muted-foreground/60">desde el selector superior</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 px-1 py-1 border-b bg-muted/30">
                    <div className="flex-1 min-w-0 text-[10px] text-muted-foreground font-medium">Producto</div>
                    <div className="w-14 shrink-0 text-[10px] text-muted-foreground font-medium text-center">Cant</div>
                    <div className="w-14 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Costo</div>
                    <div className="w-16 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Subtotal</div>
                    <div className="w-8 shrink-0" />
                  </div>
                  <ScrollArea className="h-[220px] sm:h-[260px] pr-1 -mr-1">
                    <div className="divide-y">
                      {items.map((item) => (
                        <div key={item.product_id} className="flex items-center gap-2 py-2 sm:py-1.5 px-1">
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.product_name} width={20} height={20} className="h-5 w-5 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-[11px] sm:text-[10px] font-medium truncate leading-tight">{item.product_name}</p>
                          </div>
                          <div className="w-14 shrink-0 flex items-center justify-center gap-0.5">
                            <button type="button" className="h-5 w-5 sm:h-4 sm:w-4 rounded border flex items-center justify-center hover:bg-accent"
                              onClick={() => updateItem(item.product_id, 'quantity', Math.max(1, item.quantity - 1))}>
                              <Minus className="h-2.5 w-2.5 sm:h-2 sm:w-2" />
                            </button>
                            <span className="text-[11px] sm:text-[10px] font-mono w-4 text-center tabular-nums">{item.quantity}</span>
                            <button type="button" className="h-5 w-5 sm:h-4 sm:w-4 rounded border flex items-center justify-center hover:bg-accent"
                              onClick={() => updateItem(item.product_id, 'quantity', item.quantity + 1)}>
                              <Plus className="h-2.5 w-2.5 sm:h-2 sm:w-2" />
                            </button>
                          </div>
                          <div className="w-14 shrink-0 text-[10px] font-mono text-right text-muted-foreground">Bs {item.unit_cost.toFixed(2)}</div>
                          <div className="w-16 shrink-0 text-[11px] font-mono font-medium text-right">Bs {(item.quantity * item.unit_cost).toFixed(2)}</div>
                          <button type="button" className="w-8 shrink-0 text-[11px] text-destructive hover:underline text-center font-bold"
                            onClick={() => removeItem(item.product_id)}>×</button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-muted-foreground">Total Compra</span>
                <span className="text-base sm:text-sm font-bold font-mono text-primary">Bs {total.toFixed(2)}</span>
              </div>

              {items.length > 0 && (
                <>
                  <Textarea placeholder="Notas de recepción o proveedor (opcional)" value={notes}
                    onChange={(e) => setNotes(e.target.value)} className="h-14 text-xs sm:text-[11px]" />
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="flex-1 h-9 sm:h-7 text-xs sm:text-[11px]" onClick={() => router.back()}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1 h-9 sm:h-7 text-xs sm:text-[11px] font-semibold" onClick={handleSubmit}
                      disabled={submitting || !branchId || items.length === 0}>
                      {submitting ? 'Guardando...' : 'Registrar Compra'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
