'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getBrands } from '@/modules/brands/actions'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { createQuote, updateQuote, searchCustomers, createCustomer, getQuoteProducts } from '../actions'
import { useBranch } from '@/shared/contexts/branch-context'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog'
import { Package, Plus, ShoppingCart, Check, Folder, FolderOpen, Minus, ArrowRight, Search, UserPlus, FileText } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/shared/lib/utils'

interface LineItem {
  product_id: string
  product_name: string
  image_url: string | null
  quantity: number
  price: number
  stock: number
  unit: string | null
}

interface ProductToAdd {
  id: string
  name: string
  image_url: string | null
  sale_price: number
  stock: number
  unit: string | null
}

interface InitialData {
  branchId: string
  customer: { id: string; name: string; phone: string | null } | null
  discount: number
  notes: string
  expiresAt: string
  items: LineItem[]
}

interface QuoteFormProps {
  initialData?: InitialData
  quoteId?: string
}

export function QuoteForm({ initialData, quoteId }: QuoteFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { branchId: contextBranchId } = useBranch()
  const isEditing = !!quoteId
  const branchId = initialData?.branchId ?? contextBranchId

  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<LineItem[]>(initialData?.items ?? [])
  const [pendingQty, setPendingQty] = useState<Record<string, string>>({})

  // Hierarchy
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Customer
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(initialData?.customer ?? null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  // Quote details
  const [discount, setDiscount] = useState(initialData?.discount?.toString() ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt ?? '')

  const itemsTotal = items.reduce((sum, i) => sum + (i.quantity * i.price), 0)
  const discountVal = parseFloat(discount) || 0
  const total = Math.max(0, itemsTotal - discountVal)

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
    queryKey: ['quote-products', selectedBrand, selectedCategory, branchId],
    queryFn: () => getQuoteProducts(selectedBrand!, selectedCategory!, branchId || undefined),
    enabled: !!selectedBrand && !!selectedCategory,
    staleTime: 0,
  })

  const { data: customerData } = useQuery({
    queryKey: ['customer-search', customerQuery],
    queryFn: () => searchCustomers(customerQuery),
    enabled: customerQuery.length >= 1,
    staleTime: 0,
  })

  const brands = (brandsData?.success ? (brandsData.data ?? []) : []) as Array<{ id: string; name: string }>
  const categories = (categoriesData?.success ? (categoriesData.data ?? []) : []) as Array<{ id: string; name: string }>
  const allProducts = ((productsData?.success ? (productsData.data ?? []) : [])).map((p) => {
    const rawUnit = (p as { units_of_measure?: unknown }).units_of_measure
    const u = Array.isArray(rawUnit)
      ? (rawUnit as Array<{ name: string; abbreviation: string | null }>)[0] ?? null
      : ((rawUnit as { name: string; abbreviation: string | null } | null | undefined) ?? null)
    return {
      id: (p as { id: string }).id,
      name: (p as { name: string }).name,
      image_url: (p as { image_url: string | null }).image_url,
      sale_price: (p as { sale_price: number }).sale_price,
      stock: (p as { stock: number }).stock,
      unit: u ? (u.abbreviation ?? u.name) : null,
    }
  }) as Array<ProductToAdd>
  const customerResults = (customerData?.success ? (customerData.data ?? []) : []) as Array<{ id: string; name: string; phone: string | null }>

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
      price: product.sale_price,
      stock: product.stock,
      unit: product.unit,
    }])
    setPendingQty(prev => { const n = { ...prev }; delete n[product.id]; return n })
    toast.success(`${product.name} agregado`)
  }, [])

  const updateItem = (productId: string, field: 'quantity' | 'price', value: number) => {
    setItems(items.map(i => i.product_id === productId ? { ...i, [field]: value } : i))
  }

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId))
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName) return
    const formData = new FormData()
    formData.set('name', newCustomerName)
    formData.set('phone', newCustomerPhone)
    const res = await createCustomer(formData)
    if (res.success && res.data) {
      setSelectedCustomer(res.data as { id: string; name: string; phone: string | null })
      setShowNewCustomer(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      queryClient.invalidateQueries({ queryKey: ['customer-search'] })
    } else {
      toast.error(res.message)
    }
  }

  const handleSubmit = async () => {
    if (!branchId) { toast.error('Selecciona una sucursal en el menú lateral'); return }
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    const exceeds = items.find(i => i.quantity > i.stock)
    if (exceeds) { toast.error(`Stock insuficiente de "${exceeds.product_name}". Disponible: ${exceeds.stock}`); return }

    setSubmitting(true)
    const formData = new FormData()
    formData.set('branch_id', branchId)
    formData.set('discount', String(discountVal))
    formData.set('notes', notes)
    if (expiresAt) formData.set('expires_at', expiresAt)
    if (selectedCustomer) {
      formData.set('customer_id', selectedCustomer.id)
      formData.set('customer_name', selectedCustomer.name)
      formData.set('customer_phone', selectedCustomer.phone || '')
    }
    formData.set('items', JSON.stringify(items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price }))))

    const result = isEditing && quoteId
      ? await updateQuote(quoteId, formData)
      : await createQuote(formData)
    setSubmitting(false)

    if (result.success) {
      toast.success(isEditing ? 'Cotización actualizada exitosamente' : 'Cotización registrada exitosamente')
      router.push('/quotes')
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Product Browser */}
      <div className="w-full space-y-2">
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
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 border-b bg-muted/30">
                  <div className="w-7 shrink-0" />
                  <p className="flex-1 text-[10px] text-muted-foreground font-medium">Producto</p>
                  <p className="w-20 shrink-0 text-[10px] text-muted-foreground font-medium text-right">Precio Bs</p>
                  <p className="w-12 shrink-0 text-[10px] text-muted-foreground font-medium text-center">Stock</p>
                  <p className="w-16 shrink-0 text-[10px] text-muted-foreground font-medium text-center">Cant</p>
                  <div className="w-[65px] shrink-0" />
                </div>
                <div className="divide-y">
                  {products.map((product) => {
                    const qtyStr = pendingQty[product.id] ?? '1'
                    return (
                      <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 sm:py-1.5 hover:bg-accent/30 transition-colors">
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
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold sm:font-medium text-foreground leading-snug break-words sm:truncate">
                              {product.name}
                              {product.unit && <span className="ml-1 font-normal text-[10px] text-muted-foreground">({product.unit})</span>}
                            </p>
                            <div className="flex items-center gap-2 sm:hidden text-[11px] text-muted-foreground mt-0.5">
                              <span className="font-mono font-medium text-foreground">
                                {product.sale_price > 0 ? `Bs ${product.sale_price.toFixed(2)}` : '—'}
                              </span>
                              <span>•</span>
                              <span className={cn(product.stock <= 3 ? 'text-destructive font-semibold' : '')}>
                                Stock: {product.stock}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Desktop price & stock info */}
                        <p className="hidden sm:block w-20 shrink-0 text-[11px] font-mono text-right text-muted-foreground">
                          {product.sale_price > 0 ? `Bs ${product.sale_price.toFixed(2)}` : '—'}
                        </p>
                        <p className={cn('hidden sm:block w-12 shrink-0 text-[11px] font-mono text-center', product.stock <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          {product.stock}
                        </p>

                        {/* Action controls */}
                        <div className="flex items-center justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          <div className="flex items-center gap-1.5 sm:w-16 shrink-0">
                            <span className="text-[10px] text-muted-foreground sm:hidden">Cant:</span>
                            <Input type="text" inputMode="numeric"
                              value={qtyStr}
                              onChange={(e) => setPendingQty(prev => ({ ...prev, [product.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') addItem(product, qtyStr) }}
                              className="h-8 sm:h-7 text-xs sm:text-[11px] font-mono text-center w-14 sm:w-full" />
                          </div>
                          <Button size="sm" className="h-8 sm:h-7 text-xs sm:text-[11px] px-3 sm:px-2.5 shrink-0"
                            onClick={() => addItem(product, qtyStr)}>
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

      {/* Cart Section */}
      <Card className={cn('border-2 overflow-hidden', items.length > 0 ? 'border-primary/20' : 'border-dashed')}>
        <CardContent className="p-4 space-y-4">
          {/* Cart header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className={cn('h-5 w-5', items.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-base font-semibold">Carrito</span>
            </div>
            <Badge variant={items.length > 0 ? 'default' : 'secondary'} className="text-xs px-3 py-1">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </Badge>
          </div>

          {/* Customer section */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cliente (nombre o teléfono)..."
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedCustomer && (
            <div className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p className="text-xs text-muted-foreground leading-tight truncate">{selectedCustomer.phone}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-xs text-destructive hover:underline shrink-0 ml-2">Quitar</button>
            </div>
          )}
          {customerQuery && customerResults.length > 0 && !selectedCustomer && (
            <div className="rounded-xl border divide-y max-h-32 overflow-auto">
              {customerResults.map((c) => (
                <button key={c.id} type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors"
                  onClick={() => { setSelectedCustomer(c); setCustomerQuery('') }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground leading-tight truncate">{c.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {customerQuery && customerResults.length === 0 && !selectedCustomer && (
            <Button variant="outline" size="sm" className="w-full"
              onClick={() => { setNewCustomerName(customerQuery); setShowNewCustomer(true) }}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Crear &quot;{customerQuery}&quot;
            </Button>
          )}

          <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Nuevo Cliente</DialogTitle>
                <DialogDescription>Registrar un nuevo cliente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nombre" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                <Input placeholder="Teléfono (opcional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                <Button onClick={handleCreateCustomer} className="w-full">Guardar Cliente</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cart items */}
          {items.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Selecciona productos arriba para agregarlos al carrito</p>
            </div>
          ) : (
            <div>
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.product_id} className="py-3 sm:flex sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.product_name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug break-words">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">Bs {item.price.toFixed(2)} c/u{item.unit ? ` (${item.unit})` : ''}</p>
                      </div>
                      <div className="text-right shrink-0 sm:hidden">
                        <p className="text-sm font-semibold font-mono">Bs {(item.quantity * item.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 sm:mt-0">
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors"
                          onClick={() => updateItem(item.product_id, 'quantity', Math.max(1, item.quantity - 1))}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-mono w-7 text-center tabular-nums font-medium">{item.quantity}</span>
                        <button type="button" className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors"
                          onClick={() => updateItem(item.product_id, 'quantity', item.quantity + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="hidden sm:block text-right min-w-[70px] shrink-0">
                        <p className="text-sm font-semibold font-mono">Bs {(item.quantity * item.price).toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeItem(item.product_id)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Discount + Total + Expiration + Notes */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0">Descuento</span>
                  <div className="relative flex-1 max-w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Bs</span>
                    <Input type="text" inputMode="decimal"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 text-right" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0">Vence</span>
                  <Input type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-48" />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0">Notas</span>
                  <Textarea placeholder="Opcional" value={notes}
                    onChange={(e) => setNotes(e.target.value)} className="flex-1 min-h-[40px]" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border bg-primary/5 px-4 py-3 text-center">
                  <p className="text-sm text-primary font-medium">Total Cotización</p>
                  <p className="text-2xl font-bold font-mono text-primary">Bs {total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Total + Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border/40">
            <div className="flex items-baseline gap-3">
              <span className="text-base font-semibold">Total</span>
              <span className="text-2xl font-bold font-mono text-primary">Bs {total.toFixed(2)}</span>
              {discountVal > 0 && (
                <span className="text-xs text-muted-foreground line-through">Bs {itemsTotal.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={handleSubmit}
                disabled={submitting || !branchId || items.length === 0}>
                {submitting ? 'Guardando...' : (isEditing ? 'Actualizar Cotización' : 'Registrar Cotización')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}