'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBrands } from '@/modules/brands/actions'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { getProductsByCategory } from '@/modules/products/actions'
import { createPurchase, getPurchaseById, updatePurchase } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { Card, CardContent } from '@/shared/components/ui/card'
import { SupplierSelector } from '@/modules/suppliers/components/supplier-selector'
import { useShowCost } from '@/shared/lib/use-role'
import { Package, Plus, ShoppingCart, Check, Folder, FolderOpen, Minus, ArrowRight, Truck, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'

interface LineItem {
  product_id: string
  product_name: string
  image_url: string | null
  unit: string | null
  quantity: number
  unit_cost: number
}

export function PurchaseForm({ purchaseId }: { purchaseId?: string }) {
  const isEditing = !!purchaseId

  const { data: purchaseData, isPending: purchaseLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => getPurchaseById(purchaseId!),
    enabled: isEditing,
    staleTime: 0,
  })

  const purchase = purchaseData?.success ? purchaseData.data : null

  if (isEditing && purchaseLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando compra...</p>
        </div>
      </div>
    )
  }

  if (isEditing && !purchase) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar la compra. Intenta nuevamente.</p>
        </div>
      </div>
    )
  }

  if (isEditing && purchase && purchase.status !== 'pending') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm font-medium">Esta compra ya no se puede editar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Solo se pueden modificar compras en estado pendiente.
          </p>
        </div>
      </div>
    )
  }

  const loadedItems = (purchase?.items ?? []) as Array<{
    product_id: string
    quantity: number
    unit_cost: number
    products: { name: string | null; image_url: string | null; units_of_measure: { name: string; abbreviation: string | null } | null } | null
  }>
  const loadedExpenses = (purchase?.expenses ?? []) as Array<{ description: string; cost: number }>

  return (
    <PurchaseFormInner
      key={purchase?.id ?? 'new'}
      purchaseId={purchaseId}
      isEditing={isEditing}
      initialBranchId={purchase?.branch_id}
      initialSupplier={purchase?.suppliers ? { id: purchase.suppliers.id, name: purchase.suppliers.name } : null}
      initialNotes={purchase?.notes ?? ''}
      initialItems={loadedItems.map(it => {
        const u = it.products?.units_of_measure
        const unitLabel = u ? (u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name) : null
        return {
          product_id: it.product_id,
          product_name: it.products?.name ?? 'Producto',
          image_url: it.products?.image_url ?? null,
          unit: unitLabel,
          quantity: it.quantity,
          unit_cost: Number(it.unit_cost) || 0,
        }
      })}
      initialExpenses={loadedExpenses.map(e => ({
        description: e.description,
        cost: String(e.cost ?? 0),
      }))}
    />
  )
}

function PurchaseFormInner({
  purchaseId,
  isEditing,
  initialBranchId,
  initialSupplier,
  initialNotes,
  initialItems,
  initialExpenses,
}: {
  purchaseId?: string
  isEditing: boolean
  initialBranchId?: string
  initialSupplier: { id: string; name: string } | null
  initialNotes: string
  initialItems: LineItem[]
  initialExpenses: Array<{ description: string; cost: string }>
}) {
  const router = useRouter()
  const { branchId } = useBranch()
  const [notes, setNotes] = useState(initialNotes)
  const [supplier, setSupplier] = useState(initialSupplier)
  const [items, setItems] = useState(initialItems)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [submitting, setSubmitting] = useState(false)
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({})
  const [pendingCost, setPendingCost] = useState<Record<string, string>>({})
  const [cartCostDraft, setCartCostDraft] = useState<Record<string, string>>({})

  const effectiveBranchId = initialBranchId ?? branchId

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const showCost = useShowCost()

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
    queryKey: ['products-for-purchase', selectedBrand, selectedCategory],
    queryFn: () => getProductsByCategory(selectedBrand!, selectedCategory!),
    enabled: !!selectedBrand && !!selectedCategory,
    staleTime: 0,
  })

  const brands = (brandsData?.success ? (brandsData.data ?? []) : []) as Array<{ id: string; name: string }>
  const categories = (categoriesData?.success ? (categoriesData.data ?? []) : []) as Array<{ id: string; name: string }>
  const allProducts = (productsData?.success ? (productsData.data ?? []) : []) as Array<{
    id: string
    name: string
    cost: number
    image_url: string | null
    is_active: boolean
    units_of_measure: { name: string; abbreviation: string | null } | null
  }>

  const getUnitLabel = (product: (typeof allProducts)[number]): string | null => {
    const u = product.units_of_measure
    if (!u) return null
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name
  }

  const products = allProducts
    .filter(p => p.is_active && !items.some(i => i.product_id === p.id))
    .map(p => ({ id: p.id, name: p.name, image_url: p.image_url, cost: p.cost, unit: getUnitLabel(p) }))

  const addItem = useCallback((product: (typeof products)[number], qtyStr: string, costStr: string) => {
    const qty = parseInt(qtyStr) || 0
    const cost = parseFloat(costStr) || 0
    if (qty < 1) { toast.error('La cantidad debe ser mayor a 0'); return }
    if (cost <= 0) { toast.error('El costo debe ser mayor a 0'); return }
    setItems(prev => [...prev, {
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      unit: product.unit ?? null,
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

  const addExpense = () => setExpenses(prev => [...prev, { description: '', cost: '0' }])

  const updateExpense = (index: number, field: 'description' | 'cost', value: string) => {
    setExpenses(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index))
  }

  const totalProductos = items.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0)
  const totalGastos = expenses.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0)
  const total = totalProductos + totalGastos

  const handleSubmit = async () => {
    if (!effectiveBranchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    if (items.some(i => i.unit_cost <= 0)) { toast.error('Todos los productos deben tener un costo mayor a 0'); return }

    setSubmitting(true)
    const formData = new FormData()
    if (isEditing && purchaseId) formData.set('purchase_id', purchaseId)
    formData.set('branch_id', effectiveBranchId)
    formData.set('supplier_id', supplier?.id ?? '')
    formData.set('notes', notes)
    formData.set('items', JSON.stringify(items.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
    }))))
    formData.set('expenses', JSON.stringify(expenses
      .filter(e => e.description.trim() && (parseFloat(e.cost) || 0) > 0)
      .map(e => ({ description: e.description.trim(), cost: parseFloat(e.cost) || 0 }))
    ))

    const result = isEditing ? await updatePurchase(formData) : await createPurchase(formData)
    setSubmitting(false)

    if (result.success) {
      toast.success(isEditing ? 'Compra actualizada exitosamente' : 'Compra registrada exitosamente')
      const savedId = result.data && typeof result.data === 'object'
        ? (result.data as { id?: string }).id
        : undefined
      if (isEditing && savedId) {
        router.push(`/purchases/${savedId}`)
      } else {
        router.push('/purchases')
      }
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Product Browser */}
      <div className="w-full min-w-0 space-y-2">
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
                  {showCost && <p className="w-20 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Costo Bs</p>}
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
                          {product.unit && <span className="text-[10px] text-muted-foreground font-normal">{product.unit}</span>}
                        </div>

                        {/* Controls (Costo + Cant + Agregar) */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          {showCost && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground sm:hidden">Costo:</span>
                              <div className="w-20 sm:w-20 shrink-0">
                                <Input type="text" inputMode="decimal"
                                  value={costStr}
                                  onChange={(e) => setPendingCost(prev => ({ ...prev, [product.id]: e.target.value }))}
                                  className="h-8 sm:h-7 text-xs sm:text-[11px] font-mono text-right" />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground sm:hidden">Cant:</span>
                            <div className="w-14 sm:w-16 shrink-0">
                              <Input type="text" inputMode="numeric"
                                value={qtyStr}
                                onChange={(e) => setPendingQty(prev => ({ ...prev, [product.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') addItem(product, qtyStr, showCost ? costStr : String(Number(product.cost) || 0)) }}
                                className="h-8 sm:h-7 text-xs sm:text-[11px] font-mono text-center" />
                            </div>
                          </div>

                          <Button size="sm" className="h-8 sm:h-7 text-xs sm:text-[11px] px-3 sm:px-2.5 shrink-0"
                            onClick={() => addItem(product, qtyStr, showCost ? costStr : String(Number(product.cost) || 0))}>
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

      {/* Cart */}
      <Card className={cn('border-2 overflow-hidden', items.length > 0 ? 'border-primary/20' : 'border-dashed')}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className={cn('h-5 w-5', items.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-base font-semibold">Carrito de Compras</span>
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
                      {item.unit && <p className="text-xs text-muted-foreground truncate">{item.unit}</p>}
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
                  {showCost && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground sm:hidden">Costo:</span>
                      <div className="w-20 sm:w-24 shrink-0">
                        <Input type="text" inputMode="decimal"
                          value={cartCostDraft[item.product_id] ?? String(Number(item.unit_cost.toFixed(4)))}
                          onChange={(e) => {
                            const v = e.target.value
                            setCartCostDraft(prev => ({ ...prev, [item.product_id]: v }))
                            const parsed = parseFloat(v)
                            if (!isNaN(parsed)) updateItem(item.product_id, 'unit_cost', parsed)
                          }}
                          onBlur={() => setCartCostDraft(prev => {
                            const n = { ...prev }
                            delete n[item.product_id]
                            return n
                          })}
                          className="h-8 sm:h-7 text-xs font-mono text-right" />
                      </div>
                    </div>
                  )}
                  {showCost && (
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-semibold font-mono">Bs {(item.quantity * item.unit_cost).toFixed(2)}</p>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Supplier */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Truck className="h-4 w-4" /> Proveedor
                </div>
                <SupplierSelector
                  value={supplier?.id ?? null}
                  onChange={(id, name) => setSupplier(id ? { id, name } : null)}
                />
              </div>

              <Textarea placeholder="Notas de recepción (opcional)" value={notes}
                onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>

            {showCost && (
              <div className="space-y-4">
                {/* Operating Expenses */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Gastos Operativos</span>
                    <Button type="button" variant="outline" size="sm" onClick={addExpense}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>
                  {expenses.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin gastos registrados</p>
                  )}
                  {expenses.map((exp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="Detalle" value={exp.description}
                        onChange={(e) => updateExpense(i, 'description', e.target.value)}
                        className="flex-1" />
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Bs</span>
                        <Input type="text" inputMode="decimal" placeholder="0" value={exp.cost}
                          onChange={(e) => updateExpense(i, 'cost', e.target.value)}
                          className="pl-8 text-right" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeExpense(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            {showCost && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Productos</span>
                  <span className="text-base font-semibold font-mono">Bs {totalProductos.toFixed(2)}</span>
                </div>
                {totalGastos > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Gastos</span>
                    <span className="text-base font-semibold font-mono">Bs {totalGastos.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-base font-bold">Total Compra</span>
              <span className="text-2xl font-bold font-mono text-primary">Bs {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}
              disabled={submitting || !effectiveBranchId || items.length === 0}>
              {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Compra'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
