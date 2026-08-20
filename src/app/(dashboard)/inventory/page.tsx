'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/shared/components/page-header'
import { PageContainer } from '@/shared/components/page-container'
import { InventoryList } from '@/modules/inventory/components/inventory-list'
import { InventoryAdjustForm } from '@/modules/inventory/components/inventory-adjust-form'
import { useBranch } from '@/shared/contexts/branch-context'
import { useQuery } from '@tanstack/react-query'
import { getBrands } from '@/modules/brands/actions'
import { getCategoriesByBrand } from '@/modules/categories/actions'
import { Store, Folder, Package, Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlBranchId = searchParams.get('branch')
  const urlBrandId = searchParams.get('brand')
  const urlCategoryId = searchParams.get('category')

  const { branchId, setBranch, branches } = useBranch()
  const allBranches = urlBranchId === 'all'
  const effectiveBranchId = allBranches ? '' : (urlBranchId || branchId || '')
  const effectiveBrandId = urlBrandId || ''
  const effectiveCategoryId = urlCategoryId || ''

  const [open, setOpen] = useState(false)
  const [adjustData, setAdjustData] = useState<{
    productId: string
    productName: string
    currentQty: number
    branchId: string
  } | null>(null)

  // Obtener marcas
  const { data: brandsResult } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
    staleTime: 0,
  })
  const brands = (brandsResult?.success ? brandsResult.data : []) as Array<{ id: string; name: string }>

  // Obtener categorías de la marca seleccionada
  const { data: categoriesResult } = useQuery({
    queryKey: ['categories', effectiveBrandId],
    queryFn: () => getCategoriesByBrand(effectiveBrandId),
    enabled: !!effectiveBrandId,
    staleTime: 0,
  })
  const categories = (categoriesResult?.success ? categoriesResult.data : []) as Array<{ id: string; name: string }>

  const handleAdjust = (productId: string, productName: string, currentQty: number, bId: string) => {
    setAdjustData({ productId, productName, currentQty, branchId: bId })
    setOpen(true)
  }

  useEffect(() => {
    if (urlBranchId && urlBranchId !== 'all' && urlBranchId !== branchId) {
      setBranch(urlBranchId)
    }
  }, [urlBranchId, branchId, setBranch])

  const updateFilters = (newBranch: string, newBrand: string, newCategory: string) => {
    const params = new URLSearchParams()
    if (newBranch) params.set('branch', newBranch)
    if (newBrand) params.set('brand', newBrand)
    if (newCategory) params.set('category', newCategory)
    router.push(`/inventory?${params.toString()}`)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Inventario"
        description="Gestiona el stock y precios por sucursal"
      />

      {/* Contenedor Compacto de Chips / Tarjetas */}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-3 backdrop-blur-md space-y-2.5 shadow-xs">
        {/* 1. Chips de Sucursales */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
            <Store className="h-3.5 w-3.5 text-primary" /> Sucursal:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => updateFilters('all', effectiveBrandId, effectiveCategoryId)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all border',
                allBranches
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'border-border/60 bg-muted/40 hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <span>Todas</span>
              {allBranches && <Check className="h-3 w-3" />}
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBranch(b.id)
                  updateFilters(b.id, effectiveBrandId, effectiveCategoryId)
                }}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all border',
                  b.id === effectiveBranchId
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'border-border/60 bg-muted/40 hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{b.name}</span>
                {b.id === effectiveBranchId && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Chips de Marcas */}
        {(effectiveBranchId || allBranches) && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-border/40 pt-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-muted-foreground" /> Marcas:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => updateFilters(allBranches ? 'all' : effectiveBranchId, brand.id, '')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all border',
                    brand.id === effectiveBrandId
                      ? 'border-primary bg-primary/10 text-primary font-semibold border-primary/40'
                      : 'border-border/60 bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{brand.name}</span>
                  {brand.id === effectiveBrandId && <Check className="h-3 w-3 text-primary" />}
                </button>
              ))}
              {brands.length === 0 && <span className="text-xs text-muted-foreground italic">No hay marcas</span>}
            </div>
          </div>
        )}

        {/* 3. Chips de Categorías */}
        {effectiveBrandId && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-border/40 pt-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20 flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-amber-500" /> Categoría:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateFilters(allBranches ? 'all' : effectiveBranchId, effectiveBrandId, cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all border',
                    cat.id === effectiveCategoryId
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'border-border/60 bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{cat.name}</span>
                  {cat.id === effectiveCategoryId && <Check className="h-3 w-3 text-amber-500" />}
                </button>
              ))}
              {categories.length === 0 && <span className="text-xs text-muted-foreground italic">No hay categorías</span>}
            </div>
          </div>
        )}
      </div>

      {/* Contenido Principal / Tabla de Inventario */}
      <InventoryList
        branchId={effectiveBranchId}
        allBranches={allBranches}
        brandId={effectiveBrandId}
        categoryId={effectiveCategoryId}
        onAdjust={handleAdjust}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
          </DialogHeader>
          {adjustData && (
            <InventoryAdjustForm
              productId={adjustData.productId}
              productName={adjustData.productName}
              currentQty={adjustData.currentQty}
              branchId={adjustData.branchId}
              onSuccess={() => { setOpen(false); setAdjustData(null) }}
              onCancel={() => { setOpen(false); setAdjustData(null) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}