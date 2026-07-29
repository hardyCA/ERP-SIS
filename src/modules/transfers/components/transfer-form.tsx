'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBrands } from '@/modules/brands/actions'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { createTransfer, getBranchesList, getTransferProducts } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Package, Plus, ShoppingCart, Check, Folder, FolderOpen, Minus, ArrowRight, ArrowLeftRight, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'

interface LineItem {
  product_id: string
  product_name: string
  image_url: string | null
  quantity: number
  unit_cost: number
  stock: number
}

interface ProductToAdd {
  id: string
  name: string
  image_url: string | null
  cost: number
  stock: number
}

export function TransferForm() {
  const router = useRouter()
  const { branchId: globalBranchId } = useBranch()
  const [fromBranchId, setFromBranchId] = useState('')
  const [toBranchId, setToBranchId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({})

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    if (globalBranchId && !fromBranchId)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromBranchId(globalBranchId)
  }, [globalBranchId, fromBranchId])

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 0,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', selectedBrand],
    queryFn: () => getCategoriesByBrand(selectedBrand!),
    enabled: !!selectedBrand,
    staleTime: 0,
  })

  const { data: productsData } = useQuery({
    queryKey: ['transfer-products', selectedBrand, selectedCategory, fromBranchId],
    queryFn: () => getTransferProducts(selectedBrand!, selectedCategory!, fromBranchId || undefined),
    enabled: !!selectedBrand && !!selectedCategory && !!fromBranchId,
    staleTime: 0,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: getBranchesList,
    staleTime: 0,
  })

  const brands = (brandsData?.success ? (brandsData.data ?? []) : []) as Array<{ id: string; name: string }>
  const categories = (categoriesData?.success ? (categoriesData.data ?? []) : []) as Array<{ id: string; name: string }>
  const allProducts = (productsData?.success ? (productsData.data ?? []) : []) as Array<ProductToAdd>
  const branches = (branchesData?.success ? (branchesData.data ?? []) : []) as Array<{ id: string; name: string }>

  const products = allProducts.filter(p => p.stock > 0 && !items.some(i => i.product_id === p.id))

  const addItem = useCallback((product: ProductToAdd, qtyStr: string) => {
    const qty = parseInt(qtyStr) || 0
    if (qty < 1) { toast.error('La cantidad debe ser mayor a 0'); return }
    if (qty > product.stock) { toast.error(`Stock insuficiente. Disponible: ${product.stock}`); return }
    setItems(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      quantity: qty,
      unit_cost: product.cost,
      stock: product.stock,
    }])
    setPendingQty(prev => { const n = { ...prev }; delete n[product.id]; return n })
    toast.success(`${product.name} agregado`)
  }, [])

  const updateItem = (productId: string, field: 'quantity', value: number) => {
    setItems(items.map(i => i.product_id === productId ? { ...i, [field]: value } : i))
  }

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId))
  }

  const handleSubmit = async () => {
    if (!fromBranchId || !toBranchId) { toast.error('Selecciona sucursal origen y destino'); return }
    if (fromBranchId === toBranchId) { toast.error('La sucursal origen y destino deben ser diferentes'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }

    const exceeds = items.find(i => i.quantity > i.stock)
    if (exceeds) { toast.error(`Stock insuficiente de "${exceeds.product_name}". Disponible: ${exceeds.stock}`); return }

    setSubmitting(true)
    const formData = new FormData()
    formData.set('from_branch_id', fromBranchId)
    formData.set('to_branch_id', toBranchId)
    formData.set('notes', notes)
    formData.set('items', JSON.stringify(items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost }))))

    const result = await createTransfer(formData)
    setSubmitting(false)

    if (result.success) {
      toast.success('Traspaso creado exitosamente')
      router.push('/transfers')
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  const availableDest = branches.filter(b => b.id !== fromBranchId)

  return (
    <div className="flex flex-col gap-4">
      {/* Branch origin / destination */}
      <div className="rounded-lg border bg-card px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Sucursales</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Origen</label>
            <Select value={fromBranchId} onValueChange={(v) => { setFromBranchId(v ?? ''); if (toBranchId === v) setToBranchId('') }}>
              <SelectTrigger className="h-7 text-[11px] mt-0.5">
                <SelectValue placeholder="Seleccionar">{fromBranchId ? branches.find(b => b.id === fromBranchId)?.name : ''}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id} className="text-[11px]">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Destino</label>
            <Select value={toBranchId} onValueChange={(v) => setToBranchId(v ?? '')}>
              <SelectTrigger className="h-7 text-[11px] mt-0.5">
                <SelectValue placeholder="Seleccionar">{toBranchId ? availableDest.find(b => b.id === toBranchId)?.name : ''}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableDest.map((b) => <SelectItem key={b.id} value={b.id} className="text-[11px]">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
          {!fromBranchId ? (
            <div className="text-center py-6">
              <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
              <p className="text-[11px] text-muted-foreground">Selecciona una sucursal origen primero</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
              <p className="text-[11px] text-muted-foreground">Todos los productos están en el carrito</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 px-3 py-1 border-b bg-muted/30">
                <div className="w-7 shrink-0" />
                <p className="flex-1 text-[10px] text-muted-foreground font-medium">Producto</p>
                <p className="w-14 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Stock</p>
                <p className="w-14 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Costo</p>
                <p className="w-16 shrink-0 text-[10px] text-muted-foreground font-medium text-center">Cant</p>
                <div className="w-[65px] shrink-0" />
              </div>
              <div className="divide-y">
                {products.map((product) => {
                  const qtyStr = pendingQty[product.id] ?? '1'
                  return (
                    <div key={product.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 transition-colors">
                      <div className="shrink-0">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} width={28} height={28} className="h-7 w-7 rounded object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="flex-1 text-xs font-medium truncate min-w-0">{product.name}</p>
                      <p className={cn('w-14 shrink-0 text-[11px] font-mono text-right', product.stock <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                        {product.stock}
                      </p>
                      <p className="w-14 shrink-0 text-[11px] font-mono text-right text-muted-foreground">
                        Bs {product.cost.toFixed(2)}
                      </p>
                      <div className="w-16 shrink-0">
                        <Input type="text" inputMode="numeric"
                          value={qtyStr}
                          onChange={(e) => setPendingQty(prev => ({ ...prev, [product.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addItem(product, qtyStr) }}
                          className="h-7 text-[11px] font-mono text-center" />
                      </div>
                      <Button size="sm" className="h-7 text-[11px] px-2.5 shrink-0"
                        onClick={() => addItem(product, qtyStr)}>
                        <Plus className="h-3 w-3 mr-0.5" /> Agregar
                      </Button>
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

      {/* Cart */}
      <Card className={cn('border-2 overflow-hidden', items.length > 0 ? 'border-primary/20' : 'border-dashed')}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className={cn('h-5 w-5', items.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-base font-semibold">Carrito</span>
            </div>
            <Badge variant={items.length > 0 ? 'default' : 'secondary'} className="text-xs px-3 py-1">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </Badge>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Selecciona productos arriba para agregarlos al carrito</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.product_id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.product_name} width={36} height={36} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {item.stock} | Bs {item.unit_cost.toFixed(2)} c/u</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors"
                      onClick={() => updateItem(item.product_id, 'quantity', Math.max(1, item.quantity - 1))}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-mono w-8 text-center tabular-nums font-medium">{item.quantity}</span>
                    <button type="button" className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors"
                      onClick={() => updateItem(item.product_id, 'quantity', item.quantity + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-semibold font-mono">Bs {(item.quantity * item.unit_cost).toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <>
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{items.reduce((s, i) => s + i.quantity, 0)} productos</span>
                <span className="text-lg font-bold font-mono text-primary">Bs {items.reduce((s, i) => s + (i.quantity * i.unit_cost), 0).toFixed(2)}</span>
              </div>

              <Textarea placeholder="Notas (opcional)" value={notes}
                onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />

              <Separator />

              <div className="flex items-center gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}
                  disabled={submitting || !fromBranchId || !toBranchId || items.length === 0}>
                  {submitting ? 'Guardando...' : 'Crear Traspaso'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
